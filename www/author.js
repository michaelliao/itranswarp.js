'use strict';

let
    fs = require('fs'),
    s = fs.readFileSync('./author', 'utf-8'),
    j = s.replace(/\'/g, '\\\'').replace(/\\/g, '\\\\').replace(/\n/g, '\\n');

console.log(j);
