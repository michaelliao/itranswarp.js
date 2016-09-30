// wiki.js

const dbtypes = require('../dbtypes');

module.exports = {
    name: 'Wiki',
    table: 'wikis',
    fields: {
        cover_id: dbtypes.ID,
        content_id: dbtypes.ID,
        views: dbtypes.BIGINT,
        name: dbtypes.STRING(100),
        tag: dbtypes.STRING(100),
        description: dbtypes.STRING(1000),
    }
};
