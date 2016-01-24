var gulp = require('gulp');
var gl2js = require('gulp-gl2js');
var sourcemaps = require("gulp-sourcemaps");
var browserify = require('browserify');
var babelify = require('babelify');
var source = require('vinyl-source-stream');
var runSequence = require('gulp-run-sequence');


gulp.task('all', function () {
    return browserify({
        entries: 'src/all.es6',
        standalone: 'ccwc',
        extensions: ['es2015'], debug: true})
        .transform(babelify)
        .bundle()
        .pipe(source('image.js'))
        .pipe(gulp.dest('./'));
});

gulp.task('canvas', function () {
    return browserify({
        entries: 'src/canvas.es6',
        standalone: 'ccwc',
        extensions: ['es2015'], debug: true})
        .transform(babelify)
        .bundle()
        .pipe(source('canvas.js'))
        .pipe(gulp.dest('./'));
});

gulp.task('webgl', function () {
    return browserify({
        entries: 'src/webgl.es6',
        standalone: 'ccwc',
        extensions: ['es2015'], debug: true})
        .transform(babelify)
        .bundle()
        .pipe(source('webgl.js'))
        .pipe(gulp.dest('./'));
});

/**
 * Regular Shaders (a small set to stay minimal)
 */
gulp.task('shaders', function() {
   return gulp.src('./src/webgl/shaders/*.glsl')
        .pipe(gl2js('shaders', { extension: 'es6', module: true } ))
        .pipe(gulp.dest('./src/webgl'));
});

/**
 * Extra shaders, more of a playground to test a bunch of them
 */
gulp.task('extra-shaders', function() {
    return gulp.src('./src/webgl-extra/extra-shaders/*.glsl')
        .pipe(gl2js('extra-shaders', { extension: 'es6', module: true } ))
        .pipe(gulp.dest('./src/webgl-extra'));
});

gulp.task('default', function(cb) {
    runSequence('shaders', 'extra-shaders', 'canvas', 'webgl', 'all', cb);
});