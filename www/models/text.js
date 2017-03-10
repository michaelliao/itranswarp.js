// text.js

const dbtypes = require('../dbtypes');

module.exports = {
    name: 'Text',
    table: 'texts',
    fields: {
        ref_id: {
            type: dbtypes.ID
        },
        value: {
            type: dbtypes.TEXT
        }
    }
};
