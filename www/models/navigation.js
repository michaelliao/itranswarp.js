// navigation.js

const dbtypes = require('../dbtypes');

module.exports = {
    name: 'Navigation',
    table: 'navigations',
    fields: {
        display_order: dbtypes.BIGINT,
        name: dbtypes.STRING(100),
        url: dbtypes.STRING(1000)
    }
};
