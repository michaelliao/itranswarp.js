// authuser.js

var Base = require('./_base.js');

exports = module.exports = function(sequelize, DataTypes) {
    return Base.create(sequelize, DataTypes, 'AuthUser', {
        user_id: Base.column_id(),

        auth_provider: Base.column_varchar_100(),
        auth_id: Base.column_varchar_200(true),
        auth_token: Base.column_varchar_200(),

        expires_time: Base.column_timestamp()
    });
};
