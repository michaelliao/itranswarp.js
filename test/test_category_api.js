// test category api:

var remote = require('./_test'),
    should = require('should');

describe('#categories', function() {

    before(remote.setup);

    describe('#api', function() {

        it('should get empty categories', function(done) {
            remote.get(remote.guest, '/api/categories', null, function(r) {
                r.categories.length.should.equal(0);
                done();
            });
        });

        it('create a new category by admin', function(done) {
            remote.post(remote.admin, '/api/categories', {
                name: ' Test Category  \n\n ',
                description: '  this is a test category...  '
            }, function(r) {
                should(r.display_order).equal(0);
                r.display_order.should.equal(0);
                r.name.should.equal('Test Category');
                r.description.should.equal('this is a test category...');
                r.version.should.equal(0);
                r.id.should.be.ok.and.have.lengthOf(50);
                // get by id:
                remote.get(remote.guest, '/api/categories/' + r.id, null, function(r2) {
                    r2.id.should.equal(r.id);
                    r2.name.should.equal(r.name);
                    r2.description.should.equal(r.description);
                    r2.created_at.should.equal(r.created_at);
                    r2.updated_at.should.equal(r.updated_at);
                    // create another:
                    remote.post(remote.admin, '/api/categories', {
                        name: 'Another Category'
                    }, function(r3) {
                        r3.display_order.should.equal(1);
                        // get all category:
                        remote.get(remote.guest, '/api/categories', {}, function(r4) {
                            r4.categories.should.be.an.Array.and.have.lengthOf(2);
                            done();
                        });
                    });
                });
            });
        });

        it('create new category with wrong parameter by admin', function(done) {
            remote.post(remote.admin, '/api/categories', {
                description: '  no name parameter...  '
            }, function(r) {
                r.error.should.equal('parameter:invalid');
                r.data.should.equal('name');
                r.message.should.be.ok;
                done();
            });
        });

        it('create new category by editor', function(done) {
            remote.post(remote.editor, '/api/categories', {
                name: 'by editor',
                description: '  parameter...  '
            }, function(r) {
                r.error.should.equal('permission:denied');
                r.data.should.equal('permission');
                r.message.should.be.ok;
                done();
            });
        });

        it('update a category by admin', function(done) {
            remote.post(remote.admin, '/api/categories', {
                name: ' Before Update   \n\n '
            }, function(r) {
                // try update its name and description:
                remote.post(remote.admin, '/api/categories/' + r.id, {
                    name: ' After Update\n   ',
                    description: '  added description...  \t  '
                }, function(r2) {
                    r2.id.should.equal(r.id);
                    r2.name.should.equal('After Update');
                    r2.description.should.equal('added description...');
                    r2.created_at.should.equal(r.created_at);
                    r2.updated_at.should.greaterThan(r.updated_at);
                    r2.version.should.equal(1);
                    done();
                });
            });
        });

        it('update a category by editor', function(done) {
            remote.post(remote.admin, '/api/categories', {
                name: ' Before Update   \n\n '
            }, function(r) {
                // try update its name and description:
                remote.post(remote.editor, '/api/categories/' + r.id, {
                    name: ' After Update\n   ',
                    description: '  added description...  \t  '
                }, function(r2) {
                    r2.error.should.equal('permission:denied');
                    r2.data.should.equal('permission');
                    r2.message.should.be.ok;
                    done();
                });
            });
        });

        it('delete a category by admin', function(done) {
            // create first:
            remote.post(remote.admin, '/api/categories', {
                name: ' Before Delete   \t '
            }, function(r) {
                r.name.should.equal('Before Delete');
                r.description.should.equal('');
                r.version.should.equal(0);
                r.id.should.have.lengthOf(50);
                // try delete:
                remote.post(remote.admin, '/api/categories/' + r.id + '/delete', null, function(r2) {
                    r2.id.should.equal(r.id);
                    // try get again:
                    remote.get(remote.guest, '/api/categories/' + r.id, null, function(r3) {
                        r3.error.should.equal('resource:notfound');
                        r3.data.should.equal('Category');
                        r3.message.should.be.ok;
                        done();
                    });
                });
            });
        });

        it('delete a non-exist category by editor', function(done) {
            remote.post(remote.editor, '/api/categories/001390000000000ffffffffffffffffffffffffffffffff000/delete', null, function(r) {
                r.error.should.equal('permission:denied');
                r.data.should.equal('permission');
                r.message.should.be.ok;
                done();
            });
        });

        it('delete a non-exist category by admin', function(done) {
            remote.post(remote.admin, '/api/categories/001390000000000ffffffffffffffffffffffffffffffff000/delete', null, function(r) {
                r.error.should.equal('resource:notfound');
                r.data.should.equal('Category');
                r.message.should.be.ok;
                done();
            });
        });

        it('get non-exist category', function(done) {
            remote.get(remote.guest, '/api/categories/001390000000000ffffffffffffffffffffffffffffffff000', null, function(r) {
                r.error.should.equal('resource:notfound');
                r.data.should.equal('Category');
                r.message.should.be.ok;
                done();
            });
        });
    });
});
