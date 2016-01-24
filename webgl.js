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

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
    value: true
});

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

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
    value: true
});

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmNcXHdlYmdsLmVzNiIsInNyY1xcd2ViZ2xcXGNvbnN0YW50cy5lczYiLCJzcmNcXHdlYmdsXFxmaWx0ZXJzLmVzNiIsInNyY1xcd2ViZ2xcXHNoYWRlcnMuZXM2Iiwic3JjXFx3ZWJnbFxcdGV4dHVyZXMuZXM2Iiwic3JjXFx3ZWJnbFxcdW5pZm9ybXMuZXM2Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDTUEsUUFBUSxLQUFSLEdBQWdCO0FBQ1osV0FBTztBQUNILGtDQURHO0FBRUgsb0NBRkc7QUFHSCxvQ0FIRztBQUlILGtDQUpHO0FBS0gsc0NBTEc7S0FBUDtDQURKOzs7Ozs7OztrQkNOZTtBQUNYLGNBQVU7QUFDTixtQkFBVyxJQUFYO0FBQ0EsbUJBQVcsSUFBWDtBQUNBLG1CQUFXLElBQVg7QUFDQSxtQkFBVyxJQUFYOztBQUVBLG1CQUFXLElBQVg7QUFDQSxtQkFBVyxJQUFYO0FBQ0EsbUJBQVcsSUFBWDtBQUNBLG1CQUFXLElBQVg7S0FUSjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7a0JDS1c7Ozs7Ozs7O0FBT1gsOERBQXdCLGNBQWMsZ0JBQWdCO0FBQ2xELGVBQU8sRUFBRSxjQUFjLFlBQWQsRUFBNEIsZ0JBQWdCLGNBQWhCLEVBQXJDLENBRGtEO0tBUDNDOzs7Ozs7O0FBZ0JYLHdEQUFxQixNQUFNLFdBQVc7QUFDbEMsWUFBSSxDQUFDLFNBQUQsRUFBWTtBQUNaLDBDQURZO1NBQWhCO0FBR0EsWUFBSSxDQUFDLFVBQVUsSUFBVixDQUFELEVBQWtCO0FBQ2xCLG9CQUFRLEdBQVIsQ0FBWSxTQUFaLEVBQXVCLElBQXZCLEVBQTZCLGVBQTdCLEVBQThDLFNBQTlDLEVBQXlELHFDQUF6RCxFQURrQjtBQUVsQiwwQ0FGa0I7QUFHbEIsbUJBQU8sYUFBUCxDQUhrQjtTQUF0QjtBQUtBLFlBQUksTUFBTSxVQUFVLElBQVYsRUFBZ0IsTUFBaEIsQ0FUd0I7QUFVbEMsWUFBSSxNQUFNLFVBQVUsSUFBVixFQUFnQixRQUFoQixDQVZ3QjtBQVdsQyxlQUFPLEtBQUssdUJBQUwsQ0FBNkIsR0FBN0IsRUFBa0MsR0FBbEMsQ0FBUCxDQVhrQztLQWhCM0I7Ozs7OztBQWtDWCxvREFBbUIsUUFBUTtBQUN2QixZQUFJLFFBQVEsRUFBUixDQURtQjs7QUFHdkIsY0FBTSxFQUFOLEdBQVcsT0FBTyxFQUFQLENBSFk7QUFJdkIsY0FBTSxLQUFOLEdBQWMsTUFBTSxFQUFOLENBQVMsTUFBVCxDQUFnQixLQUFoQixDQUpTO0FBS3ZCLGNBQU0sTUFBTixHQUFlLE1BQU0sRUFBTixDQUFTLE1BQVQsQ0FBZ0IsTUFBaEIsQ0FMUTs7QUFPdkIsWUFBSSxPQUFPLEtBQVAsRUFBYztBQUFFLGtCQUFNLEtBQU4sR0FBYyxPQUFPLEtBQVAsQ0FBaEI7U0FBbEI7QUFDQSxZQUFJLE9BQU8sTUFBUCxFQUFlO0FBQUUsa0JBQU0sTUFBTixHQUFlLE9BQU8sTUFBUCxDQUFqQjtTQUFuQjs7QUFFQSxjQUFNLE1BQU4sR0FBZSxPQUFPLE1BQVAsQ0FWUTtBQVd2QixjQUFNLFFBQU4sR0FBaUIsdUJBQWEsTUFBTSxLQUFOLEVBQVksTUFBTSxNQUFOLENBQTFDLENBWHVCOztBQWF2QixjQUFNLGNBQU4sR0FBdUIsU0FBUyxhQUFULENBQXVCLFFBQXZCLENBQXZCLENBYnVCO0FBY3ZCLGNBQU0sY0FBTixDQUFxQixLQUFyQixHQUE2QixNQUFNLEtBQU4sQ0FkTjtBQWV2QixjQUFNLGNBQU4sQ0FBcUIsTUFBckIsR0FBOEIsTUFBTSxNQUFOLENBZlA7QUFnQnZCLGNBQU0scUJBQU4sR0FBOEIsTUFBTSxjQUFOLENBQXFCLFVBQXJCLENBQWdDLElBQWhDLENBQTlCLENBaEJ1Qjs7QUFrQnZCLGNBQU0sUUFBTixHQUFpQix3QkFBakIsQ0FsQnVCO0FBbUJ2QixjQUFNLFFBQU4sR0FBaUIsdUJBQWEsTUFBTSxFQUFOLEVBQVUsTUFBTSxLQUFOLEVBQWEsTUFBTSxNQUFOLENBQXJELENBbkJ1Qjs7QUFxQnZCLFlBQUksT0FBTyxRQUFQLEVBQWlCO0FBQ2pCLGlCQUFLLElBQUksSUFBSSxDQUFKLEVBQU8sSUFBSSxPQUFPLFFBQVAsQ0FBZ0IsTUFBaEIsRUFBd0IsR0FBNUMsRUFBaUQ7QUFDN0Msc0JBQU0sUUFBTixDQUFlLEdBQWYsQ0FBbUIsT0FBTyxRQUFQLENBQWdCLENBQWhCLEVBQW1CLElBQW5CLEVBQXlCLE9BQU8sUUFBUCxDQUFnQixDQUFoQixFQUFtQixPQUFuQixFQUE0QixPQUFPLFFBQVAsQ0FBZ0IsQ0FBaEIsRUFBbUIsS0FBbkIsRUFBMEIsT0FBTyxRQUFQLENBQWdCLENBQWhCLEVBQW1CLFVBQW5CLENBQWxHLENBRDZDO2FBQWpEO1NBREo7O0FBTUEsWUFBSSxPQUFPLFFBQVAsRUFBaUI7QUFDakIsaUJBQUssSUFBSSxJQUFJLENBQUosRUFBTyxJQUFJLE9BQU8sUUFBUCxDQUFnQixNQUFoQixFQUF3QixHQUE1QyxFQUFpRDtBQUM3QyxzQkFBTSxRQUFOLENBQWUsR0FBZixDQUFtQixPQUFPLFFBQVAsQ0FBZ0IsQ0FBaEIsRUFBbUIsSUFBbkIsRUFBeUIsT0FBTyxRQUFQLENBQWdCLENBQWhCLEVBQW1CLElBQW5CLEVBQXlCLE9BQU8sUUFBUCxDQUFnQixDQUFoQixFQUFtQixNQUFuQixDQUFyRSxDQUQ2QzthQUFqRDtTQURKOztBQU1BLFlBQUksT0FBTyxVQUFQLEVBQW1CO0FBQ25CLG1CQUFPLEtBQUssTUFBTCxDQUFZLEtBQVosQ0FBUCxDQURtQjtTQUF2Qjs7QUFJQSxlQUFPLEtBQVAsQ0FyQ3VCO0tBbENoQjs7Ozs7Ozs7QUFnRlgsNEJBQU8sU0FBUztBQUNaLFlBQUksQ0FBQyxRQUFRLGFBQVIsRUFBdUI7QUFDeEIsZ0JBQUksZUFBZSxRQUFRLEVBQVIsQ0FBVyxZQUFYLENBQXdCLFFBQVEsRUFBUixDQUFXLGFBQVgsQ0FBdkMsQ0FEb0I7QUFFeEIsb0JBQVEsRUFBUixDQUFXLFlBQVgsQ0FBd0IsWUFBeEIsRUFBc0MsUUFBUSxNQUFSLENBQWUsWUFBZixDQUF0QyxDQUZ3QjtBQUd4QixvQkFBUSxFQUFSLENBQVcsYUFBWCxDQUF5QixZQUF6QixFQUh3Qjs7QUFLeEIsZ0JBQUksaUJBQWlCLFFBQVEsRUFBUixDQUFXLFlBQVgsQ0FBd0IsUUFBUSxFQUFSLENBQVcsZUFBWCxDQUF6QyxDQUxvQjtBQU14QixvQkFBUSxFQUFSLENBQVcsWUFBWCxDQUF3QixjQUF4QixFQUF3QyxRQUFRLE1BQVIsQ0FBZSxjQUFmLENBQXhDLENBTndCO0FBT3hCLG9CQUFRLEVBQVIsQ0FBVyxhQUFYLENBQXlCLGNBQXpCLEVBUHdCOztBQVN4QixvQkFBUSxPQUFSLEdBQWtCLFFBQVEsRUFBUixDQUFXLGFBQVgsRUFBbEIsQ0FUd0I7QUFVeEIsb0JBQVEsRUFBUixDQUFXLFlBQVgsQ0FBd0IsUUFBUSxPQUFSLEVBQWlCLFlBQXpDLEVBVndCO0FBV3hCLG9CQUFRLEVBQVIsQ0FBVyxZQUFYLENBQXdCLFFBQVEsT0FBUixFQUFpQixjQUF6QyxFQVh3QjtBQVl4QixvQkFBUSxFQUFSLENBQVcsV0FBWCxDQUF1QixRQUFRLE9BQVIsQ0FBdkIsQ0Fad0I7QUFheEIsb0JBQVEsRUFBUixDQUFXLFVBQVgsQ0FBc0IsUUFBUSxPQUFSLENBQXRCLENBYndCOztBQWV4QixnQkFBSSxtQkFBbUIsUUFBUSxFQUFSLENBQVcsaUJBQVgsQ0FBNkIsUUFBUSxPQUFSLEVBQWlCLFlBQTlDLENBQW5CLENBZm9CO0FBZ0J4QixnQkFBSSxpQkFBaUIsUUFBUSxFQUFSLENBQVcsWUFBWCxFQUFqQixDQWhCb0I7QUFpQnhCLGdCQUFJLGtCQUFrQixRQUFRLEVBQVIsQ0FBVyxZQUFYLEVBQWxCLENBakJvQjtBQWtCeEIsZ0JBQUksWUFBWSxJQUFJLFlBQUosQ0FBaUIsQ0FBQyxHQUFELEVBQU8sR0FBUCxFQUFZLEdBQVosRUFBa0IsR0FBbEIsRUFBdUIsR0FBdkIsRUFBNkIsR0FBN0IsRUFBa0MsR0FBbEMsRUFBd0MsR0FBeEMsRUFBNkMsR0FBN0MsRUFBbUQsR0FBbkQsRUFBd0QsR0FBeEQsRUFBOEQsR0FBOUQsQ0FBakIsQ0FBWixDQWxCb0I7QUFtQnhCLGdCQUFJLGFBQWEsSUFBSSxZQUFKLENBQWlCLENBQUMsQ0FBRCxFQUFJLENBQUosRUFBTyxRQUFRLFFBQVIsQ0FBaUIsS0FBakIsRUFBd0IsQ0FBL0IsRUFBa0MsQ0FBbEMsRUFBcUMsUUFBUSxRQUFSLENBQWlCLE1BQWpCLEVBQXlCLENBQTlELEVBQzlCLFFBQVEsUUFBUixDQUFpQixNQUFqQixFQUF5QixRQUFRLFFBQVIsQ0FBaUIsS0FBakIsRUFBd0IsQ0FEbkIsRUFDc0IsUUFBUSxRQUFSLENBQWlCLEtBQWpCLEVBQXdCLFFBQVEsUUFBUixDQUFpQixNQUFqQixDQUQvRCxDQUFiLENBbkJvQjs7QUFzQnhCLG9CQUFRLEVBQVIsQ0FBVyxVQUFYLENBQXNCLFFBQVEsRUFBUixDQUFXLFlBQVgsRUFBeUIsY0FBL0MsRUF0QndCO0FBdUJ4QixvQkFBUSxFQUFSLENBQVcsVUFBWCxDQUFzQixRQUFRLEVBQVIsQ0FBVyxZQUFYLEVBQXlCLFNBQS9DLEVBQTBELFFBQVEsRUFBUixDQUFXLFdBQVgsQ0FBMUQsQ0F2QndCOztBQXlCeEIsZ0JBQUksbUJBQW1CLFFBQVEsRUFBUixDQUFXLGlCQUFYLENBQTZCLFFBQVEsT0FBUixFQUFpQixZQUE5QyxDQUFuQixDQXpCb0I7QUEwQnhCLG9CQUFRLEVBQVIsQ0FBVyx1QkFBWCxDQUFtQyxnQkFBbkMsRUExQndCO0FBMkJ4QixvQkFBUSxFQUFSLENBQVcsbUJBQVgsQ0FBK0IsZ0JBQS9CLEVBQWlELENBQWpELEVBQW9ELFFBQVEsRUFBUixDQUFXLEtBQVgsRUFBa0IsS0FBdEUsRUFBNkUsQ0FBN0UsRUFBZ0YsQ0FBaEYsRUEzQndCOztBQTZCeEIsb0JBQVEsUUFBUixDQUFpQixHQUFqQixDQUFxQixjQUFyQixFQUFxQyxvQkFBVSxRQUFWLENBQW1CLFNBQW5CLEVBQThCLENBQUMsUUFBUSxFQUFSLENBQVcsTUFBWCxDQUFrQixLQUFsQixFQUF5QixRQUFRLEVBQVIsQ0FBVyxNQUFYLENBQWtCLE1BQWxCLENBQTdGLEVBN0J3QjtBQThCeEIsb0JBQVEsUUFBUixDQUFpQixHQUFqQixDQUFxQixjQUFyQixFQUFxQyxvQkFBVSxRQUFWLENBQW1CLFNBQW5CLEVBQThCLENBQUMsUUFBUSxFQUFSLENBQVcsTUFBWCxDQUFrQixLQUFsQixFQUF5QixRQUFRLEVBQVIsQ0FBVyxNQUFYLENBQWtCLE1BQWxCLENBQTdGLEVBOUJ3Qjs7QUFnQ3hCLG9CQUFRLEVBQVIsQ0FBVyxVQUFYLENBQXNCLFFBQVEsRUFBUixDQUFXLFlBQVgsRUFBeUIsZUFBL0MsRUFoQ3dCO0FBaUN4QixvQkFBUSxFQUFSLENBQVcsdUJBQVgsQ0FBbUMsZ0JBQW5DLEVBakN3QjtBQWtDeEIsb0JBQVEsRUFBUixDQUFXLG1CQUFYLENBQStCLGdCQUEvQixFQUFpRCxDQUFqRCxFQUFvRCxRQUFRLEVBQVIsQ0FBVyxLQUFYLEVBQWtCLEtBQXRFLEVBQTZFLENBQTdFLEVBQWdGLENBQWhGLEVBbEN3QjtBQW1DeEIsb0JBQVEsRUFBUixDQUFXLFVBQVgsQ0FBc0IsUUFBUSxFQUFSLENBQVcsWUFBWCxFQUF5QixVQUEvQyxFQUEyRCxRQUFRLEVBQVIsQ0FBVyxXQUFYLENBQTNELENBbkN3QjtTQUE1Qjs7QUFzQ0EsZ0JBQVEsUUFBUixDQUFpQixxQkFBakIsQ0FBdUMsUUFBUSxPQUFSLENBQXZDLENBdkNZO0FBd0NaLGdCQUFRLFFBQVIsQ0FBaUIsWUFBakIsR0F4Q1k7QUF5Q1osZ0JBQVEsUUFBUixDQUFpQixhQUFqQixDQUErQixRQUFRLEVBQVIsRUFBWSxRQUFRLE9BQVIsQ0FBM0MsQ0F6Q1k7O0FBMkNaLGdCQUFRLEVBQVIsQ0FBVyxVQUFYLENBQXNCLFFBQVEsRUFBUixDQUFXLFNBQVgsRUFBc0IsQ0FBNUMsRUFBK0MsQ0FBL0MsRUEzQ1k7QUE0Q1osZ0JBQVEsYUFBUixHQUF3QixJQUF4QixDQTVDWTs7QUE4Q1osZUFBTyxPQUFQLENBOUNZO0tBaEZMOzs7Ozs7QUFxSVgsOENBQWdCLFNBQVM7QUFDckIsWUFBSSxRQUFRLFFBQVEsRUFBUixDQURTO0FBRXJCLFlBQUksQ0FBQyxRQUFRLFVBQVIsRUFBb0I7QUFDckIsb0JBQVEsVUFBUixHQUFxQixJQUFJLFVBQUosQ0FBZSxNQUFNLE1BQU4sQ0FBYSxLQUFiLEdBQXFCLE1BQU0sTUFBTixDQUFhLE1BQWIsR0FBc0IsQ0FBM0MsQ0FBcEMsQ0FEcUI7U0FBekI7QUFHQSxjQUFNLFVBQU4sQ0FBaUIsQ0FBakIsRUFBb0IsQ0FBcEIsRUFBdUIsTUFBTSxNQUFOLENBQWEsS0FBYixFQUFvQixNQUFNLE1BQU4sQ0FBYSxNQUFiLEVBQXFCLE1BQU0sSUFBTixFQUFZLE1BQU0sYUFBTixFQUFxQixRQUFRLFVBQVIsQ0FBakcsQ0FMcUI7QUFNckIsWUFBSSxVQUFVLFFBQVEscUJBQVIsQ0FBOEIsZUFBOUIsQ0FBOEMsTUFBTSxNQUFOLENBQWEsS0FBYixFQUFvQixNQUFNLE1BQU4sQ0FBYSxNQUFiLENBQTVFLENBTmlCO0FBT3JCLGdCQUFRLElBQVIsQ0FBYSxHQUFiLENBQWlCLElBQUksaUJBQUosQ0FBc0IsUUFBUSxVQUFSLENBQXZDLEVBUHFCO0FBUXJCLGVBQU8sT0FBUCxDQVJxQjtLQXJJZDs7Ozs7Ozs7O2tCQ05BO0FBQ2IsNkJBQTJCO0FBQ3pCLGdCQUFZLCtwRUFBWjtBQUNBLGNBQVUsNFVBQVY7R0FGRjtBQUlBLGVBQWE7QUFDWCxnQkFBWSw0T0FBWjtBQUNBLGNBQVUsNFVBQVY7R0FGRjtBQUlBLGlCQUFlO0FBQ2IsZ0JBQVksb0pBQVo7QUFDQSxjQUFVLDRVQUFWO0dBRkY7QUFJQSxXQUFTO0FBQ1AsZ0JBQVksb2FBQVo7QUFDQSxjQUFVLDRVQUFWO0dBRkY7QUFJQSwwQkFBd0I7QUFDdEIsZ0JBQVksMDlDQUFaO0FBQ0EsY0FBVSw0VUFBVjtHQUZGOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDVkUsb0JBQVksRUFBWixFQUFnQixLQUFoQixFQUF1QixNQUF2QixFQUErQjs7OztBQUUzQixhQUFLLFNBQUwsR0FBaUIsRUFBakI7OztBQUYyQixZQUszQixDQUFLLEtBQUwsR0FBYSxLQUFiOzs7QUFMMkIsWUFRM0IsQ0FBSyxNQUFMLEdBQWMsTUFBZDs7O0FBUjJCLFlBVzNCLENBQUssRUFBTCxHQUFVLEVBQVY7OztBQVgyQixZQWMzQixDQUFLLFlBQUwsR0FBb0IsRUFBcEI7OztBQWQyQixZQWlCM0IsQ0FBSyxNQUFMLEdBQWMsRUFBZDs7O0FBakIyQixZQW9CM0IsQ0FBSyxjQUFMLEdBQXNCLEVBQXRCLENBcEIyQjtLQUEvQjs7Ozs7Ozs7Ozs7OzRCQThCSSxNQUFNLFNBQVMsU0FBUyxZQUFZO0FBQ3BDLGdCQUFJLENBQUMsT0FBRCxFQUFVO0FBQ1YsMEJBQVUsQ0FBVixDQURVO0FBRVYsdUJBQU8sS0FBSyxjQUFMLENBQW9CLE9BQXBCLENBQTRCLE9BQTVCLE1BQXlDLENBQUMsQ0FBRCxFQUFJO0FBQ2hELDhCQURnRDtpQkFBcEQ7YUFGSjs7QUFPQSxnQkFBSSxDQUFDLFVBQUQsRUFBYTtBQUNiLDZCQUFhLEVBQWIsQ0FEYTthQUFqQjtBQUdBLGlCQUFLLGNBQUwsQ0FBb0IsSUFBcEIsQ0FBeUIsT0FBekIsRUFYb0M7O0FBYXBDLGlCQUFLLFNBQUwsQ0FBZSxJQUFmLElBQXVCO0FBQ25CLHNCQUFNLElBQU47QUFDQSx5QkFBUyxPQUFUO0FBQ0EseUJBQVMsT0FBVDtBQUNBLDJCQUFXLEtBQUssRUFBTCxDQUFRLGFBQVIsRUFBWDtBQUNBLDZCQUFhLEtBQWI7QUFDQSw0QkFBWSxVQUFaO0FBQ0EsdUJBQU8sSUFBUCxFQVBKLENBYm9DOztBQXNCcEMsaUJBQUssWUFBTCxDQUFrQixJQUFsQixDQUF1QixLQUFLLFNBQUwsQ0FBZSxJQUFmLENBQXZCLEVBdEJvQzs7Ozs7Ozs7OzsrQkE4QmpDLE1BQU0sU0FBUztBQUNsQixnQkFBSSxPQUFKLEVBQWE7QUFDVCxxQkFBSyxTQUFMLENBQWUsSUFBZixFQUFxQixPQUFyQixHQUErQixPQUEvQixDQURTO2FBQWI7QUFHQSxpQkFBSyxTQUFMLENBQWUsSUFBZixFQUFxQixLQUFyQixHQUE2QixJQUE3QixDQUprQjtBQUtsQixpQkFBSyxNQUFMLENBQVksSUFBWixDQUFpQixLQUFLLFNBQUwsQ0FBZSxJQUFmLENBQWpCLEVBTGtCOzs7Ozs7Ozt1Q0FXUDtBQUNYLGlCQUFLLElBQUksSUFBSSxDQUFKLEVBQU8sSUFBSSxLQUFLLE1BQUwsQ0FBWSxNQUFaLEVBQW9CLEdBQXhDLEVBQTZDO0FBQ3pDLHFCQUFLLEVBQUwsQ0FBUSxhQUFSLENBQXNCLEtBQUssRUFBTCxDQUFRLFlBQVksS0FBSyxNQUFMLENBQVksQ0FBWixFQUFlLE9BQWYsQ0FBMUMsRUFEeUM7QUFFekMscUJBQUssRUFBTCxDQUFRLFdBQVIsQ0FBb0IsS0FBSyxFQUFMLENBQVEsVUFBUixFQUFvQixLQUFLLE1BQUwsQ0FBWSxDQUFaLEVBQWUsU0FBZixDQUF4QyxDQUZ5QztBQUd6QyxxQkFBSyxFQUFMLENBQVEsYUFBUixDQUFzQixLQUFLLEVBQUwsQ0FBUSxVQUFSLEVBQW9CLENBQTFDLEVBQTZDLENBQTdDLEVBQWdELENBQWhELEVBQW1ELEtBQUssRUFBTCxDQUFRLElBQVIsRUFBYyxLQUFLLEVBQUwsQ0FBUSxhQUFSLEVBQXVCLEtBQUssTUFBTCxDQUFZLENBQVosRUFBZSxPQUFmLENBQXhGLENBSHlDO2FBQTdDO0FBS0EsaUJBQUssTUFBTCxHQUFjLEVBQWQsQ0FOVzs7Ozs7Ozs7OzhDQWFPLFNBQVM7QUFDM0IsZ0JBQUksS0FBSyxZQUFMLENBQWtCLE1BQWxCLEtBQTZCLENBQTdCLEVBQWdDO0FBQUUsdUJBQUY7YUFBcEM7QUFDQSxnQkFBSSxLQUFLLEtBQUssRUFBTCxDQUZrQjtBQUczQixpQkFBSyxJQUFJLElBQUksQ0FBSixFQUFPLElBQUksS0FBSyxZQUFMLENBQWtCLE1BQWxCLEVBQTBCLEdBQTlDLEVBQW1EO0FBQy9DLHFCQUFLLFlBQUwsQ0FBa0IsQ0FBbEIsRUFBcUIsUUFBckIsR0FBZ0MsR0FBRyxrQkFBSCxDQUFzQixPQUF0QixFQUErQixZQUFZLEtBQUssWUFBTCxDQUFrQixDQUFsQixFQUFxQixPQUFyQixDQUEzRSxDQUQrQztBQUUvQyxtQkFBRyxTQUFILENBQWEsS0FBSyxZQUFMLENBQWtCLENBQWxCLEVBQXFCLFFBQXJCLEVBQStCLEtBQUssWUFBTCxDQUFrQixDQUFsQixFQUFxQixPQUFyQixDQUE1QyxDQUYrQztBQUcvQyxtQkFBRyxhQUFILENBQWlCLEdBQUcsWUFBWSxLQUFLLFlBQUwsQ0FBa0IsQ0FBbEIsRUFBcUIsT0FBckIsQ0FBaEMsRUFIK0M7QUFJL0MsbUJBQUcsV0FBSCxDQUFlLEdBQUcsVUFBSCxFQUFlLEtBQUssWUFBTCxDQUFrQixDQUFsQixFQUFxQixTQUFyQixDQUE5QixDQUorQztBQUsvQyxtQkFBRyxhQUFILENBQWlCLEdBQUcsVUFBSCxFQUFlLEdBQUcsY0FBSCxFQUFtQixHQUFHLGFBQUgsQ0FBbkQsQ0FMK0M7QUFNL0MsbUJBQUcsYUFBSCxDQUFpQixHQUFHLFVBQUgsRUFBZSxHQUFHLGNBQUgsRUFBbUIsR0FBRyxhQUFILENBQW5ELENBTitDO0FBTy9DLG1CQUFHLGFBQUgsQ0FBaUIsR0FBRyxVQUFILEVBQWUsR0FBRyxrQkFBSCxFQUF1QixHQUFHLE9BQUgsQ0FBdkQsQ0FQK0M7QUFRL0MsbUJBQUcsYUFBSCxDQUFpQixHQUFHLFVBQUgsRUFBZSxHQUFHLGtCQUFILEVBQXVCLEdBQUcsT0FBSCxDQUF2RCxDQVIrQzs7QUFVL0MscUJBQUssSUFBSSxJQUFJLENBQUosRUFBTyxJQUFJLEtBQUssWUFBTCxDQUFrQixDQUFsQixFQUFxQixVQUFyQixDQUFnQyxNQUFoQyxFQUF3QyxHQUE1RCxFQUFpRTtBQUM3RCx1QkFBRyxXQUFILENBQWUsR0FBRyxLQUFLLFlBQUwsQ0FBa0IsQ0FBbEIsRUFBcUIsVUFBckIsQ0FBZ0MsQ0FBaEMsRUFBbUMsUUFBbkMsQ0FBbEIsRUFBZ0UsS0FBSyxZQUFMLENBQWtCLENBQWxCLEVBQXFCLFVBQXJCLENBQWdDLENBQWhDLEVBQW1DLEtBQW5DLENBQWhFLENBRDZEO2lCQUFqRTs7QUFJQSxtQkFBRyxVQUFILENBQWMsR0FBRyxVQUFILEVBQWUsQ0FBN0IsRUFBZ0MsR0FBRyxJQUFILEVBQVMsR0FBRyxJQUFILEVBQVMsR0FBRyxhQUFILEVBQWtCLEtBQUssWUFBTCxDQUFrQixDQUFsQixFQUFxQixPQUFyQixDQUFwRSxDQWQrQzs7QUFnQi9DLHFCQUFLLFlBQUwsQ0FBa0IsQ0FBbEIsRUFBcUIsV0FBckIsR0FBbUMsSUFBbkMsQ0FoQitDO0FBaUIvQyxxQkFBSyxZQUFMLENBQWtCLENBQWxCLEVBQXFCLEtBQXJCLEdBQTZCLEtBQTdCLENBakIrQzthQUFuRDtBQW1CQSxpQkFBSyxZQUFMLEdBQW9CLEVBQXBCLENBdEIyQjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ3ZGL0Isc0JBQWM7Ozs7Ozs7O0FBTVYsYUFBSyxTQUFMLEdBQWlCLEVBQWpCLENBTlU7S0FBZDs7Ozs7Ozs7OzRCQWFJLE1BQU0sTUFBTSxRQUFRO0FBQ3BCLGlCQUFLLFNBQUwsQ0FBZSxJQUFmLElBQXVCLEVBQUUsTUFBTSxJQUFOLEVBQVksTUFBTSxJQUFOLEVBQVksUUFBUSxNQUFSLEVBQWdCLE9BQU8sSUFBUCxFQUFqRSxDQURvQjs7Ozs7Ozs7OytCQVFqQixNQUFNLFFBQVE7QUFDakIsaUJBQUssU0FBTCxDQUFlLElBQWYsRUFBcUIsTUFBckIsR0FBOEIsTUFBOUIsQ0FEaUI7QUFFakIsaUJBQUssU0FBTCxDQUFlLElBQWYsRUFBcUIsS0FBckIsR0FBNkIsSUFBN0IsQ0FGaUI7Ozs7Ozs7Ozs7c0NBV1AsSUFBSSxTQUFTO0FBQ3ZCLGlCQUFLLElBQUksQ0FBSixJQUFTLEtBQUssU0FBTCxFQUFnQjtBQUMxQixvQkFBSSxLQUFLLFNBQUwsQ0FBZSxDQUFmLEVBQWtCLEtBQWxCLEVBQXlCO0FBQ3pCLHdCQUFJLElBQUksR0FBRyxrQkFBSCxDQUFzQixPQUF0QixFQUErQixLQUFLLFNBQUwsQ0FBZSxDQUFmLEVBQWtCLElBQWxCLENBQW5DLENBRHFCO0FBRXpCLDRCQUFRLEtBQUssU0FBTCxDQUFlLENBQWYsRUFBa0IsSUFBbEI7QUFDSiw2QkFBSyxJQUFMO0FBQ0ksK0JBQUcsU0FBSCxDQUFhLENBQWIsRUFBZ0IsS0FBSyxTQUFMLENBQWUsQ0FBZixFQUFrQixNQUFsQixDQUF5QixDQUF6QixDQUFoQixFQURKO0FBRUksa0NBRko7O0FBREosNkJBS1MsSUFBTDtBQUNJLCtCQUFHLFNBQUgsQ0FBYSxDQUFiLEVBQWdCLEtBQUssU0FBTCxDQUFlLENBQWYsRUFBa0IsTUFBbEIsQ0FBeUIsQ0FBekIsQ0FBaEIsRUFBNkMsS0FBSyxTQUFMLENBQWUsQ0FBZixFQUFrQixNQUFsQixDQUF5QixDQUF6QixDQUE3QyxFQURKO0FBRUksa0NBRko7O0FBTEosNkJBU1MsSUFBTDtBQUNJLCtCQUFHLFNBQUgsQ0FBYSxDQUFiLEVBQWdCLEtBQUssU0FBTCxDQUFlLENBQWYsRUFBa0IsTUFBbEIsQ0FBeUIsQ0FBekIsQ0FBaEIsRUFBNkMsS0FBSyxTQUFMLENBQWUsQ0FBZixFQUFrQixNQUFsQixDQUF5QixDQUF6QixDQUE3QyxFQUEwRSxLQUFLLFNBQUwsQ0FBZSxDQUFmLEVBQWtCLE1BQWxCLENBQXlCLENBQXpCLENBQTFFLEVBREo7QUFFSSxrQ0FGSjs7QUFUSiw2QkFhUyxJQUFMO0FBQ0ksK0JBQUcsU0FBSCxDQUFhLENBQWIsRUFBZ0IsS0FBSyxTQUFMLENBQWUsQ0FBZixFQUFrQixNQUFsQixDQUF5QixDQUF6QixDQUFoQixFQUE2QyxLQUFLLFNBQUwsQ0FBZSxDQUFmLEVBQWtCLE1BQWxCLENBQXlCLENBQXpCLENBQTdDLEVBQTBFLEtBQUssU0FBTCxDQUFlLENBQWYsRUFBa0IsTUFBbEIsQ0FBeUIsQ0FBekIsQ0FBMUUsRUFBdUcsS0FBSyxTQUFMLENBQWUsQ0FBZixFQUFrQixNQUFsQixDQUF5QixDQUF6QixDQUF2RyxFQURKO0FBRUksa0NBRko7O0FBYkosNkJBaUJTLElBQUw7QUFDSSwrQkFBRyxTQUFILENBQWEsQ0FBYixFQUFnQixLQUFLLFNBQUwsQ0FBZSxDQUFmLEVBQWtCLE1BQWxCLENBQXlCLENBQXpCLENBQWhCLEVBREo7QUFFSSxrQ0FGSjs7QUFqQkosNkJBcUJTLElBQUw7QUFDSSwrQkFBRyxTQUFILENBQWEsQ0FBYixFQUFnQixLQUFLLFNBQUwsQ0FBZSxDQUFmLEVBQWtCLE1BQWxCLENBQXlCLENBQXpCLENBQWhCLEVBQTZDLEtBQUssU0FBTCxDQUFlLENBQWYsRUFBa0IsTUFBbEIsQ0FBeUIsQ0FBekIsQ0FBN0MsRUFESjtBQUVJLGtDQUZKOztBQXJCSiw2QkF5QlMsSUFBTDtBQUNJLCtCQUFHLFNBQUgsQ0FBYSxDQUFiLEVBQWdCLEtBQUssQ0FBTCxDQUFPLFFBQVAsQ0FBZ0IsQ0FBaEIsRUFBbUIsTUFBbkIsQ0FBMEIsQ0FBMUIsQ0FBaEIsRUFBOEMsS0FBSyxTQUFMLENBQWUsQ0FBZixFQUFrQixNQUFsQixDQUF5QixDQUF6QixDQUE5QyxFQUEyRSxLQUFLLFNBQUwsQ0FBZSxDQUFmLEVBQWtCLE1BQWxCLENBQXlCLENBQXpCLENBQTNFLEVBREo7QUFFSSxrQ0FGSjs7QUF6QkosNkJBNkJTLElBQUw7QUFDSSwrQkFBRyxTQUFILENBQWEsQ0FBYixFQUFnQixLQUFLLFNBQUwsQ0FBZSxDQUFmLEVBQWtCLE1BQWxCLENBQXlCLENBQXpCLENBQWhCLEVBQTZDLEtBQUssU0FBTCxDQUFlLENBQWYsRUFBa0IsTUFBbEIsQ0FBeUIsQ0FBekIsQ0FBN0MsRUFBMEUsS0FBSyxTQUFMLENBQWUsQ0FBZixFQUFrQixNQUFsQixDQUF5QixDQUF6QixDQUExRSxFQUF1RyxLQUFLLFNBQUwsQ0FBZSxDQUFmLEVBQWtCLE1BQWxCLENBQXlCLENBQXpCLENBQXZHLEVBREo7QUFFSSxrQ0FGSjtBQTdCSixxQkFGeUI7aUJBQTdCO2FBREoiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiaW1wb3J0IEZpbHRlcnMgZnJvbSAnLi93ZWJnbC9maWx0ZXJzLmVzNic7XHJcbmltcG9ydCBTaGFkZXJzIGZyb20gJy4vd2ViZ2wvc2hhZGVycy5lczYnO1xyXG5pbXBvcnQgVGV4dHVyZXMgZnJvbSAnLi93ZWJnbC90ZXh0dXJlcy5lczYnO1xyXG5pbXBvcnQgVW5pZm9ybXMgZnJvbSAnLi93ZWJnbC91bmlmb3Jtcy5lczYnO1xyXG5pbXBvcnQgQ29uc3RhbnRzIGZyb20gJy4vd2ViZ2wvY29uc3RhbnRzLmVzNic7XHJcblxyXG5leHBvcnRzLmltYWdlID0ge1xyXG4gICAgd2ViZ2w6IHtcclxuICAgICAgICBzaGFkZXJzOiBTaGFkZXJzLFxyXG4gICAgICAgIHRleHR1cmVzOiBUZXh0dXJlcyxcclxuICAgICAgICB1bmlmb3JtczogVW5pZm9ybXMsXHJcbiAgICAgICAgZmlsdGVyczogRmlsdGVycyxcclxuICAgICAgICBjb25zdGFudHM6IENvbnN0YW50c1xyXG4gICAgfVxyXG59OyIsImV4cG9ydCBkZWZhdWx0IHtcclxuICAgIHVuaWZvcm1zOiB7XHJcbiAgICAgICAgVU5JRk9STTFmOiAnMWYnLFxyXG4gICAgICAgIFVOSUZPUk0yZjogJzJmJyxcclxuICAgICAgICBVTklGT1JNM2Y6ICczZicsXHJcbiAgICAgICAgVU5JRk9STTRmOiAnNGYnLFxyXG5cclxuICAgICAgICBVTklGT1JNMWk6ICcxaScsXHJcbiAgICAgICAgVU5JRk9STTJpOiAnMmknLFxyXG4gICAgICAgIFVOSUZPUk0zaTogJzNpJyxcclxuICAgICAgICBVTklGT1JNNGk6ICc0aSdcclxuICAgIH1cclxufSIsImltcG9ydCBDb25zdGFudHMgZnJvbSAnLi9jb25zdGFudHMuZXM2JztcclxuaW1wb3J0IFNoYWRlcnMgZnJvbSAnLi9zaGFkZXJzLmVzNic7XHJcbmltcG9ydCBGaWx0ZXJzIGZyb20gJy4vZmlsdGVycy5lczYnO1xyXG5pbXBvcnQgVGV4dHVyZXMgZnJvbSAnLi90ZXh0dXJlcy5lczYnO1xyXG5pbXBvcnQgVW5pZm9ybXMgZnJvbSAnLi91bmlmb3Jtcy5lczYnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQge1xyXG4gICAgLyoqXHJcbiAgICAgKiBjcmVhdGUgZmlsdGVyIGZyb20gc2hhZGVyc1xyXG4gICAgICogQHBhcmFtIHZlcnRleFNoYWRlclxyXG4gICAgICogQHBhcmFtIGZyYWdtZW50U2hhZGVyXHJcbiAgICAgKiBAcmV0dXJucyB7e3ZlcnRleFNoYWRlcjogKiwgZnJhZ21lbnRTaGFkZXI6ICp9fVxyXG4gICAgICovXHJcbiAgICBjcmVhdGVGaWx0ZXJGcm9tU2hhZGVycyh2ZXJ0ZXhTaGFkZXIsIGZyYWdtZW50U2hhZGVyKSB7XHJcbiAgICAgICAgcmV0dXJuIHsgdmVydGV4U2hhZGVyOiB2ZXJ0ZXhTaGFkZXIsIGZyYWdtZW50U2hhZGVyOiBmcmFnbWVudFNoYWRlciB9O1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIGNyZWF0ZSBhIGZpbHRlciBmcm9tIGZpbHRlciBuYW1lXHJcbiAgICAgKiBAcGFyYW0gbmFtZVxyXG4gICAgICogQHBhcmFtIG1lbW9yeSBzcGFjZS92YXJpYWJsZSB0byBwdWxsIHNoYWRlciBmcm9tXHJcbiAgICAgKi9cclxuICAgIGNyZWF0ZUZpbHRlckZyb21OYW1lKG5hbWUsIHNoYWRlcmxvYykge1xyXG4gICAgICAgIGlmICghc2hhZGVybG9jKSB7XHJcbiAgICAgICAgICAgIHNoYWRlcmxvYyA9IFNoYWRlcnM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghc2hhZGVybG9jW25hbWVdKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTaGFkZXIgJywgbmFtZSwgJ25vdCBmb3VuZCBpbiAnLCBzaGFkZXJsb2MsICcgdXNpbmcgYSBwYXNzdGhyb3VnaCBzaGFkZXIgaW5zdGVhZCcpO1xyXG4gICAgICAgICAgICBzaGFkZXJsb2MgPSBTaGFkZXJzO1xyXG4gICAgICAgICAgICBuYW1lID0gJ3Bhc3N0aHJvdWdoJztcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHZ0eCA9IHNoYWRlcmxvY1tuYW1lXS52ZXJ0ZXg7XHJcbiAgICAgICAgdmFyIGZyZyA9IHNoYWRlcmxvY1tuYW1lXS5mcmFnbWVudDtcclxuICAgICAgICByZXR1cm4gdGhpcy5jcmVhdGVGaWx0ZXJGcm9tU2hhZGVycyh2dHgsIGZyZyk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogY3JlYXRlIG9iamVjdCBmb3IgcmVuZGVyXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH1wYXJhbXNcclxuICAgICAqL1xyXG4gICAgY3JlYXRlUmVuZGVyT2JqZWN0KHBhcmFtcykge1xyXG4gICAgICAgIHZhciBwcm9wcyA9IHt9O1xyXG5cclxuICAgICAgICBwcm9wcy5nbCA9IHBhcmFtcy5nbDtcclxuICAgICAgICBwcm9wcy53aWR0aCA9IHByb3BzLmdsLmNhbnZhcy53aWR0aDtcclxuICAgICAgICBwcm9wcy5oZWlnaHQgPSBwcm9wcy5nbC5jYW52YXMuaGVpZ2h0O1xyXG5cclxuICAgICAgICBpZiAocGFyYW1zLndpZHRoKSB7IHByb3BzLndpZHRoID0gcGFyYW1zLndpZHRoOyB9XHJcbiAgICAgICAgaWYgKHBhcmFtcy5oZWlnaHQpIHsgcHJvcHMuaGVpZ2h0ID0gcGFyYW1zLmhlaWdodDsgfVxyXG5cclxuICAgICAgICBwcm9wcy5maWx0ZXIgPSBwYXJhbXMuZmlsdGVyO1xyXG4gICAgICAgIHByb3BzLnRleHR1cmVzID0gbmV3IFRleHR1cmVzKHByb3BzLndpZHRoLHByb3BzLmhlaWdodCk7XHJcblxyXG4gICAgICAgIHByb3BzLmNhbnZhczJESGVscGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XHJcbiAgICAgICAgcHJvcHMuY2FudmFzMkRIZWxwZXIud2lkdGggPSBwcm9wcy53aWR0aDtcclxuICAgICAgICBwcm9wcy5jYW52YXMyREhlbHBlci5oZWlnaHQgPSBwcm9wcy5oZWlnaHQ7XHJcbiAgICAgICAgcHJvcHMuY2FudmFzMkRIZWxwZXJDb250ZXh0ID0gcHJvcHMuY2FudmFzMkRIZWxwZXIuZ2V0Q29udGV4dCgnMmQnKTtcclxuXHJcbiAgICAgICAgcHJvcHMudW5pZm9ybXMgPSBuZXcgVW5pZm9ybXMoKTtcclxuICAgICAgICBwcm9wcy50ZXh0dXJlcyA9IG5ldyBUZXh0dXJlcyhwcm9wcy5nbCwgcHJvcHMud2lkdGgsIHByb3BzLmhlaWdodCk7XHJcblxyXG4gICAgICAgIGlmIChwYXJhbXMudGV4dHVyZXMpIHtcclxuICAgICAgICAgICAgZm9yICh2YXIgYyA9IDA7IGMgPCBwYXJhbXMudGV4dHVyZXMubGVuZ3RoOyBjKyspIHtcclxuICAgICAgICAgICAgICAgIHByb3BzLnRleHR1cmVzLmFkZChwYXJhbXMudGV4dHVyZXNbY10ubmFtZSwgcGFyYW1zLnRleHR1cmVzW2NdLnRleHR1cmUsIHBhcmFtcy50ZXh0dXJlc1tjXS5pbmRleCwgcGFyYW1zLnRleHR1cmVzW2NdLnBpeGVsU3RvcmUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocGFyYW1zLnVuaWZvcm1zKSB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgcGFyYW1zLnVuaWZvcm1zLmxlbmd0aDsgYysrKSB7XHJcbiAgICAgICAgICAgICAgICBwcm9wcy51bmlmb3Jtcy5hZGQocGFyYW1zLnVuaWZvcm1zW2NdLm5hbWUsIHBhcmFtcy51bmlmb3Jtc1tjXS50eXBlLCBwYXJhbXMudW5pZm9ybXNbY10udmFsdWVzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHBhcmFtcy5hdXRvcmVuZGVyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlbmRlcihwcm9wcyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gcHJvcHM7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogcmVuZGVyIFdlYkdMIGZpbHRlciBvbiBjdXJyZW50IHRleHR1cmVcclxuICAgICAqIEBwYXJhbSBnbHByb3BzXHJcbiAgICAgKiBAcGFyYW0gcmVmcmVzaFRleHR1cmVJbmRpY2VzIHRleHR1cmUgcmVmcmVzaCBpbmRpY2VzIChvcHRpb25hbClcclxuICAgICAqIEByZXR1cm5zIHsqfVxyXG4gICAgICovXHJcbiAgICByZW5kZXIoZ2xwcm9wcykge1xyXG4gICAgICAgIGlmICghZ2xwcm9wcy5pc0luaXRpYWxpemVkKSB7XHJcbiAgICAgICAgICAgIHZhciB2ZXJ0ZXhTaGFkZXIgPSBnbHByb3BzLmdsLmNyZWF0ZVNoYWRlcihnbHByb3BzLmdsLlZFUlRFWF9TSEFERVIpO1xyXG4gICAgICAgICAgICBnbHByb3BzLmdsLnNoYWRlclNvdXJjZSh2ZXJ0ZXhTaGFkZXIsIGdscHJvcHMuZmlsdGVyLnZlcnRleFNoYWRlcik7XHJcbiAgICAgICAgICAgIGdscHJvcHMuZ2wuY29tcGlsZVNoYWRlcih2ZXJ0ZXhTaGFkZXIpO1xyXG5cclxuICAgICAgICAgICAgdmFyIGZyYWdtZW50U2hhZGVyID0gZ2xwcm9wcy5nbC5jcmVhdGVTaGFkZXIoZ2xwcm9wcy5nbC5GUkFHTUVOVF9TSEFERVIpO1xyXG4gICAgICAgICAgICBnbHByb3BzLmdsLnNoYWRlclNvdXJjZShmcmFnbWVudFNoYWRlciwgZ2xwcm9wcy5maWx0ZXIuZnJhZ21lbnRTaGFkZXIpO1xyXG4gICAgICAgICAgICBnbHByb3BzLmdsLmNvbXBpbGVTaGFkZXIoZnJhZ21lbnRTaGFkZXIpO1xyXG5cclxuICAgICAgICAgICAgZ2xwcm9wcy5wcm9ncmFtID0gZ2xwcm9wcy5nbC5jcmVhdGVQcm9ncmFtKCk7XHJcbiAgICAgICAgICAgIGdscHJvcHMuZ2wuYXR0YWNoU2hhZGVyKGdscHJvcHMucHJvZ3JhbSwgdmVydGV4U2hhZGVyKTtcclxuICAgICAgICAgICAgZ2xwcm9wcy5nbC5hdHRhY2hTaGFkZXIoZ2xwcm9wcy5wcm9ncmFtLCBmcmFnbWVudFNoYWRlcik7XHJcbiAgICAgICAgICAgIGdscHJvcHMuZ2wubGlua1Byb2dyYW0oZ2xwcm9wcy5wcm9ncmFtKTtcclxuICAgICAgICAgICAgZ2xwcm9wcy5nbC51c2VQcm9ncmFtKGdscHJvcHMucHJvZ3JhbSk7XHJcblxyXG4gICAgICAgICAgICB2YXIgcG9zaXRpb25Mb2NhdGlvbiA9IGdscHJvcHMuZ2wuZ2V0QXR0cmliTG9jYXRpb24oZ2xwcm9wcy5wcm9ncmFtLCAnYV9wb3NpdGlvbicpO1xyXG4gICAgICAgICAgICB2YXIgdGV4Q29vcmRCdWZmZXIgPSBnbHByb3BzLmdsLmNyZWF0ZUJ1ZmZlcigpO1xyXG4gICAgICAgICAgICB2YXIgcmVjdENvb3JkQnVmZmVyID0gZ2xwcm9wcy5nbC5jcmVhdGVCdWZmZXIoKTtcclxuICAgICAgICAgICAgdmFyIHRleENvb3JkcyA9IG5ldyBGbG9hdDMyQXJyYXkoWzAuMCwgIDAuMCwgMS4wLCAgMC4wLCAwLjAsICAxLjAsIDAuMCwgIDEuMCwgMS4wLCAgMC4wLCAxLjAsICAxLjBdKTtcclxuICAgICAgICAgICAgdmFyIHJlY3RDb29yZHMgPSBuZXcgRmxvYXQzMkFycmF5KFswLCAwLCBnbHByb3BzLnRleHR1cmVzLndpZHRoLCAwLCAwLCBnbHByb3BzLnRleHR1cmVzLmhlaWdodCwgMCxcclxuICAgICAgICAgICAgICAgIGdscHJvcHMudGV4dHVyZXMuaGVpZ2h0LCBnbHByb3BzLnRleHR1cmVzLndpZHRoLCAwLCBnbHByb3BzLnRleHR1cmVzLndpZHRoLCBnbHByb3BzLnRleHR1cmVzLmhlaWdodF0pO1xyXG5cclxuICAgICAgICAgICAgZ2xwcm9wcy5nbC5iaW5kQnVmZmVyKGdscHJvcHMuZ2wuQVJSQVlfQlVGRkVSLCB0ZXhDb29yZEJ1ZmZlcik7XHJcbiAgICAgICAgICAgIGdscHJvcHMuZ2wuYnVmZmVyRGF0YShnbHByb3BzLmdsLkFSUkFZX0JVRkZFUiwgdGV4Q29vcmRzLCBnbHByb3BzLmdsLlNUQVRJQ19EUkFXKTtcclxuXHJcbiAgICAgICAgICAgIHZhciB0ZXhDb29yZExvY2F0aW9uID0gZ2xwcm9wcy5nbC5nZXRBdHRyaWJMb2NhdGlvbihnbHByb3BzLnByb2dyYW0sICdhX3RleENvb3JkJyk7XHJcbiAgICAgICAgICAgIGdscHJvcHMuZ2wuZW5hYmxlVmVydGV4QXR0cmliQXJyYXkodGV4Q29vcmRMb2NhdGlvbik7XHJcbiAgICAgICAgICAgIGdscHJvcHMuZ2wudmVydGV4QXR0cmliUG9pbnRlcih0ZXhDb29yZExvY2F0aW9uLCAyLCBnbHByb3BzLmdsLkZMT0FULCBmYWxzZSwgMCwgMCk7XHJcblxyXG4gICAgICAgICAgICBnbHByb3BzLnVuaWZvcm1zLmFkZCgndV9yZXNvbHV0aW9uJywgQ29uc3RhbnRzLnVuaWZvcm1zLlVOSUZPUk0yZiwgW2dscHJvcHMuZ2wuY2FudmFzLndpZHRoLCBnbHByb3BzLmdsLmNhbnZhcy5oZWlnaHRdKTtcclxuICAgICAgICAgICAgZ2xwcm9wcy51bmlmb3Jtcy5hZGQoJ2ZfcmVzb2x1dGlvbicsIENvbnN0YW50cy51bmlmb3Jtcy5VTklGT1JNMmYsIFtnbHByb3BzLmdsLmNhbnZhcy53aWR0aCwgZ2xwcm9wcy5nbC5jYW52YXMuaGVpZ2h0XSk7XHJcblxyXG4gICAgICAgICAgICBnbHByb3BzLmdsLmJpbmRCdWZmZXIoZ2xwcm9wcy5nbC5BUlJBWV9CVUZGRVIsIHJlY3RDb29yZEJ1ZmZlcik7XHJcbiAgICAgICAgICAgIGdscHJvcHMuZ2wuZW5hYmxlVmVydGV4QXR0cmliQXJyYXkocG9zaXRpb25Mb2NhdGlvbik7XHJcbiAgICAgICAgICAgIGdscHJvcHMuZ2wudmVydGV4QXR0cmliUG9pbnRlcihwb3NpdGlvbkxvY2F0aW9uLCAyLCBnbHByb3BzLmdsLkZMT0FULCBmYWxzZSwgMCwgMCk7XHJcbiAgICAgICAgICAgIGdscHJvcHMuZ2wuYnVmZmVyRGF0YShnbHByb3BzLmdsLkFSUkFZX0JVRkZFUiwgcmVjdENvb3JkcywgZ2xwcm9wcy5nbC5TVEFUSUNfRFJBVyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBnbHByb3BzLnRleHR1cmVzLmluaXRpYWxpemVOZXdUZXh0dXJlcyhnbHByb3BzLnByb2dyYW0pO1xyXG4gICAgICAgIGdscHJvcHMudGV4dHVyZXMucmVmcmVzaFNjZW5lKCk7XHJcbiAgICAgICAgZ2xwcm9wcy51bmlmb3Jtcy51cGRhdGVQcm9ncmFtKGdscHJvcHMuZ2wsIGdscHJvcHMucHJvZ3JhbSk7XHJcblxyXG4gICAgICAgIGdscHJvcHMuZ2wuZHJhd0FycmF5cyhnbHByb3BzLmdsLlRSSUFOR0xFUywgMCwgNik7XHJcbiAgICAgICAgZ2xwcm9wcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGdscHJvcHM7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogcmVhZCBwaXhlbHMgZnJvbSBHTCBjb250ZXh0XHJcbiAgICAgKiBAcGFyYW0gZ2xQcm9wc1xyXG4gICAgICovXHJcbiAgICBnZXRDYW52YXNQaXhlbHMoZ2xwcm9wcykge1xyXG4gICAgICAgIHZhciBnbGN0eCA9IGdscHJvcHMuZ2w7XHJcbiAgICAgICAgaWYgKCFnbHByb3BzLnBpeGVsYXJyYXkpIHtcclxuICAgICAgICAgICAgZ2xwcm9wcy5waXhlbGFycmF5ID0gbmV3IFVpbnQ4QXJyYXkoZ2xjdHguY2FudmFzLndpZHRoICogZ2xjdHguY2FudmFzLmhlaWdodCAqIDQpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBnbGN0eC5yZWFkUGl4ZWxzKDAsIDAsIGdsY3R4LmNhbnZhcy53aWR0aCwgZ2xjdHguY2FudmFzLmhlaWdodCwgZ2xjdHguUkdCQSwgZ2xjdHguVU5TSUdORURfQllURSwgZ2xwcm9wcy5waXhlbGFycmF5KTtcclxuICAgICAgICB2YXIgaW1nRGF0YSA9IGdscHJvcHMuY2FudmFzMkRIZWxwZXJDb250ZXh0LmNyZWF0ZUltYWdlRGF0YShnbGN0eC5jYW52YXMud2lkdGgsIGdsY3R4LmNhbnZhcy5oZWlnaHQpO1xyXG4gICAgICAgIGltZ0RhdGEuZGF0YS5zZXQobmV3IFVpbnQ4Q2xhbXBlZEFycmF5KGdscHJvcHMucGl4ZWxhcnJheSkpO1xyXG4gICAgICAgIHJldHVybiBpbWdEYXRhO1xyXG4gICAgfVxyXG59OyIsImV4cG9ydCBkZWZhdWx0IHtcbiAgXCJmcmVpY2hlbl9lZGdlX2RldGVjdGlvblwiOiB7XG4gICAgXCJmcmFnbWVudFwiOiBcInByZWNpc2lvbiBtZWRpdW1wIGZsb2F0OyB1bmlmb3JtIHNhbXBsZXIyRCB1X2ltYWdlMDsgdmFyeWluZyB2ZWMyIHZfdGV4Q29vcmQ7IHVuaWZvcm0gdmVjMiBmX3Jlc29sdXRpb247IHZlYzIgdGV4ZWwgPSB2ZWMyKDEuMCAvIGZfcmVzb2x1dGlvbi54LCAxLjAgLyBmX3Jlc29sdXRpb24ueSk7IG1hdDMgR1s5XTsgIGNvbnN0IG1hdDMgZzAgPSBtYXQzKCAwLjM1MzU1MzM4NDU0MjQ2NTIsIDAsIC0wLjM1MzU1MzM4NDU0MjQ2NTIsIDAuNSwgMCwgLTAuNSwgMC4zNTM1NTMzODQ1NDI0NjUyLCAwLCAtMC4zNTM1NTMzODQ1NDI0NjUyICk7IGNvbnN0IG1hdDMgZzEgPSBtYXQzKCAwLjM1MzU1MzM4NDU0MjQ2NTIsIDAuNSwgMC4zNTM1NTMzODQ1NDI0NjUyLCAwLCAwLCAwLCAtMC4zNTM1NTMzODQ1NDI0NjUyLCAtMC41LCAtMC4zNTM1NTMzODQ1NDI0NjUyICk7IGNvbnN0IG1hdDMgZzIgPSBtYXQzKCAwLCAwLjM1MzU1MzM4NDU0MjQ2NTIsIC0wLjUsIC0wLjM1MzU1MzM4NDU0MjQ2NTIsIDAsIDAuMzUzNTUzMzg0NTQyNDY1MiwgMC41LCAtMC4zNTM1NTMzODQ1NDI0NjUyLCAwICk7IGNvbnN0IG1hdDMgZzMgPSBtYXQzKCAwLjUsIC0wLjM1MzU1MzM4NDU0MjQ2NTIsIDAsIC0wLjM1MzU1MzM4NDU0MjQ2NTIsIDAsIDAuMzUzNTUzMzg0NTQyNDY1MiwgMCwgMC4zNTM1NTMzODQ1NDI0NjUyLCAtMC41ICk7IGNvbnN0IG1hdDMgZzQgPSBtYXQzKCAwLCAtMC41LCAwLCAwLjUsIDAsIDAuNSwgMCwgLTAuNSwgMCApOyBjb25zdCBtYXQzIGc1ID0gbWF0MyggLTAuNSwgMCwgMC41LCAwLCAwLCAwLCAwLjUsIDAsIC0wLjUgKTsgY29uc3QgbWF0MyBnNiA9IG1hdDMoIDAuMTY2NjY2NjcxNjMzNzIwNCwgLTAuMzMzMzMzMzQzMjY3NDQwOCwgMC4xNjY2NjY2NzE2MzM3MjA0LCAtMC4zMzMzMzMzNDMyNjc0NDA4LCAwLjY2NjY2NjY4NjUzNDg4MTYsIC0wLjMzMzMzMzM0MzI2NzQ0MDgsIDAuMTY2NjY2NjcxNjMzNzIwNCwgLTAuMzMzMzMzMzQzMjY3NDQwOCwgMC4xNjY2NjY2NzE2MzM3MjA0ICk7IGNvbnN0IG1hdDMgZzcgPSBtYXQzKCAtMC4zMzMzMzMzNDMyNjc0NDA4LCAwLjE2NjY2NjY3MTYzMzcyMDQsIC0wLjMzMzMzMzM0MzI2NzQ0MDgsIDAuMTY2NjY2NjcxNjMzNzIwNCwgMC42NjY2NjY2ODY1MzQ4ODE2LCAwLjE2NjY2NjY3MTYzMzcyMDQsIC0wLjMzMzMzMzM0MzI2NzQ0MDgsIDAuMTY2NjY2NjcxNjMzNzIwNCwgLTAuMzMzMzMzMzQzMjY3NDQwOCApOyBjb25zdCBtYXQzIGc4ID0gbWF0MyggMC4zMzMzMzMzNDMyNjc0NDA4LCAwLjMzMzMzMzM0MzI2NzQ0MDgsIDAuMzMzMzMzMzQzMjY3NDQwOCwgMC4zMzMzMzMzNDMyNjc0NDA4LCAwLjMzMzMzMzM0MzI2NzQ0MDgsIDAuMzMzMzMzMzQzMjY3NDQwOCwgMC4zMzMzMzMzNDMyNjc0NDA4LCAwLjMzMzMzMzM0MzI2NzQ0MDgsIDAuMzMzMzMzMzQzMjY3NDQwOCApOyAgdm9pZCBtYWluKHZvaWQpIHsgICAgICBHWzBdID0gZzAsICAgICBHWzFdID0gZzEsICAgICBHWzJdID0gZzIsICAgICBHWzNdID0gZzMsICAgICBHWzRdID0gZzQsICAgICBHWzVdID0gZzUsICAgICBHWzZdID0gZzYsICAgICBHWzddID0gZzcsICAgICBHWzhdID0gZzg7ICAgICAgbWF0MyBJOyAgICAgZmxvYXQgY252WzldOyAgICAgdmVjMyBzYW1wbDsgICAgICBmb3IgKGZsb2F0IGk9MC4wOyBpPDMuMDsgaSsrKSB7ICAgICAgICAgZm9yIChmbG9hdCBqPTAuMDsgajwzLjA7IGorKykgeyAgICAgICAgICAgICBzYW1wbCA9IHRleHR1cmUyRCh1X2ltYWdlMCwgdl90ZXhDb29yZCArIHRleGVsICogdmVjMihpLTEuMCxqLTEuMCkgKS5yZ2I7ICAgICAgICAgICAgIElbaW50KGkpXVtpbnQoaildID0gbGVuZ3RoKHNhbXBsKTsgICAgICAgICB9ICAgICB9ICAgICAgZm9yIChpbnQgaT0wOyBpPDk7IGkrKykgeyAgICAgICAgIGZsb2F0IGRwMyA9IGRvdChHW2ldWzBdLCBJWzBdKSArIGRvdChHW2ldWzFdLCBJWzFdKSArIGRvdChHW2ldWzJdLCBJWzJdKTsgICAgICAgICBjbnZbaV0gPSBkcDMgKiBkcDM7ICAgICB9ICAgICAgZmxvYXQgTSA9IChjbnZbMF0gKyBjbnZbMV0pICsgKGNudlsyXSArIGNudlszXSk7ICAgICBmbG9hdCBTID0gKGNudls0XSArIGNudls1XSkgKyAoY252WzZdICsgY252WzddKSArIChjbnZbOF0gKyBNKTsgICAgICBnbF9GcmFnQ29sb3IgPSB2ZWM0KHZlYzMoc3FydChNL1MpKSwgdGV4dHVyZTJEKCB1X2ltYWdlMCwgdl90ZXhDb29yZCApLmEgKTsgfVwiLFxuICAgIFwidmVydGV4XCI6IFwiYXR0cmlidXRlIHZlYzIgYV9wb3NpdGlvbjsgYXR0cmlidXRlIHZlYzIgYV90ZXhDb29yZDsgdW5pZm9ybSB2ZWMyIHVfcmVzb2x1dGlvbjsgdmFyeWluZyB2ZWMyIHZfdGV4Q29vcmQ7ICB2b2lkIG1haW4oKSB7ICAgICB2ZWMyIHplcm9Ub09uZSA9IGFfcG9zaXRpb24gLyB1X3Jlc29sdXRpb247ICAgICB2ZWMyIHplcm9Ub1R3byA9IHplcm9Ub09uZSAqIDIuMDsgICAgIHZlYzIgY2xpcFNwYWNlID0gemVyb1RvVHdvIC0gMS4wOyAgICAgZ2xfUG9zaXRpb24gPSB2ZWM0KGNsaXBTcGFjZSAqIHZlYzIoMSwgLTEpLCAwLCAxKTsgICAgIHZfdGV4Q29vcmQgPSBhX3RleENvb3JkOyB9XCJcbiAgfSxcbiAgXCJncmV5c2NhbGVcIjoge1xuICAgIFwiZnJhZ21lbnRcIjogXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDsgdmFyeWluZyB2ZWMyIHZfdGV4Q29vcmQ7ICB1bmlmb3JtIHNhbXBsZXIyRCB1X2ltYWdlMDsgIHZvaWQgbWFpbih2b2lkKSB7ICAgICB2ZWM0IHB4ID0gdGV4dHVyZTJEKHVfaW1hZ2UwLCB2X3RleENvb3JkKTsgICAgIGZsb2F0IGF2ZyA9IChweC5yICsgcHguZyArIHB4LmIpLzMuMDsgICAgIGdsX0ZyYWdDb2xvciA9IHZlYzQoYXZnLCBhdmcsIGF2ZywgcHguYSk7IH1cIixcbiAgICBcInZlcnRleFwiOiBcImF0dHJpYnV0ZSB2ZWMyIGFfcG9zaXRpb247IGF0dHJpYnV0ZSB2ZWMyIGFfdGV4Q29vcmQ7IHVuaWZvcm0gdmVjMiB1X3Jlc29sdXRpb247IHZhcnlpbmcgdmVjMiB2X3RleENvb3JkOyAgdm9pZCBtYWluKCkgeyAgICAgdmVjMiB6ZXJvVG9PbmUgPSBhX3Bvc2l0aW9uIC8gdV9yZXNvbHV0aW9uOyAgICAgdmVjMiB6ZXJvVG9Ud28gPSB6ZXJvVG9PbmUgKiAyLjA7ICAgICB2ZWMyIGNsaXBTcGFjZSA9IHplcm9Ub1R3byAtIDEuMDsgICAgIGdsX1Bvc2l0aW9uID0gdmVjNChjbGlwU3BhY2UgKiB2ZWMyKDEsIC0xKSwgMCwgMSk7ICAgICB2X3RleENvb3JkID0gYV90ZXhDb29yZDsgfVwiXG4gIH0sXG4gIFwicGFzc3Rocm91Z2hcIjoge1xuICAgIFwiZnJhZ21lbnRcIjogXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDsgdW5pZm9ybSBzYW1wbGVyMkQgdV9pbWFnZTA7IHZhcnlpbmcgdmVjMiB2X3RleENvb3JkOyAgdm9pZCBtYWluKCkgeyAgICAgZ2xfRnJhZ0NvbG9yID0gdGV4dHVyZTJEKHVfaW1hZ2UwLCB2X3RleENvb3JkKTsgfVwiLFxuICAgIFwidmVydGV4XCI6IFwiYXR0cmlidXRlIHZlYzIgYV9wb3NpdGlvbjsgYXR0cmlidXRlIHZlYzIgYV90ZXhDb29yZDsgdW5pZm9ybSB2ZWMyIHVfcmVzb2x1dGlvbjsgdmFyeWluZyB2ZWMyIHZfdGV4Q29vcmQ7ICB2b2lkIG1haW4oKSB7ICAgICB2ZWMyIHplcm9Ub09uZSA9IGFfcG9zaXRpb24gLyB1X3Jlc29sdXRpb247ICAgICB2ZWMyIHplcm9Ub1R3byA9IHplcm9Ub09uZSAqIDIuMDsgICAgIHZlYzIgY2xpcFNwYWNlID0gemVyb1RvVHdvIC0gMS4wOyAgICAgZ2xfUG9zaXRpb24gPSB2ZWM0KGNsaXBTcGFjZSAqIHZlYzIoMSwgLTEpLCAwLCAxKTsgICAgIHZfdGV4Q29vcmQgPSBhX3RleENvb3JkOyB9XCJcbiAgfSxcbiAgXCJzZXBpYVwiOiB7XG4gICAgXCJmcmFnbWVudFwiOiBcInByZWNpc2lvbiBtZWRpdW1wIGZsb2F0OyB2YXJ5aW5nIHZlYzIgdl90ZXhDb29yZDsgIHVuaWZvcm0gc2FtcGxlcjJEIHVfaW1hZ2UwOyB1bmlmb3JtIHZlYzQgbGlnaHQ7IHVuaWZvcm0gdmVjNCBkYXJrOyB1bmlmb3JtIGZsb2F0IGRlc2F0OyB1bmlmb3JtIGZsb2F0IHRvbmVkOyAgY29uc3QgbWF0NCBjb2VmZiA9IG1hdDQoICAgICAwLjM5MywgMC4zNDksIDAuMjcyLCAxLjAsICAgICAwLjc5NiwgMC42ODYsIDAuNTM0LCAxLjAsICAgICAwLjE4OSwgMC4xNjgsIDAuMTMxLCAxLjAsICAgICAwLjAsIDAuMCwgMC4wLCAxLjAgKTsgIHZvaWQgbWFpbih2b2lkKSB7ICAgICB2ZWM0IHNvdXJjZVBpeGVsID0gdGV4dHVyZTJEKHVfaW1hZ2UwLCB2X3RleENvb3JkKTsgICAgIGdsX0ZyYWdDb2xvciA9IGNvZWZmICogc291cmNlUGl4ZWw7IH1cIixcbiAgICBcInZlcnRleFwiOiBcImF0dHJpYnV0ZSB2ZWMyIGFfcG9zaXRpb247IGF0dHJpYnV0ZSB2ZWMyIGFfdGV4Q29vcmQ7IHVuaWZvcm0gdmVjMiB1X3Jlc29sdXRpb247IHZhcnlpbmcgdmVjMiB2X3RleENvb3JkOyAgdm9pZCBtYWluKCkgeyAgICAgdmVjMiB6ZXJvVG9PbmUgPSBhX3Bvc2l0aW9uIC8gdV9yZXNvbHV0aW9uOyAgICAgdmVjMiB6ZXJvVG9Ud28gPSB6ZXJvVG9PbmUgKiAyLjA7ICAgICB2ZWMyIGNsaXBTcGFjZSA9IHplcm9Ub1R3byAtIDEuMDsgICAgIGdsX1Bvc2l0aW9uID0gdmVjNChjbGlwU3BhY2UgKiB2ZWMyKDEsIC0xKSwgMCwgMSk7ICAgICB2X3RleENvb3JkID0gYV90ZXhDb29yZDsgfVwiXG4gIH0sXG4gIFwic29iZWxfZWRnZV9kZXRlY3Rpb25cIjoge1xuICAgIFwiZnJhZ21lbnRcIjogXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDsgdmFyeWluZyB2ZWMyIHZfdGV4Q29vcmQ7IHVuaWZvcm0gc2FtcGxlcjJEIHVfaW1hZ2UwOyB1bmlmb3JtIHZlYzIgZl9yZXNvbHV0aW9uOyAgdm9pZCBtYWluKHZvaWQpIHsgICAgIGZsb2F0IHggPSAxLjAgLyBmX3Jlc29sdXRpb24ueDsgICAgIGZsb2F0IHkgPSAxLjAgLyBmX3Jlc29sdXRpb24ueTsgICAgIHZlYzQgaG9yaXpFZGdlID0gdmVjNCggMC4wICk7ICAgICBob3JpekVkZ2UgLT0gdGV4dHVyZTJEKCB1X2ltYWdlMCwgdmVjMiggdl90ZXhDb29yZC54IC0geCwgdl90ZXhDb29yZC55IC0geSApICkgKiAxLjA7ICAgICBob3JpekVkZ2UgLT0gdGV4dHVyZTJEKCB1X2ltYWdlMCwgdmVjMiggdl90ZXhDb29yZC54IC0geCwgdl90ZXhDb29yZC55ICAgICApICkgKiAyLjA7ICAgICBob3JpekVkZ2UgLT0gdGV4dHVyZTJEKCB1X2ltYWdlMCwgdmVjMiggdl90ZXhDb29yZC54IC0geCwgdl90ZXhDb29yZC55ICsgeSApICkgKiAxLjA7ICAgICBob3JpekVkZ2UgKz0gdGV4dHVyZTJEKCB1X2ltYWdlMCwgdmVjMiggdl90ZXhDb29yZC54ICsgeCwgdl90ZXhDb29yZC55IC0geSApICkgKiAxLjA7ICAgICBob3JpekVkZ2UgKz0gdGV4dHVyZTJEKCB1X2ltYWdlMCwgdmVjMiggdl90ZXhDb29yZC54ICsgeCwgdl90ZXhDb29yZC55ICAgICApICkgKiAyLjA7ICAgICBob3JpekVkZ2UgKz0gdGV4dHVyZTJEKCB1X2ltYWdlMCwgdmVjMiggdl90ZXhDb29yZC54ICsgeCwgdl90ZXhDb29yZC55ICsgeSApICkgKiAxLjA7ICAgICB2ZWM0IHZlcnRFZGdlID0gdmVjNCggMC4wICk7ICAgICB2ZXJ0RWRnZSAtPSB0ZXh0dXJlMkQoIHVfaW1hZ2UwLCB2ZWMyKCB2X3RleENvb3JkLnggLSB4LCB2X3RleENvb3JkLnkgLSB5ICkgKSAqIDEuMDsgICAgIHZlcnRFZGdlIC09IHRleHR1cmUyRCggdV9pbWFnZTAsIHZlYzIoIHZfdGV4Q29vcmQueCAgICAsIHZfdGV4Q29vcmQueSAtIHkgKSApICogMi4wOyAgICAgdmVydEVkZ2UgLT0gdGV4dHVyZTJEKCB1X2ltYWdlMCwgdmVjMiggdl90ZXhDb29yZC54ICsgeCwgdl90ZXhDb29yZC55IC0geSApICkgKiAxLjA7ICAgICB2ZXJ0RWRnZSArPSB0ZXh0dXJlMkQoIHVfaW1hZ2UwLCB2ZWMyKCB2X3RleENvb3JkLnggLSB4LCB2X3RleENvb3JkLnkgKyB5ICkgKSAqIDEuMDsgICAgIHZlcnRFZGdlICs9IHRleHR1cmUyRCggdV9pbWFnZTAsIHZlYzIoIHZfdGV4Q29vcmQueCAgICAsIHZfdGV4Q29vcmQueSArIHkgKSApICogMi4wOyAgICAgdmVydEVkZ2UgKz0gdGV4dHVyZTJEKCB1X2ltYWdlMCwgdmVjMiggdl90ZXhDb29yZC54ICsgeCwgdl90ZXhDb29yZC55ICsgeSApICkgKiAxLjA7ICAgICB2ZWMzIGVkZ2UgPSBzcXJ0KChob3JpekVkZ2UucmdiICogaG9yaXpFZGdlLnJnYikgKyAodmVydEVkZ2UucmdiICogdmVydEVkZ2UucmdiKSk7ICAgICAgZ2xfRnJhZ0NvbG9yID0gdmVjNCggZWRnZSwgdGV4dHVyZTJEKCB1X2ltYWdlMCwgdl90ZXhDb29yZCApLmEgKTsgfVwiLFxuICAgIFwidmVydGV4XCI6IFwiYXR0cmlidXRlIHZlYzIgYV9wb3NpdGlvbjsgYXR0cmlidXRlIHZlYzIgYV90ZXhDb29yZDsgdW5pZm9ybSB2ZWMyIHVfcmVzb2x1dGlvbjsgdmFyeWluZyB2ZWMyIHZfdGV4Q29vcmQ7ICB2b2lkIG1haW4oKSB7ICAgICB2ZWMyIHplcm9Ub09uZSA9IGFfcG9zaXRpb24gLyB1X3Jlc29sdXRpb247ICAgICB2ZWMyIHplcm9Ub1R3byA9IHplcm9Ub09uZSAqIDIuMDsgICAgIHZlYzIgY2xpcFNwYWNlID0gemVyb1RvVHdvIC0gMS4wOyAgICAgZ2xfUG9zaXRpb24gPSB2ZWM0KGNsaXBTcGFjZSAqIHZlYzIoMSwgLTEpLCAwLCAxKTsgICAgIHZfdGV4Q29vcmQgPSBhX3RleENvb3JkOyB9XCJcbiAgfVxufSIsImV4cG9ydCBkZWZhdWx0IGNsYXNzIHtcclxuICAgIC8qKlxyXG4gICAgICogYy10b3JcclxuICAgICAqIEBwYXJhbSBnbFxyXG4gICAgICogQHBhcmFtIHdpZHRoXHJcbiAgICAgKiBAcGFyYW0gaGVpZ2h0XHJcbiAgICAgKi9cclxuICAgIGNvbnN0cnVjdG9yKGdsLCB3aWR0aCwgaGVpZ2h0KSB7XHJcbiAgICAgICAgLyoqIGludGVybmFsIHRleHR1cmUgYXJyYXkgKi9cclxuICAgICAgICB0aGlzLl90ZXh0dXJlcyA9IHt9O1xyXG5cclxuICAgICAgICAvKiogd2lkdGggKi9cclxuICAgICAgICB0aGlzLndpZHRoID0gd2lkdGg7XHJcblxyXG4gICAgICAgIC8qKiBoZWlnaHQgKi9cclxuICAgICAgICB0aGlzLmhlaWdodCA9IGhlaWdodDtcclxuXHJcbiAgICAgICAgLyoqIGdsIGNvbnRleHQgKi9cclxuICAgICAgICB0aGlzLmdsID0gZ2w7XHJcblxyXG4gICAgICAgIC8qKiB1bmluaXRpYWxpemVkIHRleHR1cmVzICovXHJcbiAgICAgICAgdGhpcy5fdW5pdGlhbGl6ZWQgPSBbXTtcclxuXHJcbiAgICAgICAgLyoqIGRpcnR5IHRleHR1cmVzIChuZWVkcyB1cGRhdGluZykgKi9cclxuICAgICAgICB0aGlzLl9kaXJ0eSA9IFtdO1xyXG5cclxuICAgICAgICAvKiogdGV4dHVyZSBpbmRpY2VzICovXHJcbiAgICAgICAgdGhpcy50ZXh0dXJlSW5kaWNlcyA9IFtdO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogYWRkIGEgdGV4dHVyZVxyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSB0ZXh0dXJlXHJcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IGdsaW5kZXhcclxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHBpeGVsc3RvcmVcclxuICAgICAqL1xyXG4gICAgYWRkKG5hbWUsIHRleHR1cmUsIGdsaW5kZXgsIHBpeGVsc3RvcmUpIHtcclxuICAgICAgICBpZiAoIWdsaW5kZXgpIHtcclxuICAgICAgICAgICAgZ2xpbmRleCA9IDA7XHJcbiAgICAgICAgICAgIHdoaWxlICh0aGlzLnRleHR1cmVJbmRpY2VzLmluZGV4T2YoZ2xpbmRleCkgIT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICBnbGluZGV4ICsrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXBpeGVsc3RvcmUpIHtcclxuICAgICAgICAgICAgcGl4ZWxzdG9yZSA9IFtdO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnRleHR1cmVJbmRpY2VzLnB1c2goZ2xpbmRleCk7XHJcblxyXG4gICAgICAgIHRoaXMuX3RleHR1cmVzW25hbWVdID0ge1xyXG4gICAgICAgICAgICBuYW1lOiBuYW1lLFxyXG4gICAgICAgICAgICBnbGluZGV4OiBnbGluZGV4LFxyXG4gICAgICAgICAgICB0ZXh0dXJlOiB0ZXh0dXJlLFxyXG4gICAgICAgICAgICBnbHRleHR1cmU6IHRoaXMuZ2wuY3JlYXRlVGV4dHVyZSgpLFxyXG4gICAgICAgICAgICBpbml0aWFsaXplZDogZmFsc2UsXHJcbiAgICAgICAgICAgIHBpeGVsU3RvcmU6IHBpeGVsc3RvcmUsXHJcbiAgICAgICAgICAgIGRpcnR5OiB0cnVlIH07XHJcblxyXG4gICAgICAgIHRoaXMuX3VuaXRpYWxpemVkLnB1c2godGhpcy5fdGV4dHVyZXNbbmFtZV0pO1xyXG4gICAgfTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIHVwZGF0ZSBhIHVuaWZvcm1cclxuICAgICAqIEBwYXJhbSBuYW1lIG5hbWUgb2YgdGV4dHVyZVxyXG4gICAgICogQHBhcmFtIHRleHR1cmVcclxuICAgICAqL1xyXG4gICAgdXBkYXRlKG5hbWUsIHRleHR1cmUpIHtcclxuICAgICAgICBpZiAodGV4dHVyZSkge1xyXG4gICAgICAgICAgICB0aGlzLl90ZXh0dXJlc1tuYW1lXS50ZXh0dXJlID0gdGV4dHVyZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5fdGV4dHVyZXNbbmFtZV0uZGlydHkgPSB0cnVlO1xyXG4gICAgICAgIHRoaXMuX2RpcnR5LnB1c2godGhpcy5fdGV4dHVyZXNbbmFtZV0pO1xyXG4gICAgfTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIHJlZnJlc2ggc2NlbmUgd2l0aCB1cGRhdGVkIHRleHR1cmVzXHJcbiAgICAgKi9cclxuICAgIHJlZnJlc2hTY2VuZSgpIHtcclxuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IHRoaXMuX2RpcnR5Lmxlbmd0aDsgYysrKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZ2wuYWN0aXZlVGV4dHVyZSh0aGlzLmdsWydURVhUVVJFJyArIHRoaXMuX2RpcnR5W2NdLmdsaW5kZXhdKTtcclxuICAgICAgICAgICAgdGhpcy5nbC5iaW5kVGV4dHVyZSh0aGlzLmdsLlRFWFRVUkVfMkQsIHRoaXMuX2RpcnR5W2NdLmdsdGV4dHVyZSk7XHJcbiAgICAgICAgICAgIHRoaXMuZ2wudGV4U3ViSW1hZ2UyRCh0aGlzLmdsLlRFWFRVUkVfMkQsIDAsIDAsIDAsIHRoaXMuZ2wuUkdCQSwgdGhpcy5nbC5VTlNJR05FRF9CWVRFLCB0aGlzLl9kaXJ0eVtjXS50ZXh0dXJlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5fZGlydHkgPSBbXTtcclxuICAgIH07XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBpbml0aWFsaXplIG5ldyB0ZXh0dXJlc1xyXG4gICAgICogQHBhcmFtIHByb2dyYW1cclxuICAgICAqL1xyXG4gICAgaW5pdGlhbGl6ZU5ld1RleHR1cmVzKHByb2dyYW0pIHtcclxuICAgICAgICBpZiAodGhpcy5fdW5pdGlhbGl6ZWQubGVuZ3RoID09PSAwKSB7IHJldHVybjsgfVxyXG4gICAgICAgIHZhciBnbCA9IHRoaXMuZ2w7XHJcbiAgICAgICAgZm9yICh2YXIgYyA9IDA7IGMgPCB0aGlzLl91bml0aWFsaXplZC5sZW5ndGg7IGMrKykge1xyXG4gICAgICAgICAgICB0aGlzLl91bml0aWFsaXplZFtjXS5sb2NhdGlvbiA9IGdsLmdldFVuaWZvcm1Mb2NhdGlvbihwcm9ncmFtLCAndV9pbWFnZScgKyB0aGlzLl91bml0aWFsaXplZFtjXS5nbGluZGV4KTtcclxuICAgICAgICAgICAgZ2wudW5pZm9ybTFpKHRoaXMuX3VuaXRpYWxpemVkW2NdLmxvY2F0aW9uLCB0aGlzLl91bml0aWFsaXplZFtjXS5nbGluZGV4KTtcclxuICAgICAgICAgICAgZ2wuYWN0aXZlVGV4dHVyZShnbFsnVEVYVFVSRScgKyB0aGlzLl91bml0aWFsaXplZFtjXS5nbGluZGV4XSk7XHJcbiAgICAgICAgICAgIGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMuX3VuaXRpYWxpemVkW2NdLmdsdGV4dHVyZSk7XHJcbiAgICAgICAgICAgIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1MsIGdsLkNMQU1QX1RPX0VER0UpO1xyXG4gICAgICAgICAgICBnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9ULCBnbC5DTEFNUF9UT19FREdFKTtcclxuICAgICAgICAgICAgZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01JTl9GSUxURVIsIGdsLk5FQVJFU1QpO1xyXG4gICAgICAgICAgICBnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUFHX0ZJTFRFUiwgZ2wuTkVBUkVTVCk7XHJcblxyXG4gICAgICAgICAgICBmb3IgKHZhciBkID0gMDsgZCA8IHRoaXMuX3VuaXRpYWxpemVkW2NdLnBpeGVsU3RvcmUubGVuZ3RoOyBkKyspIHtcclxuICAgICAgICAgICAgICAgIGdsLnBpeGVsU3RvcmVpKGdsW3RoaXMuX3VuaXRpYWxpemVkW2NdLnBpeGVsU3RvcmVbZF0ucHJvcGVydHldLCB0aGlzLl91bml0aWFsaXplZFtjXS5waXhlbFN0b3JlW2RdLnZhbHVlKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZ2wudGV4SW1hZ2UyRChnbC5URVhUVVJFXzJELCAwLCBnbC5SR0JBLCBnbC5SR0JBLCBnbC5VTlNJR05FRF9CWVRFLCB0aGlzLl91bml0aWFsaXplZFtjXS50ZXh0dXJlKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuX3VuaXRpYWxpemVkW2NdLmluaXRpYWxpemVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5fdW5pdGlhbGl6ZWRbY10uZGlydHkgPSBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5fdW5pdGlhbGl6ZWQgPSBbXTtcclxuICAgIH07XHJcbn0iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyB7XHJcbiAgICAvKipcclxuICAgICAqIGMtdG9yXHJcbiAgICAgKi9cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIGludGVybmFsIG1hcHBpbmcgb2YgdW5pZm9ybXNcclxuICAgICAgICAgKiBAdHlwZSB7e319XHJcbiAgICAgICAgICogQHByaXZhdGVcclxuICAgICAgICAgKi9cclxuICAgICAgICB0aGlzLl91bmlmb3JtcyA9IHt9O1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogYWRkIGEgdW5pZm9ybVxyXG4gICAgICogQHBhcmFtIHR5cGUgdHlwZSBvZiB1bmlmb3JtICgxZiwgMmYsIDNmLCA0ZiwgMWksIDJpLCAzaSwgNHVcclxuICAgICAqL1xyXG4gICAgYWRkKG5hbWUsIHR5cGUsIHZhbHVlcykge1xyXG4gICAgICAgIHRoaXMuX3VuaWZvcm1zW25hbWVdID0geyBuYW1lOiBuYW1lLCB0eXBlOiB0eXBlLCB2YWx1ZXM6IHZhbHVlcywgZGlydHk6IHRydWUgfTtcclxuICAgIH07XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiB1cGRhdGUgYSB1bmlmb3JtXHJcbiAgICAgKiBAcGFyYW0gdHlwZSB0eXBlIG9mIHVuaWZvcm0gKDFmLCAyZiwgM2YsIDRmLCAxaSwgMmksIDNpLCA0dVxyXG4gICAgICovXHJcbiAgICB1cGRhdGUobmFtZSwgdmFsdWVzKSB7XHJcbiAgICAgICAgdGhpcy5fdW5pZm9ybXNbbmFtZV0udmFsdWVzID0gdmFsdWVzO1xyXG4gICAgICAgIHRoaXMuX3VuaWZvcm1zW25hbWVdLmRpcnR5ID0gdHJ1ZTtcclxuICAgIH07XHJcblxyXG5cclxuICAgIC8qKlxyXG4gICAgICogdXBkYXRlIHVuaWZvcm1zIG9uIEdMIGNvbnRleHQgYW5kIHByb2dyYW1cclxuICAgICAqIEBwYXJhbSBnbCBXZWJHTCBjb250ZXh0XHJcbiAgICAgKiBAcGFyYW0gcHJvZ3JhbVxyXG4gICAgICovXHJcbiAgICB1cGRhdGVQcm9ncmFtKGdsLCBwcm9ncmFtKSB7XHJcbiAgICAgICAgZm9yICh2YXIgYyBpbiB0aGlzLl91bmlmb3Jtcykge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5fdW5pZm9ybXNbY10uZGlydHkpIHtcclxuICAgICAgICAgICAgICAgIHZhciB1ID0gZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHByb2dyYW0sIHRoaXMuX3VuaWZvcm1zW2NdLm5hbWUpO1xyXG4gICAgICAgICAgICAgICAgc3dpdGNoICh0aGlzLl91bmlmb3Jtc1tjXS50eXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnMWYnOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBnbC51bmlmb3JtMWYodSwgdGhpcy5fdW5pZm9ybXNbY10udmFsdWVzWzBdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJzJmJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2wudW5pZm9ybTJmKHUsIHRoaXMuX3VuaWZvcm1zW2NdLnZhbHVlc1swXSwgdGhpcy5fdW5pZm9ybXNbY10udmFsdWVzWzFdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJzNmJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2wudW5pZm9ybTNmKHUsIHRoaXMuX3VuaWZvcm1zW2NdLnZhbHVlc1swXSwgdGhpcy5fdW5pZm9ybXNbY10udmFsdWVzWzFdLCB0aGlzLl91bmlmb3Jtc1tjXS52YWx1ZXNbMl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnNGYnOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBnbC51bmlmb3JtNGYodSwgdGhpcy5fdW5pZm9ybXNbY10udmFsdWVzWzBdLCB0aGlzLl91bmlmb3Jtc1tjXS52YWx1ZXNbMV0sIHRoaXMuX3VuaWZvcm1zW2NdLnZhbHVlc1syXSwgdGhpcy5fdW5pZm9ybXNbY10udmFsdWVzWzNdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJzFpJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2wudW5pZm9ybTFpKHUsIHRoaXMuX3VuaWZvcm1zW2NdLnZhbHVlc1swXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBjYXNlICcyaSc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsLnVuaWZvcm0yaSh1LCB0aGlzLl91bmlmb3Jtc1tjXS52YWx1ZXNbMF0sIHRoaXMuX3VuaWZvcm1zW2NdLnZhbHVlc1sxXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBjYXNlICczaSc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsLnVuaWZvcm0zaSh1LCB0aGlzLl8udW5pZm9ybXNbY10udmFsdWVzWzBdLCB0aGlzLl91bmlmb3Jtc1tjXS52YWx1ZXNbMV0sIHRoaXMuX3VuaWZvcm1zW2NdLnZhbHVlc1syXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBjYXNlICc0aSc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsLnVuaWZvcm1pZih1LCB0aGlzLl91bmlmb3Jtc1tjXS52YWx1ZXNbMF0sIHRoaXMuX3VuaWZvcm1zW2NdLnZhbHVlc1sxXSwgdGhpcy5fdW5pZm9ybXNbY10udmFsdWVzWzJdLCB0aGlzLl91bmlmb3Jtc1tjXS52YWx1ZXNbM10pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufSJdfQ==
