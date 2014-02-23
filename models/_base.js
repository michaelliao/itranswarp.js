// base.js

var next_id = require('./_id');

module.exports = function(sequelize, DataTypes, tableName, fields) {
    fields.id = {
        primaryKey: true,
        type: DataTypes.STRING(50),
        allowNull: false
    };
    fields.created_at = {
        type: DataTypes.BIGINT,
        allowNull: false
    };
    fields.updated_at = {
        type: DataTypes.BIGINT,
        allowNull: false
    };
    fields.version = {
        type: DataTypes.BIGINT,
        allowNull: false
    };
    return sequelize.define(tableName, fields, {
        timestamps: false,
        tableName: 'it_' + tableName.toLowerCase(),
        hooks: {
            beforeCreate: function(obj, fn) {
                console.log('before create...');
                if (! obj.id) {
                    obj.id = next_id();
                }
                var timestamp = new Date().getTime();
                obj.created_at = obj.updated_at = timestamp;
                obj.version = 0;
                fn(null, obj);
            },
            beforeUpdate: function(obj, fn) {
                console.log('before update...');
                var timestamp = new Date().getTime();
                obj.updated_at = timestamp;
                obj.version = obj.version + 1;
                fn(null, obj);
            }
        }
    });
}
