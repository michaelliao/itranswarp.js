'use strict';

// attachment api

var
    fs = require('fs'),
    mime = require('mime'),
    api = require('../api'),
    db = require('../db'),
    helper = require('../helper'),
    constants = require('../constants'),
    images = require('./_images'),
    json_schema = require('../json_schema');

var
    User = db.user,
    Attachment = db.attachment,
    Resource = db.resource,
    warp = db.warp,
    next_id = db.next_id;

function* $getAttachment(id) {
    var atta = yield Attachment.$find(id);
    if (atta === null) {
        throw api.notFound('Attachment');
    }
    return atta;
}

function* $getAttachments(page) {
    page.total = yield Attachment.$findNumber('count(id)');
    if (page.isEmpty) {
        return [];
    }
    return yield Attachment.$findAll({
        offset: page.offset,
        limit: page.limit,
        order: 'created_at desc'
    });
}

// create function(callback) with Attachment object returned in callback:
function* $createAttachment(user_id, name, description, buffer, mime) {
    var
        att_id = next_id(),
        res_id = next_id(),
        imageInfo = null;
    try {
        imageInfo = yield images.$getImageInfo(buffer);
    }
    catch (e) {
        // not an image
        console.log('attachment data is not an image.');
    }
    if (imageInfo !== null) {
        if (['png', 'jpeg', 'gif'].indexOf(imageInfo.format) !== (-1)) {
            mime = 'image/' + imageInfo.format;
        }
    }
    yield Resource.$create({
        id: res_id,
        ref_id: att_id,
        value: buffer
    });
    return yield Attachment.$create({
        id: att_id,
        resource_id: res_id,
        user_id: user_id,
        size: buffer.length,
        mime: mime,
        meta: '',
        width: imageInfo === null ? 0 : imageInfo.width,
        height: imageInfo === null ? 0 : imageInfo.height,
        name: name,
        description: description
    });
}

function* $downloadDefaultAttachment(id) {
    yield $downloadAttachment.apply(this, [id, '0']);
}

function* $downloadAttachment(id, size) {
    if ('0sml'.indexOf(size) === (-1)) {
        this.status = 404;
        return;
    }
    var
        atta = yield $getAttachment(id),
        mime = atta.mime,
        resource = yield Resource.$find(atta.resource_id),
        data, origin_width, origin_height, target_width, resize;
    if (resource === null) {
        throw api.notFound('Resource');
    }
    data = resource.value;
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
        }
        if (resize) {
            data = yield images.$resizeKeepAspect(data, origin_width, origin_height, target_width, 0);
        }
    }
    this.response.type = resize ? 'image/jpeg' : mime;
    this.body = data;
}

module.exports = {

    $getAttachment: $getAttachment,

    $getAttachments: $getAttachments,

    $createAttachment: $createAttachment,

    'GET /files/attachments/:id': $downloadDefaultAttachment,

    'GET /files/attachments/:id/:size': $downloadAttachment,

    'GET /api/attachments/:id': function* (id) {
        /**
         * Get attachment.
         * 
         * @name Get Attachment
         * @param {string} id: Id of the attachment.
         * @return {object} Attachment object.
         * @error {resource:notfound} Attachment was not found by id.
         */
        this.body = yield $getAttachment(id);
    },

    'GET /api/attachments': function* () {
        /**
         * Get attachments by page.
         * 
         * @name Get Attachments
         * @param {number} [page=1]: The page number, starts from 1.
         * @return {object} Attachment objects and page information.
         */
        var
            page = helper.getPage(this.request),
            attachments = yield $getAttachments(page);
        this.body = {
            page: page,
            attachments: attachments
        };
    },

    'POST /api/attachments/:id/delete': function* (id) {
        /**
         * Delete an attachment by its id.
         * 
         * @name Delete Attachment
         * @param {string} id: The id of the attachment.
         * @return {object} Object contains deleted id.
         * @error {resource:notfound} Attachment was not found by id.
         * @error {permission:denied} If current user has no permission.
         */
        helper.checkPermission(this.request, constants.role.CONTRIBUTOR);
        var
            atta = yield $getAttachment(id);
        if (this.request.user.role !== constants.role.ADMIN && this.request.user.id !== atta.user_id) {
            throw api.notAllowed('Permission denied.');
        }
        // delete:
        yield atta.$destroy();
        // delete all resources:
        yield warp.$update('delete from resources where ref_id=?', [id]);
        this.body = {
            id: id
        };
    },

    'POST /api/attachments': function* () {
        /**
         * Create a new attachment.
         * 
         * @name Create Attachment
         * @param {string} [name]: Name of the attachment, default to filename.
         * @param {string} [mime=null]: Mime of the attachment, e.g. "application/pdf", all lowercase.
         * @param {string} [description]: Description of the attachment, default to filename.
         * @param {data} data: File data as base64.
         * @return {object} The created attachment object.
         * @error {permission:denied} If current user has no permission.
         */
        helper.checkPermission(this.request, constants.role.CONTRIBUTOR);
        var
            buffer,
            data = this.request.body;
        json_schema.validate('createAttachment', data);
        buffer = new Buffer(data.data, 'base64');
        this.body = yield $createAttachment(
            this.request.user.id,
            data.name.trim(),
            data.description.trim(),
            buffer,
            data.mime || 'application/octet-stream'
        );
    }
};
