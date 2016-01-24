import Blobs from './canvas/blobs.es6';
import FilterChain from './canvas/filterchain.es6';
import CanvasFilters from './canvas/filters.es6';
import WebGLFilters from './webgl/filters.es6';
import Shaders from './webgl/shaders.es6';
import Textures from './webgl/textures.es6';
import Uniforms from './webgl/uniforms.es6';
import Constants from './webgl/constants.es6';

exports.image = {
    canvas: {
        blobs: Blobs,
        filterchain: FilterChain,
        filters: CanvasFilters
    },
    webgl: {
        shaders: Shaders,
        textures: Textures,
        uniforms: Uniforms,
        filters: WebGLFilters,
        constants: Constants
    }
};