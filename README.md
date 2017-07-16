# itranswarp.js

![icon](https://raw.githubusercontent.com/michaelliao/itranswarp.js/master/resource/icon-64x64.png)

A nodejs powered website containing blog, wiki, discuss and search engine.

[![Build Status](https://travis-ci.org/michaelliao/itranswarp.js.svg?branch=master)](https://travis-ci.org/michaelliao/itranswarp.js)

* based on koa2 with ES7 async/await
* OAuth2 integration (weibo, QQ, facebook, etc.)
* SEO support
* REST api
* customized css with uikit 2
* fully tested (using mocha)

### Environment

Nodejs: >= 8.x

MySQL: 5.6 ~ 5.7

Memcache

Nginx

### Configurations

You should make a copy of `config_default.js` to `config_<NODE_ENV>.js`, and override some of the settings you needed.

For example, if NODE_ENV=production, you need create `config_production.js`:

    $ cp www/config_default.js www/config_production.js

You can safely remove any settings you do not changed.

### Install packages

Run `npm install` to install all required packages:

    $ npm install

### Initialize database

Run `node schema > init_db.sql` to generate initial schema as well as administrator's email and password.

You will get `init_db.sql` file in current directory. Run this SQL script by:

    $ mysql -u root -p < init_db.sql

NOTE: re-run this SQL file will remove all existing data.

### Test

iTranswarp.js is fully tested. To run tests, make sure:

* run MySQL in localhost and set root password as `password`.
* run Memcache in localhost.

Then run:

    $ mocha

Schema will be created in MySQL `test` database before run tests.

### Run

    $ node start.js

You should able to see the home page in the browser with address `http://localhost:2017/`.

If you want to sign in to management console, go to `http://localhost:2017/manage/signin`, and sign in using the email and password you entered when running `node schema`.

### Changelog

2.0 - 15 Jul 2017

* fully async/await support
* markdown plugin support
* based on koa 2.x

1.11 - 21 Jul 2015

* support article, wiki, discuss.
* based on koa 1.x
