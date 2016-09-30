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
        ref_type: dbtypes.STRING(50),
        ref_id: {
            type: dbtypes.ID,
            index: true
        },
        user_id: {
            type: dbtypes.ID,
            index: true
        },
        replies: dbtypes.BIGINT,
        upvotes: dbtypes.BIGINT,
        downvotes: dbtypes.BIGINT,
        score: dbtypes.BIGINT,
        locked: dbtypes.BOOLEAN,
        name: dbtypes.STRING(100),
        tags: dbtypes.STRING(1000),
        content: dbtypes.TEXT
    }
};
