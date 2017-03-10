// resource.js

const dbtypes = require('../dbtypes');

module.exports = {
    name: 'Resource',
    table: 'resources',
    fields: {
        ref_id: {
            type: dbtypes.ID
        },
        value: {
            type: dbtypes.BLOB
        }
    }
};
