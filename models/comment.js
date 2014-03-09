// comment.js

var Base = require('./_base.js');

exports = module.exports = function(sequelize, DataTypes) {
    return Base.create(sequelize, DataTypes, 'Comment', {
        ref_id: Base.column_id(),
        ref_type: Base.column_varchar_100(),

        user_id: Base.column_id(),
        user_name: Base.column_varchar_100(),
        user_image_url: Base.column_url(),

        content: Base.column_varchar_500()
    });
}
