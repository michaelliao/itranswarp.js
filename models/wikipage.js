// wikipage.js

var Base = require('./_base.js');

exports = module.exports = function(sequelize, DataTypes) {
    return Base.create(sequelize, DataTypes, 'WikiPage', {
        wiki_id: Base.column_id(),
        parent_id: Base.column_id(),

        name: Base.column_varchar_100(),

        content_id: Base.column_id(),

        display_order: Base.column_bigint()
    });
}
