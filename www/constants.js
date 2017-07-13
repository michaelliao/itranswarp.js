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
        SPONSOR:     1000,
        SUBSCRIBER:  10000,
        GUEST:       100000000
    },

    signin: {
        LOCAL: 'local'
    },

    // cache keys:
    cache: {
        NAVIGATIONS: '__navigations__',
        CATEGORIES: '__categories__',
        BOARDS: '__boards__',
        ARTICLE_FEED: '__articlefeed__',
        WEBSITE: '__website__',
        SNIPPETS: '__snippet__'
    },

    // queue name:
    queue: {
        MAIL: 'queueMail',
        SNS: 'queueSNS'
    }
};
