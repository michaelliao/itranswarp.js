// generate schema:

var
    async = require('async'),
    _ = require('underscore');

var db = require('./db');

var keys = _.map(db, function(value, key) {
    return key;
});

var arr = [];

_.each(keys.sort(), function(key, list) {
    if (key=='sequelize')
        return;
    arr.push(function(callback) {
        console.log('\n>>> generate model: ' + key + '\n');
        db[key].sync({ logging: console.log }).complete(function() {
            callback(null, key);
        });
    });
});

async.series(arr, function(err, results) {
    console.log('\nDone.');
});
