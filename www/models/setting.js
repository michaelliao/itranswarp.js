// setting.js

const dbtypes = require('../dbtypes');

module.exports = {
    name: 'Setting',
    table: 'settings',
    fields: {
        group: dbtypes.STRING(100),
        key: {
            type: dbtypes.STRING(100),
            unique: true
        },
        value: {
            type: dbtypes.TEXT,
            defaultValue: ''
        }
    }
};
