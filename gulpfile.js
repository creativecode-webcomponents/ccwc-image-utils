var gulp = require('gulp');
var gl2js = require('gulp-gl2js');
var concat = require('gulp-concat');
var runSequence = require('gulp-run-sequence');

gulp.task('utils-cpu', function() {
    return gulp.src(['src/filters.js', 'src/utils.js'])
        .pipe(concat('ccwc-image-utils-cpu.js'))
        .pipe(gulp.dest('./'));
});

gulp.task('utils-gpu', function() {
    return gulp.src(['src/glfilter.js', 'src/shaders.js'])
        .pipe(concat('ccwc-image-utils-gpu.js'))
        .pipe(gulp.dest('./'));
});

gulp.task('utils', function() {
    return gulp.src(['src/glfilters.js', 'src/shaders.js'])
        .pipe(concat('ccwc-image-utils.js'))
        .pipe(gulp.dest('./'));
});

/**
 * Regular Shaders (a small set to stay minimal)
 */
gulp.task('shaders', function() {
   return gulp.src('./src/shaders/*.glsl')
        .pipe(gl2js('shaders', { assignto: 'ccwc.image.glshaders'} ))
        .pipe(gulp.dest('./src'));
});

/**
 * Extra shaders, more of a playground to test a bunch of them
 */
gulp.task('extra-shaders', function() {
    return gulp.src('./src/extra-shaders/*.glsl')
        .pipe(gl2js('extra-shaders', { assignto: 'var filters'} ))
        .pipe(gulp.dest('./src'));
});

gulp.task('default', function(cb) {
    runSequence('shaders', 'extra-shaders', 'utils-cpu', 'utils-gpu', 'utils', cb);
});