'use strict';

// wiki.js

const dbtypes = require('../dbtypes');

module.exports = {
    name: 'Wiki',
    table: 'wikis',
    fields: {
        cover_id: {
            type: dbtypes.ID
        },
        content_id: {
            type: dbtypes.ID
        },
        views: {
            type: dbtypes.BIGINT,
            defaultValue: 0
        },
        name: {
            type: dbtypes.STRING(100)
        },
        tag: {
            type: dbtypes.STRING(100)
        },
        description: {
            type: dbtypes.STRING(1000)
        }
    }
};
