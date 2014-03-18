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
    Canvas = require('canvas');

var
    User = db.user,
    Attachment = db.attachment,
    Resource = db.resource,
    sequelize = db.sequelize,
    next_id = db.next_id;

function atta_file(req, res, next, prev) {
    utils.find(Attachment, req.params.id, function(err, atta) {
        if (err) {
            return next(err);
        }
        var mime = atta.mime,
            data = atta.data;
        if (prev==='s') {
            // generate small image: 160 x N
        }
        else if (prev==='m') {
            // generate medium image: 640 x N
        }
        res.type(mime);
        res.send(data);
    });
}

exports = module.exports = {

    'GET /files/attachments/:id': atta_file,

    'GET /files/attachments/:id/0': atta_file,

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
            // for image type, check width & height:
            var width = 0,
                height = 0;
            if (type.indexOf('image/')===0) {
                var img = new Canvas.Image;
                img.src = fcontent;
                width = img.width;
                height = img.height;
                console.log('check image size: ' + width + ' x ' + height);
            }
            dao.save(Attachment, {
                user_id: user_id,
                size: size,
                mime: type,
                meta: '',
                width: width,
                height: height,
                name: name,
                description: description,
                data: fcontent
            }, function(err, atta) {
                if (err) {
                    return next(err);
                }
                atta.dataValues.data = '[binary data]';
                return res.send(atta);
            });
        });
    }

}
