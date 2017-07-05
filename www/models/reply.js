'use strict';

// reply.js

const dbtypes = require('../dbtypes');

module.exports = {
    name: 'Reply',
    table: 'replies',
    fields: {
        topic_id: {
            type: dbtypes.ID,
            index: true
        },
        user_id: {
            type: dbtypes.ID,
            index: true
        },
        deleted: {
            type: dbtypes.BOOLEAN,
            defaultValue: () => false
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
        content: {
            type: dbtypes.TEXT
        }
    },
    extraFields: ['user']
};
