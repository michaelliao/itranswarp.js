// attachment.js

var Base = require('./_base.js');

exports = module.exports = function(sequelize, DataTypes) {
    return Base.create(sequelize, DataTypes, 'Attachment', {
        user_id: Base.column_id(),
        resource_id: Base.column_id(),
        size: Base.column_bigint(),
        kind: Base.column_varchar_100(),
        name: Base.column_varchar_100(),
        description: Base.column_varchar_500()
    });
}
