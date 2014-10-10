// search.js

var
    config = require('../config.js'),
    engine = require('./' + config.search.provider).createSearchEngine(config.search.configs);

console.log('build search engine: ' + config.search.provider);
console.log('external: ' + engine.external);

module.exports = {
    engine: engine
};
