// user.js

var Base = require('./_base.js');

module.exports = function(sequelize, DataTypes) {
    return Base(sequelize, DataTypes, 'User', {
        role: {
            type: DataTypes.BIGINT,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: {
                isEmail: true,
                isLowercase: true
            }
        },
        passwd: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        verified: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        },
        binds: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        image_url: {
            type: DataTypes.STRING(1000),
            allowNull: false
        },
        locked_util: {
            type: DataTypes.BIGINT,
            allowNull: false
        }
    });
};
