// article.js

var base = require('./_base.js');

exports = module.exports = function(warp) {
    return base.defineModel(warp, 'Article', [
        base.column_id('user_id', { index: true }),
        base.column_id('category_id', { index: true }),
        base.column_id('cover_id', { defaultValue: '' }),
        base.column_id('content_id'),
        base.column_varchar_100('user_name'),
        base.column_varchar_100('name'),
        base.column_varchar_1000('tags'),
        base.column_varchar_1000('description'),
        base.column_bigint('publish_time', { index: true, defaultValue: Date.now })
    ], {
        table: 'articles'
    });
};
