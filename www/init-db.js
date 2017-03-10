/**
 * Init database.
 */
const readline = require('readline');
const config = require('./config');

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

var prompt = [
    'WARNING:',
    '  MySQL host: ' + config.db.host,
    '  Database "' + config.db.database + '" will be dropped and re-created!',
    '  All data will be lost!',
    '',
    'Enter root password to continue: '
]

rl.question(prompt.join('\n'), function (answer) {
    rl.close();
    if (answer !== '') {
        console.log('init database...');
        // set root for db operation:
        config.db.username = 'root';
        config.db.password = answer;
        config.db.maxConnections = 1;
        config.db.maxIdleTime = 1000;
        require('./db').sync();
    } else {
        console.log('skipped.')
    }
});
