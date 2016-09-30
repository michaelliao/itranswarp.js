// resource.js

const dbtypes = require('../dbtypes');

module.exports = {
    name: 'Resource',
    table: 'resources',
    fields: {
        ref_id: dbtypes.ID,
        value: dbtypes.BLOB
    }
};
