// text.js

var Base = require('./_base.js');

exports = module.exports = function(sequelize, DataTypes) {
    return Base.create(sequelize, DataTypes, 'Text', {
        ref_id: Base.column_id(),
        value: Base.column_text()
    });
}
