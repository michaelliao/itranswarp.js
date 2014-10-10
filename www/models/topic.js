// topic.js

var base = require('./_base.js');

module.exports = function (warp) {
    return base.defineModel(warp, 'Topic', [
        base.column_id('board_id', { index: true }),
        base.column_id('user_id', { index: true }),
        base.column_bigint('replies'),
        base.column_varchar_100('name'),
        base.column_varchar_1000('tags'),
        base.column_bigint('upvotes'),
        base.column_bigint('downvotes'),
        base.column_bigint('score'),
        base.column_boolean('locked'),
        base.column_text('content', { type: 'text' })
    ], {
        table: 'topics'
    });
};
