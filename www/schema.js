'use strict';

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
    return s + '\n';
}

function generateDDL(email, password) {
    var output = '', id, lid, passwd, sql_init_admin_user;
    output = output + log('-- create database...');
    output = output + log('create database ' + config.db.database + ';');
    output = output + log('use ' + config.db.database + ';');
    output = output + log('-- generating ddl...');

    _.each(keys.sort(), function (key) {
        output = output + log('-- generate model: ' + key);
        output = output + log(db[key].ddl());
    });

    output = output + log('-- create administrator:\n-- Email: ' + email + '\n-- Password: ' + new Array(password.length + 1).join('*'));

    id = db.next_id();
    lid = db.next_id();
    passwd = crypto.createHash('sha1').update(lid + ':' + crypto.createHash('sha1').update(email + ':' + password).digest('hex')).digest('hex');

    sql_init_admin_user = 'insert into users (id, role, name, email, verified, image_url, locked_until, created_at, updated_at, version) values (\'' + id + '\', 0, \'Admin\', \'' + email + '\', 1, \'/static/img/user.png\', 0, 1394002009000, 1394002009000, 0);\n\n' +
                          'insert into localusers (id, user_id, passwd, created_at, updated_at, version) values (\'' + lid + '\', \'' + id + '\', \'' + passwd + '\', 1394002009000, 1394002009000, 0);';

    output = output + log(sql_init_admin_user);
    output = output + log('grant select, insert, update, delete on ' + config.db.database + '.* to \'' + config.db.user + '\'@\'localhost\' identified by \'' + config.db.password + '\';');
    output = output + log('-- done.');
    fs.writeFileSync('./schema.sql', output);
}

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('-- Create administrator account:\n');

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
