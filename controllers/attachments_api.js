// attachments.js

var
    fs = require('fs'),
    mime = require('mime'),
    api = require('../api'),
    db = require('../db'),
    constants = require('../constants'),
    dao = require('./_dao'),
    utils = require('./_utils'),
    images = require('./_images');

var
    User = db.user,
    Attachment = db.attachment,
    Resource = db.resource,
    sequelize = db.sequelize,
    next_id = db.next_id;

function checkAttachment(fileObj, callback) {
    var result = {
        name: fileObj.originalFilename,
        description: fileObj.originalFilename,
        size: fileObj.size,
        mime: mime.lookup(fileObj.originalFilename),
        meta: '',
        width: 0,
        height: 0,
        isImage: false
    };
    fs.readFile(fileObj.path, function(err, fcontent) {
        if (err) {
            return callback(err);
        }
        result.content = fcontent;
        if (result.mime.indexOf('image/')===0) {
            // check if image is invalid:
            return images.getSize(fcontent, function(err, size) {
                if (err) {
                    return callback(api.invalid_param('file', 'Invalid image file.'));
                }
                width = size.width;
                height = size.height;
                console.log('check image size: ' + width + ' x ' + height);
                result.isImage = true;
                result.width = width;
                result.height = height;
                callback(null, result);
            });
        }
        callback(null, result);
    });
}

// create function(tx, callback) with Attachment object returned in callback:
function createAttachmentTaskInTransaction(attachmentFileObj, req) {
    var att_id = next_id();
    var res_id = next_id();
    return function(tx, callback) {
        dao.save(Resource, {
            id: res_id,
            ref_id: att_id,
            value: attachmentFileObj.content
        }, tx, function(err, entity) {
            if (err) {
                return callback(err);
            }
            dao.save(Attachment, {
                id: att_id,
                resource_id: res_id,
                user_id: req.user.id,
                size: attachmentFileObj.size,
                mime: attachmentFileObj.mime,
                meta: attachmentFileObj.meta,
                width: attachmentFileObj.width,
                height: attachmentFileObj.height,
                name: attachmentFileObj.name,
                description: attachmentFileObj.description
            }, tx, callback);
        });
    };
}

function downloadAttachment(req, res, next) {
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
                    origin_height = atta.height,
                    target_width = origin_width;
                var resize = false;
                if (size==='s') {
                    // generate small image: 160 x N
                    if (origin_width > 160) {
                        target_width = 160;
                        resize = true;
                    }
                }
                else if (size==='m') {
                    // generate medium image: 320 x N
                    if (origin_width > 320) {
                        target_width = 320;
                        resize = true;
                    }
                }
                else if (size==='l') {
                    // generate large image: 640 x N
                    if (origin_width > 640) {
                        target_width = 640;
                        resize = true;
                    }
                }
                else {
                    return res.send(404, 'Not found.');
                }
                if (resize) {
                    return images.resize(data, origin_width, origin_height, target_width, 0, function(err, stdout, stderr) {
                        if (err) {
                            return next(err);
                        }
                        res.type('image/jpeg');
                        return stdout.pipe(res);
                    });
                }
            }
            res.type(mime);
            res.send(data);
        });
    });
}

exports = module.exports = {

    checkAttachment: checkAttachment,

    createAttachmentTaskInTransaction: createAttachmentTaskInTransaction,

    'GET /files/attachments/:id': downloadAttachment,

    'GET /files/attachments/:id/:size': downloadAttachment,

    'GET /api/attachments/:id': function(req, res, next) {
        dao.find(Attachment, req.params.id, function(err, entity) {
            if (err) {
                return next(err);
            }
            return res.send(entity);
        });
    },

    'GET /api/attachments': function(req, res, next) {
        dao.findAll(Attachment, {
            order: 'created_at desc'
        }, function(err, entities) {
            if (err) {
                return next(err);
            }
            return res.send({'attachments': entities});
        });
    },

    'POST /api/attachments': function(req, res, next) {
        /**
         * Create a new attachment.
         * 
         * @return {object} The created attachment object.
         */
        if (utils.isForbidden(req, constants.ROLE_CONTRIBUTOR)) {
            return next(api.not_allowed('Permission denied.'));
        }
        var user_id = 'xxx';

        try {
            var name = utils.get_required_param('name', req);
        }
        catch (e) {
            return next(e);
        }
        var description = utils.get_param('description', '', req);

        var file = req.files.file;
        if ( ! file) {
            return next(api.invalid_param('file'));
        }

        console.log('file uploaded: ' + file.name);

        checkAttachment(file, function(err, attachFileObject) {
            if (err) {
                return next(err);
            }
            // override name:
            attachFileObject.name = name;
            attachFileObject.description = description;
            dao.transaction([
                createAttachmentTaskInTransaction(attachFileObject, req)
            ], function(err, results) {
                if (err) {
                    return next(err);
                }
                return res.send(results[0]);
            });
        });
    }
}
