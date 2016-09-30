require('babel-core/register')({
    presets: ['stage-3']
});

const db = require('./db.js');
db.sync();

console.log('init db ok.');
//process.exit(0);
