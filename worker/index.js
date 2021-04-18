const keys = require('./keys');
const redis = require('redis');

// Cria uma conexão com as chaves que estão no key.js que por sua vez são propriedades do ambiente
const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
});

// cliente para subscrição no redis
const sub = redisClient.duplicate();

function fib(index) {
    if (index < 2) {
        return 1;
    }

    return fib(index - 1) + fib(index - 2);
}

// Essa função será chamada sempre que message for inserido no banco
sub.on('message', (channel, message) => {
    // insere no hashset values um par com o index e o seu valor de fibonacci
    redisClient.hset('values', message, fib(parseInt(message)));
})

// Esse cliente será chamado sempre que houver um insert no banco
sub.subscribe('insert')