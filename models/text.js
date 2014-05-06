// text.js

var base = require('./_base.js');

module.exports = function (warp) {
    return base.defineModel(warp, 'Text', [
        base.column_id('ref_id'),
        base.column_text('value')
    ], {
        table: 'texts'
    });
};
