const keys = require('./keys');

// Express APP Setup

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());


// Postgress Client Setup

const { Pool } = require('pg');
const pgClient = new Pool({
    host: keys.pgHost,
    port: keys.pgPort,
    database: keys.pgDatabase,
    user: keys.pgUser,
    password: keys.pgPassword
});

pgClient.on('connect', client => {
    client
        .query('CREATE TABLE IF NOT EXISTS values (number INT)')
        .catch((err) => console.log(err));
});


// Redis Client Setup

const redis = require('redis')
const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
});

const redisPublisher = redisClient.duplicate();



// Express route handlers

app.get('/', (req, res) => {
    res.send('Hi');
})

app.get('/values/all', async (req, res) => {

    const values = await pgClient.query('SELECT * FROM values');

    res.send(values.rows);
});

app.get('/values/current', async (req, res) => {

    redisClient.hgetall('values', (err, values) => {
        res.send(values);
    });

});

app.post('/values', async (req, res) => {

    // Pega o valor do índice que veio na requisição
    const index = req.body.index;

    if( parseInt(index) > 40 ) {
        return res.status(422).send('Index too high!');
    }

    // salva no banco com hashset ainda sem o valor calculado
    redisClient.hset('values', index, 'Nothing yet!');

    // avisa que tem um valor novo no banco
    redisPublisher.publish('insert', index);

    // Grava o valor também no Postgres
    pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);

    // Avisa que tá fazendo
    res.send({working: true});
})


app.listen(5000, err => {
    console.log('Listening.');
});