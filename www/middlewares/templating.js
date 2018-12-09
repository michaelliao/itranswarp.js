'use strict';

/**
 * koa middleware to render view using Nunjucks.
 * 
 * author: Michael Liao
 */

const
    nunjucks = require('nunjucks'),
    config = require('../config'),
    SECURE = config.session_https === 'true';

function createEnv(path, opts) {
    let
        autoescape = opts.autoescape === undefined ? true : opts.autoescape,
        noCache = opts.noCache || false,
        watch = opts.watch || false,
        throwOnUndefined = opts.throwOnUndefined || false,
        env = new nunjucks.Environment(
            new nunjucks.FileSystemLoader(path, {
                noCache: noCache,
                watch: watch,
            }), {
                autoescape: autoescape,
                throwOnUndefined: throwOnUndefined
            }),
        f;
    if (opts.filters) {
        for (f in opts.filters) {
            env.addFilter(f, opts.filters[f]);
        }
    }
    return env;
}

module.exports = (path, opts) => {
    let env = createEnv(path, opts);
    return async (ctx, next) => {
        ctx.render = function (view, model) {
            let
                viewPath = view,
                path = ctx.request.path;
            if (! path.startsWith('/manage/')) {
                viewPath = 'themes/' + ctx.state.__theme__ + '/' + view;
            }
            if (SECURE) {
                ctx.response.set('Content-Security-Policy', 'upgrade-insecure-requests');
            }
            ctx.response.type = 'text/html';
            ctx.response.body = env.render(viewPath, Object.assign({}, ctx.state || {}, model || {}));
        };
        await next();
    };
};
