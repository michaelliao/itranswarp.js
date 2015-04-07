'use strict';

// article api

var
    _ = require('lodash'),
    api = require('../api'),
    db = require('../db'),
    cache = require('../cache'),
    images = require('./_images'),
    helper = require('../helper'),
    constants = require('../constants'),
    search = require('../search/search'),
    json_schema = require('../json_schema');

var
    commentApi = require('./commentApi'),
    settingApi = require('./settingApi'),
    categoryApi = require('./categoryApi'),
    attachmentApi = require('./attachmentApi');

var
    User = db.user,
    Article = db.article,
    Category = db.category,
    Text = db.text,
    warp = db.warp,
    next_id = db.next_id;

function indexArticle(r) {
    process.nextTick(function () {
        search.engine.index({
            type: 'article',
            id: r.id,
            tags: r.tags,
            name: r.name,
            description: r.description,
            content: helper.html2text(helper.md2html(r.content)),
            created_at: r.publish_at,
            updated_at: r.updated_at,
            url: '/article/' + r.id,
            upvotes: 0
        });
    });
}

function unindexArticle(r) {
    process.nextTick(function () {
        search.engine.unindex({
            id: r.id
        });
    });
}

function* $getRecentArticles(max) {
    var now = Date.now();
    return yield Article.$findAll({
        where: 'publish_at<?',
        order: 'publish_at desc',
        params: [now],
        offset: 0,
        limit: max
    });
}

function* $getAllArticles(page) {
    page.total = yield Article.$findNumber('count(id)');
    if (page.isEmpty) {
        return [];
    }
    return yield Article.$findAll({
        offset: page.offset,
        limit: page.limit,
        order: 'publish_at desc'
    });
}

function* $getArticles(page) {
    var now = Date.now();
    page.total = yield Article.$findNumber({
        select: 'count(id)',
        where: 'publish_at<?',
        params: [now]
    });
    if (page.isEmpty) {
        return [];
    }
    return yield Article.$findAll({
        offset: page.offset,
        limit: page.limit,
        order: 'publish_at desc'
    });
}

function* $getArticlesByCategory(categoryId, page) {
    var now = Date.now();
    page.total = yield Article.$findNumber({
        select: 'count(id)',
        where: 'publish_at<? and category_id=?',
        params: [now, categoryId]
    });
    if (page.isEmpty) {
        return [];
    }
    return yield Article.$findAll({
        order: 'publish_at desc',
        where: 'publish_at<? and category_id=?',
        params: [now, categoryId],
        offset: page.offset,
        limit: page.limit
    });
}

function* $getArticle(id, includeContent) {
    var
        text,
        article = yield Article.$find(id);
    if (article === null) {
        throw api.notFound('Article');
    }
    if (includeContent) {
        text = yield Text.$find(article.content_id);
        if (text === null) {
            throw api.notFound('Text');
        }
        article.content = text.value;
    }
    return article;
}

function toRssDate(dt) {
    return new Date(dt).toGMTString();
}

function* $getFeed(domain) {
    var
        i, text, article, url,
        articles = yield $getRecentArticles(20),
        last_publish_at = articles.length === 0 ? 0 : articles[0].publish_at,
        website = yield $settingApi.$getSettingsByDefaults('website', settingApi.defaultSettings.website),
        rss = [],
        rss_footer = '</channel></rss>';
    rss.push('<?xml version="1.0"?>\n');
    rss.push('<rss version="2.0"><channel><title><![CDATA[');
    rss.push(website.name);
    rss.push(']]></title><link>http://');
    rss.push(domain);
    rss.push('/</link><description><![CDATA[');
    rss.push(website.description);
    rss.push(']]></description><lastBuildDate>');
    rss.push(toRssDate(last_publish_at));
    rss.push('</lastBuildDate><generator>iTranswarp.js</generator><ttl>3600</ttl>');

    if (articles.length === 0) {
        rss.push(rss_footer);
    }
    else {
        for (i=0; i<articles.length; i++) {
            article = articles[i];
            text = yield Text.$find(article.content_id);
            url = 'http://' + domain + '/article/' + article.id;
            rss.push('<item><title><![CDATA[');
            rss.push(article.name);
            rss.push(']]></title><link>');
            rss.push(url);
            rss.push('</link><guid>');
            rss.push(url);
            rss.push('</guid><author><![CDATA[');
            rss.push(article.user_name);
            rss.push(']]></author><pubDate>');
            rss.push(toRssDate(article.publish_at));
            rss.push('</pubDate><description><![CDATA[');
            rss.push(helper.md2html(text.value, true));
            rss.push(']]></description></item>');
        }
        rss.push(rss_footer);
    }
    return rss.join('');
}

