'use strict';

// category.js

var base = require('./_base.js');

module.exports = function (warp) {
    return base.defineModel(warp, 'Category', [
        base.column_varchar_100('name'),
        base.column_varchar_100('tag'),
        base.column_varchar_1000('description'),
        base.column_bigint('display_order')
    ], {
        table: 'categories'
    });
};
