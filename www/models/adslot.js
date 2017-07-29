'use strict';

// AD slot.js

const dbtypes = require('../dbtypes');

module.exports = {
    name: 'AdSlot',
    table: 'adslots',
    fields: {
        name: {
            type: dbtypes.STRING(100),
            unique: 'uni_adslot_name'
        },
        description: {
            type: dbtypes.STRING(1000)
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
        num_slots: {
            type: dbtypes.BIGINT
        },
        num_auto_fill: {
            type: dbtypes.BIGINT
        },
        auto_fill: {
            type: dbtypes.TEXT, // auto fill with html if available
            defaultValue: () => ''
        }
    },
    extraFields: ['html']
};
