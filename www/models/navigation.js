'use strict';

// navigation.js

var base = require('./_base.js');

module.exports = function (warp) {
    return base.defineModel(warp, 'Navigation', [
        base.column_varchar_100('name'),
        base.column_varchar_1000('url'),
        base.column_bigint('display_order')
    ], {
        table: 'navigations'
    });
};
