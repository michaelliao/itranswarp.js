// user.js

const dbtypes = require('../dbtypes');

const constants = require('../constants');

module.exports = {
    name: 'User',
    table: 'users',
    fields: {
        role: {
            type: dbtypes.BIGINT,
            defaultValue: constants.role.SUBSCRIBER
        },
        locked_until: dbtypes.BIGINT,
        email: {
            type: dbtypes.STRING(100),
            unique: true
        },
        verified: {
            type: dbtypes.BOOLEAN,
            defaultValue: false
        },
        name: dbtypes.STRING(100),
        image_url: dbtypes.STRING(1000)
    }
};
