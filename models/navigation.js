// navigation.js

var Base = require('./_base.js');

exports = module.exports = function(sequelize, DataTypes) {
    return Base.create(sequelize, DataTypes, 'Navigation', {
        name: Base.column_name(),
        url: Base.column_url(),
        display_order: Base.column_bigint()
    });
}
