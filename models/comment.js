// comment.js

var base = require('./_base.js');

exports = module.exports = function(warp) {
    return base.defineModel(warp, 'Comment', [
        base.column_varchar_50('ref_type'),
        base.column_id('ref_id'),
        base.column_id('user_id'),
        base.column_varchar_100('user_name'),
        base.column_varchar_1000('user_image_url'),
        base.column_varchar_1000('content')
    ], {
        table: 'comments'
    });
};
