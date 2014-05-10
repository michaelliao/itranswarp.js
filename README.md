itranswarp.js
=============

A nodejs powered website containing blog, wiki, discuss.

### Environment

Nodejs: 0.10.x

MySQL: 5.1 ~ 5.6

Memcache

### Configurations

You should make a copy of 'config_default.js' to 'config_override.js', and override some of the settings you needed:

    $ cp config_default.js config_override.js

You can safely remove any settings you do not changed.

### Install packages

Run `npm install` to install all required packages:

    $ npm install

### Initialize database

Run `node schema` to generate initial schema as well as administrator's email and password.

### Run

    $ node index.js

You should able to see the home page in the browser with address `http://localhost:3000`.

If you want to sign in to management console, go to `http://localhost:3000/manage/signin`, and sign in using the email and password you entered when running `node schema`.
