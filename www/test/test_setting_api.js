'use strict';

// test setting api:

const
    appsetup = require('./_appsetup'), // <-- MUST be import first!
    appclose = require('./_appclose'),
    request = require('supertest'),
    expect = require('chai').expect,
    db = require('../db'),
    logger = require('../logger'),
    cache = require('../cache'),
    constants = require('../constants'),
    Setting = db.Setting,
    settingApi = require('../controllers/settingApi');

describe('#settings', () => {

    before(appsetup);

    after(appclose);

    beforeEach(async () => {
        logger.info('delete all settings...');
        await Setting.destroy($ALL);
        // IMPORTANT: clear cache:
        await cache.remove(constants.cache.WEBSITE);
        await cache.remove(constants.cache.SNIPPETS);
    });

    afterEach(async () => {
        // IMPORTANT: clear cache:
        await cache.remove(constants.cache.WEBSITE);
        await cache.remove(constants.cache.SNIPPETS);
    });

    it('get setting definition failed/ok', async () => {
        var response;
        // editor:
        response = await request($SERVER)
                .get('/api/settings/definitions')
                .set('Authorization', auth($EDITOR))
                .expect('Content-Type', /application\/json/)
                .expect(400);
        expect(response.body.error).to.equal("permission:denied");
        // admin:
        response = await request($SERVER)
                .get('/api/settings/definitions')
                .set('Authorization', auth($ADMIN))
                .expect('Content-Type', /application\/json/)
                .expect(200);
        expect(response.body.website).to.be.a('array');
        expect(response.body.snippets).to.be.a('array');
    });

    it('get settings of website failed/ok', async () => {
        var response;
        // editor:
        response = await request($SERVER)
                .get('/api/settings/website')
                .set('Authorization', auth($EDITOR))
                .expect('Content-Type', /application\/json/)
                .expect(400);
        expect(response.body.error).to.equal("permission:denied");
        // admin:
        response = await request($SERVER)
                .get('/api/settings/website')
                .set('Authorization', auth($ADMIN))
                .expect('Content-Type', /application\/json/)
                .expect(200);
        expect(response.body).to.be.a('object');
        expect(response.body.name).to.equal('My Website');
    });

    it('get settings of snippets failed/ok', async () => {
        var response;
        // editor:
        response = await request($SERVER)
                .get('/api/settings/snippets')
                .set('Authorization', auth($EDITOR))
                .expect('Content-Type', /application\/json/)
                .expect(400);
        expect(response.body.error).to.equal("permission:denied");
        // admin:
        response = await request($SERVER)
                .get('/api/settings/snippets')
                .set('Authorization', auth($ADMIN))
                .expect('Content-Type', /application\/json/)
                .expect(200);
        expect(response.body).to.be.a('object');
        expect(response.body.body_top).to.equal('<!-- body_top -->');
    });

    it('update settings of website failed/ok', async () => {
        var response;
        // editor:
        response = await request($SERVER)
                .post('/api/settings/website')
                .set('Authorization', auth($EDITOR))
                .send({
                    name: 'New Name',
                    description: 'New Description',
                    keywords: 'hello,world',
                    custom_header: '<h1>Hello</h1>'
                })
                .expect('Content-Type', /application\/json/)
                .expect(400);
        expect(response.body.error).to.equal("permission:denied");
        // admin:
        response = await request($SERVER)
                .post('/api/settings/website')
                .set('Authorization', auth($ADMIN))
                .send({
                    name: 'New Name',
                    description: 'New Description',
                    keywords: 'hello,world',
                    custom_header: '<h1>Hello</h1>',
                    invalid_key: 'invalid-key'
                })
                .expect('Content-Type', /application\/json/)
                .expect(200);
        expect(response.body).to.be.a('object');
        expect(response.body.name).to.equal('New Name');
        expect(response.body.invalid_key).to.a('undefined');
        // get setting by function:
        var ss = await settingApi.getWebsiteSettings();
        expect(ss).to.be.a('object');
        expect(ss.name).to.equal('New Name');
        expect(ss.invalid_key).to.a('undefined');
    });

    it('update settings of snippets failed/ok', async () => {
        var response;
        // editor:
        response = await request($SERVER)
                .post('/api/settings/snippets')
                .set('Authorization', auth($EDITOR))
                .send({
                    body_top: '<h1>top</h1>',
                    body_bottom: '<hr>',
                    invalid_key: '<div>invalid</div>'
                })
                .expect('Content-Type', /application\/json/)
                .expect(400);
        expect(response.body.error).to.equal("permission:denied");
        // admin:
        response = await request($SERVER)
                .post('/api/settings/snippets')
                .set('Authorization', auth($ADMIN))
                .send({
                    body_top: '<h1>top</h1>',
                    body_bottom: '<hr>',
                    invalid_key: '<div>invalid</div>'
                })
                .expect('Content-Type', /application\/json/)
                .expect(200);
        expect(response.body).to.be.a('object');
        expect(response.body.body_top).to.equal('<h1>top</h1>');
        expect(response.body.invalid_key).to.a('undefined');
        // get setting by function:
        var ss = await settingApi.getSnippets();
        expect(ss).to.be.a('object');
        expect(ss.body_top).to.equal('<h1>top</h1>');
        expect(ss.invalid_key).to.a('undefined');
    });

});
