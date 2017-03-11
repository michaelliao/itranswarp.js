'use strict';

// comment.js

const dbtypes = require('../dbtypes');

module.exports = {
    name: 'Comment',
    table: 'comments',
    fields: {
        ref_type: {
            type: dbtypes.STRING(50)
        },
        ref_id: {
            type: dbtypes.ID
        },
        user_id: {
            type: dbtypes.ID
        },
        user_name: {
            type: dbtypes.STRING(100)
        },
        user_image_url: {
            type: dbtypes.STRING(100)
        },
        content: {
            type: dbtypes.STRING(1000)
        }
    }
};
