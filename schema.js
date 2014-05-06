// generate schema:

var
    _ = require('lodash'),
    crypto = require('crypto'),
    readline = require('readline'),
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
    log('-- generating ddl...');

    _.each(keys.sort(), function (key) {
        log('-- generate model: ' + key);
        log(db[key].ddl());
    });

    log('-- create administrator:\n-- Email: ' + email + '\n-- Password: ' + new Array(password.length).join('*'));
    var
        id = db.next_id(),
        passwd = crypto.createHash('md5').update(email + ':' + password).digest('hex'),
        sql_init_admin_user = 'insert into users (id, role, name, email, passwd, verified, image_url, locked_util, created_at, updated_at, version) values (\'' + id + '\', 0, \'Admin\', \'' + email + '\', \'' + passwd + '\', 1, \'http://about:blank\', 0, 1394002009000, 1394002009000, 0);';
    log(sql_init_admin_user);
    log('-- done.');
}

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

log('Create administrator account:');

rl.question('Email: ', function (email) {
    rl.question('Password: ', function (password) {
        rl.close();
        generateDDL(email.trim().toLowerCase(), password);
    });
});
