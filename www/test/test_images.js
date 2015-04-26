'use strict';

// test images:

var
    _ = require('lodash'),
    fs = require('fs'),
    should = require('should'),
    images = require('../controllers/_images');

describe('#images', function () {

    it('calcScaleSize', function () {
        var image_sizes = [
            // [ori_w, ori_h, res_w, res_h, keepAspect, expected_w, expected_h, resized]
            // square:
            [1200, 1200, 600, 600, false, 600, 600],

            [1200, 1200, 900,   0,  true, 900, 900],
            [1200, 1200, 900,   0, false, 900, 900],

            [1200, 1200,   0, 700,  true, 700, 700],
            [1200, 1200,   0, 700, false, 700, 700],

            [1200, 1200, 800, 600,  true, 600, 600],
            [1200, 1200, 800, 600, false, 800, 600],

            [ 120,  120, 240,   0,  true, 240, 240],
            [ 120,  120, -10, 240,  true, 240, 240],

            [ 120,  120, 240,   0, false, 240, 240],
            [ 120,  120, -10, 240, false, 240, 240],

            [ 120,  120, 240, 360,  true, 240, 240],
            [ 120,  120, 720, 360,  true, 360, 360],

            [ 120,  120, 120, 120, false, 120, 120, false],
            [ 120,  120, 120, 120,  true, 120, 120, false],

            // wide
            [1200,  800, 600, -10,  true, 600, 400],
            [1200,  800, 600,   0, false, 600, 400],

            [1200,  800,   0, 400,  true, 600, 400],
            [1200,  800, -10, 400, false, 600, 400],

            [1200,  800, 120,  80,  true, 120,  80],
            [1200,  800, 120,  90,  true, 120,  80],
            [1200,  800, 130,  80,  true, 120,  80],

            [ 120,   80, 240, 160,  true, 240, 160],
            [ 120,   80, 240, 180,  true, 240, 160],
            [ 120,   80, 260, 160,  true, 240, 160],

            [ 120,   80, 260, 140, false, 260, 140],

            [1280,  720, 1920, 1080, true, 1920, 1080],

            // tall
            [ 800, 1200, 400, 600,  true, 400, 600],
            [ 800, 1200, 500, 600,  true, 400, 600],
            [ 800, 1200, 400, 700,  true, 400, 600],
            [ 800, 1200, 500, 700, false, 500, 700],

            [  80,  120, 400, 600,  true, 400, 600],
            [  80,  120, 500, 600,  true, 400, 600],
            [  80,  120, 400, 700,  true, 400, 600],
            [  80,  120, 500, 700, false, 500, 700],
        ];
        _.each(image_sizes, function (arr) {
            var
                ori_w = arr[0],
                ori_h = arr[1],
                res_w = arr[2],
                res_h = arr[3],
                keepAspect = arr[4],
                expected_w = arr[5],
                expected_h = arr[6],
                resized = arr[7];
            var r = images.calcScaleSize(ori_w, ori_h, res_w, res_h, keepAspect);
            //console.log(ori_w + 'x' + ori_h + ' > ' + res_w + 'x' + res_h + ' ===> ' + r.width + 'x' + r.height);
            should(r).be.ok;
            r.width.should.equal(expected_w);
            r.height.should.equal(expected_h);
            if (resized===false) {
                r.resized.should.not.be.ok;
            }
        });
    });

    it('get image size ok', function* () {
        var info = yield images.$getImageInfo(fs.readFileSync('./test/res-image.jpg'));
        should(info).be.ok;
        info.format.should.equal('jpeg');
        info.width.should.equal(1280);
        info.height.should.equal(720);
    });

    it('get image size with bad format', function* () {
        try {
            yield images.$getImageInfo(fs.readFileSync('./test/res-bad-image.jpg'));
        }
        catch (e) {
            should(e.error).be.ok;
            e.error.should.equal('parameter:invalid');
        }
    });

    it('resize small', function* () {
        var imgData = fs.readFileSync('./test/res-image.jpg');
        var resizedData = yield images.$resizeKeepAspect(imgData, 1280, 720, 480, 270);
        // check resized image:
        var resizedInfo = yield images.$getImageInfo(resizedData);
        should(resizedInfo).be.ok;
        resizedInfo.format.should.equal('jpeg');
        resizedInfo.width.should.equal(480);
        resizedInfo.height.should.equal(270);
    });

    it('resize large', function* () {
        var imgData = fs.readFileSync('./test/res-image.jpg');
        var resizedData = yield images.$resizeKeepAspect(imgData, 1280, 720, 1920, 1600);
        // check resized image:
        var resizedInfo = yield images.$getImageInfo(resizedData);
        should(resizedInfo).be.ok;
        resizedInfo.format.should.equal('jpeg');
        resizedInfo.width.should.equal(1920);
        resizedInfo.height.should.equal(1080);
    });

});
