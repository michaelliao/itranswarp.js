'use strict';

// AD slot.js

const dbtypes = require('../dbtypes');

module.exports = {
    name: 'AdSlot',
    table: 'adslots',
    fields: {
        name: {
            type: dbtypes.STRING(100)
        },
        type: {
            type: dbtypes.STRING(100)
        },
        price: {
            type: dbtypes.BIGINT
        },
        width: {
            type: dbtypes.BIGINT
        },
        height: {
            type: dbtypes.BIGINT
        },
        num: {
            type: dbtypes.BIGINT
        },
        auto_fill: {
            type: dbtypes.TEXT // auto fill with html if available
        }
    },
    extraFields: ['html']
};
