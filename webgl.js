(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.ccwc = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _filters = require('./webgl/filters.es6');

var _filters2 = _interopRequireDefault(_filters);

var _shaders = require('./webgl/shaders.es6');

var _shaders2 = _interopRequireDefault(_shaders);

var _textures = require('./webgl/textures.es6');

var _textures2 = _interopRequireDefault(_textures);

var _uniforms = require('./webgl/uniforms.es6');

var _uniforms2 = _interopRequireDefault(_uniforms);

var _constants = require('./webgl/constants.es6');

var _constants2 = _interopRequireDefault(_constants);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.image = {
    webgl: {
        shaders: _shaders2.default,
        textures: _textures2.default,
        uniforms: _uniforms2.default,
        filters: _filters2.default,
        constants: _constants2.default
    }
};

},{"./webgl/constants.es6":2,"./webgl/filters.es6":3,"./webgl/shaders.es6":4,"./webgl/textures.es6":5,"./webgl/uniforms.es6":6}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = {
    uniforms: {
        UNIFORM1f: '1f',
        UNIFORM2f: '2f',
        UNIFORM3f: '3f',
        UNIFORM4f: '4f',

        UNIFORM1i: '1i',
        UNIFORM2i: '2i',
        UNIFORM3i: '3i',
        UNIFORM4i: '4i'
    }
};

},{}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _constants = require('./constants.es6');

var _constants2 = _interopRequireDefault(_constants);

var _shaders = require('./shaders.es6');

var _shaders2 = _interopRequireDefault(_shaders);

var _filters = require('./filters.es6');

var _filters2 = _interopRequireDefault(_filters);

var _textures = require('./textures.es6');

var _textures2 = _interopRequireDefault(_textures);

var _uniforms = require('./uniforms.es6');

