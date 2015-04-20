var
    _ = require('lodash'),
    fs = require('fs'),
    less = require('gulp-less'),
    jslint = require('gulp-jslint'),
    uglify = require('gulp-uglify'),
    concat = require('gulp-concat'),
    minifyCSS = require('gulp-minify-css'),
    gulp = require('gulp');

var theme = 'default';

function getJavaScriptFiles(file) {
    var
        re = /^.*\<script\s+src\=\"(.*)\"\>.*$/,
        data = fs.readFileSync(file, { encoding: 'utf-8' }),
        begin = data.indexOf('<!-- BEGIN JAVASCRIPT COMPRESS -->'),
        end = data.indexOf('<!-- END JAVASCRIPT COMPRESS -->'),
        lines;
    if (begin === (-1) || end === (-1) || begin > end) {
        throw 'Error: special comment not found!';
    }
    lines = data.substring(begin, end).split('\n');
    lines = _.map(lines, function (line) {
        var m = re.exec(line);
        if (m) {
            return m[1].replace(/\{\{\s*\_\_theme\_\_\s*\}\}/, theme);
        }
        return null;
    });
    lines = _.filter(lines, function (line) {
        return line !== null;
    });
    return _.map(lines, function (line) {
        return '.' + line;
    });
}

console.log(getJavaScriptFiles('./views/themes/' + theme + '/_base.html'));

gulp.task('jslint', function () {
    return gulp.src([
        './controllers/*.js',
        './models/*.js',
        './search/*.js',
        './*.js'
    ]).pipe(jslint({
        node: true,
        nomen: true,
        sloppy: true,
        plusplus: true,
        unparam: true,
        stupid: true
    }));
});

gulp.task('uglify', function () {
    var jsfiles = getJavaScriptFiles('./views/themes/' + theme + '/_base.html');
    return gulp.src(jsfiles)
        .pipe(concat('all.js'))
        .pipe(uglify())
        .pipe(gulp.dest('./static/js'));
});

gulp.task('less', function () {
    return gulp.src(['./static/css/itranswarp.less'])
        .pipe(less())
        .pipe(gulp.dest('./static/css'));
});

gulp.task('default', ['uglify', 'less']);
