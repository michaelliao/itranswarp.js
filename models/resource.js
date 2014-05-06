// resource.js

var base = require('./_base.js');

module.exports = function (warp) {
    return base.defineModel(warp, 'Resource', [
        base.column_id('ref_id'),
        base.column_blob('value')
    ], {
        table: 'resources'
    });
};
