// test tags:

var should = require('should');

var images = require('../controllers/_images');

var calcScaleSize = images.calcScaleSize;

describe('#images', function() {

    it('#calcScaleSize', function() {
        var image_size = [
            // [ori_w, ori_h, res_w, res_h, keepAspect, expected_w, expected_h]
            // square:
            [1200, 1200, 900,   0,  true, 900, 900],
            [1200, 1200, 900,   0, false, 900, 900],
            [1200, 1200,   0, 700,  true, 700, 700],
            [1200, 1200,   0, 700, false, 700, 700],

            [1200,  800, 600,   0,  true, 600, 400],
        ];
        format_tags('  ABC, def, ha ha ').should.equal('ABC,def,ha ha');
    });
});
