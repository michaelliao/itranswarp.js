// category.js

const dbtypes = require('../dbtypes');

var base = require('./_base.js');

module.exports = {
    name: 'Category',
    table: 'categories',
    fields: {
        name: dbtypes.STRING(100),
        tag: dbtypes.STRING(100),
        display_order: dbtypes.BIGINT,
        description: dbtypes.STRING(1000)
    }
};
