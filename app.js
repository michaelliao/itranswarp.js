// app start entry:

// init database:

var Sequelize = require('sequelize');

var sequelize = new Sequelize('itranswarp', 'www', 'www', {
    logging: console.log,
    dialect: 'mysql',
    host: 'localhost',
    port: 3306,
    pool: {
        maxConnections: 10,
        maxIdleTime: 30
    },
    define: {
        charset: 'utf8',
        collate: 'utf8_general_ci'
    }
});

var User = sequelize.import(__dirname + '/models/user');
//User.sync({force: true});

var Article = sequelize.import(__dirname + '/models/article');
//Article.sync({force: true});

// save a user:

var u = User.build({
    name: 'AAMichael',
    email: 'askxuefeng@gmail.com'
});

u.save().success(function() {
    console.log('user saved.');


u.name = 'AABob';
u.save().success(function() {
    console.log('user updated.');
}).error(function(error) {
    console.error(error);
});


}).error(function(error) {
    console.error(error);
});


// init http server:

var express = require('express');
var app = express();

app.engine('html', require('ejs').__express);

app.get('/test', function(req, resp, next) {
    resp.render('test.html', { name: 'Michael', addr: 'Beijing'});
});

app.get('/', function(req, resp, next) {
    resp.setHeader('Content-Type', 'text/html');
    resp.end('<html><body><h1>Hello</h1></body></html>')
});

var next_id = require(__dirname + '/models/_id');
console.log(next_id());

app.listen(3000);
console.log('Start app on port 3000...');
