// setting.js

var base = require('./_base');

exports = module.exports = function(warp) {
    return base.defineModel(warp, 'Setting', [
        base.column_varchar_100('group'),
        base.column_varchar_100('key', { unique: true }),
        base.column_text('value', { type: 'text', defaultValue: '' })
    ], {
        table: 'settings'
    });
};
