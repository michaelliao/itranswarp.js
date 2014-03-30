// generate schema:

var
    _ = require('lodash'),
    db = require('./db');

var keys = _.filter(_.map(db, function(value, key) {
    return key;
}), function(key) {
    return key!='warp' && key!='next_id';
});

function log(s) {
    console.log(s);
    console.log('\n');
}

log('-- generating ddl...');

_.each(keys.sort(), function(key) {
    log('-- generate model: ' + key);
    log(db[key].ddl());
});

log('-- init admin user...');
var sql_init_admin_user = 'insert into users (id, role, name, email, passwd, verified, image_url, locked_util, created_at, updated_at, version) values (\'00139454282989205c050f069414434a3588177998dcf73000\', 0, \'Admin\', \'admin@itranswarp.com\', \'e8f98b1676572cd24c753c331aa6b02e\', 1, \'http://about:blank\', 0, 1394002009000, 1394002009000, 0);';
log(sql_init_admin_user);
log('-- done.');
