// authuser.js

const dbtypes = require('../dbtypes');

module.exports = {
    name: 'AuthUser',
    table: 'authusers',
    fields: {
        user_id: dbtypes.ID,
        auth_provider: dbtypes.STRING(50),
        auth_id: {
            type: dbtypes.STRING(100),
            unique: true
        },
        auth_token: dbtypes.STRING(500),
        expires_at: dbtypes.BIGINT
    }
};
