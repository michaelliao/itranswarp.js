#!/usr/bin/env sh

NODE_ENV=production pm2 start index.js --name itranswarp --watch
