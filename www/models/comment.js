// comment.js

const dbtypes = require('../dbtypes');

module.exports = {
    name: 'Comment',
    table: 'comments',
    fields: {
        ref_type: dbtypes.STRING(50),
        ref_id: dbtypes.ID,
        user_id: dbtypes.ID,
        user_name: dbtypes.STRING(100),
        user_image_url: dbtypes.STRING(100),
        content: dbtypes.STRING(1000),
    }
};
