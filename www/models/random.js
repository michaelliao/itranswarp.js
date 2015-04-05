'use strict';

// random.js

var base = require('./_base.js');

module.exports = function (warp) {
    return base.defineModel(warp, 'Random', [
        base.column_varchar_100('value', { unique: true, validate: { isLowercase: true }}),
        base.column_bigint('expires_time', { defaultValue: function () { return Date.now() + 1800000; }}) // 30 min
    ], {
        table: 'randoms'
    });
};
