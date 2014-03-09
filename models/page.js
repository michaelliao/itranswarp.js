// page.js

var Base = require('./_base.js');

exports = module.exports = function(sequelize, DataTypes) {
    return Base.create(sequelize, DataTypes, 'Page', {
        alias: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
            validate: {
                isLowercase: true
            }
        },

        content_id: Base.column_id(),

        draft: Base.column_boolean(),

        name: Base.column_varchar_100(),
        tags: Base.column_varchar_500()
    });
}
