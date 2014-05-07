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
    var
        provider,
        providerName = msg.provider,
        access_token = msg.access_token,
        expires_at = msg.expires_at,
        text = msg.text,
        max_retry = msg.max_retry || 3;
    info('Process SNS message: ' + JSON.stringify(msg));
    if (!providers.hasOwnProperty(providerName)) {
        return error('No such provider: ' + providerName);
    };
    provider = providers[providerName];
    //provider.requestAPI('');
}

queueSNS.pop(function(err, value) {
    if (err) {
        return error(err);
    }
    if (value === null) {
        info('No message in queue.');
        return;
    }
    sendToSNS(value);
});
