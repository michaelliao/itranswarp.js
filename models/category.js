// category.js

var base = require('./_base.js');

exports = module.exports = function(warp) {
    return base.defineModel(warp, 'Comment', [
        base.column_varchar_100('name'),
        base.column_varchar_1000('description'),
        base.column_bigint('display_order')
    ], {
        table: 'categories'
    });
};
