// attachment.js

var base = require('./_base.js');

exports = module.exports = function(warp) {
    return base.defineModel(warp, 'Attachment', [
        base.column_id('user_id'),
        base.column_id('resource_id'),
        base.column_bigint('size'),
        base.column_bigint('width'),
        base.column_bigint('height'),
        base.column_varchar_100('mime'),
        base.column_varchar_100('name'),
        base.column_varchar_100('meta', { defaultValue: '' }),
        base.column_varchar_1000('description'),
    ], {
        table: 'attachments'
    });
};
