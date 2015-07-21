'use strict';

// localuser.js

var base = require('./_base.js');

module.exports = function (warp) {
    return base.defineModel(warp, 'LocalUser', [
        base.column_id('user_id', { unique: true }),
        base.column_varchar_100('passwd')
    ], {
        table: 'localusers'
    });
};
