// test category api:

var remote = require('./_test'),
    should = require('should');

var commentApi = require('../controllers/commentApi');
var utils = require('../controllers/_utils');

describe('#comments', function() {

    var article = null;

    before(remote.setup);

    before(function(done) {
        // create article:
        remote.post(remote.admin, '/api/categories', {
            name: 'Category for Comment'
        }, function(c) {
            should(c.error).not.be.ok;
            c.id.should.be.ok.and.have.lengthOf(50);
            remote.post(remote.editor, '/api/articles', {
                category_id: c.id,
                name: 'Article for Comment',
                description: '',
                content: 'Please add comments...'
            }, function(a) {
                should(a.error).not.be.ok;
                a.name.should.equal('Article for Comment');
                article = a;
                done();
            });
        });
    });

    describe('#api', function() {

        it('get comments on article', function(done) {
            commentApi.getComments(article.id, utils.page(1, 10), function(err, r) {
                should(err===null).be.ok;
                r.page.totalItems.should.equal(0);
                r.comments.should.be.an.Array.and.have.length(0);
                done();
            });
        });

        it('create a new comment by subscriber', function(done) {
            remote.post(remote.subscriber, '/api/articles/' + article.id + '/comments', { content: '\n Hello\r\n\n\n\r\n<a>Hack</a>' }, function(c) {
                c.ref_id.should.equal(article.id);
                c.content.should.equal('Hello\n&lt;a&gt;Hack&lt;/a&gt;');
                done();
            });
        });
    });
});
