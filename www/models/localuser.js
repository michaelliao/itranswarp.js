'use strict';

// localuser.js

const dbtypes = require('../dbtypes');

module.exports = {
    name: 'LocalUser',
    table: 'localusers',
    fields: {
        user_id: {
            type: dbtypes.ID,
            unique: 'uni_user_id'
        },
        passwd: {
            type: dbtypes.STRING(100)
        }
    }
};
