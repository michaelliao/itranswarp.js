// random.js

var Base = require('./_base.js');

exports = module.exports = function(sequelize, DataTypes) {
    return Base.create(sequelize, DataTypes, 'Random', {
        value: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
            validate: {
                isLowercase: true
            }
        },
        expires_time: Base.column_timestamp()
    });
};
