'use strict';

// topic.js

const dbtypes = require('../dbtypes');

module.exports = {
    name: 'Topic',
    table: 'topics',
    fields: {
        board_id: {
            type: dbtypes.ID,
            index: true
        },
        ref_type: {
            type: dbtypes.STRING(50)
        },
        ref_id: {
            type: dbtypes.ID,
            index: true
        },
        user_id: {
            type: dbtypes.ID,
            index: true
        },
        replies: {
            type: dbtypes.BIGINT
        },
        upvotes: {
            type: dbtypes.BIGINT
        },
        downvotes: {
            type: dbtypes.BIGINT
        },
        score: {
            type: dbtypes.BIGINT
        },
        locked: {
            type: dbtypes.BOOLEAN
        },
        name: {
            type: dbtypes.STRING(100)
        },
        tags: {
            type: dbtypes.STRING(1000)
        },
        content: {
            type: dbtypes.TEXT
        }
    }
};
