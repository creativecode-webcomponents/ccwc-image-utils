var gulp = require('gulp');
var gl2js = require('gulp-gl2js');

/**
 * Regular Shaders (a small set to stay minimal)
 */
gulp.task('shaders', function(cb) {
    gulp.src('./src/shaders/*.glsl')
        .pipe(gl2js('shaders', { assignto: 'ccwc.WebGLFilter.shaders'} ))
        .pipe(gulp.dest('./src'));
});

/**
 * Extra shaders, more of a playground to test a bunch of them
 */
gulp.task('extra-shaders', function(cb) {
    gulp.src('./src/extra-shaders/*.glsl')
        .pipe(gl2js('extra-shaders', { assignto: 'var filters'} ))
        .pipe(gulp.dest('./src'));
});


gulp.task('default', ['shaders', 'extra-shaders']);