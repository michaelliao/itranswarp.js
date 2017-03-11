'use strict';

/**
 * Init database.
 */
const crypto = require('crypto');
const readline = require('readline');
const config = require('../config');
const constants = require('../constants');

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
    'Enter MySQL root password to continue: '
]

function generatePassword(localId, email, passwd) {
    var hashedPasswd = crypto.createHash('sha1').update(email + ':' + passwd).digest('hex');
    return crypto.createHash('sha1').update(localId + ':' + hashedPasswd).digest('hex');
}

function skip() {
    console.log('skipped.');
    process.exit(1);
}

rl.question(prompt.join('\n'), function (answer) {
    if (answer === '') {
        skip();
    }
    rl.question('Enter admin email: ', function (email) {
        if (email.trim() === '') {
            skip();
        }
        rl.question('Enter admin password: ', function (passwd) {
            if (passwd === '') {
                skip();
            }
            rl.close();
            console.log('init database...');
            // set root for db operation:
            config.db.username = 'root';
            config.db.password = answer;
            config.db.maxConnections = 1;
            config.db.maxIdleTime = 1000;
            (async () => {
                var
                    db = require('../db'),
                    userId = db.nextId(),
                    localId = db.nextId(),
                    User = db.User,
                    LocalUser = db.LocalUser;
                await db.sync(true);
                // create admin user:
                await User.create({
                    id: userId,
                    role: constants.role.ADMIN,
                    email: email,
                    verified: true,
                    name: 'Admin',
                    image_url: '/static/img/admin.png'
                });
                await LocalUser.create({
                    id: localId,
                    user_id: userId,
                    passwd: generatePassword(localId, email, passwd)
                });
                console.log('ok.');
            })();
        });
    });
});
