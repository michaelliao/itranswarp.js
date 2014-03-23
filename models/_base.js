// base.js

var
    Sequelize = require('sequelize'),
    next_id = require('./_id');

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
        allowNull: false,
        index: true
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

function getOption(options, name, defaultValue) {
    if (options) {
        return options[name];
    }
    return defaultValue;
}

function columnVarchar(length, options) {
    if (arguments.length===1) {
        options = length;
        length = 100;
    }
    options = options || {};
    var def = {
        type: Sequelize.STRING(length),
        allowNull: getOption(options, 'allowNull', false),
        index: getOption(options, 'index', false)
    };
    if (getOption(options, 'notEmpty', true)) {
        def.validate = {
            notEmpty: true
        };
    }
    return def;
}

exports = module.exports = {
    column_boolean: function() {
        return {
            type: Sequelize.BOOLEAN,
            allowNull: false
        };
    },
    column_bigint: function(index) {
        return {
            type: Sequelize.BIGINT,
            allowNull: false,
            index: index
        };
    },
    column_timestamp: function(index) {
        return {
            type: Sequelize.BIGINT,
            allowNull: false,
            index: index
        };
    },
    column_id: function(options) {
        options = options || {};
        var def = {
            type: Sequelize.STRING(50),
            allowNull: getOption(options, 'allowNull', false),
            index: getOption(options, 'index', false)
        };
        if (getOption(options, 'notEmpty', true)) {
            def.validate = {
                notEmpty: true
            };
        }
        return def;
    },
    column_name: function(options) {
        return columnVarchar(50, options);
    },
    column_varchar_100: function(index) {
        return {
            type: Sequelize.STRING(100),
            allowNull: false,
            index: index
        };
    },
    column_varchar_200: function(index) {
        return {
            type: Sequelize.STRING(200),
            allowNull: false,
            index: index
        };
    },
    column_varchar_500: function(index) {
        return {
            type: Sequelize.STRING(500),
            allowNull: false,
            index: index
        };
    },
    column_url: function() {
        return columnVarchar(1000, { notEmpty: false });
    },
    column_text: function() {
        return {
            type: Sequelize.TEXT,
            allowNull: false,
            validate: {
                notEmpty: true
            }
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
