// board.js

var base = require('./_base.js');

module.exports = function (warp) {
    return base.defineModel(warp, 'Board', [
        base.column_bigint('topics'),
        base.column_varchar_100('name'),
        base.column_varchar_1000('description')
    ], {
        table: 'topics'
    });
};