var RE_TIMESTAMP = /^\-?[0-9]{1,13}$/;

module.exports = {

    $getRecentArticles: $getRecentArticles,

    $getArticlesByCategory: $getArticlesByCategory,

    $getAllArticles: $getAllArticles,

    $getArticles: $getArticles,

    $getArticle: $getArticle,

    'GET /feed': function* () {
        var
            rss,
            gf = function* () {
                return yield $getFeed(this.request.host);
            };
        rss = yield cache.$get('cached_rss', gf);
        this.set('Cache-Control', 'max-age: 3600');
        this.type = 'application/rss+xml';
        this.body = rss;
    },

    'GET /api/articles/:id': function* (id) {
        /**
         * Get article.
         * 
         * @name Get Article
         * @param {string} id: Id of the article.
         * @param {string} [format]: Return html if format is 'html', default to '' (raw).
         * @return {object} Article object.
         * @error {resource:notfound} Article was not found by id.
         */
        var article = yield $getArticle(id, true);
        if (article.publish_at > Date.now() && (this.request.user===null || this.request.user.role > constants.role.CONTRIBUTOR)) {
            throw api.notFound('Article');
        }
        if (this.request.query.format === 'html') {
            article.content = helper.md2html(article.content, true);
        }
        this.body = article;
    },

    'GET /api/articles': function* () {
        /**
         * Get articles by page.
         * 
         * @name Get Articles
         * @param {number} [page=1]: The page number, starts from 1.
         * @return {object} Article objects and page information.
         */
        helper.checkPermission(this.request, constants.role.CONTRIBUTOR);
        var
            page = helper.getPage(this.request),
            articles = yield $getAllArticles(page);
        this.body = {
            page: page,
            articles: articles
        };
    },

    'POST /api/articles': function* () {
        /**
         * Create a new article.
         * 
         * @name Create Article
         * @param {string} category_id: Id of the category that article belongs to.
         * @param {string} name: Name of the article.
         * @param {string} description: Description of the article.
         * @param {string} content: Content of the article.
         * @param {string} [tags]: Tags of the article, seperated by ','.
         * @param {string} [publish_at]: Publish time of the article with format 'yyyy-MM-dd HH:mm:ss', default to current time.
         * @param {image} [image]: Base64 encoded image to upload as cover image.
         * @return {object} The created article object.
         * @error {parameter:invalid} If some parameter is invalid.
         * @error {permission:denied} If current user has no permission.
         */
        helper.checkPermission(this.request, constants.role.EDITOR);
        var
            text,
            article,
            attachment,
            article_id,
            content_id,
            data = this.request.body;
        json_schema.validate('createArticle', data);
        // check category id:
        yield categoryApi.$getCategory(data.category_id);

        attachment = yield attachmentApi.$createAttachment(
            this.request.user.id,
            data.name.trim(),
            data.description.trim(),
            new Buffer(data.image, 'base64'),
            null,
            true);

        content_id = next_id();
        article_id = next_id();

        text = yield Text.$create({
            id: content_id,
            ref_id: article_id,
            value: data.content
        });

        article = yield Article.$create({
            id: article_id,
            user_id: this.request.user.id,
            user_name: this.request.user.name,
            category_id: data.category_id,
            cover_id: attachment.id,
            content_id: content_id,
            name: data.name.trim(),
            description: data.description.trim(),
            tags: helper.formatTags(data.tags),
            publish_at: (data.publish_at === undefined ? Date.now() : data.publish_at)
        });

        article.content = data.content;
        indexArticle(article);

        this.body = article;
    },

    'POST /api/articles/:id': function* (id) {
        /**
         * Update an exist article.
         * 
         * @name Update Article
         * @param {string} id: Id of the article.
         * @param {string} [category_id]: Id of the category that article belongs to.
         * @param {string} [name]: Name of the article.
         * @param {string} [description]: Description of the article.
         * @param {string} [content]: Content of the article.
         * @param {string} [tags]: Tags of the article, seperated by ','.
         * @param {string} [publish_at]: Publish time of the article with format 'yyyy-MM-dd HH:mm:ss'.
         * @return {object} The updated article object.
         * @error {resource:notfound} Article was not found by id.
         * @error {parameter:invalid} If some parameter is invalid.
         * @error {permission:denied} If current user has no permission.
         */
        helper.checkPermission(this.request, constants.role.EDITOR);
        var
            user = this.request.user,
            article,
            props = [],
            text,
            attachment,
            data = this.request.body;
        json_schema.validate('updateArticle', data);

        article = yield $getArticle(id);
        if (user.role !== constants.role.ADMIN && user.id !== article.user_id) {
            throw api.notAllowed('Permission denied.');
        }
        if (data.category_id) {
            yield categoryApi.$getCategory(data.category_id);
            article.category_id = data.category_id;
            props.push('category_id');
        }
        if (data.name) {
            article.name = data.name.trim();
            props.push('name');
        }
        if (data.description) {
            article.description = data.description.trim();
            props.push('description');
        }
        if (data.tags) {
            article.tags = helper.formatTags(data.tags);
            props.push('tags');
        }
        if (data.publish_at !== undefined) {
            article.publish_at = data.publish_at;
            props.push('publish_at');
        }
        if (data.image) {
            // check image:
            attachment = yield attachmentApi.$createAttachment(
                user.id,
                article.name,
                article.description,
                new Buffer(data.image, 'base64'),
                null,
                true);
            article.cover_id = attachment.id;
            props.push('cover_id');
        }
        if (data.content) {
            text = yield Text.$create({
                ref_id: article.id,
                value: data.content
            });
            article.content_id = text.id;
            article.content = data.content;
            props.push('content_id');
        }
        if (props.length > 0) {
            props.push('updated_at');
            props.push('version');
            yield article.$update(props);
        }
        if (!article.content) {
            text = yield Text.$find(article.content_id);
            article.content = text.value;
        }
        this.body = article;
    },

    'POST /api/articles/:id/comments': function* (id) {
        /**
         * Create a comment on an article.
         * 
         * @name Comment Article
         * @param {string} id: Id of the article.
         * @param {string} [content]: Content of the comment.
         * @return {object} The comment object.
         * @error {resource:notfound} Article was not found by id.
         * @error {parameter:invalid} If some parameter is invalid.
         * @error {permission:denied} If current user has no permission.
         */
        helper.checkPermission(this.request, constants.role.SUBSCRIBER);

    },

    'POST /api/articles/:id/delete': function* (id) {
        /**
         * Delete an article.
         * 
         * @name Delete Article
         * @param {string} id: Id of the article.
         * @return {object} Object contains deleted id.
         * @error {resource:notfound} Article not found by id.
         * @error {permission:denied} If current user has no permission.
         */
        helper.checkPermission(this.request, constants.role.EDITOR);
        var
            user = this.request.user,
            article = yield $getArticle(id);
        if (user.role !== constants.role.ADMIN && user.id !== article.user_id) {
            throw api.notAllowed('Permission denied.');
        }
        yield article.$destroy();
        yield warp.$update('delete from texts where ref_id=?', [id]);
        this.body = {
            id: id
        };
    }
};
