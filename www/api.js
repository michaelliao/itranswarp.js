'use strict';

/**
 * APIError object definition.
 * 
 * @param {string} err_code 
 * @param {string} err_data 
 * @param {string} err_message 
 */
function APIError(err_code, err_data, err_message) {
    this.error = err_code;
    this.data = err_data;
    this.message = err_message;
}

module.exports = {
    APIError: APIError,
    authRequired: () => {
        return new APIError('auth:required', '', 'Please sign in.');
    },
    authFailed: (paramName='', message='Invalid email or password.') => {
        return new APIError('auth:failed', paramName, message);
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
    }
};
