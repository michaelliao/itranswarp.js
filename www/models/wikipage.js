// wikipage.js

const dbtypes = require('../dbtypes');

module.exports = {
    name: 'WikiPage',
    table: 'wikipages',
    fields: {
        wiki_id: dbtypes.ID,
        parent_id: dbtypes.ID,
        content_id: dbtypes.ID,
        views: dbtypes.BIGINT,
        display_order: dbtypes.BIGINT,
        name: dbtypes.STRING(100)
    }
};
