// attachments.js

var
    fs = require('fs'),
    mime = require('mime'),
    api = require('../api'),
    db = require('../db'),
    constants = require('../constants'),
    dao = require('./_dao'),
    utils = require('./_utils');

var
    gm = require('gm'),
    imageMagick = gm.subClass({ imageMagick : true });

var
    User = db.user,
    Attachment = db.attachment,
    Resource = db.resource,
    sequelize = db.sequelize,
    next_id = db.next_id;

function atta_file(req, res, next) {
    var size = req.params.size;
    if (size===undefined) {
        size = '0';
    }
    utils.find(Attachment, req.params.id, function(err, atta) {
        if (err) {
            return next(err);
        }
        utils.find(Resource, atta.resource_id, function(err, resource) {
            if (err) {
                return next(err);
            }
            //
            var mime = atta.mime,
                data = resource.value;
            if (size==='0') {
                // do nothing
            }
            else {
                var
                    origin_width = atta.width,
                    origin_height = atta.height;
                var
                    target_width = origin_width,
                    target_height = origin_height;
                var resize = false;
                if (size==='s') {
                    // generate small image: 160 x N
                    if (origin_width > 160) {
                        target_width = 160;
                        target_height = origin_height * target_width / origin_width;
                        resize = true;
                    }
                }
                else if (size==='m') {
                    // generate medium image: 320 x N
                    if (origin_width > 320) {
                        target_width = 320;
                        target_height = origin_height * target_width / origin_width;
                        resize = true;
                    }
                }
                else if (size==='l') {
                    // generate large image: 640 x N
                    if (origin_width > 640) {
                        target_width = 640;
                        target_height = origin_height * target_width / origin_width;
                        resize = true;
                    }
                }
                else {
                    return res.send(404, 'Not found.');
                }
                if (resize) {
                    var img = imageMagick(data);
                    return img.resize(target_width, target_height).stream('jpeg', function(err, stdout, stderr) {
                        if (err) {
                            return next(err);
                        }
                        res.type('image/jpeg');
                        stdout.pipe(res);
                    });
                }
            }
            res.type(mime);
            res.send(data);
        });
    });
}

exports = module.exports = {

    'GET /files/attachments/:id': atta_file,

    'GET /files/attachments/:id/:size': atta_file,

    'POST /api/attachments': function(req, res, next) {
        /**
         * Create a new attachment.
         * 
         * @return {object} The created attachment object.
         */
        //if (utils.isForbidden(req, constants.ROLE_CONTRIBUTOR)) {
        //    return next(api.not_allowed('Permission denied.'));
        //}
        var user_id = 'xxx';

        try {
            var name = utils.get_required_param('name', req);
        }
        catch (e) {
            return next(e);
        }
        var description = utils.get_param('description', '', req);

        var file = req.files.file;
        var size = file.size,
            type = mime.lookup(file.originalFilename);

        console.log('file uploaded: ' + file.name);

        fs.readFile(file.path, function(err, fcontent) {
            if (err) {
                return next(err);
            }
            var saving = function() {
                var att_id = next_id();
                var res_id = next_id();
                dao.transaction([
                    function(tx, callback) {
                        dao.save(Attachment, {
                            id: att_id,
                            user_id: user_id,
                            resource_id: res_id,
                            size: size,
                            mime: type,
                            meta: '',
                            width: width,
                            height: height,
                            name: name,
                            description: description
                        }, tx, callback);
                    },
                    function(tx, callback) {
                        dao.save(Resource, {
                            id: res_id,
                            ref_id: att_id,
                            value: fcontent
                        }, tx, callback);
                    }
                ], function(err, results) {
                    if (err) {
                        return next(err);
                    }
                    return res.send(results[0]);
                });
            };
            // for image type, check width & height:
            var width = 0,
                height = 0;
            if (type.indexOf('image/')===0) {
                var img = imageMagick(fcontent);
                img.size(function(err, size) {
                    if (err) {
                        console.log('check image size failed: ' + err.name);
                    }
                    else {
                        width = size.width;
                        height = size.height;
                        console.log('check image size: ' + width + ' x ' + height);
                    }
                    saving();
                });
                return;
            }
            saving();
        });
    }

}
