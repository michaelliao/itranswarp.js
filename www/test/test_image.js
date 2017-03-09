/**
 * Test image.js
 * 
 * ImageMagick MUST be installed first.
 */
var
    _ = require('lodash'),
    fs = require('fs'),
    expect = require('chai').expect,
    image = require('../image');

describe('#image', () => {

    it('calcScaleSize', () => {
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
            var r = image.calcScaleSize(ori_w, ori_h, res_w, res_h, keepAspect);
            //console.log(ori_w + 'x' + ori_h + ' > ' + res_w + 'x' + res_h + ' ===> ' + r.width + 'x' + r.height);
            expect(r).to.be.ok;
            expect(r.width).to.equal(expected_w);
            expect(r.height).to.equal(expected_h);
            if (resized===false) {
                expect(r.resized).to.not.be.ok;
            }
        });
    });

    it('get image size ok', async () => {
        var info = await image.getImageInfo(fs.readFileSync('./test/res-image.jpg'));
        expect(info).to.be.ok;
        expect(info.format).to.equal('jpeg');
        expect(info.width).to.equal(1280);
        expect(info.height).to.equal(720);
    });

    it('get image size with bad format', async () => {
        try {
            await image.getImageInfo(fs.readFileSync('./test/res-bad-image.jpg'));
        }
        catch (e) {
            expect(e.error).to.be.ok;
            expect(e.error).to.equal('parameter:invalid');
        }
    });

    it('resize small', async () => {
        var imgData = fs.readFileSync('./test/res-image.jpg');
        var resizedData = await image.resizeKeepAspect(imgData, 1280, 720, 480, 270);
        // check resized image:
        var resizedInfo = await image.getImageInfo(resizedData);
        expect(resizedInfo).to.be.ok;
        expect(resizedInfo.format).to.equal('jpeg');
        expect(resizedInfo.width).to.equal(480);
        expect(resizedInfo.height).to.equal(270);
    });

    it('resize large', async () => {
        var imgData = fs.readFileSync('./test/res-image.jpg');
        var resizedData = await image.resizeKeepAspect(imgData, 1280, 720, 1920, 1600);
        // check resized image:
        var resizedInfo = await image.getImageInfo(resizedData);
        expect(resizedInfo).to.be.ok;
        expect(resizedInfo.format).to.equal('jpeg');
        expect(resizedInfo.width).to.equal(1920);
        expect(resizedInfo.height).to.equal(1080);
    });

});
