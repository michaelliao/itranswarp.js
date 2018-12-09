'use strict';

/**
 * Init database.
 */
const
    crypto = require('crypto'),
    readline = require('readline'),
    config = require('../config'),
    exec = require('child_process').exec,
    constants = require('../constants'),
    DATABASE = config.db_database,
    DB_HOST = config.db_host,
    DB_USER = config.db_username,
    DB_PASS = config.db_password;

let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let info = {};

let prompt = [
    '\x1b[31m',
    '----------------------------------------------------------------------',
    '  WARNING:',
    `  MySQL host: ${DB_HOST}`,
    `  Database "${DATABASE}" will be dropped and re-created.`,
    '  ALL DATA IN THIS DATABASE WILL BE LOST!',
    '----------------------------------------------------------------------',
    '\x1b[0m',
    'Enter MySQL root password to continue: '
]

function skip() {
    console.log('cancelled.');
    process.exit(1);
}

function generatePassword(localId, email, passwd) {
    let hashedPasswd = crypto.createHash('sha1').update(email + ':' + passwd).digest('hex');
    return crypto.createHash('sha1').update(localId + ':' + hashedPasswd).digest('hex');
}

function initTables() {
    // set root for db operation:
    config.db_username = 'root';
    config.db_password = info.rootPassword;
    (async () => {
        let
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
            email: info.email,
            verified: true,
            name: 'Admin',
            image_url: '/static/img/admin.png'
        });
        await LocalUser.create({
            id: localId,
            user_id: userId,
            passwd: generatePassword(localId, info.email, info.adminPassword)
        });
        let ss = [
            '\x1b[32m',
            '----------------------------------------------------------------------',
            `  Database ${DATABASE} has been initialized successfully!`,
            '----------------------------------------------------------------------',
            '\x1b[0m'
        ];
        console.log(ss.join('\n'));
    })();
}

function grantDatabase() {
    let cmd = `mysql -h ${DB_HOST} -u root --password=${info.rootPassword} -e "GRANT SELECT, INSERT, UPDATE, DELETE ON ${DATABASE}.* TO '${DB_USER}'@'${DB_HOST}' IDENTIFIED BY '${DB_PASS}';"`;
    console.log('Exec: ' + cmd);
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error:\n${error}`);
            process.exit(1);
        } else {
            initTables();
        }
    });
}

function createDatabase() {
    let cmd = `mysql -h ${DB_HOST} -u root --password=${info.rootPassword} -e "CREATE DATABASE ${DATABASE};"`;
    console.log('Exec: ' + cmd);
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error:\n${error}`);
            process.exit(1);
        } else {
            grantDatabase();
        }
    });
}

function dropDatabase() {
    let cmd = `mysql -h ${DB_HOST} -u root --password=${info.rootPassword} -e "DROP DATABASE IF EXISTS ${DATABASE};"`;
    console.log('Exec: ' + cmd);
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error:\n${error}`);
            process.exit(1);
        } else {
            createDatabase();
        }
    });
}

rl.question(prompt.join('\n'), function (rootPassword) {
    if (rootPassword === '') {
        skip();
    }
    info.rootPassword = rootPassword;
    rl.question('Enter admin email: ', function (email) {
        if (email.trim() === '') {
            skip();
        }
        info.email = email;
        rl.question('Enter admin password: ', function (adminPassword) {
            if (adminPassword === '') {
                skip();
            }
            info.adminPassword = adminPassword;
            rl.close();
            console.log('init database...');
            dropDatabase();
        });
    });
});
