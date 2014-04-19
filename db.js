// init mysql-warp and expose all models under dir 'models':

console.log('init mysql with mysql-warp...');

var
    _ = require('lodash'),
    Warp = require('mysql-warp'),
    next_id = require('./models/_id'),
    config = require('./config');

// init database:
var warp = Warp.create(config.db);

// export warp and all model objects:
var dict = {
    warp: warp,
    next_id: next_id
};

// load all models:
var files = require('fs').readdirSync(__dirname + '/models');
var re = new RegExp("^[A-Za-z][A-Za-z0-9\\_]*\\.js$");
var models = _.map(_.filter(files, function(f) {
    return re.test(f);
}), function(fname) {
    return fname.substring(0, fname.length - 3);
});
_.each(models, function(model) {
    console.log('found model: ' + model);
    dict[model] = require('./models/' + model)(warp);
});

exports = module.exports = dict;
