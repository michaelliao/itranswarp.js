// generate schema:

var
    async = require('async'),
    _ = require('lodash');

var db = require('./db');

var keys = _.map(db, function(value, key) {
    return key;
});

console.log('\n-- generating sqls...\n');

var arr = [];

_.each(keys.sort(), function(key) {
    if (key=='sequelize' || key=='next_id')
        return;
    arr.push(function(callback) {
        console.log('\n-- generate model: ' + key + '\n');
        db[key].sync({ logging: console.log }).complete(function() {
            callback(null, key);
        });
    });
});

var sql_init_user = 'insert into t_user (id, role, name, email, passwd, verified, binds, image_url, locked_util, created_at, updated_at, version) values (\'00139454282989205c050f069414434a3588177998dcf73000\', 0, \'Admin\', \'admin@itranswarp.com\', \'e8f98b1676572cd24c753c331aa6b02e\', 1, \'\', \'http://about:blank\', 0, 1394542829892, 1394542829892, 0)';

async.series(arr, function(err, results) {
    console.log('\n-- init test user...\n');
    console.log('\n' + sql_init_user + ';');
    console.log('\n--Done.\n');
});
