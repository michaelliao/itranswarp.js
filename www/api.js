'use strict';

// api:

function APIError(err_code, err_data, err_message) {
    this.error = err_code;
    this.data = err_data;
    this.message = err_message;
}

var api = {
    authRequired: function () {
        return new APIError('auth:required', '', 'Please sign in.');
    },
    authFailed: function (paramName, message) {
        return new APIError('auth:failed', paramName || '', message || 'Invalid email or password.');
    },
    invalidRequest: function (paramName, message) {
        return new APIError('request:invalid', paramName, message || 'Invalid request: ' + paramName);
    },
    invalidParam: function (paramName, message) {
        return new APIError('parameter:invalid', paramName, message || 'Invalid parameter: ' + paramName);
    },
    notAllowed: function (err_message) {
        return new APIError('permission:denied', 'permission', err_message);
    },
    notFound: function (err_data, err_message) {
        return new APIError('entity:notfound', err_data, err_message || (err_data + ' not found.'));
    },
    conflictError: function (err_data, err_message) {
        return new APIError('entity:conflict', err_data, err_message || (err_data + ' conflict.'));
    },
    serverError: function (err_code, err_data, err_message) {
        if (err_code instanceof Error) {
            return new APIError('500', err_code.message, err_code.stack);
        }
        if (err_code && err_code.error) {
            return err_code;
        }
        return new APIError(err_code, err_data, err_message);
    },
    error: function (err_code, err_data, err_message) {
        return new APIError(err_code, err_data, err_message);
    },
    APIError: APIError
};

module.exports = api;
