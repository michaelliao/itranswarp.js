// test category api:

var test = require('../api_test');

exports.testGetCategories = function(beforeExit, assert) {
    var r = null;
    test.get('/api/categories', null, function(obj) {
        r = obj;
    });
    beforeExit(function() {
        assert.isNotNull(r);
        assert.ok(Array.isArray(r.categories));
    });
};

exports.testCreateCategoryMissingParam = function(beforeExit, assert) {
    var r = null;
    test.post('/api/categories', {
        description: 'a description...'
    }, function(obj) {
        r = obj;
    });
};

exports.testCreateCategory = function(beforeExit, assert) {
    var r = null;
    test.post('/api/categories', {
        name: ' Test Name\n  ',
        description: '  a description...  '
    }, function(obj) {
        r = obj;
    });
    beforeExit(function() {
        assert.isNotNull(r);
        assert.equal(r.name, 'Test Name', 'Category name is wrong!');
        assert.equal(r.description, 'a description...', 'Category description is wrong!');
    });
};
