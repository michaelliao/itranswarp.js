'use strict';

// test category api:

const
    appsetup = require('./_appsetup'), // <-- MUST be import first!
    appclose = require('./_appclose'),
    fs = require('fs'),
    request = require('supertest'),
    expect = require('chai').expect,
    db = require('../db'),
    logger = require('../logger'),
    cache = require('../cache'),
    constants = require('../constants'),
    categoryApi = require('../controllers/categoryApi'),
    Category = db.Category;

describe('#categories', () => {

    before(appsetup);

    after(appclose);

    beforeEach(async () => {
        logger.info('delete all categories...');
        await Category.destroy($ALL);
        // IMPORTANT: clear cache:
        await cache.remove(constants.cache.CATEGORIES);
    });

    afterEach(async () => {
        // IMPORTANT: clear cache:
        await cache.remove(constants.cache.CATEGORIES);
    });

    it('should get empty categories', async () => {
        let response;
        response = await request($SERVER)
            .get('/api/categories')
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.categories).to.a('array').and.to.have.lengthOf(0);
    });

    it('create a new category failed/ok by admin, then check', async () => {
        let response;
        // editor:
        response = await request($SERVER)
            .post('/api/categories')
            .set('Authorization', auth($EDITOR))
            .send({
                name: 'Cat',
                tag: 'dog',
                description: 'ok'
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('permission:denied');
        // admin:
        // ok:
        response = await request($SERVER)
            .post('/api/categories')
            .set('Authorization', auth($ADMIN))
            .send({
                name: ' Cat ',
                tag: ' dog ',
                description: 'ok '
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.name).to.equal('Cat');
        expect(response.body.tag).to.equal('dog');
        expect(response.body.description).to.equal('ok');
        expect(response.body.display_order).to.equal(0);
        // check:
        let id = response.body.id;
        response = await request($SERVER)
            .get('/api/categories/' + id)
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.name).to.equal('Cat');
        expect(response.body.tag).to.equal('dog');
        expect(response.body.description).to.equal('ok');
        // create another to check display_order:
        response = await request($SERVER)
            .post('/api/categories')
            .set('Authorization', auth($ADMIN))
            .send({
                name: ' Tiger ',
                tag: ' elephant ',
                description: 'Oh '
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.name).to.equal('Tiger');
        expect(response.body.display_order).to.equal(1);
    });


    it('create a new category with invalid param by admin', async () => {
        let response;
        // missing name:
        response = await request($SERVER)
            .post('/api/categories')
            .set('Authorization', auth($ADMIN))
            .send({
                tag: 'dog',
                description: 'ok'
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('parameter:invalid');
        expect(response.body.data).to.equal('name');
        // empty name:
        response = await request($SERVER)
            .post('/api/categories')
            .set('Authorization', auth($ADMIN))
            .send({
                name: '  ',
                tag: 'dog',
                description: 'ok'
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('parameter:invalid');
        expect(response.body.data).to.equal('name');
    });

    it('create / update category by admin, then check', async () => {
        let response;
        // create:
        response = await request($SERVER)
            .post('/api/categories')
            .set('Authorization', auth($ADMIN))
            .send({
                name: 'Tom',
                tag: 'cat',
                description: 'ok'
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.name).to.equal('Tom');
        expect(response.body.tag).to.equal('cat');
        let id = response.body.id;
        // update by editor failed:
        response = await request($SERVER)
            .post('/api/categories/' + id)
            .set('Authorization', auth($EDITOR))
            .send({
                name: 'Jerry',
                tag: 'rat'
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('permission:denied');
        // update by admin:
        response = await request($SERVER)
            .post('/api/categories/' + id)
            .set('Authorization', auth($ADMIN))
            .send({
                name: 'Jerry',
                tag: 'rat'
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.name).to.equal('Jerry');
        expect(response.body.tag).to.equal('rat');
        // check by get:
        response = await request($SERVER)
            .get('/api/categories/' + id)
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.name).to.equal('Jerry');
        expect(response.body.tag).to.equal('rat');
    });

    it('create categories by admin, then sort', async () => {
        let
            i, response,
            ids = [null, null, null];
        // create 3 categories:
        for (i = 0; i < 3; i++) {
            response = await request($SERVER)
                .post('/api/categories')
                .set('Authorization', auth($ADMIN))
                .send({
                    name: 'Apple-' + i,
                    tag: 'ios' + i
                })
                .expect('Content-Type', /application\/json/)
                .expect(200);
            expect(response.body.name).to.equal('Apple-' + i);
            expect(response.body.display_order).to.equal(i);
            ids[i] = response.body.id;
        }
        // sort by editor should failed:
        response = await request($SERVER)
            .post('/api/categories/all/sort')
                .set('Authorization', auth($EDITOR))
                .send({
                    ids: ids
                })
                .expect('Content-Type', /application\/json/)
                .expect(400);
        expect(response.body.error).to.equal('permission:denied');
        // sort by admin with invalid ids: length should be 3 but 4:
        response = await request($SERVER)
            .post('/api/categories/all/sort')
                .set('Authorization', auth($ADMIN))
                .send({
                    ids: [ids[0], ids[1], ids[2], ids[2]]
                })
                .expect('Content-Type', /application\/json/)
                .expect(400);
        expect(response.body.error).to.equal('parameter:invalid');
        // sort by admin with invalid ids: duplicate id:
        response = await request($SERVER)
            .post('/api/categories/all/sort')
                .set('Authorization', auth($ADMIN))
                .send({
                    ids: [ids[0], ids[1], ids[1]]
                })
                .expect('Content-Type', /application\/json/)
                .expect(400);
        expect(response.body.error).to.equal('parameter:invalid');
        // sort by admin with invalid ids: some id not found:
        response = await request($SERVER)
            .post('/api/categories/all/sort')
                .set('Authorization', auth($ADMIN))
                .send({
                    ids: [ids[0], ids[1], db.nextId()]
                })
                .expect('Content-Type', /application\/json/)
                .expect(400);
        expect(response.body.error).to.equal('parameter:invalid');
        // sort by admin ok:
        response = await request($SERVER)
            .post('/api/categories/all/sort')
            .set('Authorization', auth($ADMIN))
            .send({
                ids: [ids[2], ids[1], ids[0]]
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.ids).to.a('array').and.to.eql([ids[2], ids[1], ids[0]]);
        // query to check:
        response = await request($SERVER)
            .get('/api/categories')
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.categories).to.a('array').and.to.have.lengthOf(3);
        expect(response.body.categories[0].name).to.equal('Apple-2');
        expect(response.body.categories[1].name).to.equal('Apple-1');
        expect(response.body.categories[2].name).to.equal('Apple-0');
        for (i=0; i<3; i++) {
            expect(response.body.categories[i].display_order).to.equal(i);
        }
    });

    it('try delete category by editor / admin', async () => {
        let id, response;
        // create:
        response = await request($SERVER)
            .post('/api/categories')
            .set('Authorization', auth($ADMIN))
            .send({
                name: 'Hello',
                tag: 'hi',
                description: 'ok'
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        id = response.body.id;
        // delete by editor:
        response = await request($SERVER)
            .post(`/api/categories/${id}/delete`)
            .set('Authorization', auth($EDITOR))
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('permission:denied');
        // delete by admin:
        response = await request($SERVER)
            .post(`/api/categories/${id}/delete`)
            .set('Authorization', auth($ADMIN))
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.id).to.equal(id);
        // get:
        response = await request($SERVER)
            .get(`/api/categories/${id}`)
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('entity:notfound');
    });

    it('delete a non-exist category by admin', async () => {
        let
            id = db.nextId(),
            response;
        response = await request($SERVER)
            .post(`/api/categories/${id}/delete`)
            .set('Authorization', auth($ADMIN))
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('entity:notfound');
    });

    it('delete a non-empty category by admin', async () => {
        let id, response;
        // create:
        response = await request($SERVER)
            .post('/api/categories')
            .set('Authorization', auth($ADMIN))
            .send({
                name: 'Non-EMPTY',
                tag: 'hi',
                description: 'ok'
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        id = response.body.id;
        // create article with this category:
        response = await request($SERVER)
            .post('/api/articles')
            .set('Authorization', auth($ADMIN))
            .send({
                category_id: id,
                name: 'New Article',
                description: 'blablabla...',
                content: 'a short article',
                image: fs.readFileSync(__dirname + '/res-image-2.jpg').toString('base64')
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        // delete category
        response = await request($SERVER)
            .post(`/api/categories/${id}/delete`)
            .set('Authorization', auth($ADMIN))
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('entity:conflict');
    });

});
