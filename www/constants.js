'use strict';

// define constants:

module.exports = {
    // user role:
    role: {
        ADMIN:       0,
        EDITOR:      10,
        CONTRIBUTOR: 100,
        SUBSCRIBER:  10000,
        GUEST:       100000000
    },

    signin: {
        LOCAL: 'local'
    },

    // cache keys:
    cache: {
        NAVIGATIONS: '__navigations__',
        WEBSITE: '__website__',
        SETTINGS: '__settings__'
    },

    // queue name:
    QUEUE_SNS: 'queueSNS',

    // END:
    END: 'ended.'
};