var _uniforms2 = _interopRequireDefault(_uniforms);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = {
    /**
     * create filter from shaders
     * @param vertexShader
     * @param fragmentShader
     * @returns {{vertexShader: *, fragmentShader: *}}
     */

    createFilterFromShaders: function createFilterFromShaders(vertexShader, fragmentShader) {
        return { vertexShader: vertexShader, fragmentShader: fragmentShader };
    },


    /**
     * create a filter from filter name
     * @param name
     * @param memory space/variable to pull shader from
     */
    createFilterFromName: function createFilterFromName(name, shaderloc) {
        if (!shaderloc) {
            shaderloc = _shaders2.default;
        }
        if (!shaderloc[name]) {
            console.log('Shader ', name, 'not found in ', shaderloc, ' using a passthrough shader instead');
            shaderloc = _shaders2.default;
            name = 'passthrough';
        }
        var vtx = shaderloc[name].vertex;
        var frg = shaderloc[name].fragment;
        return this.createFilterFromShaders(vtx, frg);
    },


    /**
     * create object for render
     * @param {Object}params
     */
    createRenderObject: function createRenderObject(params) {
        var props = {};

        props.gl = params.gl;
        props.width = props.gl.canvas.width;
        props.height = props.gl.canvas.height;

        if (params.width) {
            props.width = params.width;
        }
        if (params.height) {
            props.height = params.height;
        }

        props.filter = params.filter;
        props.textures = new _textures2.default(props.width, props.height);

        props.canvas2DHelper = document.createElement('canvas');
        props.canvas2DHelper.width = props.width;
        props.canvas2DHelper.height = props.height;
        props.canvas2DHelperContext = props.canvas2DHelper.getContext('2d');

        props.uniforms = new _uniforms2.default();
        props.textures = new _textures2.default(props.gl, props.width, props.height);

        if (params.textures) {
            for (var c = 0; c < params.textures.length; c++) {
                props.textures.add(params.textures[c].name, params.textures[c].texture, params.textures[c].index, params.textures[c].pixelStore);
            }
        }

        if (params.uniforms) {
            for (var c = 0; c < params.uniforms.length; c++) {
                props.uniforms.add(params.uniforms[c].name, params.uniforms[c].type, params.uniforms[c].values);
            }
        }

        if (params.autorender) {
            return this.render(props);
        }

        return props;
    },


    /**
     * render WebGL filter on current texture
     * @param glprops
     * @param refreshTextureIndices texture refresh indices (optional)
     * @returns {*}
     */
    render: function render(glprops) {
        if (!glprops.isInitialized) {
            var vertexShader = glprops.gl.createShader(glprops.gl.VERTEX_SHADER);
            glprops.gl.shaderSource(vertexShader, glprops.filter.vertexShader);
            glprops.gl.compileShader(vertexShader);

            var fragmentShader = glprops.gl.createShader(glprops.gl.FRAGMENT_SHADER);
            glprops.gl.shaderSource(fragmentShader, glprops.filter.fragmentShader);
            glprops.gl.compileShader(fragmentShader);

            glprops.program = glprops.gl.createProgram();
            glprops.gl.attachShader(glprops.program, vertexShader);
            glprops.gl.attachShader(glprops.program, fragmentShader);
            glprops.gl.linkProgram(glprops.program);
            glprops.gl.useProgram(glprops.program);

            var positionLocation = glprops.gl.getAttribLocation(glprops.program, 'a_position');
            var texCoordBuffer = glprops.gl.createBuffer();
            var rectCoordBuffer = glprops.gl.createBuffer();
            var texCoords = new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]);
            var rectCoords = new Float32Array([0, 0, glprops.textures.width, 0, 0, glprops.textures.height, 0, glprops.textures.height, glprops.textures.width, 0, glprops.textures.width, glprops.textures.height]);

            glprops.gl.bindBuffer(glprops.gl.ARRAY_BUFFER, texCoordBuffer);
            glprops.gl.bufferData(glprops.gl.ARRAY_BUFFER, texCoords, glprops.gl.STATIC_DRAW);

            var texCoordLocation = glprops.gl.getAttribLocation(glprops.program, 'a_texCoord');
            glprops.gl.enableVertexAttribArray(texCoordLocation);
            glprops.gl.vertexAttribPointer(texCoordLocation, 2, glprops.gl.FLOAT, false, 0, 0);

            glprops.uniforms.add('u_resolution', _constants2.default.uniforms.UNIFORM2f, [glprops.gl.canvas.width, glprops.gl.canvas.height]);
            glprops.uniforms.add('f_resolution', _constants2.default.uniforms.UNIFORM2f, [glprops.gl.canvas.width, glprops.gl.canvas.height]);

            glprops.gl.bindBuffer(glprops.gl.ARRAY_BUFFER, rectCoordBuffer);
            glprops.gl.enableVertexAttribArray(positionLocation);
            glprops.gl.vertexAttribPointer(positionLocation, 2, glprops.gl.FLOAT, false, 0, 0);
            glprops.gl.bufferData(glprops.gl.ARRAY_BUFFER, rectCoords, glprops.gl.STATIC_DRAW);
        }

        glprops.textures.initializeNewTextures(glprops.program);
        glprops.textures.refreshScene();
        glprops.uniforms.updateProgram(glprops.gl, glprops.program);

        glprops.gl.drawArrays(glprops.gl.TRIANGLES, 0, 6);
        glprops.isInitialized = true;

        return glprops;
    },


    /**
     * read pixels from GL context
     * @param glProps
     */
    getCanvasPixels: function getCanvasPixels(glprops) {
        var glctx = glprops.gl;
        if (!glprops.pixelarray) {
            glprops.pixelarray = new Uint8Array(glctx.canvas.width * glctx.canvas.height * 4);
        }
        glctx.readPixels(0, 0, glctx.canvas.width, glctx.canvas.height, glctx.RGBA, glctx.UNSIGNED_BYTE, glprops.pixelarray);
        var imgData = glprops.canvas2DHelperContext.createImageData(glctx.canvas.width, glctx.canvas.height);
        imgData.data.set(new Uint8ClampedArray(glprops.pixelarray));
        return imgData;
    }
};

},{"./constants.es6":2,"./filters.es6":3,"./shaders.es6":4,"./textures.es6":5,"./uniforms.es6":6}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = {
  "freichen_edge_detection": {
    "fragment": "precision mediump float; uniform sampler2D u_image0; varying vec2 v_texCoord; uniform vec2 f_resolution; vec2 texel = vec2(1.0 / f_resolution.x, 1.0 / f_resolution.y); mat3 G[9];  const mat3 g0 = mat3( 0.3535533845424652, 0, -0.3535533845424652, 0.5, 0, -0.5, 0.3535533845424652, 0, -0.3535533845424652 ); const mat3 g1 = mat3( 0.3535533845424652, 0.5, 0.3535533845424652, 0, 0, 0, -0.3535533845424652, -0.5, -0.3535533845424652 ); const mat3 g2 = mat3( 0, 0.3535533845424652, -0.5, -0.3535533845424652, 0, 0.3535533845424652, 0.5, -0.3535533845424652, 0 ); const mat3 g3 = mat3( 0.5, -0.3535533845424652, 0, -0.3535533845424652, 0, 0.3535533845424652, 0, 0.3535533845424652, -0.5 ); const mat3 g4 = mat3( 0, -0.5, 0, 0.5, 0, 0.5, 0, -0.5, 0 ); const mat3 g5 = mat3( -0.5, 0, 0.5, 0, 0, 0, 0.5, 0, -0.5 ); const mat3 g6 = mat3( 0.1666666716337204, -0.3333333432674408, 0.1666666716337204, -0.3333333432674408, 0.6666666865348816, -0.3333333432674408, 0.1666666716337204, -0.3333333432674408, 0.1666666716337204 ); const mat3 g7 = mat3( -0.3333333432674408, 0.1666666716337204, -0.3333333432674408, 0.1666666716337204, 0.6666666865348816, 0.1666666716337204, -0.3333333432674408, 0.1666666716337204, -0.3333333432674408 ); const mat3 g8 = mat3( 0.3333333432674408, 0.3333333432674408, 0.3333333432674408, 0.3333333432674408, 0.3333333432674408, 0.3333333432674408, 0.3333333432674408, 0.3333333432674408, 0.3333333432674408 );  void main(void) {      G[0] = g0,     G[1] = g1,     G[2] = g2,     G[3] = g3,     G[4] = g4,     G[5] = g5,     G[6] = g6,     G[7] = g7,     G[8] = g8;      mat3 I;     float cnv[9];     vec3 sampl;      for (float i=0.0; i<3.0; i++) {         for (float j=0.0; j<3.0; j++) {             sampl = texture2D(u_image0, v_texCoord + texel * vec2(i-1.0,j-1.0) ).rgb;             I[int(i)][int(j)] = length(sampl);         }     }      for (int i=0; i<9; i++) {         float dp3 = dot(G[i][0], I[0]) + dot(G[i][1], I[1]) + dot(G[i][2], I[2]);         cnv[i] = dp3 * dp3;     }      float M = (cnv[0] + cnv[1]) + (cnv[2] + cnv[3]);     float S = (cnv[4] + cnv[5]) + (cnv[6] + cnv[7]) + (cnv[8] + M);      gl_FragColor = vec4(vec3(sqrt(M/S)), texture2D( u_image0, v_texCoord ).a ); }",
    "vertex": "attribute vec2 a_position; attribute vec2 a_texCoord; uniform vec2 u_resolution; varying vec2 v_texCoord;  void main() {     vec2 zeroToOne = a_position / u_resolution;     vec2 zeroToTwo = zeroToOne * 2.0;     vec2 clipSpace = zeroToTwo - 1.0;     gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);     v_texCoord = a_texCoord; }"
  },
  "greyscale": {
    "fragment": "precision mediump float; varying vec2 v_texCoord;  uniform sampler2D u_image0;  void main(void) {     vec4 px = texture2D(u_image0, v_texCoord);     float avg = (px.r + px.g + px.b)/3.0;     gl_FragColor = vec4(avg, avg, avg, px.a); }",
    "vertex": "attribute vec2 a_position; attribute vec2 a_texCoord; uniform vec2 u_resolution; varying vec2 v_texCoord;  void main() {     vec2 zeroToOne = a_position / u_resolution;     vec2 zeroToTwo = zeroToOne * 2.0;     vec2 clipSpace = zeroToTwo - 1.0;     gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);     v_texCoord = a_texCoord; }"
  },
  "passthrough": {
    "fragment": "precision mediump float; uniform sampler2D u_image0; varying vec2 v_texCoord;  void main() {     gl_FragColor = texture2D(u_image0, v_texCoord); }",
    "vertex": "attribute vec2 a_position; attribute vec2 a_texCoord; uniform vec2 u_resolution; varying vec2 v_texCoord;  void main() {     vec2 zeroToOne = a_position / u_resolution;     vec2 zeroToTwo = zeroToOne * 2.0;     vec2 clipSpace = zeroToTwo - 1.0;     gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);     v_texCoord = a_texCoord; }"
  },
  "sepia": {
    "fragment": "precision mediump float; varying vec2 v_texCoord;  uniform sampler2D u_image0; uniform vec4 light; uniform vec4 dark; uniform float desat; uniform float toned;  const mat4 coeff = mat4(     0.393, 0.349, 0.272, 1.0,     0.796, 0.686, 0.534, 1.0,     0.189, 0.168, 0.131, 1.0,     0.0, 0.0, 0.0, 1.0 );  void main(void) {     vec4 sourcePixel = texture2D(u_image0, v_texCoord);     gl_FragColor = coeff * sourcePixel; }",
    "vertex": "attribute vec2 a_position; attribute vec2 a_texCoord; uniform vec2 u_resolution; varying vec2 v_texCoord;  void main() {     vec2 zeroToOne = a_position / u_resolution;     vec2 zeroToTwo = zeroToOne * 2.0;     vec2 clipSpace = zeroToTwo - 1.0;     gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);     v_texCoord = a_texCoord; }"
  },
  "sobel_edge_detection": {
    "fragment": "precision mediump float; varying vec2 v_texCoord; uniform sampler2D u_image0; uniform vec2 f_resolution;  void main(void) {     float x = 1.0 / f_resolution.x;     float y = 1.0 / f_resolution.y;     vec4 horizEdge = vec4( 0.0 );     horizEdge -= texture2D( u_image0, vec2( v_texCoord.x - x, v_texCoord.y - y ) ) * 1.0;     horizEdge -= texture2D( u_image0, vec2( v_texCoord.x - x, v_texCoord.y     ) ) * 2.0;     horizEdge -= texture2D( u_image0, vec2( v_texCoord.x - x, v_texCoord.y + y ) ) * 1.0;     horizEdge += texture2D( u_image0, vec2( v_texCoord.x + x, v_texCoord.y - y ) ) * 1.0;     horizEdge += texture2D( u_image0, vec2( v_texCoord.x + x, v_texCoord.y     ) ) * 2.0;     horizEdge += texture2D( u_image0, vec2( v_texCoord.x + x, v_texCoord.y + y ) ) * 1.0;     vec4 vertEdge = vec4( 0.0 );     vertEdge -= texture2D( u_image0, vec2( v_texCoord.x - x, v_texCoord.y - y ) ) * 1.0;     vertEdge -= texture2D( u_image0, vec2( v_texCoord.x    , v_texCoord.y - y ) ) * 2.0;     vertEdge -= texture2D( u_image0, vec2( v_texCoord.x + x, v_texCoord.y - y ) ) * 1.0;     vertEdge += texture2D( u_image0, vec2( v_texCoord.x - x, v_texCoord.y + y ) ) * 1.0;     vertEdge += texture2D( u_image0, vec2( v_texCoord.x    , v_texCoord.y + y ) ) * 2.0;     vertEdge += texture2D( u_image0, vec2( v_texCoord.x + x, v_texCoord.y + y ) ) * 1.0;     vec3 edge = sqrt((horizEdge.rgb * horizEdge.rgb) + (vertEdge.rgb * vertEdge.rgb));      gl_FragColor = vec4( edge, texture2D( u_image0, v_texCoord ).a ); }",
    "vertex": "attribute vec2 a_position; attribute vec2 a_texCoord; uniform vec2 u_resolution; varying vec2 v_texCoord;  void main() {     vec2 zeroToOne = a_position / u_resolution;     vec2 zeroToTwo = zeroToOne * 2.0;     vec2 clipSpace = zeroToTwo - 1.0;     gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);     v_texCoord = a_texCoord; }"
  }
};

},{}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _class = function () {
    /**
     * c-tor
     * @param gl
     * @param width
     * @param height
     */

    function _class(gl, width, height) {
        _classCallCheck(this, _class);

        /** internal texture array */
        this._textures = {};

        /** width */
        this.width = width;

        /** height */
        this.height = height;

        /** gl context */
        this.gl = gl;

        /** uninitialized textures */
        this._unitialized = [];

        /** dirty textures (needs updating) */
        this._dirty = [];

        /** texture indices */
        this.textureIndices = [];
    }

    /**
     * add a texture
     * @param {String} name
     * @param {Object} texture
     * @param {Integer} glindex
     * @param {Array} pixelstore
     */


    _createClass(_class, [{
        key: 'add',
        value: function add(name, texture, glindex, pixelstore) {
            if (!glindex) {
                glindex = 0;
                while (this.textureIndices.indexOf(glindex) !== -1) {
                    glindex++;
                }
            }

            if (!pixelstore) {
                pixelstore = [];
            }
            this.textureIndices.push(glindex);

            this._textures[name] = {
                name: name,
                glindex: glindex,
                texture: texture,
                gltexture: this.gl.createTexture(),
                initialized: false,
                pixelStore: pixelstore,
                dirty: true };

            this._unitialized.push(this._textures[name]);
        }
    }, {
        key: 'update',


        /**
         * update a uniform
         * @param name name of texture
         * @param texture
         */
        value: function update(name, texture) {
            if (texture) {
                this._textures[name].texture = texture;
            }
            this._textures[name].dirty = true;
            this._dirty.push(this._textures[name]);
        }
    }, {
        key: 'refreshScene',


        /**
         * refresh scene with updated textures
         */
        value: function refreshScene() {
            for (var c = 0; c < this._dirty.length; c++) {
                this.gl.activeTexture(this.gl['TEXTURE' + this._dirty[c].glindex]);
                this.gl.bindTexture(this.gl.TEXTURE_2D, this._dirty[c].gltexture);
                this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this._dirty[c].texture);
            }
            this._dirty = [];
        }
    }, {
        key: 'initializeNewTextures',


        /**
         * initialize new textures
         * @param program
         */
        value: function initializeNewTextures(program) {
            if (this._unitialized.length === 0) {
                return;
            }
            var gl = this.gl;
            for (var c = 0; c < this._unitialized.length; c++) {
                this._unitialized[c].location = gl.getUniformLocation(program, 'u_image' + this._unitialized[c].glindex);
                gl.uniform1i(this._unitialized[c].location, this._unitialized[c].glindex);
                gl.activeTexture(gl['TEXTURE' + this._unitialized[c].glindex]);
                gl.bindTexture(gl.TEXTURE_2D, this._unitialized[c].gltexture);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

                for (var d = 0; d < this._unitialized[c].pixelStore.length; d++) {
                    gl.pixelStorei(gl[this._unitialized[c].pixelStore[d].property], this._unitialized[c].pixelStore[d].value);
                }

                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this._unitialized[c].texture);

                this._unitialized[c].initialized = true;
                this._unitialized[c].dirty = false;
            }
            this._unitialized = [];
        }
    }]);

    return _class;
}();

