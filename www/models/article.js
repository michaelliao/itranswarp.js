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
        content_id: dbtypes.ID,
        views: dbtypes.BIGINT,
        user_name: dbtypes.STRING(100),
        name: dbtypes.STRING(100),
        tags: dbtypes.STRING(100),
        description: dbtypes.STRING(1000),
        publish_at: {
            type: dbtypes.BIGINT,
            index: true,
            defaultValue: Date.now
        }
    }
};
