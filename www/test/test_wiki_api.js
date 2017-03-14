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
    constants = require('../constants');

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

    it('create, query then update by editor', async () => {
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

    it('create and update wiki page by editor ok', async () => {
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
    });

        // it('create and delete wiki by editor', async () => {
        //     // create wiki:
        //     var r1 = yield remote.$post(roles.EDITOR, '/api/wikis', {
        //         name: ' To be delete...   ',
        //         tag: 'java',
        //         description: '   blablabla\nhaha...  \n   ',
        //         content: '  Long long long content... ',
        //         image: remote.readFileSync('res-image.jpg').toString('base64')
        //     });
        //     remote.shouldNoError(r1);
        //     r1.name.should.equal('To be delete...');

        //     // delete wiki:
        //     var r2 = yield remote.$post(roles.EDITOR, '/api/wikis/' + r1.id + '/delete');
        //     remote.shouldNoError(r2);
        //     r2.id.should.equal(r1.id);

        //     // query:
        //     var r3 = yield remote.$get(roles.GUEST, '/api/wikis/' + r1.id);
        //     remote.shouldHasError(r3, 'entity:notfound', 'Wiki');
        // });

        // it('create wiki page, update and delete it', async () => {
        //     // create wiki:
        //     var w1 = yield remote.$post(roles.EDITOR, '/api/wikis', {
        //         name: ' Test For WikiPage   ',
        //         tag: 'java',
        //         description: '   blablabla\nhaha...  \n   ',
        //         content: 'Long long long content... ',
        //         image: remote.readFileSync('res-image.jpg').toString('base64')
        //     });
        //     remote.shouldNoError(w1);

        //     // create wiki page:
        //     // w1
        //     // +- p1
        //     var p1 = yield remote.$post(roles.EDITOR, '/api/wikis/' + w1.id + '/wikipages', {
        //         parent_id: '',
        //         name: 'First Wiki Page   ',
        //         content: 'This is a first wiki page...'
        //     });
        //     remote.shouldNoError(p1);
        //     p1.wiki_id.should.equal(w1.id);
        //     p1.parent_id.should.equal('');
        //     p1.display_order.should.equal(0);
        //     p1.name.should.equal('First Wiki Page');
        //     p1.content.should.equal('This is a first wiki page...');
        //     p1.version.should.equal(0);
        //     // query p1:
        //     var p2 = yield remote.$get(roles.EDITOR, '/api/wikis/wikipages/' + p1.id);
        //     remote.shouldNoError(p2);
        //     p2.wiki_id.should.equal(p1.wiki_id);
        //     p2.parent_id.should.equal(p1.parent_id);
        //     p2.display_order.should.equal(p1.display_order);
        //     p2.name.should.equal(p1.name);
        //     p2.content.should.equal(p1.content);
        //     p2.version.should.equal(0);
        //     // update p1:
        //     var p3 = yield remote.$post(roles.EDITOR, '/api/wikis/wikipages/' + p1.id, {
        //         name: 'Changed',
        //         content: 'content changed.'
        //     });
        //     remote.shouldNoError(p3);
        //     p3.name.should.equal('Changed');
        //     p3.content.should.equal('content changed.');
        //     // query again:
        //     var p4 = yield remote.$post(roles.EDITOR, '/api/wikis/wikipages/' + p1.id);
        //     remote.shouldNoError(p4);
        //     p4.wiki_id.should.equal(p3.wiki_id);
        //     p4.parent_id.should.equal(p3.parent_id);
        //     p4.display_order.should.equal(p3.display_order);
        //     p4.name.should.equal(p3.name);
        //     p4.content.should.equal(p3.content);
        //     p4.version.should.equal(1);
        // });

        // it('create wiki tree, move and try delete wiki', async () => {
        //     // create wiki:
        //     var w1 = yield remote.$post(roles.EDITOR, '/api/wikis', {
        //         name: ' Tree   ',
        //         tag: 'wikipedia',
        //         description: '   blablabla\nhaha...  \n   ',
        //         content: 'Long long long content... ',
        //         image: remote.readFileSync('res-image.jpg').toString('base64')
        //     });
        //     remote.shouldNoError(w1);

        //     // create wiki page:
        //     // w1
        //     // +- p1
        //     var p1 = yield remote.$post(roles.EDITOR, '/api/wikis/' + w1.id + '/wikipages', {
        //         parent_id: '',
        //         name: ' P1 - First Wiki Page   ',
        //         content: 'This is a first wiki page...'
        //     });
        //     remote.shouldNoError(p1);
        //     p1.wiki_id.should.equal(w1.id);
        //     p1.parent_id.should.equal('');
        //     p1.display_order.should.equal(0);
        //     p1.name.should.equal('P1 - First Wiki Page');
        //     p1.content.should.equal('This is a first wiki page...');

        //     // try delete wiki:
        //     var r2 = yield remote.$post(roles.EDITOR, '/api/wikis/' + w1.id + '/delete');
        //     remote.shouldHasError(r2, 'entity:conflict');

        //     // try create wiki page again:
        //     // w1
        //     // +- p1
        //     //    +- p2
        //     var p2 = yield remote.$post(roles.EDITOR, '/api/wikis/' + w1.id + '/wikipages', {
        //         parent_id: p1.id,
        //         name: 'P2',
        //         content: 'child wiki page...'
        //     });
        //     remote.shouldNoError(p2);
        //     p2.wiki_id.should.equal(w1.id);
        //     p2.parent_id.should.equal(p1.id);
        //     p2.display_order.should.equal(0);
        //     p2.name.should.equal('P2');
        //     p2.content.should.equal('child wiki page...');

        //     // try create wiki page under w1:
        //     // w1
        //     // +- p1
        //     // |  +- p2
        //     // +- p3
        //     var p3 = yield remote.$post(roles.EDITOR, '/api/wikis/' + w1.id + '/wikipages', {
        //         parent_id: '',
        //         name: 'P3',
        //         content: 'p3'
        //     });
        //     remote.shouldNoError(p3);
        //     p3.wiki_id.should.equal(w1.id);
        //     p3.parent_id.should.equal('');
        //     p3.display_order.should.equal(1);
        //     p3.name.should.equal('P3');
        //     p3.content.should.equal('p3');

        //     // try create wiki page under p2:
        //     // w1
        //     // +- p1
        //     // |  +- p2
        //     // |     +- p4
        //     // +- p3
        //     var p4 = yield remote.$post(roles.EDITOR, '/api/wikis/' + w1.id + '/wikipages', {
        //         parent_id: p2.id,
        //         name: 'P4',
        //         content: 'p4'
        //     });
        //     remote.shouldNoError(p4);
        //     p4.wiki_id.should.equal(w1.id);
        //     p4.parent_id.should.equal(p2.id);
        //     p4.display_order.should.equal(0);
        //     p4.name.should.equal('P4');
        //     p4.content.should.equal('p4');

        //     // move p3 to p2 at index 0:
        //     // w1
        //     // +- p1
        //     // .  +- p2
        //     // .     +- p3 <----- move to here
        //     // .     +- p4
        //     // +. p3       <----- from here
        //     var np3 = yield remote.$post(roles.EDITOR, '/api/wikis/wikipages/' + p3.id + '/move', {
        //         parent_id: p2.id,
        //         index: 0
        //     });
        //     remote.shouldNoError(np3);
        //     np3.wiki_id.should.equal(w1.id);
        //     np3.parent_id.should.equal(p2.id);
        //     np3.display_order.should.equal(0);

        //     // move p4 to ROOT at index 0:
        //     // w1
        //     // +- p4 <-------- move to here
        //     // +- p1
        //     //    +- p2
        //     //       +- p3
        //     //       +. p4 <-- from here
        //     var np4 = yield remote.$post(roles.EDITOR, '/api/wikis/wikipages/' + p4.id + '/move', {
        //         parent_id: '',
        //         index: 0
        //     });
        //     remote.shouldNoError(np4);
        //     np4.wiki_id.should.equal(w1.id);
        //     np4.parent_id.should.equal('');
        //     np4.display_order.should.equal(0);

        //     // check p1 index:
        //     var np1 = yield remote.$get(roles.EDITOR, '/api/wikis/wikipages/' + p1.id);
        //     remote.shouldNoError(np1);
        //     np1.display_order.should.equal(1);

        //     // move p1 to p3 to make a recursive:
        //     // w1
        //     // +- p4
        //     // +- p1       <----- i'm to here
        //     //    +- p2
        //     //       +- p3
        //     //          +- <----- to here, but not allowed!
        //     var r4 = yield remote.$post(roles.EDITOR, '/api/wikis/wikipages/' + p1.id + '/move', {
        //         parent_id: p3.id,
        //         index: 0
        //     });
        //     remote.shouldHasError(r4, 'entity:conflict');

        //     // try delete p2 failed because it has p3 as child:
        //     var r5 = yield remote.$post(roles.EDITOR, '/api/wikis/wikipages/' + p2.id + '/delete');
        //     remote.shouldHasError(r5, 'entity:conflict');

        //     // try delete p3 ok because it has no child:
        //     var r6 = yield remote.$post(roles.EDITOR, '/api/wikis/wikipages/' + p3.id + '/delete');
        //     remote.shouldNoError(r6);
        //     r6.id.should.equal(p3.id);
        // });
});
