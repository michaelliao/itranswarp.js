// init sequelize and expose all models under dir 'models':

console.log('init mysql with sequelize...');

var
    _ = require('lodash'),
    Sequelize = require('sequelize'),
    next_id = require('./models/_id'),
    config = require('./config');

// init database:
var sequelize = new Sequelize(config.db.schema, config.db.user, config.db.password, {
    logging: console.log,
    dialect: 'mysql',
    host: config.db.host,
    port: config.db.port,
    pool: {
        maxConnections: config.db.maxConnections,
        maxIdleTime: config.db.maxIdleTime
    },
    define: {
        charset: 'utf8',
        collate: 'utf8_general_ci'
    }
});

// export sequelize and all model objects:
var dict = {
    sequelize: sequelize,
    next_id: next_id
};

// load all models:
var files = require('fs').readdirSync(__dirname + '/models');
var re = new RegExp("^[A-Za-z][A-Za-z0-9\\_]*\\.js$");
var models = _.filter(files, function(f) {
    return re.test(f);
});
_.each(models, function(file) {
    var name = file.substring(0, file.length - 3);
    console.log('found model: ' + name);
    dict[name] = sequelize.import(__dirname + '/models/' + name);
});

exports = module.exports = dict;
