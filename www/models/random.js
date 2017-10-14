'use strict';

// random.js

const dbtypes = require('../dbtypes');

// expires time = 15 min
const EXP_TIME = 15 * 60 * 1000;

module.exports = {
    name: 'Random',
    table: 'randoms',
    fields: {
        name: {
            type: dbtypes.STRING(50)
        },
        value: {
            type: dbtypes.STRING(50),
            unique: 'uni_rnd_value'
        },
        expired_at: {
            type: dbtypes.BIGINT,
            defaultValue: () => {
                return Date.now + EXP_TIME
            }
        }
    }
};
