// image operation.

var
    fs = require('fs'),
    gm = require('gm').subClass({ imageMagick : true });

function calcScaleSize(origin_width, origin_height, resize_width, resize_height, keepAspect) {
    if (resize_width <= 0 && resize_height <= 0) {
        throw {"name": "Parameter error!"};
    }
    if (keepAspect === undefined) {
        keepAspect = true;
    }
    if (origin_width === resize_width && origin_height === resize_height) {
        return { width: origin_width, height: origin_height };;
    }
    var
        target_width = resize_width,
        target_height = resize_height;
    if (target_height <= 0) {
        target_height = target_width * origin_height / origin_width;
        return { width: target_width, height: target_height };
    }
    if (target_width <= 0) {
        target_width = target_height * origin_width / origin_height;
        return { width: target_width, height: target_height };
    }
    if (keepAspect) {
        var expected_height = target_width * origin_height / origin_width;
        if (expected_height > target_height) {
            target_width = target_height * origin_width / origin_height;
        }
        else if (expected_height < target_height) {
            target_height = expected_height;
        }
    }
    return { width: target_width, height: target_height };
}

exports = module.exports = {

    calcScaleSize: calcScaleSize,

    getSize: function(imgData, callback) {
        gm(imgData).size(callback);
    },

    /**
     * default options: { force = false, keepAspect = true, format='jpeg', stream = true }
     * if options.stream is true, callback should have signature (err, stdout, stderr).
     */
    resize: function(imgData, origin_width, origin_height, resize_width, resize_height, options, callback) {
        if (typeof(options)==='function') {
            callback = options;
            options = {};
        }
        var r = calcScaleSize(origin_width, origin_height, resize_width, resize_height, options.keepAspect || true);
        if (r) {
            var
                target_width = r.width,
                target_height = r.height;
            var img = gm(imgData);
            return img.resize(target_width, target_height).stream('jpeg', callback);
        }
        return img.stream('jpeg', callback);
    }
}

calcScaleSize(1200, 1200, 800, 600);
