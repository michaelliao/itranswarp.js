'use strict';

// test article api:

const
    appsetup = require('./_appsetup'), // <-- MUST be import first!
    appclose = require('./_appclose'),
    sleep = require('sleep-promise'),
    _ = require('lodash'),
    fs = require('fs'),
    request = require('supertest'),
    expect = require('chai').expect,
    cache = require('../cache'),
    logger = require('../logger'),
    helper = require('../helper'),
    db = require('../db'),
    Category = db.Category,
    Article = db.Article,
    Text = db.Text,
    nextId = db.nextId,
    constants = require('../constants');

describe('#article api', () => {

    before(appsetup);

    after(appclose);

    beforeEach(async () => {
        logger.info('delete all articles...');
        await Category.destroy($ALL);
        await Article.destroy($ALL);
        await Text.destroy($ALL);
        // IMPORTANT: clear cache:
        await cache.remove(constants.cache.CATEGORIES);
        await cache.remove(constants.cache.ARTICLE_FEED);
        // create 2 categories and set global variables:
        let response;
        response = await request($SERVER)
            .post('/api/categories')
            .set('Authorization', auth($ADMIN))
            .send({
                name: 'Article Category 1',
                tag: 'cat1'
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        global.$CATEGORY_1 = response.body;
        response = await request($SERVER)
            .post('/api/categories')
            .set('Authorization', auth($ADMIN))
            .send({
                name: 'Article Category 2',
                tag: 'cat2'
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        global.$CATEGORY_2 = response.body;
    });

    afterEach(async () => {
        // IMPORTANT: clear cache:
        await cache.remove(constants.cache.CATEGORIES);
        await cache.remove(constants.cache.ARTICLE_FEED);
    });

    it('should get empty articles', async () => {
        let response = await request($SERVER)
            .get('/api/articles')
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body).to.a('object');
        expect(response.body.page).to.a('object');
        expect(response.body.page.total).to.equal(0);
        expect(response.body.articles).to.a('array').and.to.have.lengthOf(0);
    });

    it('create article by contributor failed', async () => {
        let response = await request($SERVER)
            .post('/api/articles')
            .set('Authorization', auth($CONTRIB))
            .send({
                category_id: $CATEGORY_1.id,
                name: 'try create article',
                description: 'short description...',
                tags: 'a,b,c',
                content: 'blablabla...',
                image: fs.readFileSync(__dirname + '/res-image.jpg').toString('base64')
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('permission:denied');
    });

    it('create by admin and update, delete by editor failed', async () => {
        // create article by admin:
        let response = await request($SERVER)
            .post('/api/articles')
            .set('Authorization', auth($ADMIN))
            .send({
                category_id: $CATEGORY_1.id,
                name: ' Article 1 ',
                description: '  blablabla\nhaha...  \n  ',
                tags: ' aaa,\n BBB,  \t ccc,CcC ',
                content: 'Long content...',
                image: fs.readFileSync(__dirname + '/res-image.jpg').toString('base64')
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.user_id).to.equal($ADMIN.id);
        expect(response.body.category_id).to.equal($CATEGORY_1.id);
        expect(response.body.cover_id).to.a('string').and.to.have.lengthOf(50); // ID length
        expect(response.body.content_id).to.a('string').and.to.have.lengthOf(50); // ID length
        expect(response.body.name).to.equal('Article 1');
        expect(response.body.description).to.equal('blablabla\nhaha...');
        expect(response.body.tags).to.equal('aaa,BBB,ccc');
        expect(response.body.content).to.equal('Long content...');

        let articleId = response.body.id;
        // update by editor failed:
        response = await request($SERVER)
            .post(`/api/articles/${articleId}`)
            .set('Authorization', auth($EDITOR))
            .send({
                name: ' update name',
                description: '  update...  \n  ',
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('permission:denied');
        // delete by editor failed:
        response = await request($SERVER)
            .post(`/api/articles/${articleId}/delete`)
            .set('Authorization', auth($EDITOR))
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('permission:denied');
    });

    it('create and update article by editor', async () => {
        let response;
        // create article by editor failed for missing parameter:
        let validParams = {
            category_id: $CATEGORY_1.id,
            name: ' Test Article  ',
            description: '  blablabla\nhaha...  \n  ',
            tags: ' aaa,\n BBB,  \t ccc,CcC ',
            content: 'Long content...',
            image: fs.readFileSync(__dirname + '/res-image.jpg').toString('base64')
        };
        let keys = ['category_id', 'name', 'description', 'content', 'image'];
        for (let i=0; i<keys.length; i++) {
            let
                key = keys[i],
                invalidParams = _.clone(validParams);
            delete invalidParams[key];
            response = await request($SERVER)
                .post('/api/articles')
                .set('Authorization', auth($EDITOR))
                .send(invalidParams)
                .expect('Content-Type', /application\/json/)
                .expect(400);
            expect(response.body.error).to.equal('parameter:invalid');
            expect(response.body.data).to.equal(key);
        }

        // create article by editor ok:
        response = await request($SERVER)
            .post('/api/articles')
            .set('Authorization', auth($EDITOR))
            .send({
                category_id: $CATEGORY_1.id,
                name: ' Test Article  ',
                description: '  blablabla\nhaha...  \n  ',
                tags: ' aaa,\n BBB,  \t ccc,CcC ',
                content: 'Long content...',
                image: fs.readFileSync(__dirname + '/res-image.jpg').toString('base64')
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.user_id).to.equal($EDITOR.id);

        let articleId = response.body.id;
        let coverId = response.body.cover_id;
        expect(response.body.name).to.equal('Test Article');
        // check image:
        response = await request($SERVER)
                .get(`/files/attachments/${coverId}/l`)
                .expect('Content-Type', /image\/jpeg/)
                .expect(200);
        // update article:
        let PUBLISH = Date.now() + 3600000;
        response = await request($SERVER)
            .post(`/api/articles/${articleId}`)
            .set('Authorization', auth($EDITOR))
            .send({
                name: 'Name Changed',
                content: 'Changed!',
                category_id: $CATEGORY_2.id,
                publish_at: PUBLISH
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.name).to.equal('Name Changed');
        expect(response.body.content).to.equal('Changed!');
        expect(response.body.category_id).to.equal($CATEGORY_2.id);
        expect(response.body.publish_at).to.equal(PUBLISH);
        // query to verify:
        response = await request($SERVER)
            .get(`/api/articles/${articleId}`)
            .set('Authorization', auth($EDITOR))
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.name).to.equal('Name Changed');
        expect(response.body.category_id).to.equal($CATEGORY_2.id);
        expect(response.body.publish_at).to.equal(PUBLISH);
        // query as subscriber should get 404 for not published yet:
        response = await request($SERVER)
            .get(`/api/articles/${articleId}`)
            .set('Authorization', auth($SUBS))
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('entity:notfound');
        expect(response.body.data).to.equal('Article');
    });

    it('create article then change cover', async () => {
        // create article by editor ok:
        let response = await request($SERVER)
            .post('/api/articles')
            .set('Authorization', auth($EDITOR))
            .send({
                category_id: $CATEGORY_1.id,
                name: ' Test Article Cover  ',
                description: '  blablabla\nhaha...  \n  ',
                tags: ' aaa,\n BBB,  \t ccc,CcC ',
                content: 'Long content...',
                image: fs.readFileSync(__dirname + '/res-image.jpg').toString('base64')
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.user_id).to.equal($EDITOR.id);
        let articleId = response.body.id;
        let coverId = response.body.cover_id;
        // update article:
        response = await request($SERVER)
            .post(`/api/articles/${articleId}`)
            .set('Authorization', auth($EDITOR))
            .send({
                name: 'Name Changed',
                content: 'Changed!',
                image: fs.readFileSync(__dirname + '/res-image-2.jpg').toString('base64')
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.cover_id).not.to.equal(coverId);
        // check image:
        response = await request($SERVER)
                .get(`/files/attachments/${response.body.cover_id}/l`)
                .expect('Content-Type', /image\/jpeg/)
                .expect(200);
    });

    it('create article with invalid category_id', async () => {
        let response = await request($SERVER)
            .post('/api/articles')
            .set('Authorization', auth($EDITOR))
            .send({
                category_id: nextId(),
                name: ' Test article with invalid category id  ',
                description: '  blablabla...  \n  ',
                tags: ' aaa,\n BBB,,CcC ',
                content: 'Long content...',
                image: fs.readFileSync(__dirname + '/res-image.jpg').toString('base64')
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('entity:notfound');
        expect(response.body.data).to.equal('Category');
    });

    it('create article with invalid image', async () => {
        let response = await request($SERVER)
            .post('/api/articles')
            .set('Authorization', auth($EDITOR))
            .send({
                category_id: $CATEGORY_1.id,
                name: ' Test article with invalid image',
                description: '  blablabla...  \n  ',
                tags: 'a,b,c',
                content: 'Long content...',
                image: fs.readFileSync(__dirname + '/res-bad-image.jpg').toString('base64')
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('parameter:invalid')
        expect(response.body.data).to.equal('image')
    });

    it('create and delete article', async () => {
        let response;
        // create article by editor ok:
        response = await request($SERVER)
            .post('/api/articles')
            .set('Authorization', auth($EDITOR))
            .send({
                category_id: $CATEGORY_1.id,
                name: ' Test Article  ',
                description: '  blablabla\nhaha...  \n  ',
                tags: ' aaa,\n BBB,  \t ccc,CcC ',
                content: 'Long content...',
                image: fs.readFileSync(__dirname + '/res-image.jpg').toString('base64')
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.user_id).to.equal($EDITOR.id);

        let articleId = response.body.id;
        // delete by contrib failed:
        response = await request($SERVER)
            .post(`/api/articles/${articleId}/delete`)
            .set('Authorization', auth($CONTRIB))
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('permission:denied');
        // delete by editor ok:
        response = await request($SERVER)
            .post(`/api/articles/${articleId}/delete`)
            .set('Authorization', auth($EDITOR))
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.id).to.equal(articleId);
        // query not found:
        response = await request($SERVER)
            .get(`/api/articles/${articleId}`)
            .set('Authorization', auth($CONTRIB))
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('entity:notfound');
        expect(response.body.data).to.equal('Article');
    });

    it('test empty rss', async () => {
        let response, xml;
        // get rss: empty
        response = await request($SERVER)
            .get('/feed/articles')
            .expect('Content-Type', /text\/xml/)
            .expect(200);
        xml = response.text;
        expect(xml).to.a('string')
            .and.to.contains('<rss version="2.0">')
            .and.to.contains('<title>')
            .and.to.contains('<link>')
            .and.to.contains('<lastBuildDate>')
            .and.to.contains('<ttl>3600</ttl>')
            .and.not.to.contains('<item>')
            .and.not.to.contains('<author>');
    });

    it('test recent rss', async () => {
        let response, xml;
        // create 20 articles:
        for (let i=0; i<20; i++) {
            response = await request($SERVER)
                .post('/api/articles')
                .set('Authorization', auth($EDITOR))
                .send({
                    category_id: $CATEGORY_1.id,
                    name: 'Feed-' + i,
                    description: 'Feed desc-' + i,
                    tags: '',
                    content: 'Long content-' + i,
                    image: fs.readFileSync(__dirname + '/res-image.jpg').toString('base64')
                })
                .expect('Content-Type', /application\/json/)
                .expect(200);
            await sleep(10);
        }
        // get rss: 20 items
        response = await request($SERVER)
            .get('/feed/articles')
            .expect('Content-Type', /text\/xml/)
            .expect(200);
        xml = response.text;
        expect(xml).to.a('string');
        let items = xml.split(/\<item\>/).filter((s) => {
            return s.indexOf('<guid>') >= 0;
        });
        expect(items).to.a('array').and.to.have.lengthOf(20);
        // create 2 new articles:
        let i = 20;
        response = await request($SERVER)
            .post('/api/articles')
            .set('Authorization', auth($EDITOR))
            .send({
                category_id: $CATEGORY_1.id,
                name: 'Feed-' + i,
                description: 'Feed desc-' + i,
                tags: '',
                content: 'Long content-' + i,
                publish_at: Date.now() + 3600000, // <-- NOTE: this article should be invisible NOW!!!
                image: fs.readFileSync(__dirname + '/res-image.jpg').toString('base64')
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        await sleep(10);
        i = 21;
        response = await request($SERVER)
            .post('/api/articles')
            .set('Authorization', auth($EDITOR))
            .send({
                category_id: $CATEGORY_1.id,
                name: 'Feed-' + i,
                description: 'Feed desc-' + i,
                tags: '',
                content: 'Long content-' + i,
                image: fs.readFileSync(__dirname + '/res-image.jpg').toString('base64')
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        // IMPORTANT: clear cache:
        await cache.remove(constants.cache.ARTICLE_FEED);

        // get rss: 20 items
        response = await request($SERVER)
            .get('/feed/articles')
            .expect('Content-Type', /text\/xml/)
            .expect(200);
        xml = response.text;
        expect(xml).to.a('string');
        items = xml.split(/\<item\>/).filter((s) => {
            return s.indexOf('<guid>') >= 0;
        });
        expect(items).to.a('array').and.to.have.lengthOf(20);
        // first should be Feed-21 and second should be Feed-19:
        let
            first = items[0],
            second = items[1];
        expect(first).to.contains('Feed-21');
        expect(second).to.contains('Feed-19');
    });
});
