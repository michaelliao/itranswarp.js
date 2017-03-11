'use strict';

// authuser.js

const dbtypes = require('../dbtypes');

module.exports = {
    name: 'AuthUser',
    table: 'authusers',
    fields: {
        user_id: {
            type: dbtypes.ID
        },
        auth_provider: {
            type: dbtypes.STRING(50)
        },
        auth_id: {
            type: dbtypes.STRING(100),
            unique: 'uni_auth_id'
        },
        auth_token: {
            type: dbtypes.STRING(500)
        },
        expires_at: {
            type: dbtypes.BIGINT
        }
    }
};