exports.default = _class;

},{}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _class = function () {
    /**
     * c-tor
     */

    function _class() {
        _classCallCheck(this, _class);

        /**
         * internal mapping of uniforms
         * @type {{}}
         * @private
         */
        this._uniforms = {};
    }

    /**
     * add a uniform
     * @param type type of uniform (1f, 2f, 3f, 4f, 1i, 2i, 3i, 4u
     */


    _createClass(_class, [{
        key: 'add',
        value: function add(name, type, values) {
            this._uniforms[name] = { name: name, type: type, values: values, dirty: true };
        }
    }, {
        key: 'update',


        /**
         * update a uniform
         * @param type type of uniform (1f, 2f, 3f, 4f, 1i, 2i, 3i, 4u
         */
        value: function update(name, values) {
            this._uniforms[name].values = values;
            this._uniforms[name].dirty = true;
        }
    }, {
        key: 'updateProgram',


        /**
         * update uniforms on GL context and program
         * @param gl WebGL context
         * @param program
         */
        value: function updateProgram(gl, program) {
            for (var c in this._uniforms) {
                if (this._uniforms[c].dirty) {
                    var u = gl.getUniformLocation(program, this._uniforms[c].name);
                    switch (this._uniforms[c].type) {
                        case '1f':
                            gl.uniform1f(u, this._uniforms[c].values[0]);
                            break;

                        case '2f':
                            gl.uniform2f(u, this._uniforms[c].values[0], this._uniforms[c].values[1]);
                            break;

                        case '3f':
                            gl.uniform3f(u, this._uniforms[c].values[0], this._uniforms[c].values[1], this._uniforms[c].values[2]);
                            break;

                        case '4f':
                            gl.uniform4f(u, this._uniforms[c].values[0], this._uniforms[c].values[1], this._uniforms[c].values[2], this._uniforms[c].values[3]);
                            break;

                        case '1i':
                            gl.uniform1i(u, this._uniforms[c].values[0]);
                            break;

                        case '2i':
                            gl.uniform2i(u, this._uniforms[c].values[0], this._uniforms[c].values[1]);
                            break;

                        case '3i':
                            gl.uniform3i(u, this._.uniforms[c].values[0], this._uniforms[c].values[1], this._uniforms[c].values[2]);
                            break;

                        case '4i':
                            gl.uniformif(u, this._uniforms[c].values[0], this._uniforms[c].values[1], this._uniforms[c].values[2], this._uniforms[c].values[3]);
                            break;
                    }
                }
            }
        }
    }]);

    return _class;
}();

