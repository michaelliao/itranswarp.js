// category.js

var Base = require('./_base.js');

exports = module.exports = function(sequelize, DataTypes) {
    return Base.create(sequelize, DataTypes, 'Category', {
        name: Base.column_name(),
        description: Base.column_varchar_500(),
        display_order: Base.column_bigint()
    });
}
