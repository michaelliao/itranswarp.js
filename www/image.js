/**
 * image operation.
 * 
 * author: Michael Liao
 */

const
    bluebird = require('bluebird'),
    api = require('./api'),
    logger = require('./logger'),
    gm = require('gm').subClass({ imageMagick : true });

function calcScaleSize(origin_width, origin_height, resize_width, resize_height, keepAspect) {
    function isEnlarge(tw, th) {
        return origin_width < tw && origin_height < th;
    }

    if (resize_width <= 0 && resize_height <= 0) {
        throw new Error('invalid parameter: ' + resize_width + ', ' + resize_height);
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

function getImageInfo(buffer, callback) {
    var i = gm(buffer);
    i.format(function (err, format) {
        if (err) {
            return callback(api.invalidParam('image', 'Invalid image data'));
        }
        i.size(function (err, size) {
            if (err) {
                return callback(api.invalidParam('image', 'Invalid image data'));
            }
            callback(null, {
                data: buffer,
                format: format.toLowerCase(), // 'png', 'jpeg', 'gif'...
                width: size.width,
                height: size.height
            });
        });
    });
}

/**
 * resize to specific width and height, but keep aspect.
 * callback should have signature (err, buffer).
 */
function resizeKeepAspect(buffer, origin_width, origin_height, resize_width, resize_height, callback) {
    if (origin_width * resize_height === origin_height * resize_width && origin_width <= resize_width) {
        logger.debug('no need to resize!');
        return callback(null, buffer);
    }
    var
        img = gm(buffer),
        r = calcScaleSize(origin_width, origin_height, resize_width, resize_height, true);
    logger.info('resized to ' + r.width + 'x' + r.height);
    img = img.resize(r.width, r.height);
    return img.toBuffer(callback);
}

/**
 * resize to specific width and height, crop if neccessary.
 * callback should have signature (err, buffer).
 */
function resizeAsCover(buffer, origin_width, origin_height, resize_width, resize_height, callback) {
    if (origin_width * resize_height === origin_height * resize_width && origin_width <= resize_width) {
        logger.debug('no need to resize!');
        return callback(null, buffer);
    }
    var
        img = gm(buffer),
        scale_width,
        scale_height;
    if (resize_width * origin_height === origin_width * resize_height) {
        // fit!
        logger.debug('resizeAsCover: fit!');
        img = img.resize(resize_width, resize_height);
        return img.toBuffer(callback);
    }
    if (resize_width * origin_height > origin_width * resize_height) {
        // cut off top and bottom:
        scale_width = resize_width;
        logger.debug('resizeAsCover: resize to: ' + scale_width + ' x ?');
        img = img.resize(scale_width, null);
        // crop:
        scale_height = scale_width * origin_height / origin_width;
        img = img.crop(resize_width, resize_height, 0, Math.floor((scale_height - resize_height) / 2));
        return img.toBuffer(callback);
    }
    // cut off left and right:
    scale_height = resize_height;
    logger.debug('resizeAsCover: resize to: ? x ' + scale_height);
    img = img.resize(null, scale_height);
    // crop:
    scale_width = scale_height * origin_width / origin_height;
    img = img.crop(resize_width, resize_height, Math.floor((scale_width - resize_width) / 2), 0);
    return img.toBuffer(callback);
}

module.exports = {

    getImageInfo: bluebird.promisify(getImageInfo),

    resizeKeepAspect: bluebird.promisify(resizeKeepAspect),

    resizeAsCover: bluebird.promisify(resizeAsCover),

    calcScaleSize: calcScaleSize

};
