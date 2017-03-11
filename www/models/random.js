'use strict';

// random.js

const dbtypes = require('../dbtypes');

// expires time = 15 min
const EXP_TIME = 15 * 60 * 1000;

module.exports = {
    name: 'Random',
    table: 'randoms',
    fields: {
        value: {
            type: dbtypes.STRING(100),
            unique: 'uni_rnd_value'
        },
        expires_time: {
            type: dbtypes.BIGINT,
            defaultValue: () => {
                return Date.now + EXP_TIME
            }
        }
    }
};
