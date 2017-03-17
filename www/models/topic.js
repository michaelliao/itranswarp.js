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
            type: dbtypes.BIGINT,
            defaultValue: () => 0
        },
        upvotes: {
            type: dbtypes.BIGINT,
            defaultValue: () => 0
        },
        downvotes: {
            type: dbtypes.BIGINT,
            defaultValue: () => 0
        },
        score: {
            type: dbtypes.BIGINT,
            defaultValue: () => 0
        },
        locked: {
            type: dbtypes.BOOLEAN,
            defaultValue: () => false
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
