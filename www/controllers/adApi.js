'use strict';

// ad api

const
    _ = require('lodash'),
    moment = require('moment'),
    api = require('../api'),
    db = require('../db'),
    cache = require('../cache'),
    logger = require('../logger'),
    helper = require('../helper'),
    config = require('../config'),
    constants = require('../constants'),
    attachmentApi = require('./attachmentApi'),
    userApi = require('./userApi'),
    User = db.User,
    AdMaterial = db.AdMaterial,
    AdPeriod = db.AdPeriod,
    AdSlot = db.AdSlot,
    nextId = db.nextId;

async function _getAdSlots() {
    return await AdSlot.findAll({
        order: 'name'
    });
}

async function _getAdSlot(id) {
    let
        adslots = await _getAdSlots(),
        filtered = adslots.filter((ad) => {
            return ad.id === id;
        });
    if (filtered.length === 0) {
        throw api.notFound('AdSlot');
    }
    return filtered[0];
}

async function _getAdPeriod(adperiodId) {
    let adperiod = await AdPeriod.findById(adperiodId);
    if (adperiod === null) {
        throw api.notFound('AdPeriod');
    }
    return adperiod;
}

async function _getActiveAdPeriods(orderBy='end_at DESC') {
    let
        today = _today(),
        adperiods = await AdPeriod.findAll({
            where: {
                start_at: {
                    $lte: today
                },
                end_at: {
                    $gt: today
                }
            },
            order: orderBy
        });
    await userApi.bindUsers(adperiods);
    return adperiods;
}

async function _getAllAdPeriods(userId=null) {
    let adperiods;
    if (userId) {
        adperiods = await AdPeriod.findAll({
            where: {
                user_id: userId
            },
            order: 'end_at DESC'
        });
    } else {
        adperiods = await AdPeriod.findAll({
            order: 'end_at DESC'
        });
    }
    await userApi.bindUsers(adperiods);
    return adperiods;
}

async function _getUnexpiredAdPeriods(adslotId=null) {
    let
        adperiods,
        today = _today();
    if (adslotId) {
        adperiods = await AdPeriod.findAll({
            where: {
                adslot_id: adslotId,
                end_at: {
                    $gt: today
                }
            },
            order: 'end_at DESC'
        });
    } else {
        adperiods = await AdPeriod.findAll({
            where: {
                end_at: {
                    $gt: today
                }
            },
            order: 'end_at DESC'
        });
    }
    await userApi.bindUsers(adperiods);
    return adperiods;
}

async function _getActiveAdPeriod(adperiodId) {
    let adperiod = await AdPeriod.findById(adperiodId);
    if (adperiod === null) {
        throw api.notFound('AdPeriod');
    }
    if (!_isActive(adperiod)) {
        throw api.conflictError('AdPeriod', 'Not active AdPeriod.');
    }
    return adperiod;
}

async function _deleteAdMaterials(ctx, adperiod_id) {
    let ms = await AdMaterial.findAll({
        where: {
            adperiod_id: adperiod_id
        }
    });
    for (let m of ms) {
        await attachmentApi.deleteAttachment(ctx, m.cover_id);
        await m.destroy();
    }
    await AdMaterial.destroy({
        where: {
            adperiod_id: adperiod_id
        }
    });
}

async function _getAdMaterials(adperiodId) {
    if (adperiodId) {
        return await AdMaterial.findAll({
            where: {
                adperiod_id: adperiodId
            },
            order: 'created_at'
        });
    } else {
        return await AdMaterial.findAll({
            order: 'created_at'
        });
    }
}

function _isActive(adperiod) {
    /**
     * Check if start <= now < end.
     */
    let today = _today();
    return (adperiod.start_at <= today) && (today < adperiod.end_at);
}

function _isExpired(adperiod) {
    /**
     * Check if today >= end.
     */
    let today = _today();
    return today >= adperiod.end_at;
}

function _addMonths(start, months) {
    /**
     * start date is 1~28.
     */
    let m = moment(start).add(months, 'months');
    return m.format('YYYY-MM-DD');
}

function _today() {
    return moment().format('YYYY-MM-DD');
}

