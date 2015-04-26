'use strict';

// reply.js

var base = require('./_base.js');

module.exports = function (warp) {
    return base.defineModel(warp, 'Reply', [
        base.column_id('topic_id', { index: true }),
        base.column_id('user_id', { index: true }),
        base.column_boolean('deleted', { defaultValue: false }),
        base.column_bigint('upvotes', { defaultValue: 0}),
        base.column_bigint('downvotes', { defaultValue: 0}),
        base.column_bigint('score', { defaultValue: 0}),
        base.column_text('content', { type: 'text' })
    ], {
        table: 'replies'
    });
};
