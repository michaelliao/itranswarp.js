'use strict';

// attachment.js

const dbtypes = require('../dbtypes');

module.exports = {
    name: 'Attachment',
    table: 'attachments',
    fields: {
        user_id: {
            type: dbtypes.ID
        },
        resource_id: {
            type: dbtypes.ID
        },
        size: {
            type: dbtypes.BIGINT
        },
        width: {
            type: dbtypes.BIGINT
        },
        height: {
            type: dbtypes.BIGINT
        },
        mime: {
            type: dbtypes.STRING(100)
        },
        name: {
            type: dbtypes.STRING(100)
        },
        meta: {
            type: dbtypes.STRING(100),
            defaultValue: () => ''
        },
        description: {
            type: dbtypes.STRING(1000)
        }
    }
};
