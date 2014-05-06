// test category api:

var
    remote = require('./_test'),
    should = require('should'),
    async = require('async');

var commentApi = require('../controllers/commentApi');
var utils = require('../controllers/_utils');

describe('#comments', function () {

    var article = null;
    var wiki = null;
    var wikipage = null;

    before(remote.setup);

    before(function (done) {
        // create article:
        remote.post(remote.admin, '/api/categories', {
            name: 'Category for Comment'
        }, function (c) {
            should(c.error).not.be.ok;
            c.id.should.be.ok.and.have.lengthOf(50);
            remote.post(remote.editor, '/api/articles', {
                category_id: c.id,
                name: 'Article for Comment',
                description: 'for comment',
                content: 'Please add comments...'
            }, function (a) {
                should(a.error).not.be.ok;
                a.name.should.equal('Article for Comment');
                article = a;
                done();
            });
        });
    });

    before(function (done) {
        // create wiki:
        remote.post(remote.admin, '/api/wikis', {
            name: 'Wiki for Comment',
            description: 'for Comment...',
            content: 'Wiki for Comment...'
        }, function (w) {
            should(w.error).not.be.ok;
            w.id.should.be.ok.and.have.lengthOf(50);
            wiki = w;
            // create wikipage:
            remote.post(remote.editor, '/api/wikis/' + wiki.id + '/wikipages', {
                parent_id: 'ROOT',
                name: 'Wiki Page for Comment',
                content: 'Wiki Page for Comment...'
            }, function (wp) {
                should(wp.error).not.be.ok;
                wp.wiki_id.should.equal(wiki.id);
                wikipage = wp;
                done();
            });
        });
    });

    describe('#api', function () {

        it('get comments on article', function (done) {
            commentApi.getComments(article.id, utils.page(1, 10), function (err, r) {
                should(err===null).be.ok;
                r.page.totalItems.should.equal(0);
                r.comments.should.be.an.Array.and.have.length(0);
                done();
            });
        });

        it('create a new comment on article by subscriber', function (done) {
            remote.post(remote.subscriber, '/api/articles/' + article.id + '/comments', { content: '\n Hello\r\n\n\n\r\n<a>Hack</a>' }, function (c) {
                c.ref_id.should.equal(article.id);
                c.ref_type.should.equal('article');
                c.content.should.equal('Hello\n&lt;a&gt;Hack&lt;/a&gt;');
                done();
            });
        });

        it('create a new comment on wiki by subscriber', function (done) {
            remote.post(remote.subscriber, '/api/wikis/' + wiki.id + '/comments', { content: '\n Hello\r\n\n\n\r\n<a>Hack</a>' }, function (c) {
                c.ref_id.should.equal(wiki.id);
                c.ref_type.should.equal('wiki');
                c.content.should.equal('Hello\n&lt;a&gt;Hack&lt;/a&gt;');
                done();
            });
        });

        it('create a new comment on wikipage by subscriber', function (done) {
            remote.post(remote.subscriber, '/api/wikis/wikipages/' + wikipage.id + '/comments', { content: '\n Hello\r\n\n\n\r\n<a>Hack</a>' }, function (c) {
                c.ref_id.should.equal(wikipage.id);
                c.ref_type.should.equal('wikipage');
                c.content.should.equal('Hello\n&lt;a&gt;Hack&lt;/a&gt;');
                done();
            });
        });
   
        it('create lots of comments on article', function (done) {
            var tasks = [];
            for (var i=0; i<100; i++) {
                (function (n) {
                    tasks.push(function (callback) {
                        remote.post(remote.subscriber, '/api/articles/' + article.id + '/comments', { content: '   Test & ' + n }, function (c) {
                            should(c.error).not.be.ok;
                            c.ref_id.should.equal(article.id);
                            c.content.should.equal('Test &amp; ' + n);
                            callback(null, c);
                        });
                    });
                })(i);
            }
            async.series(tasks, function (err, results) {
                if (err) {
                    return done(err);
                }
                // get comments:
                commentApi.getComments(article.id, utils.page(1, 10), function (err, r1) {
                    should(err===null).be.ok;
                    r1.page.totalItems.should.equal(101);
                    r1.comments.should.be.an.Array.and.have.length(10);
                    commentApi.getComments(article.id, utils.page(11, 10), function (err, r2) {
                        should(err===null).be.ok;
                        r2.page.totalItems.should.equal(101);
                        r2.comments.should.be.an.Array.and.have.length(1);
                        done();
                    });
                });
            });
        });
    });
});
