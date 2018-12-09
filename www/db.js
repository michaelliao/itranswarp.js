'use strict';

// init db:

const
    _ = require('lodash'),
    util = require('util'),
    uuid = require('uuid/v4'),
    logger = require('./logger'),
    config = require('./config'),
    dbtypes = require('./dbtypes'),
    Sequelize = require('sequelize');

logger.info('init sequelize...');

const ID_LENGTH = 50;

const paddings = (() => {
    let i, _paddings = [];
    for (i = 1; i < 30; i++) {
        _paddings.push(new Array(i).join('0'));
    }
    return _paddings;
})();

/**
 * a id-generate function that generate 50-chars id string with:
 *   current timestamp;
 *   random uuid;
 *   server shard number (0 ~ 0xff, default to 0).
 */
function nextId() {
    // generate uuid with timestamp:
    let id = util.format('%d%s000', Date.now(), uuid().replace(/\-/g, ''));
    return paddings[ID_LENGTH - id.length] + id;
}

const SHOW_SQL = config.db_show_sql === 'true';

const sequelize = new Sequelize(
    config.db_database,
    config.db_username,
    config.db_password,
    {
        dialect: 'mysql',
        dialectOptions: {
            charset: 'utf8mb4'
        },
        host: config.db_host,
        port: parseInt(config.db_port),
        pool: {
            maxConnections: parseInt(config.db_max_connections),
            minConnections: parseInt(config.db_min_connections),
            maxIdleTime: parseInt(config.db_max_idle_time) * 1000
        },
        logging: function (t) {
            if (SHOW_SQL) {
                logger.info('SQL: ' + t);
            }
        }
    });

function defineModel(modelName, tableName, attributes, extraFields) {
    let attrs = {
        id: {
            type: dbtypes.ID,
            allowNull: false,
            primaryKey: true
        }
    };
    for (let key in attributes) {
        if (attributes.hasOwnProperty(key)) {
            // set default allowNull = false:
            let opt = attributes[key];
            opt.allowNull = opt.allowNull || false;
            attrs[key] = opt;
        }
    }
    attrs.created_at = {
        type: dbtypes.BIGINT,
        allowNull: false
    };
    attrs.updated_at = {
        type: dbtypes.BIGINT,
        allowNull: false
    };
    attrs.version = {
        type: dbtypes.BIGINT,
        allowNull: false
    };
    logger.info(`model ${modelName} defined for table: ${tableName}.`);
    logger.debug('model defined for table: ' + tableName + '\n' + JSON.stringify(attrs, function (k, v) {
        if (k === 'type') {
            for (let key in Sequelize) {
                if (key === 'ABSTRACT' || key === 'NUMBER') {
                    continue;
                }
                let dbType = Sequelize[key];
                if (typeof dbType === 'function') {
                    if (v instanceof dbType) {
                        if (v._length) {
                            return `${dbType.key}(${v._length})`;
                        }
                        return dbType.key;
                    }
                    if (v === dbType) {
                        return dbType.key;
                    }
                }
            }
        }
        return v;
    }, '  '));
    let options = {
        tableName: tableName,
        charset: 'utf8mb4',
        collate: 'utf8mb4_general_ci',
        timestamps: false,
        hooks: {
            beforeValidate: function (obj) {
                let now = Date.now();
                if (obj.isNewRecord) {
                    logger.debug('will create entity: ' + obj);
                    if (!obj.id) {
                        obj.id = nextId();
                    }
                    obj.created_at = now;
                    obj.updated_at = now;
                    obj.version = 0;
                }
            },
            beforeUpdate: function (obj) {
                logger.debug('will update entity: ' + obj.id);
                obj.updated_at = Date.now();
                obj.version ++;
            }
        }
    };
    if (Array.isArray(extraFields)) {
        let
            getters = {},
            setters = {};
        for (let extraField of extraFields) {
            getters[extraField] = function () {
                return this['_' + extraField];
            };
            setters[extraField] = function (value) {
                this['_' + extraField] = value;
            }
        }
        options.getterMethods = getters;
        options.setterMethods = setters;
    }
    let model = sequelize.define(tableName, attrs, options);
    return model;
}

let exp = {
    ID_LENGTH: ID_LENGTH,
    sequelize: sequelize,
    nextId: nextId,
    sync: async (showSql=false) => {
        // only allow create ddl in non-production environment:
        if (process.env.NODE_ENV !== 'production') {
            await sequelize.sync({
                force: true,
                logging: (t) => {
                    if (showSql) {
                        logger.info(t);
                    }
                }
            });
        } else {
            throw new Error('cannot call sync() when NODE_ENV is set to \'production\'.');
        }
    }
};

// scan models:
let
    files = require('fs').readdirSync(__dirname + '/models'),
    re = new RegExp("^[A-Za-z][A-Za-z0-9\\_]*\\.js$");

// add each model to exports:
files.filter((f) => { return re.test(f); }).map((f) => {
    return f.substring(0, f.length - 3);
}).forEach((modelName) => {
    let modelDefinition = require('./models/' + modelName);
    exp[modelDefinition.name] = defineModel(modelDefinition.name, modelDefinition.table, modelDefinition.fields, modelDefinition.extraFields);
});

logger.info('db exports: ' + Object.getOwnPropertyNames(exp).join(', '));

module.exports = exp;
