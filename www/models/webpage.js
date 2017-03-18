'use strict';

// webpage.js

const dbtypes = require('../dbtypes');

module.exports = {
    name: 'Webpage',
    table: 'pages',
    fields: {
        alias: {
            type: dbtypes.STRING(100),
            unique: 'uni_alias'
        },
        content_id: {
            type: dbtypes.ID
        },
        draft: {
            type: dbtypes.BOOLEAN,
            defaultValue: () => false
        },
        name: {
            type: dbtypes.STRING(100)
        },
        tags: {
            type: dbtypes.STRING(1000)
        }
    }
};
