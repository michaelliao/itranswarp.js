// article.js

var Base = require('./_base.js');

exports = module.exports = function(sequelize, DataTypes) {
    return Base.create(sequelize, DataTypes, 'Article', {

        user_id: Base.column_id({ index: true }),
        category_id: Base.column_id({ index: true }),
        cover_id: Base.column_id({ notEmpty: false }),
        content_id: Base.column_id(),

        user_name: Base.column_varchar_100(),

        name: Base.column_varchar_100(),
        tags: Base.column_varchar_500(),
        description: Base.column_varchar_500(),

        publish_time: Base.column_timestamp(true)
    });
}
