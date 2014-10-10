// attachment api

var
    fs = require('fs'),
    async = require('async'),
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

function checkAttachment(fileObj, expectImage, callback) {
    if (arguments.length === 2) {
        callback = expectImage;
        expectImage = undefined;
    }
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
    fs.readFile(fileObj.path, function (err, fcontent) {
        if (err) {
            return callback(err);
        }
        result.content = fcontent;
        if (expectImage || result.mime.indexOf('image/') === 0) {
            // check if image is invalid:
            return images.getSize(fcontent, function (err, size) {
                if (err) {
                    return callback(api.invalidParam('file', 'Invalid image file.'));
                }
                console.log('check image size: ' + size.width + ' x ' + size.height);
                result.isImage = true;
                result.width = size.width;
                result.height = size.height;
                callback(null, result);
            });
        }
        callback(null, result);
    });
}

// create function(callback) with Attachment object returned in callback:
function createAttachmentTaskInTx(attachmentFileObj, tx, user_id) {
    var
        att_id = next_id(),
        res_id = next_id();
    return function (callback) {
        Resource.create({
            id: res_id,
            ref_id: att_id,
            value: attachmentFileObj.content
        }, tx, function (err, resource) {
            if (err) {
                return callback(err);
            }
            Attachment.create({
                id: att_id,
                resource_id: resource.id,
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
    if (size === undefined) {
        size = '0';
    }
    Attachment.find(req.params.id, function (err, atta) {
        if (err) {
            return next(err);
        }
        if (atta === null) {
            return next(api.notFound('Attachment'));
        }
        Resource.find(atta.resource_id, function (err, resource) {
            if (err) {
                return next(err);
            }
            if (resource === null) {
                return next(api.notFound('Resource'));
            }
            //
            var
                mime = atta.mime,
                data = resource.value,
                origin_width, origin_height, target_width, resize;
            if (size !== '0') {
                origin_width = atta.width;
                origin_height = atta.height;
                target_width = origin_width;
                resize = false;
                if (size === 's') {
                    // generate small image: 160 x N
                    if (origin_width > 160) {
                        target_width = 160;
                        resize = true;
                    }
                } else if (size === 'm') {
                    // generate medium image: 320 x N
                    if (origin_width > 320) {
                        target_width = 320;
                        resize = true;
                    }
                } else if (size === 'l') {
                    // generate large image: 640 x N
                    if (origin_width > 640) {
                        target_width = 640;
                        resize = true;
                    }
                } else {
                    return res.send(404, 'Not found.');
                }
                if (resize) {
                    return images.resize(data, origin_width, origin_height, target_width, 0, function (err, stdout, stderr) {
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

function getAttachment(id, tx, callback) {
    if (arguments.length === 2) {
        callback = tx;
        tx = undefined;
    }
    Attachment.find(id, tx, function (err, entity) {
        if (err) {
            return callback(err);
        }
        if (entity === null) {
            return callback(api.notFound('Attachment'));
        }
        return callback(null, entity);
    });
}

function getAttachments(page, callback) {
    Attachment.findNumber('count(*)', function (err, num) {
        if (err) {
            return callback(err);
        }
        page.totalItems = num;
        if (page.isEmpty) {
            return callback(null, {
                page: page,
                attachments: []
            });
        }
        Attachment.findAll({
            offset: page.offset,
            limit: page.limit,
            order: 'created_at desc'
        }, function (err, attachments) {
            if (err) {
                return callback(err);
            }
            return callback(null, {
                page: page,
                attachments: attachments
            });
        });
    });
}

module.exports = {

    getAttachment: getAttachment,

    getAttachments: getAttachments,

    checkAttachment: checkAttachment,

    createAttachmentTaskInTx: createAttachmentTaskInTx,

    'GET /files/attachments/:id': downloadAttachment,

    'GET /files/attachments/:id/:size': downloadAttachment,

    'GET /api/attachments/:id': function (req, res, next) {
        /**
         * Get attachment.
         * 
         * @name Get Attachment
         * @param {string} id: Id of the attachment.
         * @return {object} Attachment object.
         * @error {resource:notfound} Attachment was not found by id.
         */
        getAttachment(req.params.id, function (err, entity) {
            if (err) {
                return next(err);
            }
            return res.send(entity);
        });
    },

    'GET /api/attachments': function (req, res, next) {
        /**
         * Get attachments by page.
         * 
         * @name Get Attachments
         * @param {number} [page=1]: The page number, starts from 1.
         * @return {object} Attachment objects and page information.
         */
        var page = utils.getPage(req);
        getAttachments(page, function (err, results) {
            if (err) {
                return next(err);
            }
            return res.send(results);
        });
    },

    'POST /api/attachments/:id/delete': function (req, res, next) {
        /**
         * Delete an attachment by its id.
         * 
         * @name Delete Attachment
         * @param {string} id: The id of the attachment.
         * @return {object} Object contains deleted id.
         * @error {resource:notfound} Attachment was not found by id.
         * @error {permission:denied} If current user has no permission.
         */
        if (utils.isForbidden(req, constants.ROLE_CONTRIBUTOR)) {
            return next(api.notAllowed('Permission denied.'));
        }
        warp.transaction(function (err, tx) {
            if (err) {
                return next(err);
            }
            async.waterfall([
                // step: query attachment by id:
                function (callback) {
                    getAttachment(req.params.id, tx, callback);
                },
                function (atta, callback) {
                    // check user permission:
                    if (req.user.role !== constants.ROLE_ADMIN && req.user.id !== atta.user_id) {
                        return callback(api.notAllowed('Permission denied.'));
                    }
                    // delete:
                    atta.destroy(tx, callback);
                },
                function (r, callback) {
                    // delete all resources:
                    warp.update('delete from resources where ref_id=?', [req.params.id], tx, callback);
                }
            ], function (err, result) {
                tx.done(err, function (err) {
                    if (err) {
                        return next(err);
                    }
                    res.send({ id: req.params.id });
                });
            });
        });
    },

    'POST /api/attachments': function (req, res, next) {
        /**
         * Create a new attachment.
         * 
         * @name Create Attachment
         * @param {string} [name]: Name of the attachment, default to filename.
         * @param {string} [description]: Description of the attachment, default to filename.
         * @param {file} file: File to upload.
         * @return {object} The created attachment object.
         * @error {permission:denied} If current user has no permission.
         */
        if (utils.isForbidden(req, constants.ROLE_CONTRIBUTOR)) {
            return next(api.notAllowed('Permission denied.'));
        }
        var
            expectImage = req.query.image === 'true',
            includeUrl = req.query.url === 'true',
            name = utils.getParam('name', '', req),
            description = utils.getParam('description', '', req),
            file = req.files.file;
        if (!file) {
            return next(api.invalidParam('file'));
        }
        if (!name) {
            name = file.name;
        }

        console.log('file uploaded: ' + file.name);

        checkAttachment(file, expectImage, function (err, attachFileObject) {
            if (err) {
                return next(err);
            }
            // override name:
            attachFileObject.name = name;
            attachFileObject.description = description;
            warp.transaction(function (err, tx) {
                if (err) {
                    return next(err);
                }
                var fn = createAttachmentTaskInTx(attachFileObject, tx, req.user.id);
                fn(function (err, atta) {
                    tx.done(err, function (err) {
                        if (err) {
                            return next(err);
                        }
                        if (includeUrl) {
                            atta.url = '/files/attachments/' + atta.id;
                        }
                        return res.send(atta);
                    });
                });
            });
        });
    }
};
