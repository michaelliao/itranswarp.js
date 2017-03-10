// category.js

const dbtypes = require('../dbtypes');

module.exports = {
    name: 'Category',
    table: 'categories',
    fields: {
        name: {
            type: dbtypes.STRING(100)
        },
        tag: {
            type: dbtypes.STRING(100)
        },
        display_order: {
            type: dbtypes.BIGINT
        },
        description: {
            type: dbtypes.STRING(1000)
        }
    }
};
