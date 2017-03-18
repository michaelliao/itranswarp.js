'use strict';

const
    fs = require('fs'),
    path = require('path'),
    basedir = path.dirname(path.dirname(__dirname)),
    webdir = 'www',
    excludes = [
        'node_modules',
        'static',
        'views'
    ];

function info(s) {
    console.log('\x1b[32m[INFO]\x1b[0m ' + s);
}

function error(s) {
    console.log('\x1b[31m[ERROR]\x1b[0m ' + s);
}

function checkFile(f) {
    let content = fs.readFileSync(f, 'utf-8');
    if (!content.startsWith('\'use strict\';\n')) {
        error('missing \'use strict\': ' + f);
        process.exit(1);
    }
}

function scanFiles(dir) {
    let files = fs.readdirSync(dir);
    files.filter((f) => {
        return ! f.startsWith('.') && f.endsWith('.js');
    }).forEach((f) => {
        // info(`check file ${f}...`);
        checkFile(`${dir}/${f}`);
    });
}

function scanDir(dir) {
    let
        dirs,
        pwd = `${basedir}/${dir}`;
    info(`scan dir ${pwd}...`);
    scanFiles(pwd);
    dirs = fs.readdirSync(pwd);
    dirs.filter((d) => {
        if (d.startsWith('.')) {
            return false;
        }
        var st = fs.statSync(`${pwd}/${d}`);
        if (st.isDirectory()) {
            if (dir===webdir && excludes.indexOf(d) >= 0) {
                return false;
            }
            return true;
        }
        return false;
    }).forEach((d) => {
        scanDir(`${dir}/${d}`);
    });
}

info(`set base dir: ${basedir}`);

scanDir(webdir);
