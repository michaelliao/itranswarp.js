// attachments.js

var
    fs = require('fs'),
    mime = require('mime'),
    api = require('../api'),
    db = require('../db'),
    constants = require('../constants'),
    utils = require('./_utils'),
    images = require('./_images');

var
    User = db.user,
    Attachment = db.attachment,
    Resource = db.resource,
    warp = db.warp,
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

// create function(callback) with Attachment object returned in callback:
function createAttachmentTaskInTx(attachmentFileObj, tx, user_id) {
    var att_id = next_id();
    var res_id = next_id();
    return function(callback) {
        Resource.create({
            id: res_id,
            ref_id: att_id,
            value: attachmentFileObj.content
        }, tx, function(err, entity) {
            if (err) {
                return callback(err);
            }
            Attachment.create({
                id: att_id,
                resource_id: res_id,
                user_id: user_id,
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
    Attachment.find(req.params.id, function(err, atta) {
        if (err) {
            return next(err);
        }
        if (atta===null) {
            return next(api.not_found('Attachment'));
        }
        Resource.find(atta.resource_id, function(err, resource) {
            if (err) {
                return next(err);
            }
            if (resource===null) {
                return next(api.not_found('Resource'));
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

    createAttachmentTaskInTx: createAttachmentTaskInTx,

    'GET /files/attachments/:id': downloadAttachment,

    'GET /files/attachments/:id/:size': downloadAttachment,

    'GET /api/attachments/:id': function(req, res, next) {
        Attachment.find(req.params.id, function(err, entity) {
            if (err) {
                return next(err);
            }
            if (entity===null) {
                return next(api.not_found('Attachment'));
            }
            return res.send(entity);
        });
    },

    'GET /api/attachments': function(req, res, next) {
        var page = utils.getPage(req);
        Attachment.findNumber('count(*)', function(err, num) {
            if (err) {
                return next(err);
            }
            page.totalItems = num;
            if (page.isEmpty) {
                return res.send({
                    page: page,
                    attachments: []
                });
            }
            Attachment.findAll({
                offset: page.offset,
                limit: page.limit,
                order: 'created_at desc'
            }, function(err, entities) {
                if (err) {
                    return next(err);
                }
                return res.send({
                    page: page,
                    attachments: entities
                });
            });
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
        var user_id = req.user.id;

        try {
            var name = utils.getRequiredParam('name', req);
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
            warp.transaction(function(err, tx) {
                if (err) {
                    return next(err);
                }
                var fn = createAttachmentTaskInTx(attachFileObject, tx, req.user.id);
                fn(function(err, atta) {
                    tx.done(err, function(err) {
                        if (err) {
                            return next(err);
                        }
                        return res.send(atta);
                    });
                });
            });
        });
    }
}
