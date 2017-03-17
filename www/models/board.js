'use strict';

// board.js

const dbtypes = require('../dbtypes');

module.exports = {
    name: 'Board',
    table: 'boards',
    fields: {
        topics: {
            type: dbtypes.BIGINT,
            defaultValue: () => 0
        },
        locked: {
            type: dbtypes.BOOLEAN,
            defaultValue: () => false
        },
        display_order: {
            type: dbtypes.BIGINT
        },
        tag: {
            type: dbtypes.STRING(100)
        },
        name: {
            type: dbtypes.STRING(100)
        },
        description: {
            type: dbtypes.STRING(1000)
        }
    }
};
