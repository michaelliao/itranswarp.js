// test tags:

var fs = require('fs');

var
    _ = require('lodash'),
    should = require('should');

var images = require('../controllers/_images');

describe('#images', function() {

    it('#calcScaleSize', function() {
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
        _.each(image_sizes, function(arr) {
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
            console.log(ori_w + 'x' + ori_h + ' > ' + res_w + 'x' + res_h + ' ===> ' + r.width + 'x' + r.height);
            should(r).be.ok;
            r.width.should.equal(expected_w);
            r.height.should.equal(expected_h);
            if (resized===false) {
                r.resized.should.not.be.ok;
            }
        });
    });

    it('#get-image-size', function(done) {
        images.getSize(fs.readFileSync('./test/test-image.jpg'), function(err, size) {
            should(err).not.be.ok;
            size.width.should.equal(1280);
            size.height.should.equal(720);
            done();
        });
    });

    it('#resize-small', function(done) {
        var imgData = fs.readFileSync('./test/test-image.jpg');
        images.resize(imgData, 1280, 720, 480, 270, { stream: false }, function(err, data) {
            should(err).not.be.ok;
            data.should.be.ok;
            // check resized image:
            images.getSize(data, function(err, size) {
                should(err).not.be.ok;
                size.width.should.equal(480);
                size.height.should.equal(270);
                fs.writeFileSync('./test/output/test-resize-smaller-480x270.jpg', data);
                done();
            });
        });
    }),

    it('#resize-large', function(done) {
        var imgData = fs.readFileSync('./test/test-image.jpg');
        images.resize(imgData, 1280, 720, 1920, 0, { stream: false }, function(err, data) {
            should(err).not.be.ok;
            data.should.be.ok;
            // check resized image:
            images.getSize(data, function(err, size) {
                should(err).not.be.ok;
                size.width.should.equal(1280);
                size.height.should.equal(720);
                done();
            });
        });
    }),

    it('#resize-large-force', function(done) {
        var imgData = fs.readFileSync('./test/test-image.jpg');
        images.resize(imgData, 1280, 720, 1920, 0, { stream: false, force: true }, function(err, data) {
            should(err).not.be.ok;
            data.should.be.ok;
            // check resized image:
            images.getSize(data, function(err, size) {
                should(err).not.be.ok;
                size.width.should.equal(1920);
                size.height.should.equal(1080);
                fs.writeFileSync('./test/output/test-resize-larger-1920x1080.jpg', data);
                //images.write('./test/output/sss.jpg', function(err) {});
                done();
            });
        });
    })

});
