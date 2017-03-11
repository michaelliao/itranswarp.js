'use strict';

/**
 * Constants definition.
 * 
 * author: Michael Liao
 */

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
        SNIPPETS: '__snippet__',
        SETTINGS: '__settings__'
    },

    // queue name:
    queue: {
        MAIL: 'queueMail',
        SNS: 'queueSNS'
    }
};
