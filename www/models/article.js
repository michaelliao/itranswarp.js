// article.js

const dbtypes = require('../dbtypes');

module.exports = {
    name: 'Article',
    table: 'articles',
    fields: {
        user_id: {
            type: dbtypes.ID,
            index: true
        },
        category_id: {
            type: dbtypes.ID,
            index: true
        },
        cover_id: {
            type: dbtypes.ID,
            defaultValue: ''
        },
        content_id: {
            type: dbtypes.ID
        },
        views: {
            type: dbtypes.BIGINT
        },
        user_name: {
            type: dbtypes.STRING(100)
        },
        name: {
            type: dbtypes.STRING(100)
        },
        tags: {
            type: dbtypes.STRING(100)
        },
        description: {
            type: dbtypes.STRING(1000)
        },
        publish_at: {
            type: dbtypes.BIGINT,
            defaultValue: Date.now,
            index: true
        }
    }
};
