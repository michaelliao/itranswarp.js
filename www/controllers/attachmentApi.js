'use strict';

/**
 * Attachment API.
 * 
 * author: Michael Liao
 */
const
    fs = require('fs'),
    mime = require('mime'),
    api = require('../api'),
    db = require('../db'),
    logger = require('../logger'),
    helper = require('../helper'),
    constants = require('../constants'),
    image = require('../image'),
    User = db.User,
    Attachment = db.Attachment,
    Resource = db.Resource,
    nextId = db.nextId;

async function _getAttachment(id) {
    let atta = await Attachment.findById(id);
    if (atta === null) {
        throw api.notFound('Attachment');
    }
    return atta;
}

async function _getAttachments(page) {
    page.total = await Attachment.count();
    if (page.isEmpty) {
        return [];
    }
    return await Attachment.findAll({
        order: 'created_at DESC',
        offset: page.offset,
        limit: page.limit
    });
}

async function createAttachment(user_id, name, description, buffer, mime, expectedImage) {
    let
        att_id = nextId(),
        res_id = nextId(),
        imageInfo = null;
    try {
        imageInfo = await image.getImageInfo(buffer);
    }
    catch (e) {
        // not an image
        logger.warn('attachment data is not an image.');
    }
    if (imageInfo !== null) {
        if (['png', 'jpeg', 'gif'].indexOf(imageInfo.format) !== (-1)) {
            mime = 'image/' + imageInfo.format;
        }
        else {
            imageInfo = null;
        }
    }
    if (imageInfo === null && expectedImage) {
        throw api.invalidParam('image');
    }
    await Resource.create({
        id: res_id,
        ref_id: att_id,
        value: buffer
    });
    return await Attachment.create({
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

async function _downloadAttachment(ctx, next) {
    let
        id = ctx.params.id,
        size = ctx.params.size || '0';
    if ('0sml'.indexOf(size) === (-1)) {
        ctx.response.status = 404;
        return;
    }
    let
        atta = await _getAttachment(id),
        mime = atta.mime,
        resource = await Resource.findById(atta.resource_id),
        data, origin_width, origin_height, target_width, resize;
    if (resource === null) {
        logger.error('could not find resource by id: ' + atta.resource_id);
        ctx.response.status = 500;
        return;
    }
    data = resource.value;
    if (size !== '0') {
        if (! mime.startsWith('image/')) {
            // cannot resize non-image resource:
            ctx.response.status = 400;
            return;
        }
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
            data = await image.resizeKeepAspect(data, origin_width, origin_height, target_width, 0);
        }
    }
    ctx.response.type = resize ? 'image/jpeg' : mime;
    ctx.response.body = data;
}

module.exports = {

    createAttachment: createAttachment,

    'GET /files/attachments/:id': _downloadAttachment,

    'GET /files/attachments/:id/:size': _downloadAttachment,

    'GET /api/attachments': async (ctx, next) => {
        /**
         * Get attachments by page.
         * 
         * @name Get Attachments
         * @param {number} [page=1]: The page number, starts from 1.
         * @return {object} Attachment objects and page information.
         */
        ctx.checkPermission(constants.role.CONTRIBUTOR);
        let
            page = helper.getPage(ctx.request),
            attachments = await _getAttachments(page);
        ctx.rest({
            page: page,
            attachments: attachments
        });
    },

    'GET /api/attachments/:id': async (ctx, next) => {
        /**
         * Get attachment.
         * 
         * @name Get Attachment
         * @param {string} id: Id of the attachment.
         * @return {object} Attachment object.
         * @error {resource:notfound} Attachment was not found by id.
         */
        ctx.checkPermission(constants.role.CONTRIBUTOR);
        let id = ctx.params.id;
        ctx.rest(await _getAttachment(id));
    },

    'POST /api/attachments/:id/delete': async (ctx, next) => {
        /**
         * Delete an attachment by its id.
         * 
         * @name Delete Attachment
         * @param {string} id: The id of the attachment.
         * @return {object} Object contains deleted id.
         * @error {resource:notfound} Attachment was not found by id.
         * @error {permission:denied} If current user has no permission.
         */
        ctx.checkPermission(constants.role.CONTRIBUTOR);
        let
            id = ctx.params.id,
            atta = await _getAttachment(id);
        if (ctx.state.__user__.role !== constants.role.ADMIN && ctx.state.__user__.id !== atta.user_id) {
            throw api.notAllowed('Permission denied.');
        }
        // delete:
        await atta.destroy();
        // delete all resources:
        await Resource.destroy({
            where: {
                'ref_id': id
            }
        });
        ctx.rest({ 'id': id });
    },

    'POST /api/attachments': async (ctx, next) => {
        /**
         * Create a new attachment.
         * 
         * @name Create Attachment
         * @param {string} [name]: Name of the attachment, default to filename.
         * @param {string} [mime=null]: Mime of the attachment, e.g. "application/pdf", all lowercase.
         * @param {string} [description]: Description of the attachment, default to ''.
         * @param {data} data: File data as base64.
         * @return {object} The created attachment object.
         * @error {permission:denied} If current user has no permission.
         */
        ctx.checkPermission(constants.role.CONTRIBUTOR);
        ctx.validate('createAttachment');
        let
            data = ctx.request.body,
            buffer = new Buffer(data.data, 'base64');
        ctx.rest(await createAttachment(
            ctx.state.__user__.id,
            data.name.trim(),
            data.description.trim(),
            buffer,
            data.mime || 'application/octet-stream',
            false
        ));
    }
};
