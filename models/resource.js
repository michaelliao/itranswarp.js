// resource.js

var Base = require('./_base.js');

exports = module.exports = function(sequelize, DataTypes) {
    return Base.create(sequelize, DataTypes, 'Resource', {
        ref_id: Base.column_id(),
        deleted: Base.column_boolean(),
        size: Base.column_bigint(),
        meta: Base.column_varchar_100(),
        mime: Base.column_varchar_100(),
        url: Base.column_url(),
        data: Base.column_blob()
    });
}
