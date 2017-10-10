'use strict';

// adperiod.js

const dbtypes = require('../dbtypes');

module.exports = {
    name: 'AdMaterial',
    table: 'admaterials',
    fields: {
        user_id: {
            type: dbtypes.ID,
            index: true
        },
        adperiod_id: {
            type: dbtypes.ID,
            index: true
        },
        cover_id: {
            type: dbtypes.ID
        },
        weight: {
            type: dbtypes.BIGINT,
            default: () => 100
        },
        start_at: {
            type: dbtypes.STRING(10), // ISO date format: YYYY-MM-DD
            default: () => ''
        },
        end_at: {
            type: dbtypes.STRING(10), // ISO date format: YYYY-MM-DD
            default: () => ''
        },
        geo: {
            type: dbtypes.STRING(100),
            default: () => ''
        },
        keywords: {
            type: dbtypes.STRING(100),
            default: () => ''
        },
        url: {
            type: dbtypes.STRING(1000)
        }
    },
    extraFields: ['html']
};
