// queue by redis:

var config = require('./config');

var
    redis = require('redis'),
    client = redis.createClient(config.queue.port, config.queue.host, {
        parser: 'javascript'
    });

module.exports = function (queueName) {
    return {
        // push object into queue:
        push: function (value, callback) {
            var s = JSON.stringify(value);
            console.log('QUEUE: push: ' + s);
            client.rpush(queueName, s, function (err) {
                if (callback) {
                    callback(err);
                }
            });
        },
        // pop object into queue, return null if queue is empty:
        pop: function (callback) {
            client.lpop(queueName, function (err, value) {
                if (err) {
                    return callback(err);
                }
                callback(null, value && JSON.parse(value));
            });
        },
        // get size of the queue:
        size: function (callback) {
            client.llen(queueName, callback);
        }
    };
};
