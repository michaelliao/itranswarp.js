// api:

function APIError(err_code, err_data, err_message) {
    this.error = err_code;
    this.data = err_data;
    this.message = err_message;
}

var api = {
    APIError: APIError,
    authRequired: () => {
        return new APIError('auth:required', '', 'Please sign in.');
    },
    authFailed: (paramName, message) => {
        return new APIError('auth:failed', paramName || '', message || 'Invalid email or password.');
    },
    invalidRequest: (paramName, message) => {
        return new APIError('request:invalid', paramName, message || 'Invalid request: ' + paramName);
    },
    invalidParam: (paramName, message) => {
        return new APIError('parameter:invalid', paramName, message || 'Invalid parameter: ' + paramName);
    },
    notAllowed: (err_message) => {
        return new APIError('permission:denied', 'permission', err_message);
    },
    notFound: (err_data, err_message) => {
        return new APIError('entity:notfound', err_data, err_message || (err_data + ' not found.'));
    },
    conflictError: (err_data, err_message) => {
        return new APIError('entity:conflict', err_data, err_message || (err_data + ' conflict.'));
    },
    serverError: (err_code, err_data, err_message) => {
        if (err_code instanceof Error) {
            return new APIError('500', err_code.message, err_code.stack);
        }
        if (err_code && err_code.error) {
            return err_code;
        }
        return new APIError(err_code, err_data, err_message);
    },
    error: (err_code, err_data, err_message) => {
        return new APIError(err_code, err_data, err_message);
    },
    restify: (pathPrefix) => {
        pathPrefix = pathPrefix || '/api/';
        return async (ctx, next) => {
            if (ctx.request.path.startsWith(pathPrefix)) {
                console.log(`Process API ${ctx.request.method} ${ctx.request.url}...`);
                ctx.rest = (data) => {
                    ctx.response.type = 'application/json';
                    ctx.response.body = data;
                }
                try {
                    await next();
                } catch (e) {
                    console.log('Process API error...');
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
    }
};

module.exports = api;
