// image operation.

var
    fs = require('fs'),
    gm = require('gm').subClass({ imageMagick : true });

function calcScaleSize(origin_width, origin_height, resize_width, resize_height, keepAspect) {
    function isEnlarge(tw, th) {
        return origin_width < tw && origin_height < th;
    }

    if (resize_width <= 0 && resize_height <= 0) {
        throw {"name": "Parameter error!"};
    }
    if (keepAspect === undefined) {
        keepAspect = true;
    }
    if (origin_width === resize_width && origin_height === resize_height) {
        return { width: origin_width, height: origin_height, resized: false, enlarge: false };
    }
    var
        expected_height,
        target_width = resize_width,
        target_height = resize_height;
    if (target_height <= 0) {
        target_height = target_width * origin_height / origin_width;
        return { width: target_width, height: target_height, resized: true, enlarge: isEnlarge(target_width, target_height) };
    }
    if (target_width <= 0) {
        target_width = target_height * origin_width / origin_height;
        return { width: target_width, height: target_height, resized: true, enlarge: isEnlarge(target_width, target_height) };
    }
    if (keepAspect) {
        expected_height = target_width * origin_height / origin_width;
        if (expected_height > target_height) {
            target_width = target_height * origin_width / origin_height;
        } else if (expected_height < target_height) {
            target_height = expected_height;
        }
    }
    return { width: target_width, height: target_height, resized: true, enlarge: isEnlarge(target_width, target_height) };
}

module.exports = {

    calcScaleSize: calcScaleSize,

    getSize: function (imgData, callback) {
        gm(imgData).size(callback);
    },

    /**
     * default options: { force = false, keepAspect = true, format='jpeg', stream=true }
     * if options.stream is true, callback should have signature (err, stdout, stderr), otherwise,
     * callback(err, buffer).
     */
    resize: function (imgData, origin_width, origin_height, resize_width, resize_height, options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        options = options || {};
        var
            opt_force = options.force === undefined ? false : true,
            opt_stream = options.stream === undefined ? true : false,
            img = gm(imgData),
            r = calcScaleSize(origin_width, origin_height, resize_width, resize_height, options.keepAspect || true);
        if (r.resized && (opt_force || !r.enlarge)) {
            console.log('resized to ' + r.width + 'x' + r.height);
            img = img.resize(r.width, r.height);
        }
        if (opt_stream) {
            return img.stream('jpeg', callback);
        }
        return img.toBuffer(callback);
    }
};

calcScaleSize(1200, 1200, 800, 600);
