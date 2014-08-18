// reply.js

var base = require('./_base.js');

module.exports = function (warp) {
    return base.defineModel(warp, 'Reply', [
        base.column_id('board_id', { index: true }),
        base.column_id('topic_id', { index: true }),
        base.column_id('user_id', { index: true }),
        base.column_boolean('deleted'),
        base.column_bigint('upvotes'),
        base.column_bigint('downvotes'),
        base.column_bigint('score'),
        base.column_text('content', { type: 'text' })
    ], {
        table: 'replies'
    });
};
