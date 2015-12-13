var gulp = require('gulp');
var gl2js = require('gulp-gl2js');

gulp.task('default', function(cb) {
    gulp.src('./src/shaders/*.glsl')
        .pipe(gl2js('shaders', { assignto: 'ccwc.WebGLFilter.shaders'} ))
        .pipe(gulp.dest('build'));
});