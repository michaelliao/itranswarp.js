'use strict';

/**
 * koa middleware to serve static staticFiles.
 * 
 * For development only.
 * 
 * author: Michael Liao
 */

const
    path = require('path'),
    mime = require('mime'),
    fs = require('mz/fs');

module.exports = (prefix, dir) => {
    return async (ctx, next) => {
        let rpath = ctx.request.path;
        if (rpath.startsWith(prefix)) {
            let fp = path.join(dir, rpath.substring(prefix.length));
            if (await fs.exists(fp)) {
                ctx.response.type = mime.lookup(rpath);
                ctx.response.body = await fs.readFile(fp);
            } else {
                ctx.response.status = 404;
            }
        } else {
            await next();
        }
    };
}
