// webpage.js

var base = require('./_base.js');

module.exports = function (warp) {
    return base.defineModel(warp, 'Webpage', [
        base.column_varchar_100('alias', { unique: true, validate: { isLowercase: true }}),
        base.column_id('content_id'),
        base.column_boolean('draft'),
        base.column_varchar_100('name'),
        base.column_varchar_1000('tags')
    ], {
        table: 'pages'
    });
};
