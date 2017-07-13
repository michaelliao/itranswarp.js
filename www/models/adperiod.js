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
        name: {
            type: dbtypes.STRING(100)
        },
        type: {
            type: dbtypes.STRING(100)
        },
        start_at: {
            type: dbtypes.STRING(10), // ISO date format: YYYY-MM-DD
            index: true
        },
        end_at: {
            type: dbtypes.STRING(10), // ISO date format: YYYY-MM-DD
            index: true
        },
        cover_id: {
            type: dbtypes.ID
        },
        url: {
            type: dbtypes.STRING(1000)
        }
    },
    extraFields: ['html']
};
