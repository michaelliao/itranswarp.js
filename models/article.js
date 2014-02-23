// article.js

var Base = require('./_base.js');

module.exports = function(sequelize, DataTypes) {
    return Base(sequelize, DataTypes, 'Article', {
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        summary: {
            type: DataTypes.STRING(1000),
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
            validate: {
                notEmpty: true
            }
        }
    });
}
