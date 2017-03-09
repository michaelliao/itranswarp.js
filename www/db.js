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

var i, paddings = [];

for (i = 1; i < 30; i++) {
    paddings.push(new Array(i).join('0'));
}

/**
 * a id-generate function that generate 50-chars id string with:
 *   current timestamp;
 *   random uuid;
 *   server shard number (0 ~ 0xff, default to 0).
 */
function nextId() {
    // generate uuid with timestamp:
    var id = util.format('%d%s000', Date.now(), uuid().replace(/\-/g, ''));
    return paddings[50 - id.length] + id;
}

var sequelize = new Sequelize(
    config.db.database,
    config.db.username,
    config.db.password,
    {
        dialect: 'mysql',
        host: config.db.host,
        port: config.db.port,
        pool: {
            maxConnections: config.db.maxConnections,
            minConnections: config.db.minConnections,
            maxIdleTime: config.db.maxIdleTime
        },
        logging: (t) => {
            logger.info('SQL: ' + t);
        }
    });

function defineModel(tableName, attributes) {
    var attrs = {
        id: {
            type: dbtypes.ID,
            primaryKey: true
        }
    };
    for (let key in attributes) {
        let value = attributes[key];
        if (typeof value === 'object' && value['type']) {
            value.allowNull = value.allowNull || false;
            attrs[key] = value;
        } else {
            attrs[key] = {
                type: value,
                allowNull: false
            };
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
    logger.info('model defined for table: ' + tableName + '\n' + JSON.stringify(attrs, function (k, v) {
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
    var model = sequelize.define(tableName, attrs, {
        tableName: tableName,
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
                } else {
                    logger.debug('will update entity: ' + obj.id);
                    obj.updated_at = now;
                    obj.version++;
                }
            }
        }
    });
    return model;
}

var exp = {
    nextId: nextId,
    sync: () => {
        // only allow create ddl in non-production environment:
        if (process.env.NODE_ENV !== 'production') {
            sequelize.sync({ force: true });
        } else {
            throw new Error('cannot call sync() when NODE_ENV is set to \'production\'.');
        }
    }
};

// scan models:
var
    files = require('fs').readdirSync(__dirname + '/models'),
    re = new RegExp("^[A-Za-z][A-Za-z0-9\\_]*\\.js$");

// add each model to exports:
files.filter((f) => { return re.test(f); }).map((f) => {
    return f.substring(0, f.length - 3);
}).forEach((modelName) => {
    logger.info(`found model: ${modelName}`);
    var modelDefinition = require('./models/' + modelName);
    exp[modelDefinition.name] = defineModel(modelDefinition.table, modelDefinition.fields);
});

module.exports = exp;
