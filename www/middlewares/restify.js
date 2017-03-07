/**
 * koa middleware to support rest.
 * 
 * Usage:
 * 
 *   const restify = require('./restify');
 *   app.use(restify('/api/'));
 * 
 * Controllers:
 * 
 *   async function (ctx, next) {
 *     return ctx.rest({
 *       id: 12345,
 *       name: 'Michael'
 *     });
 *   }
 */

function _logJSON(data) {
    if (data) {
        logger.debug(JSON.stringify(data, function (key, value) {
            if (key === 'image' && value) {
                return value.substring(0, 20) + ' (' + value.length + ' bytes image data) ...';
            }
            return value;
        }, '  '));
    }
    else {
        logger.debug('(EMPTY)');
    }
}

module.exports = function (pathPrefix = '/api/') {
    return async (ctx, next) => {
        if (ctx.request.path.startsWith(pathPrefix)) {
            logger.info(`process API ${ctx.request.method} ${ctx.request.url}...`);
            ctx.validate = (schemaName) => {
                // todo: validate schema:
            };
            ctx.rest = (data) => {
                ctx.response.type = 'application/json';
                ctx.response.body = data;
            }
            try {
                await next();
            } catch (e) {
                logger.warn('process API error.', e);
                ctx.response.status = 400;
                ctx.response.type = 'application/json';
                ctx.response.body = {
                    error: e.error || 'internal:unknown_error',
                    message: e.message || ''
                };
            }
        } else {
            await next();
        }
    };
};
