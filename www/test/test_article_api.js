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
        ['category_id', 'name', 'description', 'content', 'image'].forEach(async (key) => {
            let invalidParams = _.clone(validParams);
            delete invalidParams[key];
            response = await request($SERVER)
                .post('/api/articles')
                .set('Authorization', auth($EDITOR))
                .send(invalidParams)
                .expect('Content-Type', /application\/json/)
                .expect(400);
            expect(response.body.error).to.equal('parameter:invalid');
            expect(response.body.data).to.equal(key);
        });

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

        let articleId = response.body.id;
        expect(response.body.name).to.equal('Test Article');



    //     // check image:
    //     var dl = yield remote.$download('/files/attachments/' + r1.cover_id + '/l');
    //     remote.shouldNoError(dl);
    //     dl.statusCode.should.equal(200);
    //     dl.headers['content-type'].should.equal('image/jpeg');
    //     parseInt(dl.headers['content-length'], 10).should.approximately(122826, 10000);

    //     // update article:
    //     var r2 = yield remote.$post(roles.EDITOR, '/api/articles/' + r1.id, {
    //         name: 'Name Changed  ',
    //         content: 'Changed!'
    //     });
    //     remote.shouldNoError(r2);
    //     r2.name.should.equal('Name Changed');
    //     r2.content.should.equal('Changed!');
    //     r2.content_id.should.not.equal(r1.content_id);
    //     r2.cover_id.should.equal(r1.cover_id);
    //     r2.user_id.should.equal(r1.user_id);
    //     r2.version.should.equal(1);

    //     // query:
    //     var r3 = yield remote.$get(roles.EDITOR, '/api/articles/' + r1.id);
    //     r3.name.should.equal(r2.name);
    //     r3.content.should.equal(r2.content);
    //     r3.version.should.equal(1);
    //     // not updated:
    //     r3.tags.should.equal(r1.tags);
    //     r3.description.should.equal(r1.description);
    });

    // it('create article then change cover', async () => {
    //     // create article:
    //     var r1 = yield remote.$post(roles.EDITOR, '/api/articles', {
    //         category_id: category.id,
    //         name: 'Before Cover Change   ',
    //         description: '   blablabla\nhaha...  \n   ',
    //         tags: ' aaa,\n BBB,  \t ccc,CcC',
    //         content: 'Content not change...',
    //         image: remote.readFileSync('res-image.jpg').toString('base64')
    //     });
    //     remote.shouldNoError(r1);

    //     // update article:
    //     var r2 = yield remote.$post(roles.EDITOR, '/api/articles/' + r1.id, {
    //         image: remote.readFileSync('res-image-2.jpg').toString('base64')
    //     });
    //     remote.shouldNoError(r2);
    //     r2.name.should.equal('Before Cover Change');
    //     r2.content.should.equal('Content not change...');
    //     r2.content_id.should.equal(r1.content_id);
    //     r2.cover_id.should.not.equal(r1.cover_id);

    //     // check image:
    //     var dl = yield remote.$download('/files/attachments/' + r2.cover_id + '/l');
    //     remote.shouldNoError(dl);
    //     dl.statusCode.should.equal(200);
    //     dl.headers['content-type'].should.equal('image/jpeg');
    //     parseInt(dl.headers['content-length'], 10).should.approximately(39368, 10000);
    // });

    // it('create article with wrong parameter by editor', async () => {
    //     var
    //         i, r, params,
    //         required = ['name', 'description', 'category_id', 'content', 'image'],
    //         prepared = {
    //             name: 'Test Params',
    //             description: 'blablabla...',
    //             category_id: category.id,
    //             tags: 'tag1,tag2,tag3',
    //             content: 'a long content...',
    //             image: remote.readFileSync('res-image.jpg').toString('base64')
    //         };
    //     for (i=0; i<required.length; i++) {
    //         params = _.clone(prepared);
    //         delete params[required[i]];
    //         r = yield remote.$post(roles.EDITOR, '/api/articles', params);
    //         remote.shouldHasError(r, 'parameter:invalid', required[i]);
    //     }
    // });

    // it('create article with invalid category_id', async () => {
    //     var
    //         r,
    //         params = {
    //             name: 'Test Params',
    //             description: 'blablabla...',
    //             category_id: remote.nextId(),
    //             tags: 'tag1,tag2,tag3',
    //             content: 'a long content...',
    //             image: remote.readFileSync('res-image.jpg').toString('base64')
    //         };
    //     r = yield remote.$post(roles.EDITOR, '/api/articles', params);
    //     remote.shouldHasError(r, 'entity:notfound', 'Category');
    // });

    // it('create article with invalid image', async () => {
    //     var
    //         r,
    //         params = {
    //             name: 'Test Params',
    //             description: 'blablabla...',
    //             category_id: category.id,
    //             tags: 'tag1,tag2,tag3',
    //             content: 'a long content...',
    //             image: remote.readFileSync('res-plain.txt').toString('base64')
    //         };
    //     r = yield remote.$post(roles.EDITOR, '/api/articles', params);
    //     remote.shouldHasError(r, 'parameter:invalid', 'image');
    // });

    // it('create and delete article by editor', async () => {
    //     // create article:
    //     var r1 = yield remote.$post(roles.EDITOR, '/api/articles', {
    //         category_id: category.id,
    //         name: 'To Be Delete...   ',
    //         description: '   blablabla\nhaha...  \n   ',
    //         tags: ' aaa,\n BBB,  \t ccc,CcC',
    //         content: 'Content not change...',
    //         image: remote.readFileSync('res-image.jpg').toString('base64')
    //     });
    //     remote.shouldNoError(r1);

    //     // delete article:
    //     var r2 = yield remote.$post(roles.EDITOR, '/api/articles/' + r1.id + '/delete');
    //     remote.shouldNoError(r2);
    //     r2.id.should.equal(r1.id);

    //     // query:
    //     var r3 = yield remote.$get(roles.EDITOR, '/api/articles/' + r1.id);
    //     remote.shouldHasError(r3, 'entity:notfound', 'Article');
    // });
});
