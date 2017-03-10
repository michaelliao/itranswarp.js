// setting.js

const dbtypes = require('../dbtypes');

module.exports = {
    name: 'Setting',
    table: 'settings',
    fields: {
        group: {
            type: dbtypes.STRING(100)
        },
        key: {
            type: dbtypes.STRING(100),
            unique: 'uni_key'
        },
        value: {
            type: dbtypes.TEXT,
            defaultValue: () => {
                return '';
            }
        }
    }
};
