itranswarp.js
=============

A nodejs powered website containing blog, wiki, discuss and search engine.

### Environment

Nodejs: >= 0.12

MySQL: 5.1 ~ 5.6

Memcache

Nginx

### Configurations

You should make a copy of 'config_default.js' to 'config_production.js', and override some of the settings you needed:

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

### Run

    $ node --harmony app.js

You should able to see the home page in the browser with address `http://localhost:2015/`.

If you want to sign in to management console, go to `http://localhost:2015/manage/signin`, and sign in using the email and password you entered when running `node schema`.
