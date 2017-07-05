'use strict';

// wikipage.js

const dbtypes = require('../dbtypes');

module.exports = {
    name: 'WikiPage',
    table: 'wikipages',
    fields: {
        wiki_id: {
            type: dbtypes.ID
        },
        parent_id: {
            type: dbtypes.ID
        },
        content_id: {
            type: dbtypes.ID
        },
        views: {
            type: dbtypes.BIGINT,
            defaultValue: () => 0
        },
        display_order: {
            type: dbtypes.BIGINT
        },
        name: {
            type: dbtypes.STRING(100)
        }
    },
    extraFields: ['content', 'children']
};
