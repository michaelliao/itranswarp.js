// user.js

const
    dbtypes = require('../dbtypes'),
    constants = require('../constants'),
    SUBSCRIBER = constants.role.SUBSCRIBER;

module.exports = {
    name: 'User',
    table: 'users',
    fields: {
        role: {
            type: dbtypes.BIGINT,
            defaultValue: () => {
                return SUBSCRIBER;
            }
        },
        locked_until: {
            type: dbtypes.BIGINT,
            defaultValue: 0
        },
        email: {
            type: dbtypes.STRING(100),
            unique: 'uni_email'
        },
        verified: {
            type: dbtypes.BOOLEAN,
            defaultValue: false
        },
        name: {
            type: dbtypes.STRING(100)
        },
        image_url: {
            type: dbtypes.STRING(1000)
        }
    }
};
