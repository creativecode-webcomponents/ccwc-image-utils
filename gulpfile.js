var gulp = require('gulp');
var gl2js = require('gulp-gl2js');

/**
 * Regular Shaders (a small set to stay minimal)
 */
gulp.task('shaders', function() {
   return gulp.src('./src/webgl/shaders/*.glsl')
        .pipe(gl2js('shaders', { extension: 'js', module: true } ))
        .pipe(gulp.dest('./src/webgl'));
});

/**
 * Extra shaders, more of a playground to test a bunch of them
 */
gulp.task('extra-shaders', function() {
    return gulp.src('./src/webgl-extra/extra-shaders/*.glsl')
        .pipe(gl2js('extra-shaders', { extension: 'js', module: true } ))
        .pipe(gulp.dest('./src/webgl-extra'));
});


gulp.task('default', ['shaders', 'extra-shaders']);