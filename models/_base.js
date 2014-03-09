// base.js

var Sequelize = require('sequelize');

var next_id = require('./_id');

/**
 * automatically add following fields as well as hooks to each model:
 *   id: varchar(50), not null, the primary key.
 *   created_at: bigint, not null, the created timestamp.
 *   updated_at: bigint, not null, the updated timestamp.
 *   version: bigint, not null, the increased version number starts from 0.
 */
function create(sequelize, DataTypes, tableName, fields) {
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
        tableName: 't_' + tableName.toLowerCase(),
        hooks: {
            /**
             * automatically set id, created_at before create if obj.id is missing.
             */
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
            /**
             * automatically set updated_at, version before update.
             */
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

exports = module.exports = {
    column_boolean: function() {
        return {
            type: Sequelize.BOOLEAN,
            allowNull: false
        };
    },
    column_bigint: function() {
        return {
            type: Sequelize.BIGINT,
            allowNull: false
        };
    },
    column_timestamp: function() {
        return {
            type: Sequelize.BIGINT,
            allowNull: false
        };
    },
    column_id: function() {
        return {
            type: Sequelize.STRING(50),
            allowNull: false,
            validate: {
                notEmpty: true
            }
        };
    },
    column_name: function() {
        return {
            type: Sequelize.STRING(100),
            allowNull: false,
            validate: {
                notEmpty: true
            }
        };
    },
    column_varchar_100: function() {
        return {
            type: Sequelize.STRING(100),
            allowNull: false,
            validate: {
                notEmpty: true
            }
        };
    },
    column_varchar_200: function() {
        return {
            type: Sequelize.STRING(200),
            allowNull: false,
            validate: {
                notEmpty: true
            }
        };
    },
    column_varchar_500: function() {
        return {
            type: Sequelize.STRING(500),
            allowNull: false
        };
    },
    column_url: function() {
        return {
            type: Sequelize.STRING(1000),
            allowNull: false
        };
    },
    column_text: function() {
        return {
            type: Sequelize.TEXT,
            allowNull: false
        };
    },
    column_blob: function() {
        return {
            type: Sequelize.BLOB,
            allowNull: false
        };
    },
    create: create
};