function _buildAd(today, slot, periods, materials) {
    logger.info('build ad...' + JSON.stringify(slot));
    let
        _isActiveAdMaterial = (adm) => {
            let
                start_at = adm.start_at === '' ? '0000-00-00' : adm.start_at,
                end_at = adm.end_at === '' ? '9999-99-99' : adm.end_at;
            return (today >= start_at) && (today < end_at);
        },
        ps = _.filter(periods, (p) => {
            return p.adslot_id === slot.id;
        }),
        adperiods = _.map(ps, (p) => {
            return {
                user: p.user.name,
                admaterials: _.map(_.filter(materials, (m) => {
                    return m.adperiod_id === p.id && _isActiveAdMaterial(m);
                }), (m) => {
                    return {
                        image: '/files/attachments/' + m.cover_id + '/0',
                        weight: m.weight,
                        url: m.url
                    }
                })
            };
        });
    let num_auto_fill = slot.num_slots - adperiods.length;
    num_auto_fill = Math.max(num_auto_fill, 0);
    num_auto_fill = Math.min(num_auto_fill, slot.num_auto_fill);
    return {
        name: slot.name,
        width: slot.width,
        height: slot.height,
        auto_fill: slot.auto_fill,
        num_auto_fill: num_auto_fill,
        adperiods: adperiods
    };
}

async function _getAds() {
    let
        today = _today(),
        slots = await _getAdSlots(),
        periods = await _getActiveAdPeriods('display_order'),
        materials = await _getAdMaterials(),
        slot,
        results = {};
    for (slot of slots) {
        results[slot.alias] = _buildAd(today, slot, periods, materials);
    }
    return results;
}

async function _clearCache() {
    await cache.remove(constants.cache.ADS);
}

