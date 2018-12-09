#!/bin/bash

# install supervisor before run this script:

# npm install supervisor -g

export NODE_ENV=development

export DOMAIN=local.liaoxuefeng.com

export OAUTH2_WEIBO=true
export OAUTH2_WEIBO_APP_KEY=1391944217
export OAUTH2_WEIBO_APP_SECRET=333aebb28517f2c0925cfb2b77a62dd5

supervisor -i static,script,test,views,node_modules start.js
