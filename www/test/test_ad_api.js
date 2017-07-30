'use strict';

// test ad api:

const
    appsetup = require('./_appsetup'), // <-- MUST be import first!
    appclose = require('./_appclose'),
    sleep = require('sleep-promise'),
    _ = require('lodash'),
    fs = require('fs'),
    moment = require('moment'),
    request = require('supertest'),
    expect = require('chai').expect,
    cache = require('../cache'),
    logger = require('../logger'),
    helper = require('../helper'),
    adApi = require('../controllers/adApi'),
    db = require('../db'),
    AdSlot = db.AdSlot,
    AdPeriod = db.AdPeriod,
    AdMaterial = db.AdMaterial,
    nextId = db.nextId,
    constants = require('../constants');

describe('#ad api', () => {

    before(appsetup);

    after(appclose);

    beforeEach(async () => {
        logger.info('delete all ads...');
        await AdMaterial.destroy($ALL);
        await AdPeriod.destroy($ALL);
        await AdSlot.destroy($ALL);
        // IMPORTANT: clear cache:
        await cache.remove(constants.cache.ADS);
        // create 2 AdSlots and set global variables:
        let response;
        response = await request($SERVER)
            .post('/api/adslots')
            .set('Authorization', auth($ADMIN))
            .send({
                name: 'A',
                description: 'slot-A',
                price: 100,
                width: 336,
                height: 280,
                num_slots: 2,
                num_auto_fill: 1,
                auto_fill: '<p>slot-A</p>'
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        global.$ADSLOT_1 = response.body;
        response = await request($SERVER)
            .post('/api/adslots')
            .set('Authorization', auth($ADMIN))
            .send({
                name: 'B',
                description: 'slot-B',
                price: 200,
                width: 300,
                height: 600,
                num_slots: 2,
                num_auto_fill: 1,
                auto_fill: '<p>slot-B</p>'
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        global.$ADSLOT_2 = response.body;
    });

    afterEach(async () => {
        // IMPORTANT: clear cache:
        await cache.remove(constants.cache.ADS);
    });

    it('should get 2 adslots', async () => {
        let response = await request($SERVER)
            .get('/api/adslots')
            .set('Authorization', auth($ADMIN))
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body).to.a('object');
        expect(response.body.adSlots).to.a('array').and.to.have.lengthOf(2);
        expect(response.body.adSlots[0]).to.a('object');
        expect(response.body.adSlots[0].name).to.equal('A');
        expect(response.body.adSlots[1]).to.a('object');
        expect(response.body.adSlots[1].name).to.equal('B');
    });

    it('create and should get 3 adslots', async () => {
        let response = await request($SERVER)
            .post('/api/adslots')
            .set('Authorization', auth($ADMIN))
            .send({
                name: 'C',
                description: 'slot-C',
                price: 300,
                width: 640,
                height: 480,
                num_slots: 2,
                num_auto_fill: 1,
                auto_fill: '<p>slot-C</p>'
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body).to.a('object');
        expect(response.body.name).to.equal('C');
        response = await request($SERVER)
            .get('/api/adslots')
            .set('Authorization', auth($ADMIN))
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body).to.a('object');
        expect(response.body.adSlots).to.a('array').and.to.have.lengthOf(3);
        expect(response.body.adSlots[0]).to.a('object');
        expect(response.body.adSlots[0].name).to.equal('A');
        expect(response.body.adSlots[1]).to.a('object');
        expect(response.body.adSlots[1].name).to.equal('B');
        expect(response.body.adSlots[2]).to.a('object');
        expect(response.body.adSlots[2].name).to.equal('C');
    });

    it('create adslots failed by editor failed', async () => {
        let response = await request($SERVER)
            .post('/api/adslots')
            .set('Authorization', auth($EDITOR))
            .send({
                name: 'C',
                description: 'slot-C',
                price: 300,
                width: 640,
                height: 480,
                num_slots: 2,
                num_auto_fill: 1,
                auto_fill: '<p>slot-C</p>'
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('permission:denied');
    });

    it('update adslot failed by editor', async () => {
        let id = $ADSLOT_1.id;
        let response = await request($SERVER)
            .post('/api/adslots/' + id)
            .set('Authorization', auth($EDITOR))
            .send({
                name: 'changed',
                description: 'slot-changed',
                price: 999,
                num_slots: 9,
                num_auto_fill: 3,
                auto_fill: '<p>slot-changed</p>'
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('permission:denied');
    });

    it('update adslot ok by admin', async () => {
        let id = $ADSLOT_1.id;
        let response = await request($SERVER)
            .post('/api/adslots/' + id)
            .set('Authorization', auth($ADMIN))
            .send({
                name: 'A-changed',
                description: 'slot-changed',
                price: 999,
                width: 666,
                height: 555,
                num_slots: 9,
                num_auto_fill: 3,
                auto_fill: '<p>slot-changed</p>'
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.name).to.be.a('string').and.to.equal('A-changed');
        // query to check:
        response = await request($SERVER)
            .get('/api/adslots')
            .set('Authorization', auth($ADMIN))
            .expect('Content-Type', /application\/json/)
            .expect(200);
        let adslot = response.body.adSlots[0];
        expect(adslot.name).to.equal('A-changed');
        expect(adslot.description).to.equal('slot-changed');
        expect(adslot.price).to.equal(999);
        expect(adslot.num_slots).to.equal(9);
        expect(adslot.num_auto_fill).to.equal(3);
        expect(adslot.auto_fill).to.equal('<p>slot-changed</p>');
        // width and height CANNOT be updated:
        expect(adslot.width).to.equal(336);
        expect(adslot.height).to.equal(280);
    });

    it('delete adslot failed by editor', async () => {
        let id = $ADSLOT_1.id;
        let response = await request($SERVER)
            .post('/api/adslots/' + id + '/delete')
            .set('Authorization', auth($EDITOR))
            .send({})
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('permission:denied');
    });

    it('delete adslot ok by admin', async () => {
        let id = $ADSLOT_1.id;
        let response = await request($SERVER)
            .post('/api/adslots/' + id + '/delete')
            .set('Authorization', auth($ADMIN))
            .send({})
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.id).to.equal(id);
        // query to check:
        response = await request($SERVER)
            .get('/api/adslots')
            .set('Authorization', auth($ADMIN))
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body).to.a('object');
        expect(response.body.adSlots).to.a('array').and.to.have.lengthOf(1);
    });

    it('should get empty active adperiods', async () => {
        let adperiods = await adApi.getActiveAdPeriods();
        expect(adperiods).to.a('array').and.to.have.lengthOf(0);
    });

    it('create adperiod by editor failed', async () => {
        let response = await request($SERVER)
            .post('/api/adperiods')
            .set('Authorization', auth($EDITOR))
            .send({
                user_id: $SPONSOR.id,
                adslot_id: $ADSLOT_1.id,
                start_at: '2017-07-08',
                months: 2
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('permission:denied');
    });

    it('create adperiod by admin failed for invalid sponsor', async () => {
        let response = await request($SERVER)
            .post('/api/adperiods')
            .set('Authorization', auth($ADMIN))
            .send({
                user_id: $EDITOR.id,
                adslot_id: $ADSLOT_1.id,
                start_at: '2017-07-08',
                months: 2
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('parameter:invalid');
        expect(response.body.data).to.equal('user_id');
    });

    it('create adperiod by admin failed for invalid start_at', async () => {
        let response = await request($SERVER)
            .post('/api/adperiods')
            .set('Authorization', auth($ADMIN))
            .send({
                user_id: $SPONSOR.id,
                adslot_id: $ADSLOT_1.id,
                start_at: '2017/07/08',
                months: 2
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('parameter:invalid');
        expect(response.body.data).to.equal('start_at');
        // start_at > 28:
        response = await request($SERVER)
            .post('/api/adperiods')
            .set('Authorization', auth($ADMIN))
            .send({
                user_id: $SPONSOR.id,
                adslot_id: $ADSLOT_1.id,
                start_at: '2017-07-29',
                months: 2
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('parameter:invalid');
        expect(response.body.data).to.equal('start_at');
    });

    it('create adperiod by admin failed for invalid months', async () => {
        let response = await request($SERVER)
            .post('/api/adperiods')
            .set('Authorization', auth($ADMIN))
            .send({
                user_id: $SPONSOR.id,
                adslot_id: $ADSLOT_1.id,
                start_at: '2017-07-08',
                months: 0
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('parameter:invalid');
        expect(response.body.data).to.equal('months');
    });

    it('create non-active adperiod by admin ok', async () => {
        let response = await request($SERVER)
            .post('/api/adperiods')
            .set('Authorization', auth($ADMIN))
            .send({
                user_id: $SPONSOR.id,
                adslot_id: $ADSLOT_1.id,
                start_at: '2016-07-08',
                months: 2
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.adslot_id).to.equal($ADSLOT_1.id);
        expect(response.body.start_at).to.equal('2016-07-08');
        expect(response.body.end_at).to.equal('2016-09-08');
        // check:
        let ps = await adApi.getActiveAdPeriods();
        expect(ps).to.be.a('array').and.to.have.lengthOf(0);
    });

    it('create active adperiod by admin ok', async () => {
        let
            start = moment().startOf('month'),
            end = start.clone().add(2, 'months');
        let response = await request($SERVER)
            .post('/api/adperiods')
            .set('Authorization', auth($ADMIN))
            .send({
                user_id: $SPONSOR.id,
                adslot_id: $ADSLOT_1.id,
                start_at: start.format('YYYY-MM-DD'),
                months: 2
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.adslot_id).to.equal($ADSLOT_1.id);
        expect(response.body.start_at).to.equal(start.format('YYYY-MM-DD'));
        expect(response.body.end_at).to.equal(end.format('YYYY-MM-DD'));
        // check:
        let ps = await adApi.getActiveAdPeriods();
        expect(ps).to.be.a('array').and.to.have.lengthOf(1);
        expect(ps[0].id).to.equal(response.body.id);
    });

    it('extend adperiod by editor failed', async () => {
        let response = await request($SERVER)
            .post('/api/adperiods/' + nextId() + '/extend')
            .set('Authorization', auth($EDITOR))
            .send({
                months: 2
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('permission:denied');
    });

    it('extend non-active adperiod by admin failed', async () => {
        let response = await request($SERVER)
            .post('/api/adperiods')
            .set('Authorization', auth($ADMIN))
            .send({
                user_id: $SPONSOR.id,
                adslot_id: $ADSLOT_1.id,
                start_at: '2016-07-08',
                months: 2
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        let adpId = response.body.id;
        response = await request($SERVER)
            .post('/api/adperiods/' + adpId + '/extend')
            .set('Authorization', auth($ADMIN))
            .send({
                months: 2
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('parameter:invalid');
        expect(response.body.data).to.equal('id');
    });

    it('extend active adperiod by admin failed', async () => {
        let
            start = moment().startOf('month'),
            end = start.clone().add(2, 'months');
        let response = await request($SERVER)
            .post('/api/adperiods')
            .set('Authorization', auth($ADMIN))
            .send({
                user_id: $SPONSOR.id,
                adslot_id: $ADSLOT_1.id,
                start_at: start.format('YYYY-MM-DD'),
                months: 2
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        let adpId = response.body.id;
        response = await request($SERVER)
            .post('/api/adperiods/' + adpId + '/extend')
            .set('Authorization', auth($ADMIN))
            .send({
                months: 0
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('parameter:invalid');
        expect(response.body.data).to.equal('months');
    });

    it('extend active adperiod by admin ok', async () => {
        let
            start = moment().startOf('month'),
            end = start.clone().add(2, 'months');
        let response = await request($SERVER)
            .post('/api/adperiods')
            .set('Authorization', auth($ADMIN))
            .send({
                user_id: $SPONSOR.id,
                adslot_id: $ADSLOT_1.id,
                start_at: start.format('YYYY-MM-DD'),
                months: 2
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        let adpId = response.body.id;
        response = await request($SERVER)
            .post('/api/adperiods/' + adpId + '/extend')
            .set('Authorization', auth($ADMIN))
            .send({
                months: 3
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.id).to.equal(adpId);
        expect(response.body.start_at).to.equal(start.format('YYYY-MM-DD'));
        expect(response.body.end_at).to.equal(end.clone().add(3, 'months').format('YYYY-MM-DD'));
    });

    it('create admaterial by editor failed', async () => {
        let
            start = moment().startOf('month'),
            end = start.clone().add(2, 'months');
        let response = await request($SERVER)
            .post('/api/adperiods')
            .set('Authorization', auth($ADMIN))
            .send({
                user_id: $SPONSOR.id,
                adslot_id: $ADSLOT_1.id,
                start_at: start.format('YYYY-MM-DD'),
                months: 2
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        let adpId = response.body.id;
        response = await request($SERVER)
            .post('/api/adperiods/' + adpId + '/admaterials')
            .set('Authorization', auth($EDITOR))
            .send({})
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('permission:denied');
    });

    it('create admaterial by another sponsor failed', async () => {
        let response = await request($SERVER)
            .post('/api/adperiods')
            .set('Authorization', auth($ADMIN))
            .send({
                user_id: $SPONSOR.id,
                adslot_id: $ADSLOT_1.id,
                start_at: '2017-01-01',
                months: 2
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        let adpId = response.body.id;
        response = await request($SERVER)
            .post('/api/adperiods/' + adpId + '/admaterials')
            .set('Authorization', auth($SPONSOR_2))
            .send({
                url: 'http://www.example.com/',
                image: fs.readFileSync(__dirname + '/res-image-336x280.jpg').toString('base64')
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('permission:denied');
    });

    it('create admaterial by sponsor failed for bad adperiod id', async () => {
        let response = await request($SERVER)
            .post('/api/adperiods/' + nextId() + '/admaterials')
            .set('Authorization', auth($SPONSOR))
            .send({
                url: ' http://www.sample.io/ ',
                weight: 100,
                start_at: '2017-01-01',
                image: fs.readFileSync(__dirname + '/res-image-336x280.jpg').toString('base64')
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('entity:notfound');
        expect(response.body.data).to.equal('AdPeriod');
    });

    it('create admaterial by sponsor failed for bad url', async () => {
        let
            start = moment().startOf('month'),
            end = start.clone().add(2, 'months');
        let response = await request($SERVER)
            .post('/api/adperiods')
            .set('Authorization', auth($ADMIN))
            .send({
                user_id: $SPONSOR.id,
                adslot_id: $ADSLOT_1.id,
                start_at: start.format('YYYY-MM-DD'),
                months: 2
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        let adpId = response.body.id;
        // bad url:
        response = await request($SERVER)
            .post('/api/adperiods/' + adpId + '/admaterials')
            .set('Authorization', auth($SPONSOR))
            .send({
                url: '  ', // invalid url
                weight: 100,
                start_at: start.format('YYYY-MM-DD'),
                end_at: end.format('YYYY-MM-DD'),
                image: fs.readFileSync(__dirname + '/res-image-336x280.jpg').toString('base64')
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('parameter:invalid');
        expect(response.body.data).to.equal('url');
        // bad url:
        response = await request($SERVER)
            .post('/api/adperiods/' + adpId + '/admaterials')
            .set('Authorization', auth($SPONSOR))
            .send({
                url: ' ftp://www.sample.io/ ', // invalid url
                weight: 100,
                start_at: start.format('YYYY-MM-DD'),
                end_at: end.format('YYYY-MM-DD'),
                image: fs.readFileSync(__dirname + '/res-image-336x280.jpg').toString('base64')
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('parameter:invalid');
        expect(response.body.data).to.equal('url');
    });

    it('create admaterial by sponsor failed for bad image', async () => {
        let
            start = moment().startOf('month'),
            end = start.clone().add(2, 'months');
        let response = await request($SERVER)
            .post('/api/adperiods')
            .set('Authorization', auth($ADMIN))
            .send({
                user_id: $SPONSOR.id,
                adslot_id: $ADSLOT_1.id,
                start_at: start.format('YYYY-MM-DD'),
                months: 2
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        let adpId = response.body.id;
        // bad image:
        response = await request($SERVER)
            .post('/api/adperiods/' + adpId + '/admaterials')
            .set('Authorization', auth($SPONSOR))
            .send({
                url: 'http://www.example.com/',
                weight: 100,
                start_at: start.format('YYYY-MM-DD'),
                end_at: end.format('YYYY-MM-DD'),
                image: fs.readFileSync(__dirname + '/res-html-0.html').toString('base64')
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('parameter:invalid');
        expect(response.body.data).to.equal('image');
        // bad image:
        response = await request($SERVER)
            .post('/api/adperiods/' + adpId + '/admaterials')
            .set('Authorization', auth($SPONSOR))
            .send({
                url: 'http://www.example.com/',
                weight: 100,
                start_at: start.format('YYYY-MM-DD'),
                end_at: end.format('YYYY-MM-DD'),
                // image too large:
                image: fs.readFileSync(__dirname + '/res-image-2.jpg').toString('base64')
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('parameter:invalid');
        expect(response.body.data).to.equal('image');
    });

    it('create admaterial by sponsor ok', async () => {
        let
            start = moment().startOf('month'),
            end = start.clone().add(2, 'months');
        let response = await request($SERVER)
            .post('/api/adperiods')
            .set('Authorization', auth($ADMIN))
            .send({
                user_id: $SPONSOR.id,
                adslot_id: $ADSLOT_1.id,
                start_at: start.format('YYYY-MM-DD'),
                months: 2
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        let adpId = response.body.id;
        response = await request($SERVER)
            .post('/api/adperiods/' + adpId + '/admaterials')
            .set('Authorization', auth($SPONSOR))
            .send({
                url: ' http://www.example.com/ ',
                weight: 100,
                start_at: start.format('YYYY-MM-DD'),
                end_at: end.format('YYYY-MM-DD'),
                image: fs.readFileSync(__dirname + '/res-image-336x280.jpg').toString('base64')
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body).to.a('object');
        expect(response.body.user_id).to.equal($SPONSOR.id);
        expect(response.body.adperiod_id).to.equal(adpId);
        expect(response.body.start_at).to.equal(start.format('YYYY-MM-DD'));
        expect(response.body.end_at).to.equal(end.format('YYYY-MM-DD'));
        expect(response.body.url).to.equal('http://www.example.com/');
        expect(response.body.cover_id).to.a('string');
        // download image:
        let imageId = response.body.cover_id;
        response = await request($SERVER)
            .get('/files/attachments/' + imageId)
            .expect('Content-Type', /image\/jpeg/)
            .expect('Content-Length', '12834')
            .expect(200);
        // download size of s, m, l:
        for (let size of ['s', 'm', 'l']) {
            response = await request($SERVER)
                .get(`/files/attachments/${imageId}/${size}`)
                .expect(200);
        }
    });

    it('create admaterial by sponsor failed for too many', async () => {
        let
            start = moment().startOf('month'),
            end = start.clone().add(2, 'months');
        let response = await request($SERVER)
            .post('/api/adperiods')
            .set('Authorization', auth($ADMIN))
            .send({
                user_id: $SPONSOR.id,
                adslot_id: $ADSLOT_1.id,
                start_at: start.format('YYYY-MM-DD'),
                months: 2
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        let adpId = response.body.id;
        // create 10 AdMaterials:
        for (let i=0; i<10; i++) {
            response = await request($SERVER)
                .post('/api/adperiods/' + adpId + '/admaterials')
                .set('Authorization', auth($SPONSOR))
                .send({
                    url: ' http://www.example.com/' + i,
                    weight: 10 + i,
                    start_at: start.format('YYYY-MM-DD'),
                    end_at: end.format('YYYY-MM-DD'),
                    image: fs.readFileSync(__dirname + '/res-image-336x280.jpg').toString('base64')
                })
                .expect('Content-Type', /application\/json/)
                .expect(200);
            expect(response.body).to.a('object');
            expect(response.body.user_id).to.equal($SPONSOR.id);
            expect(response.body.adperiod_id).to.equal(adpId);
            expect(response.body.url).to.equal('http://www.example.com/' + i);
        }
        // create another:
        response = await request($SERVER)
            .post('/api/adperiods/' + adpId + '/admaterials')
            .set('Authorization', auth($SPONSOR))
            .send({
                url: ' http://www.example.com/ ',
                weight: 100,
                start_at: start.format('YYYY-MM-DD'),
                end_at: end.format('YYYY-MM-DD'),
                image: fs.readFileSync(__dirname + '/res-image-336x280.jpg').toString('base64')
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('maximum:reached');
    });

    it('create admaterial by sponsor ok then delete it', async () => {
        let
            start = moment().startOf('month'),
            end = start.clone().add(2, 'months');
        let response = await request($SERVER)
            .post('/api/adperiods')
            .set('Authorization', auth($ADMIN))
            .send({
                user_id: $SPONSOR.id,
                adslot_id: $ADSLOT_1.id,
                start_at: start.format('YYYY-MM-DD'),
                months: 2
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        let adpId = response.body.id;
        response = await request($SERVER)
            .post('/api/adperiods/' + adpId + '/admaterials')
            .set('Authorization', auth($SPONSOR))
            .send({
                url: ' http://www.example.com/',
                weight: 10,
                start_at: start.format('YYYY-MM-DD'),
                end_at: end.format('YYYY-MM-DD'),
                image: fs.readFileSync(__dirname + '/res-image-336x280.jpg').toString('base64')
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body).to.a('object');
        expect(response.body.user_id).to.equal($SPONSOR.id);
        expect(response.body.adperiod_id).to.equal(adpId);
        let admId = response.body.id;
        // delete it by another sponsor:
        response = await request($SERVER)
            .post('/api/admaterials/' + admId + '/delete')
            .set('Authorization', auth($SPONSOR_2))
            .send({})
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('permission:denied');
        // delete it ok:
        response = await request($SERVER)
            .post('/api/admaterials/' + admId + '/delete')
            .set('Authorization', auth($SPONSOR))
            .send({})
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.id).to.equal(admId);
    });

});
