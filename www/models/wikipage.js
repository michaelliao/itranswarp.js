'use strict';

// wikipage.js

var base = require('./_base.js');

module.exports = function (warp) {
    return base.defineModel(warp, 'WikiPage', [
        base.column_id('wiki_id'),
        base.column_id('parent_id'),
        base.column_id('content_id'),
        base.column_bigint('views'),
        base.column_varchar_100('name'),
        base.column_bigint('display_order')
    ], {
        table: 'wikipages'
    });
};
