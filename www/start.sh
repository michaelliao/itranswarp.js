#!/bin/bash

# install supervisor before run this script:

# npm install supervisor -g

export NODE_ENV=development
supervisor -i static,script,test,views,node_modules start.js
