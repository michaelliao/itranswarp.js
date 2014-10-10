// generate schema:

var
    _ = require('lodash'),
    fs = require('fs'),
    crypto = require('crypto'),
    readline = require('readline'),
    config = require('./config'),
    db = require('./db');

var keys = _.filter(_.map(db, function (value, key) {
    return key;
}), function (key) {
    return key !== 'warp' && key !== 'next_id';
});

function log(s) {
    console.log(s);
    console.log('\n');
}

function generateDDL(email, password) {
    log('-- create database...');
    log('create database ' + config.db.database + ';');
    log('-- generating ddl...');

    _.each(keys.sort(), function (key) {
        log('-- generate model: ' + key);
        log(db[key].ddl());
    });

    log('-- create administrator:\n-- Email: ' + email + '\n-- Password: ' + new Array(password.length + 1).join('*'));
    var
        id = db.next_id(),
        passwd = crypto.createHash('md5').update(email + ':' + password).digest('hex'),
        sql_init_admin_user = 'insert into users (id, role, name, email, passwd, verified, image_url, locked_util, created_at, updated_at, version) values (\'' + id + '\', 0, \'Admin\', \'' + email + '\', \'' + passwd + '\', 1, \'http://about:blank\', 0, 1394002009000, 1394002009000, 0);';
    log(sql_init_admin_user);
    log('grant select, insert, update, delete on ' + config.db.database + '.* to \'' + config.db.user + '\'@\'localhost\' identified by \'' + config.db.password + '\';');
    log('-- done.');
}

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

log('-- Create administrator account:');

rl.question('Email: ', function (email) {
    rl.question('Password (6-20 chars): ', function (password) {
        rl.close();
        if (password.length < 6 || password.length > 20) {
            console.log('Bad password.');
            return;
        }
        generateDDL(email.trim().toLowerCase(), password);
    });
});
