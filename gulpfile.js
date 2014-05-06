var
    jslint = require('gulp-jslint'),
    less = require('gulp-less'),
    gulp = require('gulp');

gulp.task('jslint', function () {
    return gulp.src([
        './controllers/*.js',
        './models/*.js',
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

gulp.task('less', function () {
    return gulp.src([
        './static/css/itranswarp.css.less/itranswarp-*.less'
    ]).pipe(less({
        paths: ['./static/css/itranswarp.css.less']
    })).pipe(gulp.dest('./static/css'));
});

gulp.task('default', ['jslint', 'less']);
