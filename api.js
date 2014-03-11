// api:

function create_api_error(err_code, err_data, err_message) {
    return {
        error: err_code || 'internal:unknown',
        data: err_data || '',
        message: err_message || ''
    };
}

var api = {
    invalid_param: function(paramName) {
        return create_api_error('param:invalid', paramName, 'Invalid parameter: ' + paramName);
    },
    not_allowed: function(err_message) {
        return create_api_error('permission:notallowed', '', err_message);
    },
    not_found: function(err_data, err_message) {
        return create_api_error('resource:notfound', err_data, err_message);
    },
    server_error: function(err_code, err_data, err_message) {
        if (err_code instanceof Error) {
            return create_api_error('', err_code.message, err_code.stack);
        }
        if (err_code && err_code.error) {
            return err_code;
        }
        return create_api_error(err_code, err_data, err_message);
    },
    error: function(err_code, err_data, err_message) {
        if (err_code instanceof Error) {
            return create_api_error('', err_code.message, err_code.stack);
        }
        if (err_code && err_code.error) {
            return err_code;
        }
        return create_api_error(err_code, err_data, err_message);
    }
}

exports = module.exports = api;
