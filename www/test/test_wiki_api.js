'use strict';

// test wiki api:

const
    appsetup = require('./_appsetup'), // <-- MUST be import first!
    appclose = require('./_appclose'),
    _ = require('lodash'),
    request = require('supertest'),
    expect = require('chai').expect,
    db = require('../db'),
    Wiki = db.Wiki,
    WikiPage = db.WikiPage,
    Text = db.Text,
    nextId = db.nextId,
    logger = require('../logger'),
    fs = require('fs'),
    constants = require('../constants'),
    wikiApi = require('../controllers/wikiApi');

describe('#wikis', () => {

    before(appsetup);

    after(appclose);

    beforeEach(async () => {
        logger.info('delete all wikis/wikipages...');
        await WikiPage.destroy($ALL);
        await Wiki.destroy($ALL);
        await Text.destroy($ALL);
    });

    it('should get empty wikis', async () => {
        let response = await request($SERVER)
            .get('/api/wikis')
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.wikis).to.be.a('array').and.to.have.lengthOf(0);
    });

    it('create wiki by contrib failed', async () => {
        let response = await request($SERVER)
            .post('/api/wikis')
            .set('Authorization', auth($CONTRIB))
            .send({
                name: 'Cannot Create',
                description: 'blablabla...',
                content: 'Oppps',
                image: 'base64-string'
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('permission:denied');
    });

    it('create wiki by editor failed for wrong param', async () => {
        let response;
        response = await request($SERVER)
            .post('/api/wikis')
            .set('Authorization', auth($EDITOR))
            .send({
                // missing name!
                description: 'blablabla...',
                content: 'Oppps',
                tag: 'a,b,c',
                image: fs.readFileSync(__dirname + '/res-image.jpg').toString('base64')
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('parameter:invalid');
        expect(response.body.data).to.equal('name');
        response = await request($SERVER)
            .post('/api/wikis')
            .set('Authorization', auth($EDITOR))
            .send({
                name: 'New Wiki',
                // missing description
                content: 'Oppps',
                tag: 'a,b,c',
                image: fs.readFileSync(__dirname + '/res-image.jpg').toString('base64')
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('parameter:invalid');
        expect(response.body.data).to.equal('description');
        response = await request($SERVER)
            .post('/api/wikis')
            .set('Authorization', auth($EDITOR))
            .send({
                name: 'New Wiki',
                description: 'blablabla...',
                // missing content
                tag: 'a,b,c',
                image: fs.readFileSync(__dirname + '/res-image.jpg').toString('base64')
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('parameter:invalid');
        expect(response.body.data).to.equal('content');
        response = await request($SERVER)
            .post('/api/wikis')
            .set('Authorization', auth($EDITOR))
            .send({
                name: 'New Wiki',
                description: 'blablabla...',
                content: 'Oppps',
                // missing image
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('parameter:invalid');
        expect(response.body.data).to.equal('image');
    });

    it('create, query then update, delete by editor', async () => {
        let response, id, old_cover_id;
        response = await request($SERVER)
            .post('/api/wikis')
            .set('Authorization', auth($EDITOR))
            .send({
                name: ' Test Wiki  ',
                description: 'blablabla...',
                content: 'Oppps',
                image: fs.readFileSync(__dirname + '/res-image.jpg').toString('base64')
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body).to.a('object');
        expect(response.body.name).to.equal('Test Wiki');
        expect(response.body.content).to.equal('Oppps');
        expect(response.body.tag).to.equal('');
        // query to check:
        id = response.body.id;
        response = await request($SERVER)
            .get(`/api/wikis/${id}`)
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body).to.a('object');
        expect(response.body.name).to.equal('Test Wiki');
        expect(response.body.content).to.equal('Oppps');
        expect(response.body.tag).to.equal('');
        // update by contrib failed:
        response = await request($SERVER)
            .post(`/api/wikis/${id}`)
            .set('Authorization', auth($CONTRIB))
            .send({
                name: 'Try Update',
                description: 'blablabla...',
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('permission:denied');
        // update by editor ok:
        response = await request($SERVER)
            .post(`/api/wikis/${id}`)
            .set('Authorization', auth($EDITOR))
            .send({
                name: ' Updated',
                description: 'haha',
                tag: '  python '
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body).to.a('object');
        expect(response.body.name).to.equal('Updated');
        expect(response.body.description).to.equal('haha');
        expect(response.body.tag).to.equal('python');
        // query to check:
        response = await request($SERVER)
            .get(`/api/wikis/${id}`)
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body).to.a('object');
        expect(response.body.name).to.equal('Updated');
        expect(response.body.description).to.equal('haha');
        expect(response.body.tag).to.equal('python');
        expect(response.body.cover_id).to.a('string');
        // update with image:
        old_cover_id = response.body.cover_id;
        response = await request($SERVER)
            .post(`/api/wikis/${id}`)
            .set('Authorization', auth($EDITOR))
            .send({
                name: ' with new image',
                image: fs.readFileSync(__dirname + '/res-image-2.jpg').toString('base64')
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body).to.a('object');
        expect(response.body.cover_id).to.a('string').and.to.not.equal(old_cover_id);
        // update with bad image:
        response = await request($SERVER)
            .post(`/api/wikis/${id}`)
            .set('Authorization', auth($EDITOR))
            .send({
                name: ' with bad image',
                image: fs.readFileSync(__dirname + '/res-bad-image.jpg').toString('base64')
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('parameter:invalid');
        expect(response.body.data).to.equal('image');
        // delete by contrib failed:
        response = await request($SERVER)
            .post(`/api/wikis/${id}/delete`)
            .set('Authorization', auth($CONTRIB))
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('permission:denied');
        // delete by editor ok:
        response = await request($SERVER)
            .post(`/api/wikis/${id}/delete`)
            .set('Authorization', auth($EDITOR))
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.id).to.equal(id);
        // query not found:
        response = await request($SERVER)
            .get(`/api/wikis/${id}`)
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('entity:notfound');
    });

    it('create wiki page by contrib failed', async () => {
        let wiki_id, response;
        // create ok:
        response = await request($SERVER)
            .post('/api/wikis')
            .set('Authorization', auth($EDITOR))
            .send({
                name: ' Learn JavaScript  ',
                description: 'blablabla...',
                content: 'Oppps',
                image: fs.readFileSync(__dirname + '/res-image.jpg').toString('base64')
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        wiki_id = response.body.id;
        // create wiki page by contrib failed:
        response = await request($SERVER)
            .post(`/api/wikis/${wiki_id}/wikipages`)
            .set('Authorization', auth($CONTRIB))
            .send({
                name: ' Learn JavaScript  ',
                description: 'blablabla...',
                content: 'Oppps',
                image: 'base64-string'
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('permission:denied');
    });

    it('create wiki page by editor failed', async () => {
        let wiki_id, response;
        // create ok:
        response = await request($SERVER)
            .post('/api/wikis')
            .set('Authorization', auth($EDITOR))
            .send({
                name: '  JavaScript  ',
                description: 'blablabla...',
                content: 'Oppps',
                image: fs.readFileSync(__dirname + '/res-image.jpg').toString('base64')
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        wiki_id = response.body.id;
        // create wiki page by editor failed:
        response = await request($SERVER)
            .post(`/api/wikis/${wiki_id}/wikipages`)
            .set('Authorization', auth($EDITOR))
            .send({
                // missing name
                parent_id: '',
                content: 'how to learn js'
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('parameter:invalid');
        expect(response.body.data).to.equal('name');
        response = await request($SERVER)
            .post(`/api/wikis/${wiki_id}/wikipages`)
            .set('Authorization', auth($EDITOR))
            .send({
                name: ' Learn JavaScript  ',
                // missing parent_id
                content: 'how to learn js'
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('parameter:invalid');
        expect(response.body.data).to.equal('parent_id');
        response = await request($SERVER)
            .post(`/api/wikis/${wiki_id}/wikipages`)
            .set('Authorization', auth($EDITOR))
            .send({
                name: ' Learn JavaScript  ',
                // invalid parent_id:
                parent_id: nextId(),
                content: 'how to learn js'
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('entity:notfound');
        expect(response.body.data).to.equal('WikiPage');
        response = await request($SERVER)
            .post(`/api/wikis/${wiki_id}/wikipages`)
            .set('Authorization', auth($EDITOR))
            .send({
                name: ' Learn JavaScript  ',
                parent_id: '',
                // missing content
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('parameter:invalid');
        expect(response.body.data).to.equal('content');
    });

    it('create, update wiki page by editor ok', async () => {
        let wiki_id, wp_id, response;
        // create ok:
        response = await request($SERVER)
            .post('/api/wikis')
            .set('Authorization', auth($EDITOR))
            .send({
                name: 'JavaScript',
                description: 'blablabla...',
                content: 'Oppps',
                image: fs.readFileSync(__dirname + '/res-image.jpg').toString('base64')
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        wiki_id = response.body.id;
        // create wiki page by editor:
        response = await request($SERVER)
            .post(`/api/wikis/${wiki_id}/wikipages`)
            .set('Authorization', auth($EDITOR))
            .send({
                name: ' Learn JavaScript  ',
                parent_id: '',
                content: 'js is awesome'
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body).to.a('object');
        expect(response.body.name).to.equal('Learn JavaScript');
        expect(response.body.parent_id).to.equal('');
        expect(response.body.wiki_id).to.equal(wiki_id);
        expect(response.body.content).to.equal('js is awesome');
        expect(response.body.display_order).to.equal(0);
        // get to check:
        wp_id = response.body.id;
        response = await request($SERVER)
            .get(`/api/wikis/wikipages/${wp_id}`)
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body).to.a('object');
        expect(response.body.name).to.equal('Learn JavaScript');
        expect(response.body.parent_id).to.equal('');
        expect(response.body.content).to.equal('js is awesome');
        expect(response.body.display_order).to.equal(0);
        // update by contrib failed:
        response = await request($SERVER)
            .post(`/api/wikis/wikipages/${wp_id}`)
            .set('Authorization', auth($CONTRIB))
            .expect('Content-Type', /application\/json/)
            .send({
                name: 'Changed'
            })
            .expect(400);
        expect(response.body.error).to.equal('permission:denied');
        // update by editor ok:
        response = await request($SERVER)
            .post(`/api/wikis/wikipages/${wp_id}`)
            .set('Authorization', auth($EDITOR))
            .expect('Content-Type', /application\/json/)
            .send({
                name: 'Changed',
                content: 'node.js is awesome'
            })
            .expect(200);
        expect(response.body).to.a('object');
        expect(response.body.name).to.equal('Changed');
        expect(response.body.parent_id).to.equal('');
        expect(response.body.content).to.equal('node.js is awesome');
    });

    it('delete wiki page and delete non-empty wiki', async () => {
        let wiki_id, wp_id, response;
        // create ok:
        response = await request($SERVER)
            .post('/api/wikis')
            .set('Authorization', auth($EDITOR))
            .send({
                name: 'JS Wiki',
                description: 'blablabla...',
                content: 'Oppps',
                image: fs.readFileSync(__dirname + '/res-image.jpg').toString('base64')
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        wiki_id = response.body.id;
        // create wiki page by editor:
        response = await request($SERVER)
            .post(`/api/wikis/${wiki_id}/wikipages`)
            .set('Authorization', auth($EDITOR))
            .send({
                name: ' Add a leaf  ',
                parent_id: '',
                content: 'js is awesome'
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        wp_id = response.body.id;
        // delete wiki page by contrib failed:
        response = await request($SERVER)
            .post(`/api/wikis/wikipages/${wp_id}/delete`)
            .set('Authorization', auth($CONTRIB))
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('permission:denied');
        // delete non-empty wiki by editor failed:
        response = await request($SERVER)
            .post(`/api/wikis/${wiki_id}/delete`)
            .set('Authorization', auth($EDITOR))
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('entity:conflict');
        // delete wiki page by editor ok:
        response = await request($SERVER)
            .post(`/api/wikis/wikipages/${wp_id}/delete`)
            .set('Authorization', auth($EDITOR))
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.id).to.equal(wp_id);
        // query wiki page not found:
        response = await request($SERVER)
            .get(`/api/wikis/wikipages/${wp_id}`)
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('entity:notfound');
        // delete wiki by editor ok:
        response = await request($SERVER)
            .post(`/api/wikis/${wiki_id}/delete`)
            .set('Authorization', auth($EDITOR))
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.id).to.equal(wiki_id);
    });

    it('create tree, then move, try delete', async () => {
        let wiki_id, response, p1, p2, p3, p4;
        // create ok:
        response = await request($SERVER)
            .post('/api/wikis')
            .set('Authorization', auth($EDITOR))
            .send({
                name: 'JS Wiki',
                description: 'blablabla...',
                content: 'learn js',
                image: fs.readFileSync(__dirname + '/res-image.jpg').toString('base64')
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        wiki_id = response.body.id;
        // create wiki page as TREE:
        // w1
        // +- p1
        // |  +- p2
        // |     +- p4
        // +- p3

        // p1:
        response = await request($SERVER)
            .post(`/api/wikis/${wiki_id}/wikipages`)
            .set('Authorization', auth($EDITOR))
            .send({
                name: 'p1',
                parent_id: '',
                content: 'p1...'
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        p1 = response.body;
        // p2:
        response = await request($SERVER)
            .post(`/api/wikis/${wiki_id}/wikipages`)
            .set('Authorization', auth($EDITOR))
            .send({
                name: 'p2',
                parent_id: p1.id,
                content: 'p2...'
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        p2 = response.body;
        // p3:
        response = await request($SERVER)
            .post(`/api/wikis/${wiki_id}/wikipages`)
            .set('Authorization', auth($EDITOR))
            .send({
                name: 'p3',
                parent_id: '',
                content: 'p3...'
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        p3 = response.body;
        // p4:
        response = await request($SERVER)
            .post(`/api/wikis/${wiki_id}/wikipages`)
            .set('Authorization', auth($EDITOR))
            .send({
                name: 'p4',
                parent_id: p2.id,
                content: 'p4...'
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        p4 = response.body;
        // validate p1 ~ p4:
        expect(p1.name).to.equal('p1');
        expect(p2.name).to.equal('p2');
        expect(p3.name).to.equal('p3');
        expect(p4.name).to.equal('p4');
        expect(p1.content).to.equal('p1...');
        expect(p2.content).to.equal('p2...');
        expect(p3.content).to.equal('p3...');
        expect(p4.content).to.equal('p4...');
        expect(p1.display_order).to.equal(0);
        expect(p3.display_order).to.equal(1);
        // try delete non-empty p2
        response = await request($SERVER)
            .post(`/api/wikis/wikipages/${p2.id}/delete`)
            .set('Authorization', auth($EDITOR))
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('entity:conflict');
        // move p3 to p2 at index 0:
        // w1
        // +- p1
        // .  +- p2
        // .     +- p3 <----- move to here
        // .     +- p4
        // +. p3       <----- from here
        response = await request($SERVER)
            .post(`/api/wikis/wikipages/${p3.id}/move`)
            .set('Authorization', auth($EDITOR))
            .send({
                parent_id: p2.id,
                index: 0
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.parent_id).to.equal(p2.id);
        expect(response.body.display_order).to.equal(0);
        // p3.display_order should be 0:
        response = await request($SERVER)
            .get(`/api/wikis/wikipages/${p3.id}`)
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.display_order).to.equal(0);
        expect(response.body.parent_id).to.equal(p2.id);
        // p4.display_order should be 1:
        response = await request($SERVER)
            .get(`/api/wikis/wikipages/${p4.id}`)
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.display_order).to.equal(1);
        expect(response.body.parent_id).to.equal(p2.id);

        // move p4 to ROOT at index 0:
        // w1
        // +- p4 <-------- move to here
        // +- p1
        //    +- p2
        //       +- p3
        //       +. p4 <-- from here
        response = await request($SERVER)
            .post(`/api/wikis/wikipages/${p4.id}/move`)
            .set('Authorization', auth($EDITOR))
            .send({
                parent_id: '',
                index: 0
            })
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.parent_id).to.equal('');
        expect(response.body.display_order).to.equal(0);
        // p4.display_order should be 0:
        response = await request($SERVER)
            .get(`/api/wikis/wikipages/${p4.id}`)
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.display_order).to.equal(0);
        expect(response.body.parent_id).to.equal('');
        // p1.display_order should be 1:
        response = await request($SERVER)
            .get(`/api/wikis/wikipages/${p1.id}`)
            .expect('Content-Type', /application\/json/)
            .expect(200);
        expect(response.body.display_order).to.equal(1);
        expect(response.body.parent_id).to.equal('');
        
        // move p1 to p3 to make a recursive:
        // w1
        // +- p4
        // +- p1       <----- i'm to here
        //    +- p2
        //       +- p3
        //          +- <----- to here, but not allowed!
        response = await request($SERVER)
            .post(`/api/wikis/wikipages/${p1.id}/move`)
            .set('Authorization', auth($EDITOR))
            .send({
                parent_id: p3.id,
                index: 0
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('entity:conflict');

        // try move as contributor failed:
        response = await request($SERVER)
            .post(`/api/wikis/wikipages/${p4.id}/move`)
            .set('Authorization', auth($CONTRIB))
            .send({
                parent_id: p1.id,
                index: 0
            })
            .expect('Content-Type', /application\/json/)
            .expect(400);
        expect(response.body.error).to.equal('permission:denied');
        // get tree should be:
        // w1
        // +- p4
        // +- p1
        //    +- p2
        //       +- p3
        let tree = await wikiApi.getWikiTree(wiki_id, false);
        expect(tree).to.a('object');
        expect(tree.name).to.equal('JS Wiki');
        expect(tree.children).to.a('array').and.to.have.lengthOf(2);
        // p4:
        expect(tree.children[0]).to.a('object');
        expect(tree.children[0].name).to.equal('p4');
        expect(tree.children[0].children).to.a('array').and.to.have.lengthOf(0);
        // p1:
        expect(tree.children[1]).to.a('object');
        expect(tree.children[1].name).to.equal('p1');
        expect(tree.children[1].children).to.a('array').and.to.have.lengthOf(1);
        // p2:
        expect(tree.children[1].children[0]).to.a('object');
        expect(tree.children[1].children[0].name).to.equal('p2');
        expect(tree.children[1].children[0].children).to.a('array').and.to.have.lengthOf(1);
        // p3:
        expect(tree.children[1].children[0].children[0]).to.a('object');
        expect(tree.children[1].children[0].children[0].name).to.equal('p3');
        expect(tree.children[1].children[0].children[0].children).to.a('array').and.to.have.lengthOf(0);
        logger.info(JSON.stringify(tree, null, '  '));
    });
});
