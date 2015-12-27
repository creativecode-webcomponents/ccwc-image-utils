var gulp = require('gulp');
var gl2js = require('gulp-gl2js');
var concat = require('gulp-concat');
var runSequence = require('gulp-run-sequence');

gulp.task('utils-canvas', function() {
    return gulp.src(['src/canvas/*.js'])
        .pipe(concat('ccwc-image-utils-canvas.js'))
        .pipe(gulp.dest('./'));
});

gulp.task('utils-webgl', function() {
    return gulp.src(['src/webgl/*.js'])
        .pipe(concat('ccwc-image-utils-webgl.js'))
        .pipe(gulp.dest('./'));
});

gulp.task('utils', function() {
    return gulp.src(['src/webgl/*.js', 'src/canvas/*.js'])
        .pipe(concat('ccwc-image-utils.js'))
        .pipe(gulp.dest('./'));
});

/**
 * Regular Shaders (a small set to stay minimal)
 */
gulp.task('shaders', function() {
   return gulp.src('./src/webgl/shaders/*.glsl')
        .pipe(gl2js('shaders', { assignto: 'ccwc.image.webgl.shaders'} ))
        .pipe(gulp.dest('./src/webgl'));
});

/**
 * Extra shaders, more of a playground to test a bunch of them
 */
gulp.task('extra-shaders', function() {
    return gulp.src('./src/webgl-extra/extra-shaders/*.glsl')
        .pipe(gl2js('extra-shaders', { assignto: 'var filters'} ))
        .pipe(gulp.dest('./src/webgl-extra'));
});

gulp.task('default', function(cb) {
    runSequence('shaders', 'extra-shaders', 'utils-canvas', 'utils-webgl', 'utils', cb);
});