// wiki.js

var Base = require('./_base.js');

exports = module.exports = function(sequelize, DataTypes) {
    return Base.create(sequelize, DataTypes, 'Wiki', {
        name: Base.column_varchar_100(),
        description: Base.column_varchar_500(),

        cover_id: Base.column_id(),
        content_id: Base.column_id()
    });
}
