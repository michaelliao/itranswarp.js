'use strict';

// adperiod.js

const dbtypes = require('../dbtypes');

module.exports = {
    name: 'AdPeriod',
    table: 'adperiods',
    fields: {
        user_id: {
            type: dbtypes.ID,
            index: true
        },
        adslot_id: {
            type: dbtypes.ID,
            index: true
        },
        display_order: {
            type: dbtypes.BIGINT
        },
        start_at: {
            type: dbtypes.STRING(10), // ISO date format: YYYY-MM-DD
            index: true
        },
        end_at: {
            type: dbtypes.STRING(10), // ISO date format: YYYY-MM-DD
            index: true
        }
    },
    extraFields: ['user']
};
