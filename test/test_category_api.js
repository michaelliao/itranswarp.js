// test category api:

var api = require('./_test');

var assert = require('assert');
var log = console.log;

suite('test categories', function() {
    setup(api.setup);

    suite('#/api/categories', function() {

        test('should get empty categories', function(done) {
            api.get('/api/categories', null, function(r) {
                assert.ok(r.categories.length===0)
                done();
            });
        });

        test('create a new category', function(done) {
            api.post('/api/categories', {
                name: ' Test Category  \n\n ',
                description: '  this is a test category...  '
            }, function(r) {
                assert.equal(r.display_order, 0, 'display order of the first category is not 0.');
                assert.equal(r.name, 'Test Category', 'category name is wrong.');
                assert.equal(r.description, 'this is a test category...', 'category description is wrong.');
                assert.equal(r.version, 0, 'versoin must be 0.');
                assert.ok(r.id.length==50, 'category id is invalid.');
                // get by id:
                api.get('/api/categories/' + r.id, null, function(r2) {
                    assert.equal(r2.id, r.id, 'id must be equal.');
                    assert.equal(r2.name, r.name, 'name must be equal.');
                    assert.equal(r2.description, r.description, 'description must be equal.');
                    assert.equal(r2.created_at, r.created_at, 'created_at must be equal.');
                    assert.equal(r2.updated_at, r.updated_at, 'updated_at must be equal.');
                    // create another:
                    api.post('/api/categories', {
                        name: 'Another Category'
                    }, function(r3) {
                        assert.equal(r3.display_order, 1, 'display order should be 1 for second category.');
                        // get all category:
                        api.get('/api/categories', {}, function(r4) {
                            assert.ok(Array.isArray(r4.categories), 'no categories in result.');
                            assert.equal(r4.categories.length, 2, 'should be 2 categories.');
                            done();
                        });
                    });
                });
            });
        });

        test('create new category with wrong param', function(done) {
            api.post('/api/categories', {
                description: '  no name parameter...  '
            }, function(r) {
                assert.equal(r.error, 'parameter:invalid', 'error code is wrong.');
                assert.equal(r.data, 'name', 'error data is wrong.');
                done();
            });
        });

        test('update a category', function(done) {
            api.post('/api/categories', {
                name: ' Before Update   \n\n '
            }, function(r) {
                // try update its name and description:
                api.post('/api/categories/' + r.id, {
                    name: ' After Update\n   ',
                    description: '  added description...  \t  '
                }, function(r2) {
                    assert.equal(r2.id, r.id, 'id must be equal.');
                    assert.equal(r2.name, 'After Update', 'name not updated.');
                    assert.equal(r2.description, 'added description...', 'description not updated.');
                    assert.equal(r2.created_at, r.created_at, 'created_at must be equal.');
                    assert.ok(r2.updated_at > r.updated_at, 'updated_at must be greater.');
                    assert.ok(r2.version, 1, 'version not increased.');
                    done();
                });
            });
        });

        test('delete a category', function(done) {
            // create first:
            api.post('/api/categories', {
                name: ' Before Delete   \t '
            }, function(r) {
                assert.equal(r.name, 'Before Delete', 'category name is wrong.');
                assert.equal(r.description, '', 'category description is wrong.');
                assert.equal(r.version, 0, 'versoin must be 0.');
                assert.ok(r.id.length==50, 'category id is invalid.');
                // try delete:
                api.post('/api/categories/' + r.id + '/delete', null, function(r2) {
                    assert.equal(r2.id, r.id, 'id must be equal.');
                    done();
                });
            });
        });

        test('delete a non-exist category', function(done) {
            api.post('/api/categories/001390000000000ffffffffffffffffffffffffffffffff000/delete', null, function(r) {
                assert.equal(r.error, 'resource:notfound', 'bad error code.');
                assert.equal(r.data, 'category', 'bad error data.');
                assert.ok('message' in r, 'do not have a message.');
                done();
            });
        });

        test('get non-exist category', function(done) {
            api.get('/api/categories/001390000000000ffffffffffffffffffffffffffffffff000', null, function(r) {
                assert.equal(r.error, 'resource:notfound', 'bad error code.');
                assert.equal(r.data, 'category', 'bad error data.');
                assert.ok('message' in r, 'do not have a message.');
                done();
            });
        });
    });
});