module.exports = {

    getAdSlots: _getAdSlots,

    getAllAdPeriods: _getAllAdPeriods,

    getActiveAdPeriods: _getActiveAdPeriods,

    getAdMaterials: _getAdMaterials,

    getAds: _getAds,

    'GET /api/adslots': async function (ctx, next) {
        /**
         * Get all ad slots.
         * 
         * @name Get ADSlots
         * @return {object} AdSlot object.
         */
        ctx.checkPermission(constants.role.ADMIN);
        ctx.rest({
            adslots: await _getAdSlots()
        });
    },

    'GET /api/adslots/:id': async function (ctx, next) {
        /**
         * Get ad slot by id.
         * 
         * @name Get ad slot by id.
         * @return {object} AdSlot object.
         */
        ctx.checkPermission(constants.role.ADMIN);
        ctx.rest(await _getAdSlot(ctx.params.id));
    },

    'POST /api/adslots': async (ctx, next) => {
        /**
         * Create adslot object.
         * 
         * @name Create AdSlot object
         * @param {string} name: Name of adslots.
         * @param {string} description: Description of adslots.
         * @param {number} price: Price of adslots.
         * @param {number} width: Width of adslots.
         * @param {number} height: Height of adslots.
         * @param {number} num_slots: Number of adslots.
         * @param {number} num_auto_fill: Number of auto-filled adslots.
         * @param {string} auto_fill: Content of auto-fill ad.
         * @return {object} The updated adslot object.
         * @error {parameter:invalid} If some parameter is invalid.
         * @error {permission:denied} If current user has no permission.
         */
        ctx.checkPermission(constants.role.ADMIN);
        ctx.validate('createAdSlot');
        let
            data = ctx.request.body,
            name = data.name.trim(),
            alias = data.alias,
            adslots = await _getAdSlots(),
            filtered = adslots.filter((ad) => {
                return ad.name === name;
            });
        if (filtered.length > 0) {
             throw api.invalidParam('name');
        }
        // create adslot:
        let adslot = await AdSlot.create({
            name: name,
            alias: alias,
            description: data.description.trim(),
            price: data.price,
            width: data.width,
            height: data.height,
            num_slots: data.num_slots,
            num_auto_fill: data.num_auto_fill,
            auto_fill: data.auto_fill.trim()
        });
        await _clearCache();
        ctx.rest(adslot);
    },

    'POST /api/adslots/:id': async (ctx, next) => {
        /**
         * Update adslot object.
         * 
         * @name Update AdSlot object
         * @param {string} name: Name of adslots.
         * @param {string} description: Description of adslots.
         * @param {number} price: Price of adslots.
         * @param {number} num_slots: Number of adslots.
         * @param {number} num_auto_fill: Number of auto-filled adslots.
         * @param {string} auto_fill: Content of auto-fill ad.
         * @return {object} The updated adslot object.
         * @error {parameter:invalid} If some parameter is invalid.
         * @error {permission:denied} If current user has no permission.
         */
        ctx.checkPermission(constants.role.ADMIN);
        ctx.validate('updateAdSlot');
        let
            id = ctx.params.id,
            data = ctx.request.body,
            adslot = await _getAdSlot(id);
        // update:
        if (data.name) {
            adslot.name = data.name.trim();
        }
        if (data.description) {
            adslot.description = data.description.trim();
        }
        if (data.price) {
            adslot.price = data.price;
        }
        if (data.num_slots) {
            adslot.num_slots = data.num_slots;
        }
        if (data.num_auto_fill) {
            adslot.num_auto_fill = data.num_auto_fill;
        }
        if (data.auto_fill !== undefined) {
            adslot.auto_fill = data.auto_fill.trim();
        }
        await adslot.save();
        await _clearCache();
        ctx.rest(adslot);
    },

    'POST /api/adslots/:id/delete': async (ctx, next) => {
        /**
         * Delete an AdSlot.
         * 
         * @name Delete AdSlot
         * @param {string} id: Id of the AdSlot.
         * @return {object} Object contains deleted id.
         * @error {resource:notfound} AdSlot not found by id.
         * @error {permission:denied} If current user has no permission.
         */
        ctx.checkPermission(constants.role.ADMIN);
        let
            id = ctx.params.id,
            adslot = await _getAdSlot(id),
            adperiods = await _getUnexpiredAdPeriods(adslot.id);
        if (adperiods.length > 0) {
            throw api.conflictError('AdPeriod', 'Cannot delete AdSlot because there are some unexpired associated AdPeriods');
        }
        await adslot.destroy();
        await _clearCache();
        ctx.rest({ id: id });
    },

    'GET /api/adperiods': async (ctx, next) => {
        /**
         * Get all AdPeriods.
         * 
         * @name Get all AdPeriods.
         */
        ctx.checkPermission(constants.role.ADMIN);
        let adperiods = await _getAllAdPeriods();
        ctx.rest({
            adperiods: adperiods
        });
    },

    'POST /api/adperiods': async (ctx, next) => {
        /**
         * Create an AdPeriod.
         * 
         * @name Create AdPeriod object
         * @param {string} user_id: User id.
         * @param {string} adslot_id: AdSlot id.
         * @param {string} start_at: Start of date, 'YYYY-MM-DD'.
         * @param {number} months: Months.
         * @return {object} The created AdPeriod object.
         * @error {parameter:invalid} If some parameter is invalid.
         * @error {permission:denied} If current user has no permission.
         */
        ctx.checkPermission(constants.role.ADMIN);
        ctx.validate('createAdPeriod');
        let
            data = ctx.request.body,
            start_at = data.start_at,
            months = data.months,
            user = await userApi.getUser(data.user_id),
            adslot = await _getAdSlot(data.adslot_id),
            adperiods = await _getUnexpiredAdPeriods(adslot.id);
        let startAtDate = moment(start_at);
        if (! startAtDate.isValid()) {
            throw api.invalidParam('start_at', 'Invalid format of start_at.');
        }
        if (startAtDate.date() > 28) {
            throw api.invalidParam('start_at', 'Please specify start day 1~28.');
        }
        if (months < 1 || months > 12) {
            throw api.invalidParam('months', 'Must be 1~12.');
        }
        if (user.role !== constants.role.SPONSOR) {
            throw api.invalidParam('user_id', 'Not a sponsor user.');
        }
        // check if adslots is full:
        if (adperiods.length >= adslot.num_slots) {
            throw api.conflictError('adslot_id', 'Maximum AdPeroids reached.');
        }
        // create adperiods:
        let
            end_at = _addMonths(start_at, months),
            max_display_order = await AdPeriod.max('display_order');
        let adperiod = await AdPeriod.create({
            user_id: user.id,
            adslot_id: adslot.id,
            start_at: start_at,
            end_at: end_at,
            display_order: isNaN(max_display_order) ? 0 : max_display_order + 1
        });
        await _clearCache();
        ctx.rest(adperiod);
    },

    'POST /api/adperiods/:id/delete': async (ctx, next) => {
        /**
         * Delete an AdPeriod.
         * 
         * @name Delete an AdPeriod.
         * @param {string} id The AdPeriod id.
         */
        ctx.checkPermission(constants.role.ADMIN);
        let
            id = ctx.params.id,
            adperiod = await _getAdPeriod(id);
        if (! _isExpired(adperiod)) {
            throw api.invalidParam('id', 'AdPeriod is not expired.');
        }
        // delete AdPeriod:
        await adperiod.destroy();
        // delete all AdMaterials
        await _deleteAdMaterials(ctx, id);
        await _clearCache();
        ctx.rest({
            id: id
        });
    },

    'POST /api/adperiods/:id/extend': async (ctx, next) => {
        /**
         * Extend an AdPeriod.
         * 
         * @name Extend an AdPeriod.
         * @param {string} id The AdPeriod id.
         * @param {number} months: Months.
         */
        ctx.checkPermission(constants.role.ADMIN);
        ctx.validate('extendAdPeriod');
        let
            id = ctx.params.id,
            data = ctx.request.body,
            months = data.months,
            adperiod = await _getAdPeriod(id);
        if (_isExpired(adperiod)) {
            throw api.invalidParam('id', 'AdPeriod is expired.');
        }
        if (months < 1 || months > 12) {
            throw api.invalidParam('months');
        }
        adperiod.end_at = _addMonths(adperiod.end_at, months);
        await adperiod.save();
        await _clearCache();
        ctx.rest(adperiod);
    },

    'POST /api/adperiods/:id/admaterials': async (ctx, next) => {
        /**
         * Create a new AdMaterial.
         */
        // special check permission:
        if (ctx.state.__user__ === null || (ctx.state.__user__.role !== constants.role.ADMIN && ctx.state.__user__.role !== constants.role.SPONSOR)) {
            logger.warn('check permission failed: expected = ADMIN or SPONSOR, actual = ' + (ctx.state.__user__ ? ctx.state.__user__.role : 'null'));
            throw api.notAllowed('Do not have permission.');
        }
        ctx.validate('createAdMaterial');
        let
            id = ctx.params.id,
            data = ctx.request.body,
            url = data.url.trim(),
            weight = data.weight || 100,
            start_at = data.start_at || '',
            end_at = data.end_at || '',
            geo = data.geo || '',
            keywords = data.keywords || '',
            adperiod = await _getAdPeriod(id),
            adslot = await _getAdSlot(adperiod.adslot_id),
            user = ctx.state.__user__;
        if (user.role !== constants.role.ADMIN && user.id !== adperiod.user_id) {
            logger.warn('check permission failed: not owner sponsor');
            throw api.notAllowed('Do not have permission.');
        }
        if (_isExpired(adperiod)) {
            throw api.invalidParam('id', 'AdPeriod is expired.');
        }
        // check
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            throw api.invalidParam('url', 'Must be start with http:// or https://');
        }
        // check image:
        let
            maxSize = adslot.width * adslot.height / 2,
            imageBuffer = new Buffer(data.image, 'base64');
        if (imageBuffer.length > maxSize) {
            throw api.invalidParam('image', 'Image is too large.');
        }
        // check if reached the maximum number:
        let count = await AdMaterial.count({
            where: {
                adperiod_id: id
            }
        });
        if (count >= 10) {
            throw api.error('maximum:reached', 'Too many AdMaterial: 10');
        }
        // create:
        let imageName = user.name;
        let attachment = await attachmentApi.createAttachment(
            user.id,
            imageName,
            imageName,
            imageBuffer,
            null,
            true);
        let admaterial = await AdMaterial.create({
            user_id: user.id,
            adperiod_id: adperiod.id,
            weight: weight,
            start_at: start_at,
            end_at: end_at,
            geo: geo,
            keywords: keywords,
            url: url,
            cover_id: attachment.id
        });
        await _clearCache();
        ctx.rest(admaterial);
    },

    'GET /api/admaterials': async (ctx, next) => {
        ctx.checkPermission(constants.role.ADMIN);
        ctx.rest({
            admaterials: await _getAdMaterials()
        });
    },

    'POST /api/admaterials/:id/delete': async (ctx, next) => {
        /**
         * Delete an AdMaterial.
         * 
         * @param {string} id The AdMaterial id.
         */
        // special check permission:
        if (ctx.state.__user__ === null || (ctx.state.__user__.role !== constants.role.ADMIN && ctx.state.__user__.role !== constants.role.SPONSOR)) {
            logger.warn('check permission failed: expected = ADMIN or SPONSOR, actual = ' + (ctx.state.__user__ ? ctx.state.__user__.role : 'null'));
            throw api.notAllowed('Do not have permission.');
        }
        let
            id = ctx.params.id,
            admaterial = await AdMaterial.findById(id),
            user = ctx.state.__user__;
        if (admaterial === null) {
            throw api.notFound('AdMaterial');
        }
        if (user.role !== constants.role.ADMIN && user.id !== admaterial.user_id) {
            logger.warn('check permission failed: not owner sponsor');
            throw api.notAllowed('Do not have permission.');
        }
        await admaterial.destroy();
        await attachmentApi.deleteAttachment(ctx, admaterial.cover_id);
        await _clearCache();
        ctx.rest({ id: id });
    }
};
