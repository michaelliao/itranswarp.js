// api:

function create_api_error(err_code, err_data, err_message) {
    return {
        error: err_code || 'internal:unknown',
        data: err_data || '',
        message: err_message || ''
    };
}

var api = {
    notallowed: function(err_data, err_message) {
        return create_api_error('permission:notallowed', err_data, err_message);
    },
    notfound: function(err_data, err_message) {
        return create_api_error('resource:notfound', err_data, err_message);
    },
    error: function(err_code, err_data, err_message) {
        if (err_code instanceof Error) {
            return create_api_error('', err_code.message, err_code.stack);
        }
        return create_api_error(err_code, err_data, err_message);
    }
}

exports = module.exports = api;
