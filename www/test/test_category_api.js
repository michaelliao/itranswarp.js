'use strict';

// test category api:

var
    should = require('should'),
    remote = require('./_remote'),
    constants = require('../constants'),
    roles = constants.role;

describe('#categories', function () {

    before(remote.setup);

    describe('#api', function () {

        it('should get empty categories', function* () {
            var r = yield remote.$get(roles.GUEST, '/api/categories');
            remote.shouldNoError(r);
            should(r.categories).be.ok;
            r.categories.should.be.an.Array.and.have.length(0);
        });

        it('create a new category by admin ok', function* () {
            var r = yield remote.$post(roles.ADMIN, '/api/categories', {
                name: ' Test Category   ',
                description: '  this is a test category...  '
            });
            remote.shouldNoError(r);
            r.display_order.should.equal(0);
            r.name.should.equal('Test Category');
            r.description.should.equal('this is a test category...');
            r.version.should.equal(0);
            r.id.should.be.ok.and.have.lengthOf(50);
            // get by id:
            var r2 = yield remote.$get(roles.GUEST, '/api/categories/' + r.id);
            remote.shouldNoError(r2);
            r2.id.should.equal(r.id);
            r2.name.should.equal(r.name);
            r2.description.should.equal(r.description);
            r2.created_at.should.equal(r.created_at);
            r2.updated_at.should.equal(r.updated_at);
            r2.version.should.equal(r.version);
            // create another:
            var r3 = yield remote.$post(roles.ADMIN, '/api/categories', {
                name: 'Another Category '
            });
            remote.shouldNoError(r3);
            r3.name.should.equal('Another Category');
            r3.display_order.should.equal(1);
            // get all category:
            var rs = yield remote.$get(roles.GUEST, '/api/categories');
            remote.shouldNoError(rs);
            rs.categories.should.be.an.Array.and.have.lengthOf(2);
        });

        it('create new category with wrong parameter by admin', function* () {
            var r = yield remote.$post(roles.ADMIN, '/api/categories', {
                description: '  no name parameter...  '
            });
            remote.shouldHasError(r, 'parameter:invalid', 'name');
        });

        it('create new category by editor', function* () {
            var r = yield remote.$post(roles.EDITOR, '/api/categories', {
                name: 'by editor',
                description: '  parameter...  '
            });
            remote.shouldHasError(r, 'permission:denied', 'permission');
        });

        it('update a category by admin', function* () {
            var r = yield remote.$post(roles.ADMIN, '/api/categories', {
                name: ' Before Update     ',
                description: '  '
            });
            remote.shouldNoError(r);
            r.name.should.equal('Before Update');
            r.description.should.equal('');
            r.version.should.equal(0);
            var r2 = yield remote.$post(roles.ADMIN, '/api/categories/' + r.id, {
                name: ' After Update    ',
                description: '  added description...  \t  '
            });
            remote.shouldNoError(r2);
            r2.id.should.equal(r.id);
            r2.name.should.equal('After Update');
            r2.description.should.equal('added description...');
            r2.created_at.should.equal(r.created_at);
            r2.updated_at.should.greaterThan(r.updated_at);
            r2.version.should.equal(1);
        });

        it('update a category by editor', function* () {
            var r = yield remote.$post(roles.ADMIN, '/api/categories', {
                name: ' Before Update    ',
                description: '  '
            });
            remote.shouldNoError(r);
            // try update its name and description:
            var r2 = yield remote.$post(roles.EDITOR, '/api/categories/' + r.id, {
                name: ' Try Update\n   ',
                description: '  added description...  \t  '
            });
            remote.shouldHasError(r2, 'permission:denied', 'permission');
        });

        it('delete a category by admin', function* () {
            // create first:
            var r = yield remote.$post(roles.ADMIN, '/api/categories', {
                name: ' Before Delete  ',
                description: '  '
            });
            remote.shouldNoError(r);
            r.name.should.equal('Before Delete');
            // try delete:
            var r2 = yield remote.$post(roles.ADMIN, '/api/categories/' + r.id + '/delete');
            remote.shouldNoError(r2);
            r2.id.should.equal(r.id);
            // try get again:
            var r3 = yield remote.$get(roles.GUEST, '/api/categories/' + r.id);
            remote.shouldHasError(r3, 'entity:notfound', 'Category');
        });

        it('delete a non-exist category by editor', function* () {
            var r = yield remote.$post(roles.EDITOR, '/api/categories/' + remote.next_id() + '/delete');
            remote.shouldHasError(r, 'permission:denied', 'permission');
        });

        it('delete a non-exist category by admin', function* () {
            var r = yield remote.$post(roles.ADMIN, '/api/categories/' + remote.next_id() + '/delete');
            remote.shouldHasError(r, 'entity:notfound', 'Category');
        });

        it('get non-exist category', function* () {
            var r = yield remote.$get(roles.GUEST, '/api/categories/' + remote.next_id());
            remote.shouldHasError(r, 'entity:notfound', 'Category');
        });
    });
});
