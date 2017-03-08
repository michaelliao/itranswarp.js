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

const
    logger = require('../logger'),
    api_schema = require('../api_schema');

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
        let
            request = ctx.request,
            response = ctx.response;
        if (request.path.startsWith(pathPrefix)) {
            logger.info(`process API ${request.method} ${request.url}...`);
            ctx.validate = (schemaName) => {
                api_schema.validate(schemaName, request.body);
            };
            ctx.rest = (data) => {
                response.type = 'application/json';
                response.body = data;
            }
            try {
                await next();
            } catch (e) {
                logger.warn('process API error.', e);
                response.status = 400;
                response.type = 'application/json';
                response.body = {
                    error: e.error || 'internal:unknown_error',
                    message: e.message || ''
                };
            }
        } else {
            await next();
        }
    };
};
