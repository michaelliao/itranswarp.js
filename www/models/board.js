// board.js

const dbtypes = require('../dbtypes');

module.exports = {
    name: 'Board',
    table: 'boards',
    fields: {
        topics: dbtypes.BIGINT,
        locked: dbtypes.BOOLEAN,
        display_order: dbtypes.BIGINT,
        tag: dbtypes.STRING(100),
        name: dbtypes.STRING(100),
        description: dbtypes.STRING(1000)
    }
};
