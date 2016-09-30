// text.js

const dbtypes = require('../dbtypes');

module.exports = {
    name: 'Text',
    table: 'texts',
    fields: {
        ref_id: dbtypes.ID,
        value: dbtypes.TEXT
    }
};
