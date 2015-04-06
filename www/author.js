'use strict';

var fs = require('fs');

var s = fs.readFileSync('./author', 'utf-8');

var j = s.replace(/\'/g, '\\\'').replace(/\\/g, '\\\\').replace(/\n/g, '\\n');

console.log(j);
