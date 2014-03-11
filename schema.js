// generate schema:

var
    async = require('async'),
    _ = require('underscore');

var db = require('./db');

var keys = _.map(db, function(value, key) {
    return key;
});

console.log('\n-- generating sqls...\n');

var arr = [];

_.each(keys.sort(), function(key, list) {
    if (key=='sequelize' || key=='next_id')
        return;
    arr.push(function(callback) {
        console.log('\n-- generate model: ' + key + '\n');
        db[key].sync({ logging: console.log }).complete(function() {
            callback(null, key);
        });
    });
});

async.series(arr, function(err, results) {
    console.log('\n--Done.');
});
