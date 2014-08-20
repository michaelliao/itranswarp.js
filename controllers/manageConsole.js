// manage.js

var
    _ = require('lodash'),
    fs = require('fs'),
    async = require('async');

var
    api = require('../api'),
    db = require('../db'),
    cache = require('../cache'),
    constants = require('../constants'),
    utils = require('./_utils');

var
    User = db.user,
    Article = db.article,
    Category = db.category,
    warp = db.warp;

var
    commentApi = require('./commentApi'),
    categoryApi = require('./categoryApi'),
    articleApi = require('./articleApi'),
    pageApi = require('./pageApi'),
    wikiApi = require('./wikiApi'),
    discussApi = require('./discussApi'),
    attachmentApi = require('./attachmentApi'),
    navigationApi = require('./navigationApi'),
    userApi = require('./userApi'),
    settingApi = require('./settingApi');

var apisList = [commentApi, categoryApi, articleApi, pageApi, wikiApi, discussApi, attachmentApi, navigationApi, userApi, settingApi];

function getAllNavigationMenus(callback) {
    var fns = _.map(apisList, function (theApi) {
        // return [menu1, menu2, ... ]
        if (typeof (theApi.getNavigationMenus) === 'function') {
            return theApi.getNavigationMenus;
        }
        return function (callback) {
            callback(null, []);
        };
    });
    async.series(fns, function (err, results) {
        var menus = _.flatten(results);
        _.each(menus, function (m, index) {
            m.index = index.toString();
        });
        return callback(null, menus);
    });
}

function safeEncodeJSON(obj) {
    return '\'' + encodeURIComponent(JSON.stringify(obj)).replace(/\'/g, '\\\'') + '\'';
}

// do management console

