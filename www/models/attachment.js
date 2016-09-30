// attachment.js

const dbtypes = require('../dbtypes');

module.exports = {
    name: 'Attachment',
    table: 'attachments',
    fields:{
        user_id: dbtypes.ID,
        resource_id: dbtypes.ID,
        size: dbtypes.BIGINT,
        width: dbtypes.BIGINT,
        height: dbtypes.BIGINT,
        mime: dbtypes.STRING(100),
        name: dbtypes.STRING(100),
        meta: {
            type: dbtypes.STRING(100),
            defaultValue: ''
        },
        description: dbtypes.STRING(1000)
    }
};
