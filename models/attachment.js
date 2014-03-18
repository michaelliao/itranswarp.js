// attachment.js

var Base = require('./_base.js');

exports = module.exports = function(sequelize, DataTypes) {
    return Base.create(sequelize, DataTypes, 'Attachment', {
        user_id: Base.column_id(),
        size: Base.column_bigint(),
        width: Base.column_bigint(),
        height: Base.column_bigint(),
        mime: Base.column_varchar_100(),
        name: Base.column_name(),
        meta: Base.column_varchar_100(),
        description: Base.column_varchar_500(),
        data: Base.column_blob()
    });
}
