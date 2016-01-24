import Filters from './webgl/filters.es6';
import Shaders from './webgl/shaders.es6';
import Textures from './webgl/textures.es6';
import Uniforms from './webgl/uniforms.es6';
import Constants from './webgl/constants.es6';

exports.image = {
    webgl: {
        shaders: Shaders,
        textures: Textures,
        uniforms: Uniforms,
        filters: Filters,
        constants: Constants
    }
};