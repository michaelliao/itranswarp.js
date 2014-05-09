// queue worker:

var
    providers = require('./controllers/_auth'),
    constants = require('./constants'),
    queue = require('./queue'),
    queueSNS = queue(constants.QUEUE_SNS);

function info(s) {
    console.log('INFO: ' + s);
}

function error(s) {
    console.log('ERROR: ' + s);
}

function sendToSNS(msg) {
    console.log('Send to sns: ' + msg);
}

queueSNS.pop(function (err, value) {
    if (err) {
        return error(err);
    }
    if (value === null) {
        info('No message in queue.');
        return;
    }
    sendToSNS(value);
});
