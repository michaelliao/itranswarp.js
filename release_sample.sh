#!/bin/bash

# a sample release script for fabric

# define gateway:
GATEWAY=8.8.8.8

# define hosts:
HOSTS=172.16.0.1,172.16.0.2

# update version.js:
echo "update version.js..."
echo "'use strict';" > www/version.js
echo "// generated js file: DO NOT MODIFY" >> www/version.js
echo "const version = '`git log -1 --pretty=format:%h`';" >> www/version.js
echo "module.exports = version;" >> www/version.js

# generate css and js:
cd www
gulp
cd ..

# fabric deply:
fab --gateway=$GATEWAY --hosts=$HOSTS --user=root deploy
