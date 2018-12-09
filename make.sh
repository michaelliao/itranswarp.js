#!/bin/bash

CURRENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo "working dir is set to: $CURRENT_DIR"

cd $CURRENT_DIR

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
