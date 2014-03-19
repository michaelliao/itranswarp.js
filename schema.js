// generate schema:

var
    async = require('async'),
    _ = require('lodash'),
    db = require('./db');

var keys = _.filter(_.map(db, function(value, key) {
    return key;
}), function(key) {
    return key!='sequelize' && key!='next_id';
});

var prefix = 'Executing (default): ';

var log = function(s) {
    if (s.indexOf(prefix)==0) {
        s = s.substring(prefix.length);
        s = s.replace(/BLOB/g, 'MEDIUMBLOB');
        s = s.replace(/TEXT/g, 'MEDIUMTEXT');
    }
    console.log(s);
};

log('\n-- generating sqls...\n');

var arr = [];

_.each(keys.sort(), function(key) {
    arr.push(function(callback) {
        console.log('\n-- generate model: ' + key + '\n');
        db[key].sync({ logging: log }).complete(function() {
            callback(null, key);
        });
    });
});

var sql_init_admin_user = 'insert into t_user (id, role, name, email, passwd, verified, binds, image_url, locked_util, created_at, updated_at, version) values (\'00139454282989205c050f069414434a3588177998dcf73000\', 0, \'Admin\', \'admin@itranswarp.com\', \'e8f98b1676572cd24c753c331aa6b02e\', 1, \'\', \'http://about:blank\', 0, 1394542829892, 1394542829892, 0)';

function createIndex() {
    log('\n-- prepare for creating index...');
    _.each(keys.sort(), function(entity) {
        var attrs = db[entity].rawAttributes;
        var array = [];
        _.each(attrs, function(v, k) {
            if (v.index) {
                array.push('CREATE INDEX idx_' + k + ' USING BTREE ON `t_' + entity + '` (`' + k + '`);');
            }
        });
        if (array.length > 0) {
            log('\n-- create index for model: ' + entity + '\n');
            log(array.join('\n\n'));
        }
    });
};

async.series(arr, function(err, results) {
    createIndex();
    log('\n-- init admin user...\n');
    log(sql_init_admin_user + ';');
    log('\n--Done.\n');
});