exports.default = _class;

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmNcXHdlYmdsLmVzNiIsInNyY1xcd2ViZ2xcXGNvbnN0YW50cy5lczYiLCJzcmNcXHdlYmdsXFxmaWx0ZXJzLmVzNiIsInNyY1xcd2ViZ2xcXHNoYWRlcnMuZXM2Iiwic3JjXFx3ZWJnbFxcdGV4dHVyZXMuZXM2Iiwic3JjXFx3ZWJnbFxcdW5pZm9ybXMuZXM2Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDTUEsUUFBUSxLQUFSLEdBQWdCO0FBQ1osV0FBTztBQUNILGtDQURHO0FBRUgsb0NBRkc7QUFHSCxvQ0FIRztBQUlILGtDQUpHO0FBS0gsc0NBTEc7S0FBUDtDQURKOzs7Ozs7OztrQkNOZTtBQUNYLGNBQVU7QUFDTixtQkFBVyxJQUFYO0FBQ0EsbUJBQVcsSUFBWDtBQUNBLG1CQUFXLElBQVg7QUFDQSxtQkFBVyxJQUFYOztBQUVBLG1CQUFXLElBQVg7QUFDQSxtQkFBVyxJQUFYO0FBQ0EsbUJBQVcsSUFBWDtBQUNBLG1CQUFXLElBQVg7S0FUSjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7a0JDS1c7Ozs7Ozs7O0FBT1gsOERBQXdCLGNBQWMsZ0JBQWdCO0FBQ2xELGVBQU8sRUFBRSxjQUFjLFlBQWQsRUFBNEIsZ0JBQWdCLGNBQWhCLEVBQXJDLENBRGtEO0tBUDNDOzs7Ozs7OztBQWdCWCx3REFBcUIsTUFBTSxXQUFXO0FBQ2xDLFlBQUksQ0FBQyxTQUFELEVBQVk7QUFDWiwwQ0FEWTtTQUFoQjtBQUdBLFlBQUksQ0FBQyxVQUFVLElBQVYsQ0FBRCxFQUFrQjtBQUNsQixvQkFBUSxHQUFSLENBQVksU0FBWixFQUF1QixJQUF2QixFQUE2QixlQUE3QixFQUE4QyxTQUE5QyxFQUF5RCxxQ0FBekQsRUFEa0I7QUFFbEIsMENBRmtCO0FBR2xCLG1CQUFPLGFBQVAsQ0FIa0I7U0FBdEI7QUFLQSxZQUFJLE1BQU0s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LFNBQUgsQ0FBYSxDQUFiLEVBQWdCLEtBQUssU0FBTCxDQUFlLENBQWYsRUFBa0IsTUFBbEIsQ0FBeUIsQ0FBekIsQ0FBaEIsRUFBNkMsS0FBSyxTQUFMLENBQWUsQ0FBZixFQUFrQixNQUFsQixDQUF5QixDQUF6QixDQUE3QyxFQURKO0FBRUksa0NBRko7O0FBckJKLDZCQXlCUyxJQUFMO0FBQ0ksK0JBQUcsU0FBSCxDQUFhLENBQWIsRUFBZ0IsS0FBSyxDQUFMLENBQU8sUUFBUCxDQUFnQixDQUFoQixFQUFtQixNQUFuQixDQUEwQixDQUExQixDQUFoQixFQUE4QyxLQUFLLFNBQUwsQ0FBZSxDQUFmLEVBQWtCLE1BQWxCLENBQXlCLENBQXpCLENBQTlDLEVBQTJFLEtBQUssU0FBTCxDQUFlLENBQWYsRUFBa0IsTUFBbEIsQ0FBeUIsQ0FBekIsQ0FBM0UsRUFESjtBQUVJLGtDQUZKOztBQXpCSiw2QkE2QlMsSUFBTDtBQUNJLCtCQUFHLFNBQUgsQ0FBYSxDQUFiLEVBQWdCLEtBQUssU0FBTCxDQUFlLENBQWYsRUFBa0IsTUFBbEIsQ0FBeUIsQ0FBekIsQ0FBaEIsRUFBNkMsS0FBSyxTQUFMLENBQWUsQ0FBZixFQUFrQixNQUFsQixDQUF5QixDQUF6QixDQUE3QyxFQUEwRSxLQUFLLFNBQUwsQ0FBZSxDQUFmLEVBQWtCLE1BQWxCLENBQXlCLENBQXpCLENBQTFFLEVBQXVHLEtBQUssU0FBTCxDQUFlLENBQWYsRUFBa0IsTUFBbEIsQ0FBeUIsQ0FBekIsQ0FBdkcsRUFESjtBQUVJLGtDQUZKO0FBN0JKLHFCQUZ5QjtpQkFBN0I7YUFESiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJpbXBvcnQgRmlsdGVycyBmcm9tICcuL3dlYmdsL2ZpbHRlcnMuZXM2JztcclxuaW1wb3J0IFNoYWRlcnMgZnJvbSAnLi93ZWJnbC9zaGFkZXJzLmVzNic7XHJcbmltcG9ydCBUZXh0dXJlcyBmcm9tICcuL3dlYmdsL3RleHR1cmVzLmVzNic7XHJcbmltcG9ydCBVbmlmb3JtcyBmcm9tICcuL3dlYmdsL3VuaWZvcm1zLmVzNic7XHJcbmltcG9ydCBDb25zdGFudHMgZnJvbSAnLi93ZWJnbC9jb25zdGFudHMuZXM2JztcclxuXHJcbmV4cG9ydHMuaW1hZ2UgPSB7XHJcbiAgICB3ZWJnbDoge1xyXG4gICAgICAgIHNoYWRlcnM6IFNoYWRlcnMsXHJcbiAgICAgICAgdGV4dHVyZXM6IFRleHR1cmVzLFxyXG4gICAgICAgIHVuaWZvcm1zOiBVbmlmb3JtcyxcclxuICAgICAgICBmaWx0ZXJzOiBGaWx0ZXJzLFxyXG4gICAgICAgIGNvbnN0YW50czogQ29uc3RhbnRzXHJcbiAgICB9XHJcbn07IiwiZXhwb3J0IGRlZmF1bHQge1xyXG4gICAgdW5pZm9ybXM6IHtcclxuICAgICAgICBVTklGT1JNMWY6ICcxZicsXHJcbiAgICAgICAgVU5JRk9STTJmOiAnMmYnLFxyXG4gICAgICAgIFVOSUZPUk0zZjogJzNmJyxcclxuICAgICAgICBVTklGT1JNNGY6ICc0ZicsXHJcblxyXG4gICAgICAgIFVOSUZPUk0xaTogJzFpJyxcclxuICAgICAgICBVTklGT1JNMmk6ICcyaScsXHJcbiAgICAgICAgVU5JRk9STTNpOiAnM2knLFxyXG4gICAgICAgIFVOSUZPUk00aTogJzRpJ1xyXG4gICAgfVxyXG59IiwiaW1wb3J0IENvbnN0YW50cyBmcm9tICcuL2NvbnN0YW50cy5lczYnO1xyXG5pbXBvcnQgU2hhZGVycyBmcm9tICcuL3NoYWRlcnMuZXM2JztcclxuaW1wb3J0IEZpbHRlcnMgZnJvbSAnLi9maWx0ZXJzLmVzNic7XHJcbmltcG9ydCBUZXh0dXJlcyBmcm9tICcuL3RleHR1cmVzLmVzNic7XHJcbmltcG9ydCBVbmlmb3JtcyBmcm9tICcuL3VuaWZvcm1zLmVzNic7XHJcblxyXG5leHBvcnQgZGVmYXVsdCB7XHJcbiAgICAvKipcclxuICAgICAqIGNyZWF0ZSBmaWx0ZXIgZnJvbSBzaGFkZXJzXHJcbiAgICAgKiBAcGFyYW0gdmVydGV4U2hhZGVyXHJcbiAgICAgKiBAcGFyYW0gZnJhZ21lbnRTaGFkZXJcclxuICAgICAqIEByZXR1cm5zIHt7dmVydGV4U2hhZGVyOiAqLCBmcmFnbWVudFNoYWRlcjogKn19XHJcbiAgICAgKi9cclxuICAgIGNyZWF0ZUZpbHRlckZyb21TaGFkZXJzKHZlcnRleFNoYWRlciwgZnJhZ21lbnRTaGFkZXIpIHtcclxuICAgICAgICByZXR1cm4geyB2ZXJ0ZXhTaGFkZXI6IHZlcnRleFNoYWRlciwgZnJhZ21lbnRTaGFkZXI6IGZyYWdtZW50U2hhZGVyIH07XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogY3JlYXRlIGEgZmlsdGVyIGZyb20gZmlsdGVyIG5hbWVcclxuICAgICAqIEBwYXJhbSBuYW1lXHJcbiAgICAgKiBAcGFyYW0gbWVtb3J5IHNwYWNlL3ZhcmlhYmxlIHRvIHB1bGwgc2hhZGVyIGZyb21cclxuICAgICAqL1xyXG4gICAgY3JlYXRlRmlsdGVyRnJvbU5hbWUobmFtZSwgc2hhZGVybG9jKSB7XHJcbiAgICAgICAgaWYgKCFzaGFkZXJsb2MpIHtcclxuICAgICAgICAgICAgc2hhZGVybG9jID0gU2hhZGVycztcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCFzaGFkZXJsb2NbbmFtZV0pIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1NoYWRlciAnLCBuYW1lLCAnbm90IGZvdW5kIGluICcsIHNoYWRlcmxvYywgJyB1c2luZyBhIHBhc3N0aHJvdWdoIHNoYWRlciBpbnN0ZWFkJyk7XHJcbiAgICAgICAgICAgIHNoYWRlcmxvYyA9IFNoYWRlcnM7XHJcbiAgICAgICAgICAgIG5hbWUgPSAncGFzc3Rocm91Z2gnO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgdnR4ID0gc2hhZGVybG9jW25hbWVdLnZlcnRleDtcclxuICAgICAgICB2YXIgZnJnID0gc2hhZGVybG9jW25hbWVdLmZyYWdtZW50O1xyXG4gICAgICAgIHJldHVybiB0aGlzLmNyZWF0ZUZpbHRlckZyb21TaGFkZXJzKHZ0eCwgZnJnKTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBjcmVhdGUgb2JqZWN0IGZvciByZW5kZXJcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fXBhcmFtc1xyXG4gICAgICovXHJcbiAgICBjcmVhdGVSZW5kZXJPYmplY3QocGFyYW1zKSB7XHJcbiAgICAgICAgdmFyIHByb3BzID0ge307XHJcblxyXG4gICAgICAgIHByb3BzLmdsID0gcGFyYW1zLmdsO1xyXG4gICAgICAgIHByb3BzLndpZHRoID0gcHJvcHMuZ2wuY2FudmFzLndpZHRoO1xyXG4gICAgICAgIHByb3BzLmhlaWdodCA9IHByb3BzLmdsLmNhbnZhcy5oZWlnaHQ7XHJcblxyXG4gICAgICAgIGlmIChwYXJhbXMud2lkdGgpIHsgcHJvcHMud2lkdGggPSBwYXJhbXMud2lkdGg7IH1cclxuICAgICAgICBpZiAocGFyYW1zLmhlaWdodCkgeyBwcm9wcy5oZWlnaHQgPSBwYXJhbXMuaGVpZ2h0OyB9XHJcblxyXG4gICAgICAgIHByb3BzLmZpbHRlciA9IHBhcmFtcy5maWx0ZXI7XHJcbiAgICAgICAgcHJvcHMudGV4dHVyZXMgPSBuZXcgVGV4dHVyZXMocHJvcHMud2lkdGgscHJvcHMuaGVpZ2h0KTtcclxuXHJcbiAgICAgICAgcHJvcHMuY2FudmFzMkRIZWxwZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcclxuICAgICAgICBwcm9wcy5jYW52YXMyREhlbHBlci53aWR0aCA9IHByb3BzLndpZHRoO1xyXG4gICAgICAgIHByb3BzLmNhbnZhczJESGVscGVyLmhlaWdodCA9IHByb3BzLmhlaWdodDtcclxuICAgICAgICBwcm9wcy5jYW52YXMyREhlbHBlckNvbnRleHQgPSBwcm9wcy5jYW52YXMyREhlbHBlci5nZXRDb250ZXh0KCcyZCcpO1xyXG5cclxuICAgICAgICBwcm9wcy51bmlmb3JtcyA9IG5ldyBVbmlmb3JtcygpO1xyXG4gICAgICAgIHByb3BzLnRleHR1cmVzID0gbmV3IFRleHR1cmVzKHByb3BzLmdsLCBwcm9wcy53aWR0aCwgcHJvcHMuaGVpZ2h0KTtcclxuXHJcbiAgICAgICAgaWYgKHBhcmFtcy50ZXh0dXJlcykge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IHBhcmFtcy50ZXh0dXJlcy5sZW5ndGg7IGMrKykge1xyXG4gICAgICAgICAgICAgICAgcHJvcHMudGV4dHVyZXMuYWRkKHBhcmFtcy50ZXh0dXJlc1tjXS5uYW1lLCBwYXJhbXMudGV4dHVyZXNbY10udGV4dHVyZSwgcGFyYW1zLnRleHR1cmVzW2NdLmluZGV4LCBwYXJhbXMudGV4dHVyZXNbY10ucGl4ZWxTdG9yZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChwYXJhbXMudW5pZm9ybXMpIHtcclxuICAgICAgICAgICAgZm9yICh2YXIgYyA9IDA7IGMgPCBwYXJhbXMudW5pZm9ybXMubGVuZ3RoOyBjKyspIHtcclxuICAgICAgICAgICAgICAgIHByb3BzLnVuaWZvcm1zLmFkZChwYXJhbXMudW5pZm9ybXNbY10ubmFtZSwgcGFyYW1zLnVuaWZvcm1zW2NdLnR5cGUsIHBhcmFtcy51bmlmb3Jtc1tjXS52YWx1ZXMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocGFyYW1zLmF1dG9yZW5kZXIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVuZGVyKHByb3BzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBwcm9wcztcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiByZW5kZXIgV2ViR0wgZmlsdGVyIG9uIGN1cnJlbnQgdGV4dHVyZVxyXG4gICAgICogQHBhcmFtIGdscHJvcHNcclxuICAgICAqIEBwYXJhbSByZWZyZXNoVGV4dHVyZUluZGljZXMgdGV4dHVyZSByZWZyZXNoIGluZGljZXMgKG9wdGlvbmFsKVxyXG4gICAgICogQHJldHVybnMgeyp9XHJcbiAgICAgKi9cclxuICAgIHJlbmRlcihnbHByb3BzKSB7XHJcbiAgICAgICAgaWYgKCFnbHByb3BzLmlzSW5pdGlhbGl6ZWQpIHtcclxuICAgICAgICAgICAgdmFyIHZlcnRleFNoYWRlciA9IGdscHJvcHMuZ2wuY3JlYXRlU2hhZGVyKGdscHJvcHMuZ2wuVkVSVEVYX1NIQURFUik7XHJcbiAgICAgICAgICAgIGdscHJvcHMuZ2wuc2hhZGVyU291cmNlKHZlcnRleFNoYWRlciwgZ2xwcm9wcy5maWx0ZXIudmVydGV4U2hhZGVyKTtcclxuICAgICAgICAgICAgZ2xwcm9wcy5nbC5jb21waWxlU2hhZGVyKHZlcnRleFNoYWRlcik7XHJcblxyXG4gICAgICAgICAgICB2YXIgZnJhZ21lbnRTaGFkZXIgPSBnbHByb3BzLmdsLmNyZWF0ZVNoYWRlcihnbHByb3BzLmdsLkZSQUdNRU5UX1NIQURFUik7XHJcbiAgICAgICAgICAgIGdscHJvcHMuZ2wuc2hhZGVyU291cmNlKGZyYWdtZW50U2hhZGVyLCBnbHByb3BzLmZpbHRlci5mcmFnbWVudFNoYWRlcik7XHJcbiAgICAgICAgICAgIGdscHJvcHMuZ2wuY29tcGlsZVNoYWRlcihmcmFnbWVudFNoYWRlcik7XHJcblxyXG4gICAgICAgICAgICBnbHByb3BzLnByb2dyYW0gPSBnbHByb3BzLmdsLmNyZWF0ZVByb2dyYW0oKTtcclxuICAgICAgICAgICAgZ2xwcm9wcy5nbC5hdHRhY2hTaGFkZXIoZ2xwcm9wcy5wcm9ncmFtLCB2ZXJ0ZXhTaGFkZXIpO1xyXG4gICAgICAgICAgICBnbHByb3BzLmdsLmF0dGFjaFNoYWRlcihnbHByb3BzLnByb2dyYW0sIGZyYWdtZW50U2hhZGVyKTtcclxuICAgICAgICAgICAgZ2xwcm9wcy5nbC5saW5rUHJvZ3JhbShnbHByb3BzLnByb2dyYW0pO1xyXG4gICAgICAgICAgICBnbHByb3BzLmdsLnVzZVByb2dyYW0oZ2xwcm9wcy5wcm9ncmFtKTtcclxuXHJcbiAgICAgICAgICAgIHZhciBwb3NpdGlvbkxvY2F0aW9uID0gZ2xwcm9wcy5nbC5nZXRBdHRyaWJMb2NhdGlvbihnbHByb3BzLnByb2dyYW0sICdhX3Bvc2l0aW9uJyk7XHJcbiAgICAgICAgICAgIHZhciB0ZXhDb29yZEJ1ZmZlciA9IGdscHJvcHMuZ2wuY3JlYXRlQnVmZmVyKCk7XHJcbiAgICAgICAgICAgIHZhciByZWN0Q29vcmRCdWZmZXIgPSBnbHByb3BzLmdsLmNyZWF0ZUJ1ZmZlcigpO1xyXG4gICAgICAgICAgICB2YXIgdGV4Q29vcmRzID0gbmV3IEZsb2F0MzJBcnJheShbMC4wLCAgMC4wLCAxLjAsICAwLjAsIDAuMCwgIDEuMCwgMC4wLCAgMS4wLCAxLjAsICAwLjAsIDEuMCwgIDEuMF0pO1xyXG4gICAgICAgICAgICB2YXIgcmVjdENvb3JkcyA9IG5ldyBGbG9hdDMyQXJyYXkoWzAsIDAsIGdscHJvcHMudGV4dHVyZXMud2lkdGgsIDAsIDAsIGdscHJvcHMudGV4dHVyZXMuaGVpZ2h0LCAwLFxyXG4gICAgICAgICAgICAgICAgZ2xwcm9wcy50ZXh0dXJlcy5oZWlnaHQsIGdscHJvcHMudGV4dHVyZXMud2lkdGgsIDAsIGdscHJvcHMudGV4dHVyZXMud2lkdGgsIGdscHJvcHMudGV4dHVyZXMuaGVpZ2h0XSk7XHJcblxyXG4gICAgICAgICAgICBnbHByb3BzLmdsLmJpbmRCdWZmZXIoZ2xwcm9wcy5nbC5BUlJBWV9CVUZGRVIsIHRleENvb3JkQnVmZmVyKTtcclxuICAgICAgICAgICAgZ2xwcm9wcy5nbC5idWZmZXJEYXRhKGdscHJvcHMuZ2wuQVJSQVlfQlVGRkVSLCB0ZXhDb29yZHMsIGdscHJvcHMuZ2wuU1RBVElDX0RSQVcpO1xyXG5cclxuICAgICAgICAgICAgdmFyIHRleENvb3JkTG9jYXRpb24gPSBnbHByb3BzLmdsLmdldEF0dHJpYkxvY2F0aW9uKGdscHJvcHMucHJvZ3JhbSwgJ2FfdGV4Q29vcmQnKTtcclxuICAgICAgICAgICAgZ2xwcm9wcy5nbC5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheSh0ZXhDb29yZExvY2F0aW9uKTtcclxuICAgICAgICAgICAgZ2xwcm9wcy5nbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKHRleENvb3JkTG9jYXRpb24sIDIsIGdscHJvcHMuZ2wuRkxPQVQsIGZhbHNlLCAwLCAwKTtcclxuXHJcbiAgICAgICAgICAgIGdscHJvcHMudW5pZm9ybXMuYWRkKCd1X3Jlc29sdXRpb24nLCBDb25zdGFudHMudW5pZm9ybXMuVU5JRk9STTJmLCBbZ2xwcm9wcy5nbC5jYW52YXMud2lkdGgsIGdscHJvcHMuZ2wuY2FudmFzLmhlaWdodF0pO1xyXG4gICAgICAgICAgICBnbHByb3BzLnVuaWZvcm1zLmFkZCgnZl9yZXNvbHV0aW9uJywgQ29uc3RhbnRzLnVuaWZvcm1zLlVOSUZPUk0yZiwgW2dscHJvcHMuZ2wuY2FudmFzLndpZHRoLCBnbHByb3BzLmdsLmNhbnZhcy5oZWlnaHRdKTtcclxuXHJcbiAgICAgICAgICAgIGdscHJvcHMuZ2wuYmluZEJ1ZmZlcihnbHByb3BzLmdsLkFSUkFZX0JVRkZFUiwgcmVjdENvb3JkQnVmZmVyKTtcclxuICAgICAgICAgICAgZ2xwcm9wcy5nbC5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheShwb3NpdGlvbkxvY2F0aW9uKTtcclxuICAgICAgICAgICAgZ2xwcm9wcy5nbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKHBvc2l0aW9uTG9jYXRpb24sIDIsIGdscHJvcHMuZ2wuRkxPQVQsIGZhbHNlLCAwLCAwKTtcclxuICAgICAgICAgICAgZ2xwcm9wcy5nbC5idWZmZXJEYXRhKGdscHJvcHMuZ2wuQVJSQVlfQlVGRkVSLCByZWN0Q29vcmRzLCBnbHByb3BzLmdsLlNUQVRJQ19EUkFXKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdscHJvcHMudGV4dHVyZXMuaW5pdGlhbGl6ZU5ld1RleHR1cmVzKGdscHJvcHMucHJvZ3JhbSk7XHJcbiAgICAgICAgZ2xwcm9wcy50ZXh0dXJlcy5yZWZyZXNoU2NlbmUoKTtcclxuICAgICAgICBnbHByb3BzLnVuaWZvcm1zLnVwZGF0ZVByb2dyYW0oZ2xwcm9wcy5nbCwgZ2xwcm9wcy5wcm9ncmFtKTtcclxuXHJcbiAgICAgICAgZ2xwcm9wcy5nbC5kcmF3QXJyYXlzKGdscHJvcHMuZ2wuVFJJQU5HTEVTLCAwLCA2KTtcclxuICAgICAgICBnbHByb3BzLmlzSW5pdGlhbGl6ZWQgPSB0cnVlO1xyXG5cclxuICAgICAgICByZXR1cm4gZ2xwcm9wcztcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiByZWFkIHBpeGVscyBmcm9tIEdMIGNvbnRleHRcclxuICAgICAqIEBwYXJhbSBnbFByb3BzXHJcbiAgICAgKi9cclxuICAgIGdldENhbnZhc1BpeGVscyhnbHByb3BzKSB7XHJcbiAgICAgICAgdmFyIGdsY3R4ID0gZ2xwcm9wcy5nbDtcclxuICAgICAgICBpZiAoIWdscHJvcHMucGl4ZWxhcnJheSkge1xyXG4gICAgICAgICAgICBnbHByb3BzLnBpeGVsYXJyYXkgPSBuZXcgVWludDhBcnJheShnbGN0eC5jYW52YXMud2lkdGggKiBnbGN0eC5jYW52YXMuaGVpZ2h0ICogNCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGdsY3R4LnJlYWRQaXhlbHMoMCwgMCwgZ2xjdHguY2FudmFzLndpZHRoLCBnbGN0eC5jYW52YXMuaGVpZ2h0LCBnbGN0eC5SR0JBLCBnbGN0eC5VTlNJR05FRF9CWVRFLCBnbHByb3BzLnBpeGVsYXJyYXkpO1xyXG4gICAgICAgIHZhciBpbWdEYXRhID0gZ2xwcm9wcy5jYW52YXMyREhlbHBlckNvbnRleHQuY3JlYXRlSW1hZ2VEYXRhKGdsY3R4LmNhbnZhcy53aWR0aCwgZ2xjdHguY2FudmFzLmhlaWdodCk7XHJcbiAgICAgICAgaW1nRGF0YS5kYXRhLnNldChuZXcgVWludDhDbGFtcGVkQXJyYXkoZ2xwcm9wcy5waXhlbGFycmF5KSk7XHJcbiAgICAgICAgcmV0dXJuIGltZ0RhdGE7XHJcbiAgICB9XHJcbn07IiwiZXhwb3J0IGRlZmF1bHQge1xuICBcImZyZWljaGVuX2VkZ2VfZGV0ZWN0aW9uXCI6IHtcbiAgICBcImZyYWdtZW50XCI6IFwicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7IHVuaWZvcm0gc2FtcGxlcjJEIHVfaW1hZ2UwOyB2YXJ5aW5nIHZlYzIgdl90ZXhDb29yZDsgdW5pZm9ybSB2ZWMyIGZfcmVzb2x1dGlvbjsgdmVjMiB0ZXhlbCA9IHZlYzIoMS4wIC8gZl9yZXNvbHV0aW9uLngsIDEuMCAvIGZfcmVzb2x1dGlvbi55KTsgbWF0MyBHWzldOyAgY29uc3QgbWF0MyBnMCA9IG1hdDMoIDAuMzUzNTUzMzg0NTQyNDY1MiwgMCwgLTAuMzUzNTUzMzg0NTQyNDY1MiwgMC41LCAwLCAtMC41LCAwLjM1MzU1MzM4NDU0MjQ2NTIsIDAsIC0wLjM1MzU1MzM4NDU0MjQ2NTIgKTsgY29uc3QgbWF0MyBnMSA9IG1hdDMoIDAuMzUzNTUzMzg0NTQyNDY1MiwgMC41LCAwLjM1MzU1MzM4NDU0MjQ2NTIsIDAsIDAsIDAsIC0wLjM1MzU1MzM4NDU0MjQ2NTIsIC0wLjUsIC0wLjM1MzU1MzM4NDU0MjQ2NTIgKTsgY29uc3QgbWF0MyBnMiA9IG1hdDMoIDAsIDAuMzUzNTUzMzg0NTQyNDY1MiwgLTAuNSwgLTAuMzUzNTUzMzg0NTQyNDY1MiwgMCwgMC4zNTM1NTMzODQ1NDI0NjUyLCAwLjUsIC0wLjM1MzU1MzM4NDU0MjQ2NTIsIDAgKTsgY29uc3QgbWF0MyBnMyA9IG1hdDMoIDAuNSwgLTAuMzUzNTUzMzg0NTQyNDY1MiwgMCwgLTAuMzUzNTUzMzg0NTQyNDY1MiwgMCwgMC4zNTM1NTMzODQ1NDI0NjUyLCAwLCAwLjM1MzU1MzM4NDU0MjQ2NTIsIC0wLjUgKTsgY29uc3QgbWF0MyBnNCA9IG1hdDMoIDAsIC0wLjUsIDAsIDAuNSwgMCwgMC41LCAwLCAtMC41LCAwICk7IGNvbnN0IG1hdDMgZzUgPSBtYXQzKCAtMC41LCAwLCAwLjUsIDAsIDAsIDAsIDAuNSwgMCwgLTAuNSApOyBjb25zdCBtYXQzIGc2ID0gbWF0MyggMC4xNjY2NjY2NzE2MzM3MjA0LCAtMC4zMzMzMzMzNDMyNjc0NDA4LCAwLjE2NjY2NjY3MTYzMzcyMDQsIC0wLjMzMzMzMzM0MzI2NzQ0MDgsIDAuNjY2NjY2Njg2NTM0ODgxNiwgLTAuMzMzMzMzMzQzMjY3NDQwOCwgMC4xNjY2NjY2NzE2MzM3MjA0LCAtMC4zMzMzMzMzNDMyNjc0NDA4LCAwLjE2NjY2NjY3MTYzMzcyMDQgKTsgY29uc3QgbWF0MyBnNyA9IG1hdDMoIC0wLjMzMzMzMzM0MzI2NzQ0MDgsIDAuMTY2NjY2NjcxNjMzNzIwNCwgLTAuMzMzMzMzMzQzMjY3NDQwOCwgMC4xNjY2NjY2NzE2MzM3MjA0LCAwLjY2NjY2NjY4NjUzNDg4MTYsIDAuMTY2NjY2NjcxNjMzNzIwNCwgLTAuMzMzMzMzMzQzMjY3NDQwOCwgMC4xNjY2NjY2NzE2MzM3MjA0LCAtMC4zMzMzMzMzNDMyNjc0NDA4ICk7IGNvbnN0IG1hdDMgZzggPSBtYXQzKCAwLjMzMzMzMzM0MzI2NzQ0MDgsIDAuMzMzMzMzMzQzMjY3NDQwOCwgMC4zMzMzMzMzNDMyNjc0NDA4LCAwLjMzMzMzMzM0MzI2NzQ0MDgsIDAuMzMzMzMzMzQzMjY3NDQwOCwgMC4zMzMzMzMzNDMyNjc0NDA4LCAwLjMzMzMzMzM0MzI2NzQ0MDgsIDAuMzMzMzMzMzQzMjY3NDQwOCwgMC4zMzMzMzMzNDMyNjc0NDA4ICk7ICB2b2lkIG1haW4odm9pZCkgeyAgICAgIEdbMF0gPSBnMCwgICAgIEdbMV0gPSBnMSwgICAgIEdbMl0gPSBnMiwgICAgIEdbM10gPSBnMywgICAgIEdbNF0gPSBnNCwgICAgIEdbNV0gPSBnNSwgICAgIEdbNl0gPSBnNiwgICAgIEdbN10gPSBnNywgICAgIEdbOF0gPSBnODsgICAgICBtYXQzIEk7ICAgICBmbG9hdCBjbnZbOV07ICAgICB2ZWMzIHNhbXBsOyAgICAgIGZvciAoZmxvYXQgaT0wLjA7IGk8My4wOyBpKyspIHsgICAgICAgICBmb3IgKGZsb2F0IGo9MC4wOyBqPDMuMDsgaisrKSB7ICAgICAgICAgICAgIHNhbXBsID0gdGV4dHVyZTJEKHVfaW1hZ2UwLCB2X3RleENvb3JkICsgdGV4ZWwgKiB2ZWMyKGktMS4wLGotMS4wKSApLnJnYjsgICAgICAgICAgICAgSVtpbnQoaSldW2ludChqKV0gPSBsZW5ndGgoc2FtcGwpOyAgICAgICAgIH0gICAgIH0gICAgICBmb3IgKGludCBpPTA7IGk8OTsgaSsrKSB7ICAgICAgICAgZmxvYXQgZHAzID0gZG90KEdbaV1bMF0sIElbMF0pICsgZG90KEdbaV1bMV0sIElbMV0pICsgZG90KEdbaV1bMl0sIElbMl0pOyAgICAgICAgIGNudltpXSA9IGRwMyAqIGRwMzsgICAgIH0gICAgICBmbG9hdCBNID0gKGNudlswXSArIGNudlsxXSkgKyAoY252WzJdICsgY252WzNdKTsgICAgIGZsb2F0IFMgPSAoY252WzRdICsgY252WzVdKSArIChjbnZbNl0gKyBjbnZbN10pICsgKGNudls4XSArIE0pOyAgICAgIGdsX0ZyYWdDb2xvciA9IHZlYzQodmVjMyhzcXJ0KE0vUykpLCB0ZXh0dXJlMkQoIHVfaW1hZ2UwLCB2X3RleENvb3JkICkuYSApOyB9XCIsXG4gICAgXCJ2ZXJ0ZXhcIjogXCJhdHRyaWJ1dGUgdmVjMiBhX3Bvc2l0aW9uOyBhdHRyaWJ1dGUgdmVjMiBhX3RleENvb3JkOyB1bmlmb3JtIHZlYzIgdV9yZXNvbHV0aW9uOyB2YXJ5aW5nIHZlYzIgdl90ZXhDb29yZDsgIHZvaWQgbWFpbigpIHsgICAgIHZlYzIgemVyb1RvT25lID0gYV9wb3NpdGlvbiAvIHVfcmVzb2x1dGlvbjsgICAgIHZlYzIgemVyb1RvVHdvID0gemVyb1RvT25lICogMi4wOyAgICAgdmVjMiBjbGlwU3BhY2UgPSB6ZXJvVG9Ud28gLSAxLjA7ICAgICBnbF9Qb3NpdGlvbiA9IHZlYzQoY2xpcFNwYWNlICogdmVjMigxLCAtMSksIDAsIDEpOyAgICAgdl90ZXhDb29yZCA9IGFfdGV4Q29vcmQ7IH1cIlxuICB9LFxuICBcImdyZXlzY2FsZVwiOiB7XG4gICAgXCJmcmFnbWVudFwiOiBcInByZWNpc2lvbiBtZWRpdW1wIGZsb2F0OyB2YXJ5aW5nIHZlYzIgdl90ZXhDb29yZDsgIHVuaWZvcm0gc2FtcGxlcjJEIHVfaW1hZ2UwOyAgdm9pZCBtYWluKHZvaWQpIHsgICAgIHZlYzQgcHggPSB0ZXh0dXJlMkQodV9pbWFnZTAsIHZfdGV4Q29vcmQpOyAgICAgZmxvYXQgYXZnID0gKHB4LnIgKyBweC5nICsgcHguYikvMy4wOyAgICAgZ2xfRnJhZ0NvbG9yID0gdmVjNChhdmcsIGF2ZywgYXZnLCBweC5hKTsgfVwiLFxuICAgIFwidmVydGV4XCI6IFwiYXR0cmlidXRlIHZlYzIgYV9wb3NpdGlvbjsgYXR0cmlidXRlIHZlYzIgYV90ZXhDb29yZDsgdW5pZm9ybSB2ZWMyIHVfcmVzb2x1dGlvbjsgdmFyeWluZyB2ZWMyIHZfdGV4Q29vcmQ7ICB2b2lkIG1haW4oKSB7ICAgICB2ZWMyIHplcm9Ub09uZSA9IGFfcG9zaXRpb24gLyB1X3Jlc29sdXRpb247ICAgICB2ZWMyIHplcm9Ub1R3byA9IHplcm9Ub09uZSAqIDIuMDsgICAgIHZlYzIgY2xpcFNwYWNlID0gemVyb1RvVHdvIC0gMS4wOyAgICAgZ2xfUG9zaXRpb24gPSB2ZWM0KGNsaXBTcGFjZSAqIHZlYzIoMSwgLTEpLCAwLCAxKTsgICAgIHZfdGV4Q29vcmQgPSBhX3RleENvb3JkOyB9XCJcbiAgfSxcbiAgXCJwYXNzdGhyb3VnaFwiOiB7XG4gICAgXCJmcmFnbWVudFwiOiBcInByZWNpc2lvbiBtZWRpdW1wIGZsb2F0OyB1bmlmb3JtIHNhbXBsZXIyRCB1X2ltYWdlMDsgdmFyeWluZyB2ZWMyIHZfdGV4Q29vcmQ7ICB2b2lkIG1haW4oKSB7ICAgICBnbF9GcmFnQ29sb3IgPSB0ZXh0dXJlMkQodV9pbWFnZTAsIHZfdGV4Q29vcmQpOyB9XCIsXG4gICAgXCJ2ZXJ0ZXhcIjogXCJhdHRyaWJ1dGUgdmVjMiBhX3Bvc2l0aW9uOyBhdHRyaWJ1dGUgdmVjMiBhX3RleENvb3JkOyB1bmlmb3JtIHZlYzIgdV9yZXNvbHV0aW9uOyB2YXJ5aW5nIHZlYzIgdl90ZXhDb29yZDsgIHZvaWQgbWFpbigpIHsgICAgIHZlYzIgemVyb1RvT25lID0gYV9wb3NpdGlvbiAvIHVfcmVzb2x1dGlvbjsgICAgIHZlYzIgemVyb1RvVHdvID0gemVyb1RvT25lICogMi4wOyAgICAgdmVjMiBjbGlwU3BhY2UgPSB6ZXJvVG9Ud28gLSAxLjA7ICAgICBnbF9Qb3NpdGlvbiA9IHZlYzQoY2xpcFNwYWNlICogdmVjMigxLCAtMSksIDAsIDEpOyAgICAgdl90ZXhDb29yZCA9IGFfdGV4Q29vcmQ7IH1cIlxuICB9LFxuICBcInNlcGlhXCI6IHtcbiAgICBcImZyYWdtZW50XCI6IFwicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7IHZhcnlpbmcgdmVjMiB2X3RleENvb3JkOyAgdW5pZm9ybSBzYW1wbGVyMkQgdV9pbWFnZTA7IHVuaWZvcm0gdmVjNCBsaWdodDsgdW5pZm9ybSB2ZWM0IGRhcms7IHVuaWZvcm0gZmxvYXQgZGVzYXQ7IHVuaWZvcm0gZmxvYXQgdG9uZWQ7ICBjb25zdCBtYXQ0IGNvZWZmID0gbWF0NCggICAgIDAuMzkzLCAwLjM0OSwgMC4yNzIsIDEuMCwgICAgIDAuNzk2LCAwLjY4NiwgMC41MzQsIDEuMCwgICAgIDAuMTg5LCAwLjE2OCwgMC4xMzEsIDEuMCwgICAgIDAuMCwgMC4wLCAwLjAsIDEuMCApOyAgdm9pZCBtYWluKHZvaWQpIHsgICAgIHZlYzQgc291cmNlUGl4ZWwgPSB0ZXh0dXJlMkQodV9pbWFnZTAsIHZfdGV4Q29vcmQpOyAgICAgZ2xfRnJhZ0NvbG9yID0gY29lZmYgKiBzb3VyY2VQaXhlbDsgfVwiLFxuICAgIFwidmVydGV4XCI6IFwiYXR0cmlidXRlIHZlYzIgYV9wb3NpdGlvbjsgYXR0cmlidXRlIHZlYzIgYV90ZXhDb29yZDsgdW5pZm9ybSB2ZWMyIHVfcmVzb2x1dGlvbjsgdmFyeWluZyB2ZWMyIHZfdGV4Q29vcmQ7ICB2b2lkIG1haW4oKSB7ICAgICB2ZWMyIHplcm9Ub09uZSA9IGFfcG9zaXRpb24gLyB1X3Jlc29sdXRpb247ICAgICB2ZWMyIHplcm9Ub1R3byA9IHplcm9Ub09uZSAqIDIuMDsgICAgIHZlYzIgY2xpcFNwYWNlID0gemVyb1RvVHdvIC0gMS4wOyAgICAgZ2xfUG9zaXRpb24gPSB2ZWM0KGNsaXBTcGFjZSAqIHZlYzIoMSwgLTEpLCAwLCAxKTsgICAgIHZfdGV4Q29vcmQgPSBhX3RleENvb3JkOyB9XCJcbiAgfSxcbiAgXCJzb2JlbF9lZGdlX2RldGVjdGlvblwiOiB7XG4gICAgXCJmcmFnbWVudFwiOiBcInByZWNpc2lvbiBtZWRpdW1wIGZsb2F0OyB2YXJ5aW5nIHZlYzIgdl90ZXhDb29yZDsgdW5pZm9ybSBzYW1wbGVyMkQgdV9pbWFnZTA7IHVuaWZvcm0gdmVjMiBmX3Jlc29sdXRpb247ICB2b2lkIG1haW4odm9pZCkgeyAgICAgZmxvYXQgeCA9IDEuMCAvIGZfcmVzb2x1dGlvbi54OyAgICAgZmxvYXQgeSA9IDEuMCAvIGZfcmVzb2x1dGlvbi55OyAgICAgdmVjNCBob3JpekVkZ2UgPSB2ZWM0KCAwLjAgKTsgICAgIGhvcml6RWRnZSAtPSB0ZXh0dXJlMkQoIHVfaW1hZ2UwLCB2ZWMyKCB2X3RleENvb3JkLnggLSB4LCB2X3RleENvb3JkLnkgLSB5ICkgKSAqIDEuMDsgICAgIGhvcml6RWRnZSAtPSB0ZXh0dXJlMkQoIHVfaW1hZ2UwLCB2ZWMyKCB2X3RleENvb3JkLnggLSB4LCB2X3RleENvb3JkLnkgICAgICkgKSAqIDIuMDsgICAgIGhvcml6RWRnZSAtPSB0ZXh0dXJlMkQoIHVfaW1hZ2UwLCB2ZWMyKCB2X3RleENvb3JkLnggLSB4LCB2X3RleENvb3JkLnkgKyB5ICkgKSAqIDEuMDsgICAgIGhvcml6RWRnZSArPSB0ZXh0dXJlMkQoIHVfaW1hZ2UwLCB2ZWMyKCB2X3RleENvb3JkLnggKyB4LCB2X3RleENvb3JkLnkgLSB5ICkgKSAqIDEuMDsgICAgIGhvcml6RWRnZSArPSB0ZXh0dXJlMkQoIHVfaW1hZ2UwLCB2ZWMyKCB2X3RleENvb3JkLnggKyB4LCB2X3RleENvb3JkLnkgICAgICkgKSAqIDIuMDsgICAgIGhvcml6RWRnZSArPSB0ZXh0dXJlMkQoIHVfaW1hZ2UwLCB2ZWMyKCB2X3RleENvb3JkLnggKyB4LCB2X3RleENvb3JkLnkgKyB5ICkgKSAqIDEuMDsgICAgIHZlYzQgdmVydEVkZ2UgPSB2ZWM0KCAwLjAgKTsgICAgIHZlcnRFZGdlIC09IHRleHR1cmUyRCggdV9pbWFnZTAsIHZlYzIoIHZfdGV4Q29vcmQueCAtIHgsIHZfdGV4Q29vcmQueSAtIHkgKSApICogMS4wOyAgICAgdmVydEVkZ2UgLT0gdGV4dHVyZTJEKCB1X2ltYWdlMCwgdmVjMiggdl90ZXhDb29yZC54ICAgICwgdl90ZXhDb29yZC55IC0geSApICkgKiAyLjA7ICAgICB2ZXJ0RWRnZSAtPSB0ZXh0dXJlMkQoIHVfaW1hZ2UwLCB2ZWMyKCB2X3RleENvb3JkLnggKyB4LCB2X3RleENvb3JkLnkgLSB5ICkgKSAqIDEuMDsgICAgIHZlcnRFZGdlICs9IHRleHR1cmUyRCggdV9pbWFnZTAsIHZlYzIoIHZfdGV4Q29vcmQueCAtIHgsIHZfdGV4Q29vcmQueSArIHkgKSApICogMS4wOyAgICAgdmVydEVkZ2UgKz0gdGV4dHVyZTJEKCB1X2ltYWdlMCwgdmVjMiggdl90ZXhDb29yZC54ICAgICwgdl90ZXhDb29yZC55ICsgeSApICkgKiAyLjA7ICAgICB2ZXJ0RWRnZSArPSB0ZXh0dXJlMkQoIHVfaW1hZ2UwLCB2ZWMyKCB2X3RleENvb3JkLnggKyB4LCB2X3RleENvb3JkLnkgKyB5ICkgKSAqIDEuMDsgICAgIHZlYzMgZWRnZSA9IHNxcnQoKGhvcml6RWRnZS5yZ2IgKiBob3JpekVkZ2UucmdiKSArICh2ZXJ0RWRnZS5yZ2IgKiB2ZXJ0RWRnZS5yZ2IpKTsgICAgICBnbF9GcmFnQ29sb3IgPSB2ZWM0KCBlZGdlLCB0ZXh0dXJlMkQoIHVfaW1hZ2UwLCB2X3RleENvb3JkICkuYSApOyB9XCIsXG4gICAgXCJ2ZXJ0ZXhcIjogXCJhdHRyaWJ1dGUgdmVjMiBhX3Bvc2l0aW9uOyBhdHRyaWJ1dGUgdmVjMiBhX3RleENvb3JkOyB1bmlmb3JtIHZlYzIgdV9yZXNvbHV0aW9uOyB2YXJ5aW5nIHZlYzIgdl90ZXhDb29yZDsgIHZvaWQgbWFpbigpIHsgICAgIHZlYzIgemVyb1RvT25lID0gYV9wb3NpdGlvbiAvIHVfcmVzb2x1dGlvbjsgICAgIHZlYzIgemVyb1RvVHdvID0gemVyb1RvT25lICogMi4wOyAgICAgdmVjMiBjbGlwU3BhY2UgPSB6ZXJvVG9Ud28gLSAxLjA7ICAgICBnbF9Qb3NpdGlvbiA9IHZlYzQoY2xpcFNwYWNlICogdmVjMigxLCAtMSksIDAsIDEpOyAgICAgdl90ZXhDb29yZCA9IGFfdGV4Q29vcmQ7IH1cIlxuICB9XG59IiwiZXhwb3J0IGRlZmF1bHQgY2xhc3Mge1xyXG4gICAgLyoqXHJcbiAgICAgKiBjLXRvclxyXG4gICAgICogQHBhcmFtIGdsXHJcbiAgICAgKiBAcGFyYW0gd2lkdGhcclxuICAgICAqIEBwYXJhbSBoZWlnaHRcclxuICAgICAqL1xyXG4gICAgY29uc3RydWN0b3IoZ2wsIHdpZHRoLCBoZWlnaHQpIHtcclxuICAgICAgICAvKiogaW50ZXJuYWwgdGV4dHVyZSBhcnJheSAqL1xyXG4gICAgICAgIHRoaXMuX3RleHR1cmVzID0ge307XHJcblxyXG4gICAgICAgIC8qKiB3aWR0aCAqL1xyXG4gICAgICAgIHRoaXMud2lkdGggPSB3aWR0aDtcclxuXHJcbiAgICAgICAgLyoqIGhlaWdodCAqL1xyXG4gICAgICAgIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xyXG5cclxuICAgICAgICAvKiogZ2wgY29udGV4dCAqL1xyXG4gICAgICAgIHRoaXMuZ2wgPSBnbDtcclxuXHJcbiAgICAgICAgLyoqIHVuaW5pdGlhbGl6ZWQgdGV4dHVyZXMgKi9cclxuICAgICAgICB0aGlzLl91bml0aWFsaXplZCA9IFtdO1xyXG5cclxuICAgICAgICAvKiogZGlydHkgdGV4dHVyZXMgKG5lZWRzIHVwZGF0aW5nKSAqL1xyXG4gICAgICAgIHRoaXMuX2RpcnR5ID0gW107XHJcblxyXG4gICAgICAgIC8qKiB0ZXh0dXJlIGluZGljZXMgKi9cclxuICAgICAgICB0aGlzLnRleHR1cmVJbmRpY2VzID0gW107XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBhZGQgYSB0ZXh0dXJlXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHRleHR1cmVcclxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gZ2xpbmRleFxyXG4gICAgICogQHBhcmFtIHtBcnJheX0gcGl4ZWxzdG9yZVxyXG4gICAgICovXHJcbiAgICBhZGQobmFtZSwgdGV4dHVyZSwgZ2xpbmRleCwgcGl4ZWxzdG9yZSkge1xyXG4gICAgICAgIGlmICghZ2xpbmRleCkge1xyXG4gICAgICAgICAgICBnbGluZGV4ID0gMDtcclxuICAgICAgICAgICAgd2hpbGUgKHRoaXMudGV4dHVyZUluZGljZXMuaW5kZXhPZihnbGluZGV4KSAhPT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIGdsaW5kZXggKys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghcGl4ZWxzdG9yZSkge1xyXG4gICAgICAgICAgICBwaXhlbHN0b3JlID0gW107XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMudGV4dHVyZUluZGljZXMucHVzaChnbGluZGV4KTtcclxuXHJcbiAgICAgICAgdGhpcy5fdGV4dHVyZXNbbmFtZV0gPSB7XHJcbiAgICAgICAgICAgIG5hbWU6IG5hbWUsXHJcbiAgICAgICAgICAgIGdsaW5kZXg6IGdsaW5kZXgsXHJcbiAgICAgICAgICAgIHRleHR1cmU6IHRleHR1cmUsXHJcbiAgICAgICAgICAgIGdsdGV4dHVyZTogdGhpcy5nbC5jcmVhdGVUZXh0dXJlKCksXHJcbiAgICAgICAgICAgIGluaXRpYWxpemVkOiBmYWxzZSxcclxuICAgICAgICAgICAgcGl4ZWxTdG9yZTogcGl4ZWxzdG9yZSxcclxuICAgICAgICAgICAgZGlydHk6IHRydWUgfTtcclxuXHJcbiAgICAgICAgdGhpcy5fdW5pdGlhbGl6ZWQucHVzaCh0aGlzLl90ZXh0dXJlc1tuYW1lXSk7XHJcbiAgICB9O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogdXBkYXRlIGEgdW5pZm9ybVxyXG4gICAgICogQHBhcmFtIG5hbWUgbmFtZSBvZiB0ZXh0dXJlXHJcbiAgICAgKiBAcGFyYW0gdGV4dHVyZVxyXG4gICAgICovXHJcbiAgICB1cGRhdGUobmFtZSwgdGV4dHVyZSkge1xyXG4gICAgICAgIGlmICh0ZXh0dXJlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX3RleHR1cmVzW25hbWVdLnRleHR1cmUgPSB0ZXh0dXJlO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLl90ZXh0dXJlc1tuYW1lXS5kaXJ0eSA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5fZGlydHkucHVzaCh0aGlzLl90ZXh0dXJlc1tuYW1lXSk7XHJcbiAgICB9O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogcmVmcmVzaCBzY2VuZSB3aXRoIHVwZGF0ZWQgdGV4dHVyZXNcclxuICAgICAqL1xyXG4gICAgcmVmcmVzaFNjZW5lKCkge1xyXG4gICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgdGhpcy5fZGlydHkubGVuZ3RoOyBjKyspIHtcclxuICAgICAgICAgICAgdGhpcy5nbC5hY3RpdmVUZXh0dXJlKHRoaXMuZ2xbJ1RFWFRVUkUnICsgdGhpcy5fZGlydHlbY10uZ2xpbmRleF0pO1xyXG4gICAgICAgICAgICB0aGlzLmdsLmJpbmRUZXh0dXJlKHRoaXMuZ2wuVEVYVFVSRV8yRCwgdGhpcy5fZGlydHlbY10uZ2x0ZXh0dXJlKTtcclxuICAgICAgICAgICAgdGhpcy5nbC50ZXhTdWJJbWFnZTJEKHRoaXMuZ2wuVEVYVFVSRV8yRCwgMCwgMCwgMCwgdGhpcy5nbC5SR0JBLCB0aGlzLmdsLlVOU0lHTkVEX0JZVEUsIHRoaXMuX2RpcnR5W2NdLnRleHR1cmUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLl9kaXJ0eSA9IFtdO1xyXG4gICAgfTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIGluaXRpYWxpemUgbmV3IHRleHR1cmVzXHJcbiAgICAgKiBAcGFyYW0gcHJvZ3JhbVxyXG4gICAgICovXHJcbiAgICBpbml0aWFsaXplTmV3VGV4dHVyZXMocHJvZ3JhbSkge1xyXG4gICAgICAgIGlmICh0aGlzLl91bml0aWFsaXplZC5sZW5ndGggPT09IDApIHsgcmV0dXJuOyB9XHJcbiAgICAgICAgdmFyIGdsID0gdGhpcy5nbDtcclxuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IHRoaXMuX3VuaXRpYWxpemVkLmxlbmd0aDsgYysrKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX3VuaXRpYWxpemVkW2NdLmxvY2F0aW9uID0gZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHByb2dyYW0sICd1X2ltYWdlJyArIHRoaXMuX3VuaXRpYWxpemVkW2NdLmdsaW5kZXgpO1xyXG4gICAgICAgICAgICBnbC51bmlmb3JtMWkodGhpcy5fdW5pdGlhbGl6ZWRbY10ubG9jYXRpb24sIHRoaXMuX3VuaXRpYWxpemVkW2NdLmdsaW5kZXgpO1xyXG4gICAgICAgICAgICBnbC5hY3RpdmVUZXh0dXJlKGdsWydURVhUVVJFJyArIHRoaXMuX3VuaXRpYWxpemVkW2NdLmdsaW5kZXhdKTtcclxuICAgICAgICAgICAgZ2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy5fdW5pdGlhbGl6ZWRbY10uZ2x0ZXh0dXJlKTtcclxuICAgICAgICAgICAgZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfUywgZ2wuQ0xBTVBfVE9fRURHRSk7XHJcbiAgICAgICAgICAgIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1QsIGdsLkNMQU1QX1RPX0VER0UpO1xyXG4gICAgICAgICAgICBnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUlOX0ZJTFRFUiwgZ2wuTkVBUkVTVCk7XHJcbiAgICAgICAgICAgIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NQUdfRklMVEVSLCBnbC5ORUFSRVNUKTtcclxuXHJcbiAgICAgICAgICAgIGZvciAodmFyIGQgPSAwOyBkIDwgdGhpcy5fdW5pdGlhbGl6ZWRbY10ucGl4ZWxTdG9yZS5sZW5ndGg7IGQrKykge1xyXG4gICAgICAgICAgICAgICAgZ2wucGl4ZWxTdG9yZWkoZ2xbdGhpcy5fdW5pdGlhbGl6ZWRbY10ucGl4ZWxTdG9yZVtkXS5wcm9wZXJ0eV0sIHRoaXMuX3VuaXRpYWxpemVkW2NdLnBpeGVsU3RvcmVbZF0udmFsdWUpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBnbC50ZXhJbWFnZTJEKGdsLlRFWFRVUkVfMkQsIDAsIGdsLlJHQkEsIGdsLlJHQkEsIGdsLlVOU0lHTkVEX0JZVEUsIHRoaXMuX3VuaXRpYWxpemVkW2NdLnRleHR1cmUpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5fdW5pdGlhbGl6ZWRbY10uaW5pdGlhbGl6ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLl91bml0aWFsaXplZFtjXS5kaXJ0eSA9IGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLl91bml0aWFsaXplZCA9IFtdO1xyXG4gICAgfTtcclxufSIsImV4cG9ydCBkZWZhdWx0IGNsYXNzIHtcclxuICAgIC8qKlxyXG4gICAgICogYy10b3JcclxuICAgICAqL1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogaW50ZXJuYWwgbWFwcGluZyBvZiB1bmlmb3Jtc1xyXG4gICAgICAgICAqIEB0eXBlIHt7fX1cclxuICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMuX3VuaWZvcm1zID0ge307XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBhZGQgYSB1bmlmb3JtXHJcbiAgICAgKiBAcGFyYW0gdHlwZSB0eXBlIG9mIHVuaWZvcm0gKDFmLCAyZiwgM2YsIDRmLCAxaSwgMmksIDNpLCA0dVxyXG4gICAgICovXHJcbiAgICBhZGQobmFtZSwgdHlwZSwgdmFsdWVzKSB7XHJcbiAgICAgICAgdGhpcy5fdW5pZm9ybXNbbmFtZV0gPSB7IG5hbWU6IG5hbWUsIHR5cGU6IHR5cGUsIHZhbHVlczogdmFsdWVzLCBkaXJ0eTogdHJ1ZSB9O1xyXG4gICAgfTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIHVwZGF0ZSBhIHVuaWZvcm1cclxuICAgICAqIEBwYXJhbSB0eXBlIHR5cGUgb2YgdW5pZm9ybSAoMWYsIDJmLCAzZiwgNGYsIDFpLCAyaSwgM2ksIDR1XHJcbiAgICAgKi9cclxuICAgIHVwZGF0ZShuYW1lLCB2YWx1ZXMpIHtcclxuICAgICAgICB0aGlzLl91bmlmb3Jtc1tuYW1lXS52YWx1ZXMgPSB2YWx1ZXM7XHJcbiAgICAgICAgdGhpcy5fdW5pZm9ybXNbbmFtZV0uZGlydHkgPSB0cnVlO1xyXG4gICAgfTtcclxuXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiB1cGRhdGUgdW5pZm9ybXMgb24gR0wgY29udGV4dCBhbmQgcHJvZ3JhbVxyXG4gICAgICogQHBhcmFtIGdsIFdlYkdMIGNvbnRleHRcclxuICAgICAqIEBwYXJhbSBwcm9ncmFtXHJcbiAgICAgKi9cclxuICAgIHVwZGF0ZVByb2dyYW0oZ2wsIHByb2dyYW0pIHtcclxuICAgICAgICBmb3IgKHZhciBjIGluIHRoaXMuX3VuaWZvcm1zKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLl91bmlmb3Jtc1tjXS5kaXJ0eSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHUgPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24ocHJvZ3JhbSwgdGhpcy5fdW5pZm9ybXNbY10ubmFtZSk7XHJcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHRoaXMuX3VuaWZvcm1zW2NdLnR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlICcxZic6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsLnVuaWZvcm0xZih1LCB0aGlzLl91bmlmb3Jtc1tjXS52YWx1ZXNbMF0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnMmYnOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBnbC51bmlmb3JtMmYodSwgdGhpcy5fdW5pZm9ybXNbY10udmFsdWVzWzBdLCB0aGlzLl91bmlmb3Jtc1tjXS52YWx1ZXNbMV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnM2YnOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBnbC51bmlmb3JtM2YodSwgdGhpcy5fdW5pZm9ybXNbY10udmFsdWVzWzBdLCB0aGlzLl91bmlmb3Jtc1tjXS52YWx1ZXNbMV0sIHRoaXMuX3VuaWZvcm1zW2NdLnZhbHVlc1syXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBjYXNlICc0Zic6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsLnVuaWZvcm00Zih1LCB0aGlzLl91bmlmb3Jtc1tjXS52YWx1ZXNbMF0sIHRoaXMuX3VuaWZvcm1zW2NdLnZhbHVlc1sxXSwgdGhpcy5fdW5pZm9ybXNbY10udmFsdWVzWzJdLCB0aGlzLl91bmlmb3Jtc1tjXS52YWx1ZXNbM10pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnMWknOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBnbC51bmlmb3JtMWkodSwgdGhpcy5fdW5pZm9ybXNbY10udmFsdWVzWzBdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJzJpJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2wudW5pZm9ybTJpKHUsIHRoaXMuX3VuaWZvcm1zW2NdLnZhbHVlc1swXSwgdGhpcy5fdW5pZm9ybXNbY10udmFsdWVzWzFdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJzNpJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2wudW5pZm9ybTNpKHUsIHRoaXMuXy51bmlmb3Jtc1tjXS52YWx1ZXNbMF0sIHRoaXMuX3VuaWZvcm1zW2NdLnZhbHVlc1sxXSwgdGhpcy5fdW5pZm9ybXNbY10udmFsdWVzWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJzRpJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2wudW5pZm9ybWlmKHUsIHRoaXMuX3VuaWZvcm1zW2NdLnZhbHVlc1swXSwgdGhpcy5fdW5pZm9ybXNbY10udmFsdWVzWzFdLCB0aGlzLl91bmlmb3Jtc1tjXS52YWx1ZXNbMl0sIHRoaXMuX3VuaWZvcm1zW2NdLnZhbHVlc1szXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59Il19
