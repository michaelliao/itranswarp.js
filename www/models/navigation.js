'use strict';

// navigation.js

const dbtypes = require('../dbtypes');

module.exports = {
    name: 'Navigation',
    table: 'navigations',
    fields: {
        display_order: {
            type: dbtypes.BIGINT
        },
        name: {
            type: dbtypes.STRING(100)
        },
        url: {
            type: dbtypes.STRING(1000)
        }
    }
};
