// user.js

var Base = require('./_base.js');

exports = module.exports = function(sequelize, DataTypes) {
    return Base.create(sequelize, DataTypes, 'User', {
        // user role: 0 = admin, 10000 = guest
        role: Base.column_bigint(),
        // user display name
        name: Base.column_name(),
        // user's email, in lowercase.
        email: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true,
                isLowercase: true
            }
        },
        // md5-hashed password, in lowercase, or empty string if user signed in from 3rd-party.
        passwd: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        // email address verified or not.
        verified: Base.column_boolean(),
        // which 3rd-part signin providers:
        binds: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        // user's image url:
        image_url: Base.column_url(),
        // user should be locked util timestamp:
        locked_util: Base.column_timestamp()
    });
};