module.exports = {

    'GET /manage/': function (req, res, next) {
        return res.redirect('/manage/comment/');
    },

    // comment ////////////////////////////////////////////////////////////////

    'GET /manage/comment/(index)?': function (req, res, next) {
        var page = utils.getPage(req);
        commentApi.getComments(page, function (err, r) {
            if (err) {
                return next(err);
            }
            return res.render('manage/comment/comment_list.html', {
                page: JSON.stringify(r.page),
                comments: JSON.stringify(r.comments)
            });
        });
    },

    // article ////////////////////////////////////////////////////////////////

    'GET /manage/article/(index)?': function (req, res, next) {
        var page = utils.getPage(req);
        async.parallel({
            articles: function (callback) {
                articleApi.getAllArticles(page, callback);
            },
            categories: function (callback) {
                categoryApi.getCategories(callback);
            }
        }, function (err, results) {
            if (err) {
                return next(err);
            }
            return res.render('manage/article/article_list.html', {
                page: JSON.stringify(results.articles.page),
                articles: JSON.stringify(results.articles.articles),
                categories: JSON.stringify(results.categories)
            });
        });
    },

    'GET /manage/article/create_article': function (req, res, next) {
        categoryApi.getCategories(function (err, categories) {
            if (err) {
                return next(err);
            }
            return res.render('manage/article/article_form.html', {
                form: {
                    name: 'Create Article',
                    action: '/api/articles/',
                    redirect: '/manage/article/'
                },
                categories: JSON.stringify(categories),
                article: {
                    safe_content: safeEncodeJSON('')
                }
            });
        });
    },

    'GET /manage/article/edit_article': function (req, res, next) {
        async.parallel({
            article: function (callback) {
                articleApi.getArticle(req.query.id, function (err, article) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, article);
                });
            },
            categories: function (callback) {
                categoryApi.getCategories(callback);
            }
        }, function (err, results) {
            if (err) {
                return next(err);
            }
            var article = results.article;
            article.safe_content = safeEncodeJSON(article.content);
            return res.render('manage/article/article_form.html', {
                form: {
                    name: 'Edit Article',
                    action: '/api/articles/' + article.id,
                    redirect: '/manage/article/'
                },
                categories: JSON.stringify(results.categories),
                article: article
            });
        });
    },

    'GET /manage/article/category_list': function (req, res, next) {
        categoryApi.getCategories(function (err, categories) {
            if (err) {
                return next(err);
            }
            return res.render('manage/article/category_list.html', {
                categories: JSON.stringify(categories)
            });
        });
    },

    'GET /manage/article/create_category': function (req, res, next) {
        return res.render('manage/article/category_form.html', {
            form: {
                name: 'Create Category',
                action: '/api/categories/',
                redirect: '/manage/article/category_list'
            },
            category: {}
        });
    },

    'GET /manage/article/edit_category': function (req, res, next) {
        categoryApi.getCategory(req.query.id, function (err, obj) {
            if (err) {
                return next(err);
            }
            if (obj === null) {
                return next(api.notFound('Category'));
            }
            return res.render('manage/article/category_form.html', {
                form: {
                    name: 'Edit Category',
                    action: '/api/categories/' + obj.id + '/',
                    redirect: '/manage/article/category_list'
                },
                category: obj
            });
        });
    },

    // page ///////////////////////////////////////////////////////////////////

    'GET /manage/page/(index)?': function (req, res, next) {
        pageApi.getPages(function (err, pages) {
            if (err) {
                return next(err);
            }
            return res.render('manage/page/page_list.html', {
                pages: JSON.stringify(pages)
            });
        });
    },

    'GET /manage/page/create_page': function (req, res, next) {
        return res.render('manage/page/page_form.html', {
            form: {
                name: 'Create Page',
                action: '/api/pages/',
                redirect: '/manage/page/'
            },
            page: {
                tags: '',
                name: '',
                alias: '',
                draft: false,
                content: '',
                safe_content: safeEncodeJSON('')
            }
        });
    },

    'GET /manage/page/edit_page': function (req, res, next) {
        var id = req.query.id;
        pageApi.getPage(id, function (err, page) {
            if (err) {
                return next(err);
            }
            page.safe_content = safeEncodeJSON(page.content);
            return res.render('manage/page/page_form.html', {
                form: {
                    name: 'Edit Page',
                    action: '/api/pages/' + id,
                    redirect: '/manage/page/'
                },
                page: page
            });
        });
    },

    // wiki ///////////////////////////////////////////////////////////////////

    'GET /manage/wiki/(index)?': function (req, res, next) {
        wikiApi.getWikis(function (err, wikis) {
            if (err) {
                return next(err);
            }
            return res.render('manage/wiki/wiki_list.html', {
                wikis: JSON.stringify(wikis)
            });
        });
    },

    'GET /manage/wiki/create_wiki': function (req, res, next) {
        return res.render('manage/wiki/wiki_form.html', {
            form: {
                name: 'Create Wiki',
                action: '/api/wikis/',
                redirect: '/manage/wiki/'
            },
            wiki: {
                safe_content: safeEncodeJSON('')
            }
        });
    },

    'GET /manage/wiki/list_wiki': function (req, res, next) {
        var id = req.query.id;
        wikiApi.getWiki(id, function (err, wiki) {
            return res.render('manage/wiki/wiki_tree.html', {
                wiki: wiki
            });
        });
    },

    'GET /manage/wiki/edit_wiki': function (req, res, next) {
        var id = req.query.id;
        wikiApi.getWikiWithContent(id, function (err, wiki) {
            if (err) {
                return next(err);
            }
            wiki.safe_content = safeEncodeJSON(wiki.content);
            return res.render('manage/wiki/wiki_form.html', {
                form: {
                    name: 'Edit Wiki',
                    action: '/api/wikis/' + id + '/',
                    redirect: '/manage/wiki/list_wiki?id=' + id
                },
                wiki: wiki
            });
        });
    },

    'GET /manage/wiki/edit_wikipage': function (req, res, next) {
        var
            id = req.query.id,
            wikipage = null;
        async.waterfall([
            function (callback) {
                wikiApi.getWikiPageWithContent(id, callback);
            },
            function (wp, callback) {
                wikipage = wp;
                wikiApi.getWiki(wp.wiki_id, callback);
            }
        ], function (err, wiki) {
            if (err) {
                return next(err);
            }
            wikipage.safe_content = safeEncodeJSON(wikipage.content);
            return res.render('manage/wiki/wikipage_form.html', {
                form: {
                    name: 'Edit Wiki Page',
                    action: '/api/wikis/wikipages/' + id + '/',
                    redirect: '/manage/wiki/list_wiki?id=' + wiki.id
                },
                wikipage: wikipage,
                wiki: wiki
            });
        });
    },

    // board //////////////////////////////////////////////////////////////////

    'GET /manage/discuss/(index)?': function (req, res, next) {
        discussApi.getBoards(function (err, boards) {
            if (err) {
                return next(err);
            }
            return res.render('manage/discuss/board_list.html', {
                boards: JSON.stringify(boards)
            });
        });
    },

    'GET /manage/discuss/create_board': function (req, res, next) {
        return res.render('manage/discuss/board_form.html', {
            form: {
                name: 'Create Board',
                action: '/api/boards',
                redirect: '/manage/discuss/'
            },
            board: {}
        });
    },

    'GET /manage/discuss/edit_board': function (req, res, next) {
        discussApi.getBoard(req.query.id, function (err, obj) {
            if (err) {
                return next(err);
            }
            if (obj === null) {
                return next(api.notFound('Board'));
            }
            return res.render('manage/discuss/board_form.html', {
                form: {
                    name: 'Edit Board',
                    action: '/api/boards/' + obj.id + '/',
                    redirect: '/manage/discuss/'
                },
                board: obj
            });
        });
    },

    // attachment /////////////////////////////////////////////////////////////

    'GET /manage/attachment/(index)?': function (req, res, next) {
        var page = utils.getPage(req);
        attachmentApi.getAttachments(page, function (err, results) {
            if (err) {
                return next(err);
            }
            return res.render('manage/attachment/attachment_list.html', {
                page: JSON.stringify(results.page),
                attachments: JSON.stringify(results.attachments)
            });
        });
    },

    // user ///////////////////////////////////////////////////////////////////

    'GET /manage/user/(index)?': function (req, res, next) {
        var page = utils.getPage(req);
        userApi.getUsers(page, function (err, results) {
            if (err) {
                return next(err);
            }
            return res.render('manage/user/user_list.html', {
                now: Date.now(),
                page: JSON.stringify(results.page),
                users: JSON.stringify(results.users)
            });
        });
    },

    // navigation /////////////////////////////////////////////////////////////

    'GET /manage/navigation/(index)?': function (req, res, next) {
        navigationApi.getNavigations(function (err, navigations) {
            if (err) {
                return next(err);
            }
            return res.render('manage/navigation/navigation_list.html', {
                navigations: JSON.stringify(navigations)
            });
        });
    },

    'GET /manage/navigation/create_navigation': function (req, res, next) {
        getAllNavigationMenus(function (err, menus) {
            if (err) {
                return next(err);
            }
            return res.render('manage/navigation/navigation_menu_form.html', {
                form: {
                    name: 'Create Navigation',
                    action: '/api/navigations/',
                    redirect: '/manage/navigation/'
                },
                menus: menus
            });
        });
    },

    'GET /manage/navigation/edit_navigation': function (req, res, next) {
        navigationApi.getNavigation(req.query.id, function (err, obj) {
            if (err) {
                return next(err);
            }
            return res.render('manage/navigation/navigation_form.html', {
                form: {
                    name: 'Edit Navigation',
                    action: '/api/navigations/' + obj.id + '/',
                    redirect: '/manage/navigation/'
                },
                navigation: obj
            });
        });
    },

    // setting ////////////////////////////////////////////////////////////////

    'GET /manage/setting/(index)?': function (req, res, next) {
        var makeField = function (name, value, label, type) {
            return {
                name: name,
                value: value,
                label: label || (name.charAt(0) + name.substring(1)),
                type: type || 'text'
            };
        };
        settingApi.getSettingsByDefaults('website', settingApi.defaultSettings.website, function (err, website) {
            if (err) {
                return next(err);
            }
            return res.render('manage/setting/setting_list.html', {
                form: {
                    name: 'Settings',
                    action: '/manage/setting/save'
                },
                model: safeEncodeJSON({
                    website: website,
                    datetime: {
                        timezone: 'GMT+08:00',
                        date_format: 'yyyy-MM-dd',
                        time_format: 'hh:mm:ss'
                    }
                }),
                settings: [
                    {
                        name: 'website',
                        label: 'Website',
                        fields: [
                            makeField('name', website.name, 'Name'),
                            makeField('description', website.description, 'Description'),
                            makeField('xmlns', website.xmlns, 'XML Namespace'),
                            makeField('custom_header', website.custom_header, 'Custom Header', 'textarea'),
                            makeField('custom_footer', website.custom_footer, 'Custom Footer', 'textarea')
                        ]
                    },
                    {
                        name: 'datetime',
                        label: 'Date and Time',
                        fields: [
                            makeField('timezone', website.timezone, 'Timezone', 'select'),
                            makeField('date_format', website.date_format, 'Date Format', 'select'),
                            makeField('time_format', website.time_format, 'Time Format', 'select')
                        ]
                    }
                ]
            });
        });
    },

    'POST /manage/setting/save': function (req, res, next) {
        var
            settings = ['website', 'datetime'],
            tasks = [];
        _.each(settings, function (group) {
            tasks.push(function (callback) {
                settingApi.setSettings(group, req.body[group], callback);
            });
        });
        async.series(tasks, function (err, results) {
            if (err) {
                return next(err);
            }
            cache.remove(constants.CACHE_KEY_WEBSITE_SETTINGS);
            return res.send({ result: true });
        });
    }
};
