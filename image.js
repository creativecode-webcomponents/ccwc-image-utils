(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.ccwc = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _blobs = require('./canvas/blobs.es6');

var _blobs2 = _interopRequireDefault(_blobs);

var _filterchain = require('./canvas/filterchain.es6');

var _filterchain2 = _interopRequireDefault(_filterchain);

var _filters = require('./canvas/filters.es6');

var _filters2 = _interopRequireDefault(_filters);

var _filters3 = require('./webgl/filters.es6');

var _filters4 = _interopRequireDefault(_filters3);

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
    canvas: {
        blobs: _blobs2.default,
        filterchain: _filterchain2.default,
        filters: _filters2.default
    },
    webgl: {
        shaders: _shaders2.default,
        textures: _textures2.default,
        uniforms: _uniforms2.default,
        filters: _filters4.default,
        constants: _constants2.default
    }
};

},{"./canvas/blobs.es6":2,"./canvas/filterchain.es6":3,"./canvas/filters.es6":4,"./webgl/constants.es6":5,"./webgl/filters.es6":6,"./webgl/shaders.es6":7,"./webgl/textures.es6":8,"./webgl/uniforms.es6":9}],2:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = {
    /**
     * miniumum blobsize default
     */
    MIN_BLOB_SIZE: 50,

    /**
     * find blobs
     * BLACK AND WHITE IMAGE REQUIRED
     * @param pxs
     * @return {Array} blob coordinates
     */
    findBlobs: function findBlobs(pxs, cfg) {
        if (!cfg) {
            cfg = {};
        }

        var width = pxs.width;
        var rowsize = width * 4;
        var len = pxs.data.length;
        var pixels = new Uint16Array(pxs.data.length);
        for (var d = 0; d < pxs.data.length; d++) {
            pixels[d] = pxs.data[d];
        }
        var blobs = [];
        var blobIndex = -1;

        // contains pixel indices for blobs that touch
        var blobTable = [];
        for (var c = 0; c < len; c += 4) {
            if (pixels[c] === 255) {
                continue;
            }
            var neighbors = [c - 4, c + 4, c - rowsize, c + rowsize, c - 4 - rowsize, c + 4 - rowsize, c - 4 + rowsize, c + 4 + rowsize];
            var numNeighbors = neighbors.length;

            // just check one channel, because we assume every px is black or white
            var blobIndexFound = -1;
            for (var neighbor = 0; neighbor < numNeighbors; neighbor++) {
                if (neighbors[neighbor] >= 0 && neighbors[neighbor] < len && pixels[neighbors[neighbor]] === pixels[c]) {
                    // if touching a neighbor, record index of that blob index of that neighbor
                    // also if touching different indices, record that these indices should be the same index
                    // the blob table records which blob index maps to which other blob index
                    if (pixels[neighbors[neighbor] + 1] > 0) {
                        if (blobIndexFound !== -1 && blobIndexFound !== pixels[neighbors[neighbor] + 1]) {
                            // green channel (+1) records blob index
                            blobTable.push([blobIndexFound, pixels[neighbors[neighbor] + 1]]);
                        }
                        blobIndexFound = pixels[neighbors[neighbor] + 1];
                    }
                }
            }

            if (blobIndexFound > -1) {
                // blob is found, mark pixel and record in blobs
                pixels[c + 1] = blobIndexFound; // use green channel as blob tracker
                blobs[blobIndexFound].push(c);
            } else {
                // brand new blob
                blobIndex++;
                blobs.push([c]);
                pixels[c + 1] = blobIndex; // use green channel as blob tracker
            }
        }

        // merge intersecting pairs
        // maybe not the most efficient code, but blob count should be fairly low (hopefully)
        // revisit if speed gets in the way
        for (var c = 0; c < blobTable.length; c++) {
            for (var d = 0; d < blobTable.length; d++) {
                var connected = false;
                for (var e = 0; e < blobTable[d].length; e++) {
                    if (blobTable[c].indexOf(blobTable[d][e]) !== -1) {
                        connected = true;
                    }
                }
                if (connected && d !== c) {
                    for (var f = 0; f < blobTable[d].length; f++) {
                        // only add uniques
                        if (blobTable[c].indexOf(blobTable[d][f]) === -1) {
                            blobTable[c].push(blobTable[d][f]);
                        }
                    }
                    blobTable[d] = [];
                }
            }
        }

        // weed out empties
        blobTable = blobTable.filter(function (pair) {
            if (pair.length > 0) {
                return true;
            }
        });

        // each blob is a list of image indices
        // use blobs index to match to blob table index and concat the blobs at that index
        for (var c = 0; c < blobs.length; c++) {
            for (var d = 0; d < blobTable.length; d++) {
                if (blobTable[d].indexOf(c) !== -1) {
                    for (var e = 0; e < blobTable[d].length; e++) {
                        if (blobTable[d][e] !== c) {
                            blobs[c] = blobs[c].concat(blobs[blobTable[d][e]]);
                            blobs[blobTable[d][e]] = [];
                        }
                    }
                }
            }
        }

        // refine blobs now that the right things are concated and we don't need to track
        // meaning we can start splicing things without worrying about the index
        blobs = blobs.filter(function (blb) {
            return blb.length >= this.MIN_BLOB_SIZE;
        }, this);

        // get blob dimensions positions
        var blobCoords = [];
        for (var c = 0; c < blobs.length; c++) {
            var minX = -1,
                maxX = -1,
                minY = -1,
                maxY = -1;
            for (var d = 0; d < blobs[c].length; d++) {
                var px = Math.floor(blobs[c][d] / 4);
                var x = px % width;
                var y = parseInt(px / width);

                if (x < minX || minX === -1) {
                    minX = x;
                }
                if (x > maxX || maxX === -1) {
                    maxX = x;
                }
                if (y < minY || minY === -1) {
                    minY = y;
                }
                if (y > maxY || maxY === -1) {
                    maxY = y;
                }
            }
            blobCoords.push({ x: minX, y: minY, width: maxX - minX, height: maxY - minY });
        }

        // paint the blobs
        if (cfg.paint) {
            for (var d = 0; d < blobs.length; d++) {
                var clr = [Math.random() * 255, Math.random() * 255, Math.random() * 255];
                for (var e = 0; e < blobs[d].length; e++) {
                    pxs.data[blobs[d][e]] = clr[0];
                    pxs.data[blobs[d][e] + 1] = clr[1];
                    pxs.data[blobs[d][e] + 2] = clr[2];
                }
            }
        }
        return { image: pxs, blobs: blobCoords };
    }
};

},{}],3:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _filters = require('./filters.es6');

var _filters2 = _interopRequireDefault(_filters);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _class = function () {
    /**
     * c-tor
     */

    function _class() {
        _classCallCheck(this, _class);

        this.result = pxs;
    }

    _createClass(_class, [{
        key: 'toGrayscale',

        /**
         * convert image to grayscale
         * @param {ImageData} pxs
         * @returns {*}
         */
        value: function toGrayscale() {
            this.result = _filters2.default.toGrayscale(this.result);
            return this;
        }
    }, {
        key: 'saturate',

        /**
         * saturate image
         * @param {ImageData} pxs
         * @param {Number} percentamount percentage saturation
         * @returns {*}
         */
        value: function saturate(percentamount) {
            this.result = _filters2.default.saturate(this.result, percentamount);
            return this;
        }
    }, {
        key: 'toBlackAndWhite',

        /**
         * convert to pure black or pure white
         * @param pxs
         * @param pxs
         * @returns {*}
         */
        value: function toBlackAndWhite(thresholdtoblackpercent) {
            this.result = _filters2.default.toBlackAndWhite(this.result, thresholdtoblackpercent);
            return this;
        }
    }, {
        key: 'toDiff',

        /**
         * convert 2 images to an image highlighting differences
         * @param pxs1
         * @param pxs2
         * @param tolerance
         * @returns {*}
         */
        value: function toDiff(compare, tolerance) {
            this.result = _filters2.default.toDiff(this.result, compare, tolerance);
            return this;
        }
    }]);

    return _class;
}();

exports.default = _class;

},{"./filters.es6":4}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = {
    /**
     * convert image to grayscale
     * @param {ImageData} pxs
     * @returns {*}
     */

    toGrayscale: function toGrayscale(pxs) {
        for (var c = 0; c < pxs.data.length; c += 4) {
            var gray = (pxs.data[c] + pxs.data[c + 1] + pxs.data[c + 2]) / 3;
            pxs.data[c] = pxs.data[c + 1] = pxs.data[c + 2] = gray;
        }
        return pxs;
    },

    /**
     * saturate image
     * @param {ImageData} pxs
     * @param {Number} percentamount percentage saturation
     * @returns {*}
     */
    saturate: function saturate(pxs, percentamount) {
        if (!percentamount) {
            percentamount = 50;
        }
        var amt = percentamount / 100 * 255;
        for (var c = 0; c < pxs.data.length; c += 4) {
            pxs.data[c] = pxs.data[c] + amt;
            pxs.data[c + 1] = pxs.data[c + 1] + amt;
            pxs.data[c + 2] = pxs.data[c + 2] + amt;
        }
        return pxs;
    },

    /**
     * convert 2 images to an image highlighting differences
     * @param pxs1
     * @param pxs2
     * @param tolerance
     * @returns {*}
     */
    toDiff: function toDiff(pxs1, pxs2, tolerance) {
        if (pxs1.data.length !== pxs2.data.length) {
            throw new Error('images not the same size');
        }
        var diff = new ImageData(pxs1.width, pxs1.height);
        for (var c = 0; c < pxs1.data.length; c += 4) {
            var draw = 255;
            for (var d = 0; d < 4; d++) {
                if (pxs1.data[c + d] - pxs2.data[c + d] > tolerance) {
                    draw = 0;
                    continue;
                }
            }

            diff.data[c] = draw;
            diff.data[c + 1] = draw;
            diff.data[c + 2] = draw;
            diff.data[c + 3] = 255;
        }
        return diff;
    },

    /**
     * convert to pure black or pure white
     * @param pxs
     * @param pxs
     * @returns {*}
     */
    toBlackAndWhite: function toBlackAndWhite(pxs, thresholdtoblackpercent) {
        if (!thresholdtoblackpercent) {
            thresholdtoblackpercent = 50;
        }
        var threshold = thresholdtoblackpercent / 100 * (255 + 255 + 255);
        for (var c = 0; c < pxs.data.length; c += 4) {
            if (pxs.data[c] + pxs.data[c + 1] + pxs.data[c + 2] < threshold) {
                pxs.data[c] = 0;
                pxs.data[c + 1] = 0;
                pxs.data[c + 2] = 0;
            } else {
                pxs.data[c] = 255;
                pxs.data[c + 1] = 255;
                pxs.data[c + 2] = 255;
            }
        }

        return pxs;
    }
};

},{}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
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

},{"./constants.es6":5,"./filters.es6":6,"./shaders.es6":7,"./textures.es6":8,"./uniforms.es6":9}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
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

},{}],9:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmNcXGFsbC5lczYiLCJzcmNcXGNhbnZhc1xcYmxvYnMuZXM2Iiwic3JjXFxjYW52YXNcXGZpbHRlcmNoYWluLmVzNiIsInNyY1xcY2FudmFzXFxmaWx0ZXJzLmVzNiIsInNyY1xcd2ViZ2xcXGNvbnN0YW50cy5lczYiLCJzcmNcXHdlYmdsXFxmaWx0ZXJzLmVzNiIsInNyY1xcd2ViZ2xcXHNoYWRlcnMuZXM2Iiwic3JjXFx3ZWJnbFxcdGV4dHVyZXMuZXM2Iiwic3JjXFx3ZWJnbFxcdW5pZm9ybXMuZXM2Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDU0EsUUFBUSxLQUFSLEdBQWdCO0FBQ1osWUFBUTtBQUNKLDhCQURJO0FBRUosMENBRkk7QUFHSixrQ0FISTtLQUFSO0FBS0EsV0FBTztBQUNILGtDQURHO0FBRUgsb0NBRkc7QUFHSCxvQ0FIRztBQUlILGtDQUpHO0FBS0gsc0NBTEc7S0FBUDtDQU5KOzs7Ozs7OztrQkNUZTs7OztBQUlYLG1CQUFjLEVBQWQ7Ozs7Ozs7O0FBUUEsa0NBQVUsS0FBSyxLQUFLO0FBQ2hCLFlBQUksQ0FBQyxHQUFELEVBQU07QUFDTixrQkFBTSxFQUFOLENBRE07U0FBVjs7QUFJQSxZQUFJLFFBQVEsSUFBSSxLQUFKLENBTEk7QUFNaEIsWUFBSSxVQUFVLFFBQVEsQ0FBUixDQU5FO0FBT2hCLFlBQUksTUFBTSxJQUFJLElBQUosQ0FBUyxNQUFULENBUE07QUFRaEIsWUFBSSxTQUFTLElBQUksV0FBSixDQUFnQixJQUFJLElBQUosQ0FBUyxNQUFULENBQXpCLENBUlk7QUFTaEIsYUFBSyxJQUFJLElBQUksQ0FBSixFQUFPLElBQUksSUFBSSxJQUFKLENBQVMsTUFBVCxFQUFpQixHQUFyQyxFQUEwQztBQUN0QyxtQkFBTyxDQUFQLElB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QTFFLEVBQXVHLEtBQUssU0FBTCxDQUFlLENBQWYsRUFBa0IsTUFBbEIsQ0FBeUIsQ0FBekIsQ0FBdkcsRUFESjtBQUVJLGtDQUZKO0FBN0JKLHFCQUZ5QjtpQkFBN0I7YUFESiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJpbXBvcnQgQmxvYnMgZnJvbSAnLi9jYW52YXMvYmxvYnMuZXM2JztcclxuaW1wb3J0IEZpbHRlckNoYWluIGZyb20gJy4vY2FudmFzL2ZpbHRlcmNoYWluLmVzNic7XHJcbmltcG9ydCBDYW52YXNGaWx0ZXJzIGZyb20gJy4vY2FudmFzL2ZpbHRlcnMuZXM2JztcclxuaW1wb3J0IFdlYkdMRmlsdGVycyBmcm9tICcuL3dlYmdsL2ZpbHRlcnMuZXM2JztcclxuaW1wb3J0IFNoYWRlcnMgZnJvbSAnLi93ZWJnbC9zaGFkZXJzLmVzNic7XHJcbmltcG9ydCBUZXh0dXJlcyBmcm9tICcuL3dlYmdsL3RleHR1cmVzLmVzNic7XHJcbmltcG9ydCBVbmlmb3JtcyBmcm9tICcuL3dlYmdsL3VuaWZvcm1zLmVzNic7XHJcbmltcG9ydCBDb25zdGFudHMgZnJvbSAnLi93ZWJnbC9jb25zdGFudHMuZXM2JztcclxuXHJcbmV4cG9ydHMuaW1hZ2UgPSB7XHJcbiAgICBjYW52YXM6IHtcclxuICAgICAgICBibG9iczogQmxvYnMsXHJcbiAgICAgICAgZmlsdGVyY2hhaW46IEZpbHRlckNoYWluLFxyXG4gICAgICAgIGZpbHRlcnM6IENhbnZhc0ZpbHRlcnNcclxuICAgIH0sXHJcbiAgICB3ZWJnbDoge1xyXG4gICAgICAgIHNoYWRlcnM6IFNoYWRlcnMsXHJcbiAgICAgICAgdGV4dHVyZXM6IFRleHR1cmVzLFxyXG4gICAgICAgIHVuaWZvcm1zOiBVbmlmb3JtcyxcclxuICAgICAgICBmaWx0ZXJzOiBXZWJHTEZpbHRlcnMsXHJcbiAgICAgICAgY29uc3RhbnRzOiBDb25zdGFudHNcclxuICAgIH1cclxufTsiLCJleHBvcnQgZGVmYXVsdCB7XHJcbiAgICAvKipcclxuICAgICAqIG1pbml1bXVtIGJsb2JzaXplIGRlZmF1bHRcclxuICAgICAqL1xyXG4gICAgTUlOX0JMT0JfU0laRTo1MCxcclxuXHJcbiAgICAvKipcclxuICAgICAqIGZpbmQgYmxvYnNcclxuICAgICAqIEJMQUNLIEFORCBXSElURSBJTUFHRSBSRVFVSVJFRFxyXG4gICAgICogQHBhcmFtIHB4c1xyXG4gICAgICogQHJldHVybiB7QXJyYXl9IGJsb2IgY29vcmRpbmF0ZXNcclxuICAgICAqL1xyXG4gICAgZmluZEJsb2JzKHB4cywgY2ZnKSB7XHJcbiAgICAgICAgaWYgKCFjZmcpIHtcclxuICAgICAgICAgICAgY2ZnID0ge307XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgd2lkdGggPSBweHMud2lkdGg7XHJcbiAgICAgICAgdmFyIHJvd3NpemUgPSB3aWR0aCAqIDQ7XHJcbiAgICAgICAgdmFyIGxlbiA9IHB4cy5kYXRhLmxlbmd0aDtcclxuICAgICAgICB2YXIgcGl4ZWxzID0gbmV3IFVpbnQxNkFycmF5KHB4cy5kYXRhLmxlbmd0aCk7XHJcbiAgICAgICAgZm9yICh2YXIgZCA9IDA7IGQgPCBweHMuZGF0YS5sZW5ndGg7IGQrKykge1xyXG4gICAgICAgICAgICBwaXhlbHNbZF0gPSBweHMuZGF0YVtkXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGJsb2JzID0gW107XHJcbiAgICAgICAgdmFyIGJsb2JJbmRleCA9IC0xO1xyXG5cclxuICAgICAgICAvLyBjb250YWlucyBwaXhlbCBpbmRpY2VzIGZvciBibG9icyB0aGF0IHRvdWNoXHJcbiAgICAgICAgdmFyIGJsb2JUYWJsZSA9IFtdO1xyXG4gICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgbGVuOyBjICs9IDQpIHtcclxuICAgICAgICAgICAgaWYgKHBpeGVsc1tjXSA9PT0gMjU1KSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2YXIgbmVpZ2hib3JzID0gW2MgLSA0LCBjICsgNCwgYyAtIHJvd3NpemUsIGMgKyByb3dzaXplLCBjIC0gNCAtIHJvd3NpemUsIGMgKyA0IC0gcm93c2l6ZSwgYyAtIDQgKyByb3dzaXplLCBjICsgNCArIHJvd3NpemVdO1xyXG4gICAgICAgICAgICB2YXIgbnVtTmVpZ2hib3JzID0gbmVpZ2hib3JzLmxlbmd0aDtcclxuXHJcbiAgICAgICAgICAgIC8vIGp1c3QgY2hlY2sgb25lIGNoYW5uZWwsIGJlY2F1c2Ugd2UgYXNzdW1lIGV2ZXJ5IHB4IGlzIGJsYWNrIG9yIHdoaXRlXHJcbiAgICAgICAgICAgIHZhciBibG9iSW5kZXhGb3VuZCA9IC0xO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBuZWlnaGJvciA9IDA7IG5laWdoYm9yIDwgbnVtTmVpZ2hib3JzOyBuZWlnaGJvcisrKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAobmVpZ2hib3JzW25laWdoYm9yXSA+PSAwICYmIG5laWdoYm9yc1tuZWlnaGJvcl0gPCBsZW4gJiYgcGl4ZWxzW25laWdoYm9yc1tuZWlnaGJvcl1dID09PSBwaXhlbHNbY10pIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBpZiB0b3VjaGluZyBhIG5laWdoYm9yLCByZWNvcmQgaW5kZXggb2YgdGhhdCBibG9iIGluZGV4IG9mIHRoYXQgbmVpZ2hib3JcclxuICAgICAgICAgICAgICAgICAgICAvLyBhbHNvIGlmIHRvdWNoaW5nIGRpZmZlcmVudCBpbmRpY2VzLCByZWNvcmQgdGhhdCB0aGVzZSBpbmRpY2VzIHNob3VsZCBiZSB0aGUgc2FtZSBpbmRleFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIHRoZSBibG9iIHRhYmxlIHJlY29yZHMgd2hpY2ggYmxvYiBpbmRleCBtYXBzIHRvIHdoaWNoIG90aGVyIGJsb2IgaW5kZXhcclxuICAgICAgICAgICAgICAgICAgICBpZiAocGl4ZWxzW25laWdoYm9yc1tuZWlnaGJvcl0gKyAxXSA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGJsb2JJbmRleEZvdW5kICE9PSAtMSAmJiBibG9iSW5kZXhGb3VuZCAhPT0gcGl4ZWxzW25laWdoYm9yc1tuZWlnaGJvcl0gKyAxXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZ3JlZW4gY2hhbm5lbCAoKzEpIHJlY29yZHMgYmxvYiBpbmRleFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvYlRhYmxlLnB1c2goW2Jsb2JJbmRleEZvdW5kLCBwaXhlbHNbbmVpZ2hib3JzW25laWdoYm9yXSArIDFdXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgYmxvYkluZGV4Rm91bmQgPSBwaXhlbHNbbmVpZ2hib3JzW25laWdoYm9yXSArIDFdO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGJsb2JJbmRleEZvdW5kID4gLTEpIHtcclxuICAgICAgICAgICAgICAgIC8vIGJsb2IgaXMgZm91bmQsIG1hcmsgcGl4ZWwgYW5kIHJlY29yZCBpbiBibG9ic1xyXG4gICAgICAgICAgICAgICAgcGl4ZWxzW2MgKyAxXSA9IGJsb2JJbmRleEZvdW5kOyAvLyB1c2UgZ3JlZW4gY2hhbm5lbCBhcyBibG9iIHRyYWNrZXJcclxuICAgICAgICAgICAgICAgIGJsb2JzW2Jsb2JJbmRleEZvdW5kXS5wdXNoKGMpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gYnJhbmQgbmV3IGJsb2JcclxuICAgICAgICAgICAgICAgIGJsb2JJbmRleCsrO1xyXG4gICAgICAgICAgICAgICAgYmxvYnMucHVzaChbY10pO1xyXG4gICAgICAgICAgICAgICAgcGl4ZWxzW2MgKyAxXSA9IGJsb2JJbmRleDsgLy8gdXNlIGdyZWVuIGNoYW5uZWwgYXMgYmxvYiB0cmFja2VyXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIG1lcmdlIGludGVyc2VjdGluZyBwYWlyc1xyXG4gICAgICAgIC8vIG1heWJlIG5vdCB0aGUgbW9zdCBlZmZpY2llbnQgY29kZSwgYnV0IGJsb2IgY291bnQgc2hvdWxkIGJlIGZhaXJseSBsb3cgKGhvcGVmdWxseSlcclxuICAgICAgICAvLyByZXZpc2l0IGlmIHNwZWVkIGdldHMgaW4gdGhlIHdheVxyXG4gICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgYmxvYlRhYmxlLmxlbmd0aDsgYysrKSB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGQgPSAwOyBkIDwgYmxvYlRhYmxlLmxlbmd0aDsgZCsrKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgY29ubmVjdGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBlID0gMDsgZSA8IGJsb2JUYWJsZVtkXS5sZW5ndGg7IGUrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChibG9iVGFibGVbY10uaW5kZXhPZihibG9iVGFibGVbZF1bZV0pICE9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChjb25uZWN0ZWQgJiYgZCAhPT0gYykge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGYgPSAwOyBmIDwgYmxvYlRhYmxlW2RdLmxlbmd0aDsgZisrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9ubHkgYWRkIHVuaXF1ZXNcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGJsb2JUYWJsZVtjXS5pbmRleE9mKGJsb2JUYWJsZVtkXVtmXSkgPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBibG9iVGFibGVbY10ucHVzaChibG9iVGFibGVbZF1bZl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJsb2JUYWJsZVtkXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyB3ZWVkIG91dCBlbXB0aWVzXHJcbiAgICAgICAgYmxvYlRhYmxlID0gYmxvYlRhYmxlLmZpbHRlcihmdW5jdGlvbiAocGFpcikge1xyXG4gICAgICAgICAgICBpZiAocGFpci5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBlYWNoIGJsb2IgaXMgYSBsaXN0IG9mIGltYWdlIGluZGljZXNcclxuICAgICAgICAvLyB1c2UgYmxvYnMgaW5kZXggdG8gbWF0Y2ggdG8gYmxvYiB0YWJsZSBpbmRleCBhbmQgY29uY2F0IHRoZSBibG9icyBhdCB0aGF0IGluZGV4XHJcbiAgICAgICAgZm9yICh2YXIgYyA9IDA7IGMgPCBibG9icy5sZW5ndGg7IGMrKykge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBkID0gMDsgZCA8IGJsb2JUYWJsZS5sZW5ndGg7IGQrKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKGJsb2JUYWJsZVtkXS5pbmRleE9mKGMpICE9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGUgPSAwOyBlIDwgYmxvYlRhYmxlW2RdLmxlbmd0aDsgZSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChibG9iVGFibGVbZF1bZV0gIT09IGMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb2JzW2NdID0gYmxvYnNbY10uY29uY2F0KGJsb2JzW2Jsb2JUYWJsZVtkXVtlXV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvYnNbYmxvYlRhYmxlW2RdW2VdXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyByZWZpbmUgYmxvYnMgbm93IHRoYXQgdGhlIHJpZ2h0IHRoaW5ncyBhcmUgY29uY2F0ZWQgYW5kIHdlIGRvbid0IG5lZWQgdG8gdHJhY2tcclxuICAgICAgICAvLyBtZWFuaW5nIHdlIGNhbiBzdGFydCBzcGxpY2luZyB0aGluZ3Mgd2l0aG91dCB3b3JyeWluZyBhYm91dCB0aGUgaW5kZXhcclxuICAgICAgICBibG9icyA9IGJsb2JzLmZpbHRlcihmdW5jdGlvbiAoYmxiKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBibGIubGVuZ3RoID49IHRoaXMuTUlOX0JMT0JfU0laRTtcclxuICAgICAgICB9LCB0aGlzKTtcclxuXHJcblxyXG4gICAgICAgIC8vIGdldCBibG9iIGRpbWVuc2lvbnMgcG9zaXRpb25zXHJcbiAgICAgICAgdmFyIGJsb2JDb29yZHMgPSBbXTtcclxuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IGJsb2JzLmxlbmd0aDsgYysrKSB7XHJcbiAgICAgICAgICAgIHZhciBtaW5YID0gLTEsIG1heFggPSAtMSwgbWluWSA9IC0xLCBtYXhZID0gLTE7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGQgPSAwOyBkIDwgYmxvYnNbY10ubGVuZ3RoOyBkKyspIHtcclxuICAgICAgICAgICAgICAgIHZhciBweCA9IE1hdGguZmxvb3IoYmxvYnNbY11bZF0gLyA0KTtcclxuICAgICAgICAgICAgICAgIHZhciB4ID0gcHggJSB3aWR0aDtcclxuICAgICAgICAgICAgICAgIHZhciB5ID0gcGFyc2VJbnQocHggLyB3aWR0aCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHggPCBtaW5YIHx8IG1pblggPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWluWCA9IHg7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoeCA+IG1heFggfHwgbWF4WCA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICBtYXhYID0geDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICh5IDwgbWluWSB8fCBtaW5ZID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1pblkgPSB5O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKHkgPiBtYXhZIHx8IG1heFkgPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWF4WSA9IHk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYmxvYkNvb3Jkcy5wdXNoKHt4OiBtaW5YLCB5OiBtaW5ZLCB3aWR0aDogbWF4WCAtIG1pblgsIGhlaWdodDogbWF4WSAtIG1pbll9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHBhaW50IHRoZSBibG9ic1xyXG4gICAgICAgIGlmIChjZmcucGFpbnQpIHtcclxuICAgICAgICAgICAgZm9yICh2YXIgZCA9IDA7IGQgPCBibG9icy5sZW5ndGg7IGQrKykge1xyXG4gICAgICAgICAgICAgICAgdmFyIGNsciA9IFtNYXRoLnJhbmRvbSgpICogMjU1LCBNYXRoLnJhbmRvbSgpICogMjU1LCBNYXRoLnJhbmRvbSgpICogMjU1XTtcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGUgPSAwOyBlIDwgYmxvYnNbZF0ubGVuZ3RoOyBlKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBweHMuZGF0YVtibG9ic1tkXVtlXV0gPSBjbHJbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgcHhzLmRhdGFbYmxvYnNbZF1bZV0gKyAxXSA9IGNsclsxXTtcclxuICAgICAgICAgICAgICAgICAgICBweHMuZGF0YVtibG9ic1tkXVtlXSArIDJdID0gY2xyWzJdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB7aW1hZ2U6IHB4cywgYmxvYnM6IGJsb2JDb29yZHN9O1xyXG4gICAgfVxyXG59IiwiaW1wb3J0IEZpbHRlcnMgZnJvbSAnLi9maWx0ZXJzLmVzNic7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyB7XHJcbiAgICAvKipcclxuICAgICAqIGMtdG9yXHJcbiAgICAgKi9cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMucmVzdWx0ID0gcHhzO1xyXG4gICAgfTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIGNvbnZlcnQgaW1hZ2UgdG8gZ3JheXNjYWxlXHJcbiAgICAgKiBAcGFyYW0ge0ltYWdlRGF0YX0gcHhzXHJcbiAgICAgKiBAcmV0dXJucyB7Kn1cclxuICAgICAqL1xyXG4gICAgdG9HcmF5c2NhbGUoKSB7XHJcbiAgICAgICAgdGhpcy5yZXN1bHQgPSBGaWx0ZXJzLnRvR3JheXNjYWxlKHRoaXMucmVzdWx0KTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH07XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBzYXR1cmF0ZSBpbWFnZVxyXG4gICAgICogQHBhcmFtIHtJbWFnZURhdGF9IHB4c1xyXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHBlcmNlbnRhbW91bnQgcGVyY2VudGFnZSBzYXR1cmF0aW9uXHJcbiAgICAgKiBAcmV0dXJucyB7Kn1cclxuICAgICAqL1xyXG4gICAgc2F0dXJhdGUocGVyY2VudGFtb3VudCkge1xyXG4gICAgICAgIHRoaXMucmVzdWx0ID0gRmlsdGVycy5zYXR1cmF0ZSh0aGlzLnJlc3VsdCwgcGVyY2VudGFtb3VudCk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogY29udmVydCB0byBwdXJlIGJsYWNrIG9yIHB1cmUgd2hpdGVcclxuICAgICAqIEBwYXJhbSBweHNcclxuICAgICAqIEBwYXJhbSBweHNcclxuICAgICAqIEByZXR1cm5zIHsqfVxyXG4gICAgICovXHJcbiAgICB0b0JsYWNrQW5kV2hpdGUodGhyZXNob2xkdG9ibGFja3BlcmNlbnQpIHtcclxuICAgICAgICB0aGlzLnJlc3VsdCA9IEZpbHRlcnMudG9CbGFja0FuZFdoaXRlKHRoaXMucmVzdWx0LCB0aHJlc2hvbGR0b2JsYWNrcGVyY2VudCk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogY29udmVydCAyIGltYWdlcyB0byBhbiBpbWFnZSBoaWdobGlnaHRpbmcgZGlmZmVyZW5jZXNcclxuICAgICAqIEBwYXJhbSBweHMxXHJcbiAgICAgKiBAcGFyYW0gcHhzMlxyXG4gICAgICogQHBhcmFtIHRvbGVyYW5jZVxyXG4gICAgICogQHJldHVybnMgeyp9XHJcbiAgICAgKi9cclxuICAgIHRvRGlmZihjb21wYXJlLCB0b2xlcmFuY2UpIHtcclxuICAgICAgICB0aGlzLnJlc3VsdCA9IEZpbHRlcnMudG9EaWZmKHRoaXMucmVzdWx0LCBjb21wYXJlLCB0b2xlcmFuY2UpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG59IiwiZXhwb3J0IGRlZmF1bHQge1xyXG4gICAgLyoqXHJcbiAgICAgKiBjb252ZXJ0IGltYWdlIHRvIGdyYXlzY2FsZVxyXG4gICAgICogQHBhcmFtIHtJbWFnZURhdGF9IHB4c1xyXG4gICAgICogQHJldHVybnMgeyp9XHJcbiAgICAgKi9cclxuICAgIHRvR3JheXNjYWxlKHB4cykge1xyXG4gICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgcHhzLmRhdGEubGVuZ3RoOyBjKz00KSB7XHJcbiAgICAgICAgICAgIHZhciBncmF5ID0gKHB4cy5kYXRhW2NdICsgcHhzLmRhdGFbYysxXSArIHB4cy5kYXRhW2MrMl0pLzM7XHJcbiAgICAgICAgICAgIHB4cy5kYXRhW2NdID0gcHhzLmRhdGFbYysxXSA9IHB4cy5kYXRhW2MrMl0gPSBncmF5O1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcHhzO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIHNhdHVyYXRlIGltYWdlXHJcbiAgICAgKiBAcGFyYW0ge0ltYWdlRGF0YX0gcHhzXHJcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gcGVyY2VudGFtb3VudCBwZXJjZW50YWdlIHNhdHVyYXRpb25cclxuICAgICAqIEByZXR1cm5zIHsqfVxyXG4gICAgICovXHJcbiAgICBzYXR1cmF0ZShweHMsIHBlcmNlbnRhbW91bnQpIHtcclxuICAgICAgICBpZiAoIXBlcmNlbnRhbW91bnQpIHsgcGVyY2VudGFtb3VudCA9IDUwOyB9XHJcbiAgICAgICAgdmFyIGFtdCA9IHBlcmNlbnRhbW91bnQvMTAwICogMjU1O1xyXG4gICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgcHhzLmRhdGEubGVuZ3RoOyBjKz00KSB7XHJcbiAgICAgICAgICAgIHB4cy5kYXRhW2NdID0gcHhzLmRhdGFbY10gKyBhbXQ7XHJcbiAgICAgICAgICAgIHB4cy5kYXRhW2MrMV0gPSBweHMuZGF0YVtjKzFdICsgYW10O1xyXG4gICAgICAgICAgICBweHMuZGF0YVtjKzJdID0gcHhzLmRhdGFbYysyXSArIGFtdDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHB4cztcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBjb252ZXJ0IDIgaW1hZ2VzIHRvIGFuIGltYWdlIGhpZ2hsaWdodGluZyBkaWZmZXJlbmNlc1xyXG4gICAgICogQHBhcmFtIHB4czFcclxuICAgICAqIEBwYXJhbSBweHMyXHJcbiAgICAgKiBAcGFyYW0gdG9sZXJhbmNlXHJcbiAgICAgKiBAcmV0dXJucyB7Kn1cclxuICAgICAqL1xyXG4gICAgdG9EaWZmKHB4czEsIHB4czIsIHRvbGVyYW5jZSkge1xyXG4gICAgICAgIGlmIChweHMxLmRhdGEubGVuZ3RoICE9PSBweHMyLmRhdGEubGVuZ3RoKSB7IHRocm93IG5ldyBFcnJvcignaW1hZ2VzIG5vdCB0aGUgc2FtZSBzaXplJyk7IH1cclxuICAgICAgICB2YXIgZGlmZiA9IG5ldyBJbWFnZURhdGEocHhzMS53aWR0aCwgcHhzMS5oZWlnaHQpO1xyXG4gICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgcHhzMS5kYXRhLmxlbmd0aDsgYys9NCkge1xyXG4gICAgICAgICAgICB2YXIgZHJhdyA9IDI1NTtcclxuICAgICAgICAgICAgZm9yICh2YXIgZCA9IDA7IGQgPCA0OyBkKyspIHtcclxuICAgICAgICAgICAgICAgIGlmIChweHMxLmRhdGFbYytkXSAtIHB4czIuZGF0YVtjK2RdID4gdG9sZXJhbmNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZHJhdyA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGRpZmYuZGF0YVtjXSA9IGRyYXc7XHJcbiAgICAgICAgICAgIGRpZmYuZGF0YVtjKzFdID0gZHJhdztcclxuICAgICAgICAgICAgZGlmZi5kYXRhW2MrMl0gPSBkcmF3O1xyXG4gICAgICAgICAgICBkaWZmLmRhdGFbYyszXT0gMjU1O1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZGlmZjtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBjb252ZXJ0IHRvIHB1cmUgYmxhY2sgb3IgcHVyZSB3aGl0ZVxyXG4gICAgICogQHBhcmFtIHB4c1xyXG4gICAgICogQHBhcmFtIHB4c1xyXG4gICAgICogQHJldHVybnMgeyp9XHJcbiAgICAgKi9cclxuICAgIHRvQmxhY2tBbmRXaGl0ZShweHMsIHRocmVzaG9sZHRvYmxhY2twZXJjZW50KSB7XHJcbiAgICAgICAgaWYgKCF0aHJlc2hvbGR0b2JsYWNrcGVyY2VudCkgeyB0aHJlc2hvbGR0b2JsYWNrcGVyY2VudCA9IDUwOyB9XHJcbiAgICAgICAgdmFyIHRocmVzaG9sZCA9IHRocmVzaG9sZHRvYmxhY2twZXJjZW50LzEwMCAqICgyNTUgKyAyNTUgKyAyNTUpO1xyXG4gICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgcHhzLmRhdGEubGVuZ3RoOyBjKz00KSB7XHJcbiAgICAgICAgICAgIGlmIChweHMuZGF0YVtjXSArIHB4cy5kYXRhW2MrMV0gKyBweHMuZGF0YVtjKzJdIDwgdGhyZXNob2xkICkge1xyXG4gICAgICAgICAgICAgICAgcHhzLmRhdGFbY10gPSAwO1xyXG4gICAgICAgICAgICAgICAgcHhzLmRhdGFbYysxXSA9IDA7XHJcbiAgICAgICAgICAgICAgICBweHMuZGF0YVtjKzJdID0gMDtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHB4cy5kYXRhW2NdID0gMjU1O1xyXG4gICAgICAgICAgICAgICAgcHhzLmRhdGFbYysxXSA9IDI1NTtcclxuICAgICAgICAgICAgICAgIHB4cy5kYXRhW2MrMl0gPSAyNTU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBweHM7XHJcbiAgICB9XHJcbn0iLCJleHBvcnQgZGVmYXVsdCB7XHJcbiAgICB1bmlmb3Jtczoge1xyXG4gICAgICAgIFVOSUZPUk0xZjogJzFmJyxcclxuICAgICAgICBVTklGT1JNMmY6ICcyZicsXHJcbiAgICAgICAgVU5JRk9STTNmOiAnM2YnLFxyXG4gICAgICAgIFVOSUZPUk00ZjogJzRmJyxcclxuXHJcbiAgICAgICAgVU5JRk9STTFpOiAnMWknLFxyXG4gICAgICAgIFVOSUZPUk0yaTogJzJpJyxcclxuICAgICAgICBVTklGT1JNM2k6ICczaScsXHJcbiAgICAgICAgVU5JRk9STTRpOiAnNGknXHJcbiAgICB9XHJcbn0iLCJpbXBvcnQgQ29uc3RhbnRzIGZyb20gJy4vY29uc3RhbnRzLmVzNic7XHJcbmltcG9ydCBTaGFkZXJzIGZyb20gJy4vc2hhZGVycy5lczYnO1xyXG5pbXBvcnQgRmlsdGVycyBmcm9tICcuL2ZpbHRlcnMuZXM2JztcclxuaW1wb3J0IFRleHR1cmVzIGZyb20gJy4vdGV4dHVyZXMuZXM2JztcclxuaW1wb3J0IFVuaWZvcm1zIGZyb20gJy4vdW5pZm9ybXMuZXM2JztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IHtcclxuICAgIC8qKlxyXG4gICAgICogY3JlYXRlIGZpbHRlciBmcm9tIHNoYWRlcnNcclxuICAgICAqIEBwYXJhbSB2ZXJ0ZXhTaGFkZXJcclxuICAgICAqIEBwYXJhbSBmcmFnbWVudFNoYWRlclxyXG4gICAgICogQHJldHVybnMge3t2ZXJ0ZXhTaGFkZXI6ICosIGZyYWdtZW50U2hhZGVyOiAqfX1cclxuICAgICAqL1xyXG4gICAgY3JlYXRlRmlsdGVyRnJvbVNoYWRlcnModmVydGV4U2hhZGVyLCBmcmFnbWVudFNoYWRlcikge1xyXG4gICAgICAgIHJldHVybiB7IHZlcnRleFNoYWRlcjogdmVydGV4U2hhZGVyLCBmcmFnbWVudFNoYWRlcjogZnJhZ21lbnRTaGFkZXIgfTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBjcmVhdGUgYSBmaWx0ZXIgZnJvbSBmaWx0ZXIgbmFtZVxyXG4gICAgICogQHBhcmFtIG5hbWVcclxuICAgICAqIEBwYXJhbSBtZW1vcnkgc3BhY2UvdmFyaWFibGUgdG8gcHVsbCBzaGFkZXIgZnJvbVxyXG4gICAgICovXHJcbiAgICBjcmVhdGVGaWx0ZXJGcm9tTmFtZShuYW1lLCBzaGFkZXJsb2MpIHtcclxuICAgICAgICBpZiAoIXNoYWRlcmxvYykge1xyXG4gICAgICAgICAgICBzaGFkZXJsb2MgPSBTaGFkZXJzO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIXNoYWRlcmxvY1tuYW1lXSkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnU2hhZGVyICcsIG5hbWUsICdub3QgZm91bmQgaW4gJywgc2hhZGVybG9jLCAnIHVzaW5nIGEgcGFzc3Rocm91Z2ggc2hhZGVyIGluc3RlYWQnKTtcclxuICAgICAgICAgICAgc2hhZGVybG9jID0gU2hhZGVycztcclxuICAgICAgICAgICAgbmFtZSA9ICdwYXNzdGhyb3VnaCc7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciB2dHggPSBzaGFkZXJsb2NbbmFtZV0udmVydGV4O1xyXG4gICAgICAgIHZhciBmcmcgPSBzaGFkZXJsb2NbbmFtZV0uZnJhZ21lbnQ7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlRmlsdGVyRnJvbVNoYWRlcnModnR4LCBmcmcpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIGNyZWF0ZSBvYmplY3QgZm9yIHJlbmRlclxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9cGFyYW1zXHJcbiAgICAgKi9cclxuICAgIGNyZWF0ZVJlbmRlck9iamVjdChwYXJhbXMpIHtcclxuICAgICAgICB2YXIgcHJvcHMgPSB7fTtcclxuXHJcbiAgICAgICAgcHJvcHMuZ2wgPSBwYXJhbXMuZ2w7XHJcbiAgICAgICAgcHJvcHMud2lkdGggPSBwcm9wcy5nbC5jYW52YXMud2lkdGg7XHJcbiAgICAgICAgcHJvcHMuaGVpZ2h0ID0gcHJvcHMuZ2wuY2FudmFzLmhlaWdodDtcclxuXHJcbiAgICAgICAgaWYgKHBhcmFtcy53aWR0aCkgeyBwcm9wcy53aWR0aCA9IHBhcmFtcy53aWR0aDsgfVxyXG4gICAgICAgIGlmIChwYXJhbXMuaGVpZ2h0KSB7IHByb3BzLmhlaWdodCA9IHBhcmFtcy5oZWlnaHQ7IH1cclxuXHJcbiAgICAgICAgcHJvcHMuZmlsdGVyID0gcGFyYW1zLmZpbHRlcjtcclxuICAgICAgICBwcm9wcy50ZXh0dXJlcyA9IG5ldyBUZXh0dXJlcyhwcm9wcy53aWR0aCxwcm9wcy5oZWlnaHQpO1xyXG5cclxuICAgICAgICBwcm9wcy5jYW52YXMyREhlbHBlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xyXG4gICAgICAgIHByb3BzLmNhbnZhczJESGVscGVyLndpZHRoID0gcHJvcHMud2lkdGg7XHJcbiAgICAgICAgcHJvcHMuY2FudmFzMkRIZWxwZXIuaGVpZ2h0ID0gcHJvcHMuaGVpZ2h0O1xyXG4gICAgICAgIHByb3BzLmNhbnZhczJESGVscGVyQ29udGV4dCA9IHByb3BzLmNhbnZhczJESGVscGVyLmdldENvbnRleHQoJzJkJyk7XHJcblxyXG4gICAgICAgIHByb3BzLnVuaWZvcm1zID0gbmV3IFVuaWZvcm1zKCk7XHJcbiAgICAgICAgcHJvcHMudGV4dHVyZXMgPSBuZXcgVGV4dHVyZXMocHJvcHMuZ2wsIHByb3BzLndpZHRoLCBwcm9wcy5oZWlnaHQpO1xyXG5cclxuICAgICAgICBpZiAocGFyYW1zLnRleHR1cmVzKSB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgcGFyYW1zLnRleHR1cmVzLmxlbmd0aDsgYysrKSB7XHJcbiAgICAgICAgICAgICAgICBwcm9wcy50ZXh0dXJlcy5hZGQocGFyYW1zLnRleHR1cmVzW2NdLm5hbWUsIHBhcmFtcy50ZXh0dXJlc1tjXS50ZXh0dXJlLCBwYXJhbXMudGV4dHVyZXNbY10uaW5kZXgsIHBhcmFtcy50ZXh0dXJlc1tjXS5waXhlbFN0b3JlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHBhcmFtcy51bmlmb3Jtcykge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IHBhcmFtcy51bmlmb3Jtcy5sZW5ndGg7IGMrKykge1xyXG4gICAgICAgICAgICAgICAgcHJvcHMudW5pZm9ybXMuYWRkKHBhcmFtcy51bmlmb3Jtc1tjXS5uYW1lLCBwYXJhbXMudW5pZm9ybXNbY10udHlwZSwgcGFyYW1zLnVuaWZvcm1zW2NdLnZhbHVlcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChwYXJhbXMuYXV0b3JlbmRlcikge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZW5kZXIocHJvcHMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHByb3BzO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIHJlbmRlciBXZWJHTCBmaWx0ZXIgb24gY3VycmVudCB0ZXh0dXJlXHJcbiAgICAgKiBAcGFyYW0gZ2xwcm9wc1xyXG4gICAgICogQHBhcmFtIHJlZnJlc2hUZXh0dXJlSW5kaWNlcyB0ZXh0dXJlIHJlZnJlc2ggaW5kaWNlcyAob3B0aW9uYWwpXHJcbiAgICAgKiBAcmV0dXJucyB7Kn1cclxuICAgICAqL1xyXG4gICAgcmVuZGVyKGdscHJvcHMpIHtcclxuICAgICAgICBpZiAoIWdscHJvcHMuaXNJbml0aWFsaXplZCkge1xyXG4gICAgICAgICAgICB2YXIgdmVydGV4U2hhZGVyID0gZ2xwcm9wcy5nbC5jcmVhdGVTaGFkZXIoZ2xwcm9wcy5nbC5WRVJURVhfU0hBREVSKTtcclxuICAgICAgICAgICAgZ2xwcm9wcy5nbC5zaGFkZXJTb3VyY2UodmVydGV4U2hhZGVyLCBnbHByb3BzLmZpbHRlci52ZXJ0ZXhTaGFkZXIpO1xyXG4gICAgICAgICAgICBnbHByb3BzLmdsLmNvbXBpbGVTaGFkZXIodmVydGV4U2hhZGVyKTtcclxuXHJcbiAgICAgICAgICAgIHZhciBmcmFnbWVudFNoYWRlciA9IGdscHJvcHMuZ2wuY3JlYXRlU2hhZGVyKGdscHJvcHMuZ2wuRlJBR01FTlRfU0hBREVSKTtcclxuICAgICAgICAgICAgZ2xwcm9wcy5nbC5zaGFkZXJTb3VyY2UoZnJhZ21lbnRTaGFkZXIsIGdscHJvcHMuZmlsdGVyLmZyYWdtZW50U2hhZGVyKTtcclxuICAgICAgICAgICAgZ2xwcm9wcy5nbC5jb21waWxlU2hhZGVyKGZyYWdtZW50U2hhZGVyKTtcclxuXHJcbiAgICAgICAgICAgIGdscHJvcHMucHJvZ3JhbSA9IGdscHJvcHMuZ2wuY3JlYXRlUHJvZ3JhbSgpO1xyXG4gICAgICAgICAgICBnbHByb3BzLmdsLmF0dGFjaFNoYWRlcihnbHByb3BzLnByb2dyYW0sIHZlcnRleFNoYWRlcik7XHJcbiAgICAgICAgICAgIGdscHJvcHMuZ2wuYXR0YWNoU2hhZGVyKGdscHJvcHMucHJvZ3JhbSwgZnJhZ21lbnRTaGFkZXIpO1xyXG4gICAgICAgICAgICBnbHByb3BzLmdsLmxpbmtQcm9ncmFtKGdscHJvcHMucHJvZ3JhbSk7XHJcbiAgICAgICAgICAgIGdscHJvcHMuZ2wudXNlUHJvZ3JhbShnbHByb3BzLnByb2dyYW0pO1xyXG5cclxuICAgICAgICAgICAgdmFyIHBvc2l0aW9uTG9jYXRpb24gPSBnbHByb3BzLmdsLmdldEF0dHJpYkxvY2F0aW9uKGdscHJvcHMucHJvZ3JhbSwgJ2FfcG9zaXRpb24nKTtcclxuICAgICAgICAgICAgdmFyIHRleENvb3JkQnVmZmVyID0gZ2xwcm9wcy5nbC5jcmVhdGVCdWZmZXIoKTtcclxuICAgICAgICAgICAgdmFyIHJlY3RDb29yZEJ1ZmZlciA9IGdscHJvcHMuZ2wuY3JlYXRlQnVmZmVyKCk7XHJcbiAgICAgICAgICAgIHZhciB0ZXhDb29yZHMgPSBuZXcgRmxvYXQzMkFycmF5KFswLjAsICAwLjAsIDEuMCwgIDAuMCwgMC4wLCAgMS4wLCAwLjAsICAxLjAsIDEuMCwgIDAuMCwgMS4wLCAgMS4wXSk7XHJcbiAgICAgICAgICAgIHZhciByZWN0Q29vcmRzID0gbmV3IEZsb2F0MzJBcnJheShbMCwgMCwgZ2xwcm9wcy50ZXh0dXJlcy53aWR0aCwgMCwgMCwgZ2xwcm9wcy50ZXh0dXJlcy5oZWlnaHQsIDAsXHJcbiAgICAgICAgICAgICAgICBnbHByb3BzLnRleHR1cmVzLmhlaWdodCwgZ2xwcm9wcy50ZXh0dXJlcy53aWR0aCwgMCwgZ2xwcm9wcy50ZXh0dXJlcy53aWR0aCwgZ2xwcm9wcy50ZXh0dXJlcy5oZWlnaHRdKTtcclxuXHJcbiAgICAgICAgICAgIGdscHJvcHMuZ2wuYmluZEJ1ZmZlcihnbHByb3BzLmdsLkFSUkFZX0JVRkZFUiwgdGV4Q29vcmRCdWZmZXIpO1xyXG4gICAgICAgICAgICBnbHByb3BzLmdsLmJ1ZmZlckRhdGEoZ2xwcm9wcy5nbC5BUlJBWV9CVUZGRVIsIHRleENvb3JkcywgZ2xwcm9wcy5nbC5TVEFUSUNfRFJBVyk7XHJcblxyXG4gICAgICAgICAgICB2YXIgdGV4Q29vcmRMb2NhdGlvbiA9IGdscHJvcHMuZ2wuZ2V0QXR0cmliTG9jYXRpb24oZ2xwcm9wcy5wcm9ncmFtLCAnYV90ZXhDb29yZCcpO1xyXG4gICAgICAgICAgICBnbHByb3BzLmdsLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KHRleENvb3JkTG9jYXRpb24pO1xyXG4gICAgICAgICAgICBnbHByb3BzLmdsLnZlcnRleEF0dHJpYlBvaW50ZXIodGV4Q29vcmRMb2NhdGlvbiwgMiwgZ2xwcm9wcy5nbC5GTE9BVCwgZmFsc2UsIDAsIDApO1xyXG5cclxuICAgICAgICAgICAgZ2xwcm9wcy51bmlmb3Jtcy5hZGQoJ3VfcmVzb2x1dGlvbicsIENvbnN0YW50cy51bmlmb3Jtcy5VTklGT1JNMmYsIFtnbHByb3BzLmdsLmNhbnZhcy53aWR0aCwgZ2xwcm9wcy5nbC5jYW52YXMuaGVpZ2h0XSk7XHJcbiAgICAgICAgICAgIGdscHJvcHMudW5pZm9ybXMuYWRkKCdmX3Jlc29sdXRpb24nLCBDb25zdGFudHMudW5pZm9ybXMuVU5JRk9STTJmLCBbZ2xwcm9wcy5nbC5jYW52YXMud2lkdGgsIGdscHJvcHMuZ2wuY2FudmFzLmhlaWdodF0pO1xyXG5cclxuICAgICAgICAgICAgZ2xwcm9wcy5nbC5iaW5kQnVmZmVyKGdscHJvcHMuZ2wuQVJSQVlfQlVGRkVSLCByZWN0Q29vcmRCdWZmZXIpO1xyXG4gICAgICAgICAgICBnbHByb3BzLmdsLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KHBvc2l0aW9uTG9jYXRpb24pO1xyXG4gICAgICAgICAgICBnbHByb3BzLmdsLnZlcnRleEF0dHJpYlBvaW50ZXIocG9zaXRpb25Mb2NhdGlvbiwgMiwgZ2xwcm9wcy5nbC5GTE9BVCwgZmFsc2UsIDAsIDApO1xyXG4gICAgICAgICAgICBnbHByb3BzLmdsLmJ1ZmZlckRhdGEoZ2xwcm9wcy5nbC5BUlJBWV9CVUZGRVIsIHJlY3RDb29yZHMsIGdscHJvcHMuZ2wuU1RBVElDX0RSQVcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ2xwcm9wcy50ZXh0dXJlcy5pbml0aWFsaXplTmV3VGV4dHVyZXMoZ2xwcm9wcy5wcm9ncmFtKTtcclxuICAgICAgICBnbHByb3BzLnRleHR1cmVzLnJlZnJlc2hTY2VuZSgpO1xyXG4gICAgICAgIGdscHJvcHMudW5pZm9ybXMudXBkYXRlUHJvZ3JhbShnbHByb3BzLmdsLCBnbHByb3BzLnByb2dyYW0pO1xyXG5cclxuICAgICAgICBnbHByb3BzLmdsLmRyYXdBcnJheXMoZ2xwcm9wcy5nbC5UUklBTkdMRVMsIDAsIDYpO1xyXG4gICAgICAgIGdscHJvcHMuaXNJbml0aWFsaXplZCA9IHRydWU7XHJcblxyXG4gICAgICAgIHJldHVybiBnbHByb3BzO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIHJlYWQgcGl4ZWxzIGZyb20gR0wgY29udGV4dFxyXG4gICAgICogQHBhcmFtIGdsUHJvcHNcclxuICAgICAqL1xyXG4gICAgZ2V0Q2FudmFzUGl4ZWxzKGdscHJvcHMpIHtcclxuICAgICAgICB2YXIgZ2xjdHggPSBnbHByb3BzLmdsO1xyXG4gICAgICAgIGlmICghZ2xwcm9wcy5waXhlbGFycmF5KSB7XHJcbiAgICAgICAgICAgIGdscHJvcHMucGl4ZWxhcnJheSA9IG5ldyBVaW50OEFycmF5KGdsY3R4LmNhbnZhcy53aWR0aCAqIGdsY3R4LmNhbnZhcy5oZWlnaHQgKiA0KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZ2xjdHgucmVhZFBpeGVscygwLCAwLCBnbGN0eC5jYW52YXMud2lkdGgsIGdsY3R4LmNhbnZhcy5oZWlnaHQsIGdsY3R4LlJHQkEsIGdsY3R4LlVOU0lHTkVEX0JZVEUsIGdscHJvcHMucGl4ZWxhcnJheSk7XHJcbiAgICAgICAgdmFyIGltZ0RhdGEgPSBnbHByb3BzLmNhbnZhczJESGVscGVyQ29udGV4dC5jcmVhdGVJbWFnZURhdGEoZ2xjdHguY2FudmFzLndpZHRoLCBnbGN0eC5jYW52YXMuaGVpZ2h0KTtcclxuICAgICAgICBpbWdEYXRhLmRhdGEuc2V0KG5ldyBVaW50OENsYW1wZWRBcnJheShnbHByb3BzLnBpeGVsYXJyYXkpKTtcclxuICAgICAgICByZXR1cm4gaW1nRGF0YTtcclxuICAgIH1cclxufTsiLCJleHBvcnQgZGVmYXVsdCB7XG4gIFwiZnJlaWNoZW5fZWRnZV9kZXRlY3Rpb25cIjoge1xuICAgIFwiZnJhZ21lbnRcIjogXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDsgdW5pZm9ybSBzYW1wbGVyMkQgdV9pbWFnZTA7IHZhcnlpbmcgdmVjMiB2X3RleENvb3JkOyB1bmlmb3JtIHZlYzIgZl9yZXNvbHV0aW9uOyB2ZWMyIHRleGVsID0gdmVjMigxLjAgLyBmX3Jlc29sdXRpb24ueCwgMS4wIC8gZl9yZXNvbHV0aW9uLnkpOyBtYXQzIEdbOV07ICBjb25zdCBtYXQzIGcwID0gbWF0MyggMC4zNTM1NTMzODQ1NDI0NjUyLCAwLCAtMC4zNTM1NTMzODQ1NDI0NjUyLCAwLjUsIDAsIC0wLjUsIDAuMzUzNTUzMzg0NTQyNDY1MiwgMCwgLTAuMzUzNTUzMzg0NTQyNDY1MiApOyBjb25zdCBtYXQzIGcxID0gbWF0MyggMC4zNTM1NTMzODQ1NDI0NjUyLCAwLjUsIDAuMzUzNTUzMzg0NTQyNDY1MiwgMCwgMCwgMCwgLTAuMzUzNTUzMzg0NTQyNDY1MiwgLTAuNSwgLTAuMzUzNTUzMzg0NTQyNDY1MiApOyBjb25zdCBtYXQzIGcyID0gbWF0MyggMCwgMC4zNTM1NTMzODQ1NDI0NjUyLCAtMC41LCAtMC4zNTM1NTMzODQ1NDI0NjUyLCAwLCAwLjM1MzU1MzM4NDU0MjQ2NTIsIDAuNSwgLTAuMzUzNTUzMzg0NTQyNDY1MiwgMCApOyBjb25zdCBtYXQzIGczID0gbWF0MyggMC41LCAtMC4zNTM1NTMzODQ1NDI0NjUyLCAwLCAtMC4zNTM1NTMzODQ1NDI0NjUyLCAwLCAwLjM1MzU1MzM4NDU0MjQ2NTIsIDAsIDAuMzUzNTUzMzg0NTQyNDY1MiwgLTAuNSApOyBjb25zdCBtYXQzIGc0ID0gbWF0MyggMCwgLTAuNSwgMCwgMC41LCAwLCAwLjUsIDAsIC0wLjUsIDAgKTsgY29uc3QgbWF0MyBnNSA9IG1hdDMoIC0wLjUsIDAsIDAuNSwgMCwgMCwgMCwgMC41LCAwLCAtMC41ICk7IGNvbnN0IG1hdDMgZzYgPSBtYXQzKCAwLjE2NjY2NjY3MTYzMzcyMDQsIC0wLjMzMzMzMzM0MzI2NzQ0MDgsIDAuMTY2NjY2NjcxNjMzNzIwNCwgLTAuMzMzMzMzMzQzMjY3NDQwOCwgMC42NjY2NjY2ODY1MzQ4ODE2LCAtMC4zMzMzMzMzNDMyNjc0NDA4LCAwLjE2NjY2NjY3MTYzMzcyMDQsIC0wLjMzMzMzMzM0MzI2NzQ0MDgsIDAuMTY2NjY2NjcxNjMzNzIwNCApOyBjb25zdCBtYXQzIGc3ID0gbWF0MyggLTAuMzMzMzMzMzQzMjY3NDQwOCwgMC4xNjY2NjY2NzE2MzM3MjA0LCAtMC4zMzMzMzMzNDMyNjc0NDA4LCAwLjE2NjY2NjY3MTYzMzcyMDQsIDAuNjY2NjY2Njg2NTM0ODgxNiwgMC4xNjY2NjY2NzE2MzM3MjA0LCAtMC4zMzMzMzMzNDMyNjc0NDA4LCAwLjE2NjY2NjY3MTYzMzcyMDQsIC0wLjMzMzMzMzM0MzI2NzQ0MDggKTsgY29uc3QgbWF0MyBnOCA9IG1hdDMoIDAuMzMzMzMzMzQzMjY3NDQwOCwgMC4zMzMzMzMzNDMyNjc0NDA4LCAwLjMzMzMzMzM0MzI2NzQ0MDgsIDAuMzMzMzMzMzQzMjY3NDQwOCwgMC4zMzMzMzMzNDMyNjc0NDA4LCAwLjMzMzMzMzM0MzI2NzQ0MDgsIDAuMzMzMzMzMzQzMjY3NDQwOCwgMC4zMzMzMzMzNDMyNjc0NDA4LCAwLjMzMzMzMzM0MzI2NzQ0MDggKTsgIHZvaWQgbWFpbih2b2lkKSB7ICAgICAgR1swXSA9IGcwLCAgICAgR1sxXSA9IGcxLCAgICAgR1syXSA9IGcyLCAgICAgR1szXSA9IGczLCAgICAgR1s0XSA9IGc0LCAgICAgR1s1XSA9IGc1LCAgICAgR1s2XSA9IGc2LCAgICAgR1s3XSA9IGc3LCAgICAgR1s4XSA9IGc4OyAgICAgIG1hdDMgSTsgICAgIGZsb2F0IGNudls5XTsgICAgIHZlYzMgc2FtcGw7ICAgICAgZm9yIChmbG9hdCBpPTAuMDsgaTwzLjA7IGkrKykgeyAgICAgICAgIGZvciAoZmxvYXQgaj0wLjA7IGo8My4wOyBqKyspIHsgICAgICAgICAgICAgc2FtcGwgPSB0ZXh0dXJlMkQodV9pbWFnZTAsIHZfdGV4Q29vcmQgKyB0ZXhlbCAqIHZlYzIoaS0xLjAsai0xLjApICkucmdiOyAgICAgICAgICAgICBJW2ludChpKV1baW50KGopXSA9IGxlbmd0aChzYW1wbCk7ICAgICAgICAgfSAgICAgfSAgICAgIGZvciAoaW50IGk9MDsgaTw5OyBpKyspIHsgICAgICAgICBmbG9hdCBkcDMgPSBkb3QoR1tpXVswXSwgSVswXSkgKyBkb3QoR1tpXVsxXSwgSVsxXSkgKyBkb3QoR1tpXVsyXSwgSVsyXSk7ICAgICAgICAgY252W2ldID0gZHAzICogZHAzOyAgICAgfSAgICAgIGZsb2F0IE0gPSAoY252WzBdICsgY252WzFdKSArIChjbnZbMl0gKyBjbnZbM10pOyAgICAgZmxvYXQgUyA9IChjbnZbNF0gKyBjbnZbNV0pICsgKGNudls2XSArIGNudls3XSkgKyAoY252WzhdICsgTSk7ICAgICAgZ2xfRnJhZ0NvbG9yID0gdmVjNCh2ZWMzKHNxcnQoTS9TKSksIHRleHR1cmUyRCggdV9pbWFnZTAsIHZfdGV4Q29vcmQgKS5hICk7IH1cIixcbiAgICBcInZlcnRleFwiOiBcImF0dHJpYnV0ZSB2ZWMyIGFfcG9zaXRpb247IGF0dHJpYnV0ZSB2ZWMyIGFfdGV4Q29vcmQ7IHVuaWZvcm0gdmVjMiB1X3Jlc29sdXRpb247IHZhcnlpbmcgdmVjMiB2X3RleENvb3JkOyAgdm9pZCBtYWluKCkgeyAgICAgdmVjMiB6ZXJvVG9PbmUgPSBhX3Bvc2l0aW9uIC8gdV9yZXNvbHV0aW9uOyAgICAgdmVjMiB6ZXJvVG9Ud28gPSB6ZXJvVG9PbmUgKiAyLjA7ICAgICB2ZWMyIGNsaXBTcGFjZSA9IHplcm9Ub1R3byAtIDEuMDsgICAgIGdsX1Bvc2l0aW9uID0gdmVjNChjbGlwU3BhY2UgKiB2ZWMyKDEsIC0xKSwgMCwgMSk7ICAgICB2X3RleENvb3JkID0gYV90ZXhDb29yZDsgfVwiXG4gIH0sXG4gIFwiZ3JleXNjYWxlXCI6IHtcbiAgICBcImZyYWdtZW50XCI6IFwicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7IHZhcnlpbmcgdmVjMiB2X3RleENvb3JkOyAgdW5pZm9ybSBzYW1wbGVyMkQgdV9pbWFnZTA7ICB2b2lkIG1haW4odm9pZCkgeyAgICAgdmVjNCBweCA9IHRleHR1cmUyRCh1X2ltYWdlMCwgdl90ZXhDb29yZCk7ICAgICBmbG9hdCBhdmcgPSAocHguciArIHB4LmcgKyBweC5iKS8zLjA7ICAgICBnbF9GcmFnQ29sb3IgPSB2ZWM0KGF2ZywgYXZnLCBhdmcsIHB4LmEpOyB9XCIsXG4gICAgXCJ2ZXJ0ZXhcIjogXCJhdHRyaWJ1dGUgdmVjMiBhX3Bvc2l0aW9uOyBhdHRyaWJ1dGUgdmVjMiBhX3RleENvb3JkOyB1bmlmb3JtIHZlYzIgdV9yZXNvbHV0aW9uOyB2YXJ5aW5nIHZlYzIgdl90ZXhDb29yZDsgIHZvaWQgbWFpbigpIHsgICAgIHZlYzIgemVyb1RvT25lID0gYV9wb3NpdGlvbiAvIHVfcmVzb2x1dGlvbjsgICAgIHZlYzIgemVyb1RvVHdvID0gemVyb1RvT25lICogMi4wOyAgICAgdmVjMiBjbGlwU3BhY2UgPSB6ZXJvVG9Ud28gLSAxLjA7ICAgICBnbF9Qb3NpdGlvbiA9IHZlYzQoY2xpcFNwYWNlICogdmVjMigxLCAtMSksIDAsIDEpOyAgICAgdl90ZXhDb29yZCA9IGFfdGV4Q29vcmQ7IH1cIlxuICB9LFxuICBcInBhc3N0aHJvdWdoXCI6IHtcbiAgICBcImZyYWdtZW50XCI6IFwicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7IHVuaWZvcm0gc2FtcGxlcjJEIHVfaW1hZ2UwOyB2YXJ5aW5nIHZlYzIgdl90ZXhDb29yZDsgIHZvaWQgbWFpbigpIHsgICAgIGdsX0ZyYWdDb2xvciA9IHRleHR1cmUyRCh1X2ltYWdlMCwgdl90ZXhDb29yZCk7IH1cIixcbiAgICBcInZlcnRleFwiOiBcImF0dHJpYnV0ZSB2ZWMyIGFfcG9zaXRpb247IGF0dHJpYnV0ZSB2ZWMyIGFfdGV4Q29vcmQ7IHVuaWZvcm0gdmVjMiB1X3Jlc29sdXRpb247IHZhcnlpbmcgdmVjMiB2X3RleENvb3JkOyAgdm9pZCBtYWluKCkgeyAgICAgdmVjMiB6ZXJvVG9PbmUgPSBhX3Bvc2l0aW9uIC8gdV9yZXNvbHV0aW9uOyAgICAgdmVjMiB6ZXJvVG9Ud28gPSB6ZXJvVG9PbmUgKiAyLjA7ICAgICB2ZWMyIGNsaXBTcGFjZSA9IHplcm9Ub1R3byAtIDEuMDsgICAgIGdsX1Bvc2l0aW9uID0gdmVjNChjbGlwU3BhY2UgKiB2ZWMyKDEsIC0xKSwgMCwgMSk7ICAgICB2X3RleENvb3JkID0gYV90ZXhDb29yZDsgfVwiXG4gIH0sXG4gIFwic2VwaWFcIjoge1xuICAgIFwiZnJhZ21lbnRcIjogXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDsgdmFyeWluZyB2ZWMyIHZfdGV4Q29vcmQ7ICB1bmlmb3JtIHNhbXBsZXIyRCB1X2ltYWdlMDsgdW5pZm9ybSB2ZWM0IGxpZ2h0OyB1bmlmb3JtIHZlYzQgZGFyazsgdW5pZm9ybSBmbG9hdCBkZXNhdDsgdW5pZm9ybSBmbG9hdCB0b25lZDsgIGNvbnN0IG1hdDQgY29lZmYgPSBtYXQ0KCAgICAgMC4zOTMsIDAuMzQ5LCAwLjI3MiwgMS4wLCAgICAgMC43OTYsIDAuNjg2LCAwLjUzNCwgMS4wLCAgICAgMC4xODksIDAuMTY4LCAwLjEzMSwgMS4wLCAgICAgMC4wLCAwLjAsIDAuMCwgMS4wICk7ICB2b2lkIG1haW4odm9pZCkgeyAgICAgdmVjNCBzb3VyY2VQaXhlbCA9IHRleHR1cmUyRCh1X2ltYWdlMCwgdl90ZXhDb29yZCk7ICAgICBnbF9GcmFnQ29sb3IgPSBjb2VmZiAqIHNvdXJjZVBpeGVsOyB9XCIsXG4gICAgXCJ2ZXJ0ZXhcIjogXCJhdHRyaWJ1dGUgdmVjMiBhX3Bvc2l0aW9uOyBhdHRyaWJ1dGUgdmVjMiBhX3RleENvb3JkOyB1bmlmb3JtIHZlYzIgdV9yZXNvbHV0aW9uOyB2YXJ5aW5nIHZlYzIgdl90ZXhDb29yZDsgIHZvaWQgbWFpbigpIHsgICAgIHZlYzIgemVyb1RvT25lID0gYV9wb3NpdGlvbiAvIHVfcmVzb2x1dGlvbjsgICAgIHZlYzIgemVyb1RvVHdvID0gemVyb1RvT25lICogMi4wOyAgICAgdmVjMiBjbGlwU3BhY2UgPSB6ZXJvVG9Ud28gLSAxLjA7ICAgICBnbF9Qb3NpdGlvbiA9IHZlYzQoY2xpcFNwYWNlICogdmVjMigxLCAtMSksIDAsIDEpOyAgICAgdl90ZXhDb29yZCA9IGFfdGV4Q29vcmQ7IH1cIlxuICB9LFxuICBcInNvYmVsX2VkZ2VfZGV0ZWN0aW9uXCI6IHtcbiAgICBcImZyYWdtZW50XCI6IFwicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7IHZhcnlpbmcgdmVjMiB2X3RleENvb3JkOyB1bmlmb3JtIHNhbXBsZXIyRCB1X2ltYWdlMDsgdW5pZm9ybSB2ZWMyIGZfcmVzb2x1dGlvbjsgIHZvaWQgbWFpbih2b2lkKSB7ICAgICBmbG9hdCB4ID0gMS4wIC8gZl9yZXNvbHV0aW9uLng7ICAgICBmbG9hdCB5ID0gMS4wIC8gZl9yZXNvbHV0aW9uLnk7ICAgICB2ZWM0IGhvcml6RWRnZSA9IHZlYzQoIDAuMCApOyAgICAgaG9yaXpFZGdlIC09IHRleHR1cmUyRCggdV9pbWFnZTAsIHZlYzIoIHZfdGV4Q29vcmQueCAtIHgsIHZfdGV4Q29vcmQueSAtIHkgKSApICogMS4wOyAgICAgaG9yaXpFZGdlIC09IHRleHR1cmUyRCggdV9pbWFnZTAsIHZlYzIoIHZfdGV4Q29vcmQueCAtIHgsIHZfdGV4Q29vcmQueSAgICAgKSApICogMi4wOyAgICAgaG9yaXpFZGdlIC09IHRleHR1cmUyRCggdV9pbWFnZTAsIHZlYzIoIHZfdGV4Q29vcmQueCAtIHgsIHZfdGV4Q29vcmQueSArIHkgKSApICogMS4wOyAgICAgaG9yaXpFZGdlICs9IHRleHR1cmUyRCggdV9pbWFnZTAsIHZlYzIoIHZfdGV4Q29vcmQueCArIHgsIHZfdGV4Q29vcmQueSAtIHkgKSApICogMS4wOyAgICAgaG9yaXpFZGdlICs9IHRleHR1cmUyRCggdV9pbWFnZTAsIHZlYzIoIHZfdGV4Q29vcmQueCArIHgsIHZfdGV4Q29vcmQueSAgICAgKSApICogMi4wOyAgICAgaG9yaXpFZGdlICs9IHRleHR1cmUyRCggdV9pbWFnZTAsIHZlYzIoIHZfdGV4Q29vcmQueCArIHgsIHZfdGV4Q29vcmQueSArIHkgKSApICogMS4wOyAgICAgdmVjNCB2ZXJ0RWRnZSA9IHZlYzQoIDAuMCApOyAgICAgdmVydEVkZ2UgLT0gdGV4dHVyZTJEKCB1X2ltYWdlMCwgdmVjMiggdl90ZXhDb29yZC54IC0geCwgdl90ZXhDb29yZC55IC0geSApICkgKiAxLjA7ICAgICB2ZXJ0RWRnZSAtPSB0ZXh0dXJlMkQoIHVfaW1hZ2UwLCB2ZWMyKCB2X3RleENvb3JkLnggICAgLCB2X3RleENvb3JkLnkgLSB5ICkgKSAqIDIuMDsgICAgIHZlcnRFZGdlIC09IHRleHR1cmUyRCggdV9pbWFnZTAsIHZlYzIoIHZfdGV4Q29vcmQueCArIHgsIHZfdGV4Q29vcmQueSAtIHkgKSApICogMS4wOyAgICAgdmVydEVkZ2UgKz0gdGV4dHVyZTJEKCB1X2ltYWdlMCwgdmVjMiggdl90ZXhDb29yZC54IC0geCwgdl90ZXhDb29yZC55ICsgeSApICkgKiAxLjA7ICAgICB2ZXJ0RWRnZSArPSB0ZXh0dXJlMkQoIHVfaW1hZ2UwLCB2ZWMyKCB2X3RleENvb3JkLnggICAgLCB2X3RleENvb3JkLnkgKyB5ICkgKSAqIDIuMDsgICAgIHZlcnRFZGdlICs9IHRleHR1cmUyRCggdV9pbWFnZTAsIHZlYzIoIHZfdGV4Q29vcmQueCArIHgsIHZfdGV4Q29vcmQueSArIHkgKSApICogMS4wOyAgICAgdmVjMyBlZGdlID0gc3FydCgoaG9yaXpFZGdlLnJnYiAqIGhvcml6RWRnZS5yZ2IpICsgKHZlcnRFZGdlLnJnYiAqIHZlcnRFZGdlLnJnYikpOyAgICAgIGdsX0ZyYWdDb2xvciA9IHZlYzQoIGVkZ2UsIHRleHR1cmUyRCggdV9pbWFnZTAsIHZfdGV4Q29vcmQgKS5hICk7IH1cIixcbiAgICBcInZlcnRleFwiOiBcImF0dHJpYnV0ZSB2ZWMyIGFfcG9zaXRpb247IGF0dHJpYnV0ZSB2ZWMyIGFfdGV4Q29vcmQ7IHVuaWZvcm0gdmVjMiB1X3Jlc29sdXRpb247IHZhcnlpbmcgdmVjMiB2X3RleENvb3JkOyAgdm9pZCBtYWluKCkgeyAgICAgdmVjMiB6ZXJvVG9PbmUgPSBhX3Bvc2l0aW9uIC8gdV9yZXNvbHV0aW9uOyAgICAgdmVjMiB6ZXJvVG9Ud28gPSB6ZXJvVG9PbmUgKiAyLjA7ICAgICB2ZWMyIGNsaXBTcGFjZSA9IHplcm9Ub1R3byAtIDEuMDsgICAgIGdsX1Bvc2l0aW9uID0gdmVjNChjbGlwU3BhY2UgKiB2ZWMyKDEsIC0xKSwgMCwgMSk7ICAgICB2X3RleENvb3JkID0gYV90ZXhDb29yZDsgfVwiXG4gIH1cbn0iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyB7XHJcbiAgICAvKipcclxuICAgICAqIGMtdG9yXHJcbiAgICAgKiBAcGFyYW0gZ2xcclxuICAgICAqIEBwYXJhbSB3aWR0aFxyXG4gICAgICogQHBhcmFtIGhlaWdodFxyXG4gICAgICovXHJcbiAgICBjb25zdHJ1Y3RvcihnbCwgd2lkdGgsIGhlaWdodCkge1xyXG4gICAgICAgIC8qKiBpbnRlcm5hbCB0ZXh0dXJlIGFycmF5ICovXHJcbiAgICAgICAgdGhpcy5fdGV4dHVyZXMgPSB7fTtcclxuXHJcbiAgICAgICAgLyoqIHdpZHRoICovXHJcbiAgICAgICAgdGhpcy53aWR0aCA9IHdpZHRoO1xyXG5cclxuICAgICAgICAvKiogaGVpZ2h0ICovXHJcbiAgICAgICAgdGhpcy5oZWlnaHQgPSBoZWlnaHQ7XHJcblxyXG4gICAgICAgIC8qKiBnbCBjb250ZXh0ICovXHJcbiAgICAgICAgdGhpcy5nbCA9IGdsO1xyXG5cclxuICAgICAgICAvKiogdW5pbml0aWFsaXplZCB0ZXh0dXJlcyAqL1xyXG4gICAgICAgIHRoaXMuX3VuaXRpYWxpemVkID0gW107XHJcblxyXG4gICAgICAgIC8qKiBkaXJ0eSB0ZXh0dXJlcyAobmVlZHMgdXBkYXRpbmcpICovXHJcbiAgICAgICAgdGhpcy5fZGlydHkgPSBbXTtcclxuXHJcbiAgICAgICAgLyoqIHRleHR1cmUgaW5kaWNlcyAqL1xyXG4gICAgICAgIHRoaXMudGV4dHVyZUluZGljZXMgPSBbXTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGFkZCBhIHRleHR1cmVcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gdGV4dHVyZVxyXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSBnbGluZGV4XHJcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBwaXhlbHN0b3JlXHJcbiAgICAgKi9cclxuICAgIGFkZChuYW1lLCB0ZXh0dXJlLCBnbGluZGV4LCBwaXhlbHN0b3JlKSB7XHJcbiAgICAgICAgaWYgKCFnbGluZGV4KSB7XHJcbiAgICAgICAgICAgIGdsaW5kZXggPSAwO1xyXG4gICAgICAgICAgICB3aGlsZSAodGhpcy50ZXh0dXJlSW5kaWNlcy5pbmRleE9mKGdsaW5kZXgpICE9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgZ2xpbmRleCArKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFwaXhlbHN0b3JlKSB7XHJcbiAgICAgICAgICAgIHBpeGVsc3RvcmUgPSBbXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy50ZXh0dXJlSW5kaWNlcy5wdXNoKGdsaW5kZXgpO1xyXG5cclxuICAgICAgICB0aGlzLl90ZXh0dXJlc1tuYW1lXSA9IHtcclxuICAgICAgICAgICAgbmFtZTogbmFtZSxcclxuICAgICAgICAgICAgZ2xpbmRleDogZ2xpbmRleCxcclxuICAgICAgICAgICAgdGV4dHVyZTogdGV4dHVyZSxcclxuICAgICAgICAgICAgZ2x0ZXh0dXJlOiB0aGlzLmdsLmNyZWF0ZVRleHR1cmUoKSxcclxuICAgICAgICAgICAgaW5pdGlhbGl6ZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICBwaXhlbFN0b3JlOiBwaXhlbHN0b3JlLFxyXG4gICAgICAgICAgICBkaXJ0eTogdHJ1ZSB9O1xyXG5cclxuICAgICAgICB0aGlzLl91bml0aWFsaXplZC5wdXNoKHRoaXMuX3RleHR1cmVzW25hbWVdKTtcclxuICAgIH07XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiB1cGRhdGUgYSB1bmlmb3JtXHJcbiAgICAgKiBAcGFyYW0gbmFtZSBuYW1lIG9mIHRleHR1cmVcclxuICAgICAqIEBwYXJhbSB0ZXh0dXJlXHJcbiAgICAgKi9cclxuICAgIHVwZGF0ZShuYW1lLCB0ZXh0dXJlKSB7XHJcbiAgICAgICAgaWYgKHRleHR1cmUpIHtcclxuICAgICAgICAgICAgdGhpcy5fdGV4dHVyZXNbbmFtZV0udGV4dHVyZSA9IHRleHR1cmU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuX3RleHR1cmVzW25hbWVdLmRpcnR5ID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLl9kaXJ0eS5wdXNoKHRoaXMuX3RleHR1cmVzW25hbWVdKTtcclxuICAgIH07XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiByZWZyZXNoIHNjZW5lIHdpdGggdXBkYXRlZCB0ZXh0dXJlc1xyXG4gICAgICovXHJcbiAgICByZWZyZXNoU2NlbmUoKSB7XHJcbiAgICAgICAgZm9yICh2YXIgYyA9IDA7IGMgPCB0aGlzLl9kaXJ0eS5sZW5ndGg7IGMrKykge1xyXG4gICAgICAgICAgICB0aGlzLmdsLmFjdGl2ZVRleHR1cmUodGhpcy5nbFsnVEVYVFVSRScgKyB0aGlzLl9kaXJ0eVtjXS5nbGluZGV4XSk7XHJcbiAgICAgICAgICAgIHRoaXMuZ2wuYmluZFRleHR1cmUodGhpcy5nbC5URVhUVVJFXzJELCB0aGlzLl9kaXJ0eVtjXS5nbHRleHR1cmUpO1xyXG4gICAgICAgICAgICB0aGlzLmdsLnRleFN1YkltYWdlMkQodGhpcy5nbC5URVhUVVJFXzJELCAwLCAwLCAwLCB0aGlzLmdsLlJHQkEsIHRoaXMuZ2wuVU5TSUdORURfQllURSwgdGhpcy5fZGlydHlbY10udGV4dHVyZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuX2RpcnR5ID0gW107XHJcbiAgICB9O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogaW5pdGlhbGl6ZSBuZXcgdGV4dHVyZXNcclxuICAgICAqIEBwYXJhbSBwcm9ncmFtXHJcbiAgICAgKi9cclxuICAgIGluaXRpYWxpemVOZXdUZXh0dXJlcyhwcm9ncmFtKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuX3VuaXRpYWxpemVkLmxlbmd0aCA9PT0gMCkgeyByZXR1cm47IH1cclxuICAgICAgICB2YXIgZ2wgPSB0aGlzLmdsO1xyXG4gICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgdGhpcy5fdW5pdGlhbGl6ZWQubGVuZ3RoOyBjKyspIHtcclxuICAgICAgICAgICAgdGhpcy5fdW5pdGlhbGl6ZWRbY10ubG9jYXRpb24gPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24ocHJvZ3JhbSwgJ3VfaW1hZ2UnICsgdGhpcy5fdW5pdGlhbGl6ZWRbY10uZ2xpbmRleCk7XHJcbiAgICAgICAgICAgIGdsLnVuaWZvcm0xaSh0aGlzLl91bml0aWFsaXplZFtjXS5sb2NhdGlvbiwgdGhpcy5fdW5pdGlhbGl6ZWRbY10uZ2xpbmRleCk7XHJcbiAgICAgICAgICAgIGdsLmFjdGl2ZVRleHR1cmUoZ2xbJ1RFWFRVUkUnICsgdGhpcy5fdW5pdGlhbGl6ZWRbY10uZ2xpbmRleF0pO1xyXG4gICAgICAgICAgICBnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0aGlzLl91bml0aWFsaXplZFtjXS5nbHRleHR1cmUpO1xyXG4gICAgICAgICAgICBnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9TLCBnbC5DTEFNUF9UT19FREdFKTtcclxuICAgICAgICAgICAgZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfVCwgZ2wuQ0xBTVBfVE9fRURHRSk7XHJcbiAgICAgICAgICAgIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NSU5fRklMVEVSLCBnbC5ORUFSRVNUKTtcclxuICAgICAgICAgICAgZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01BR19GSUxURVIsIGdsLk5FQVJFU1QpO1xyXG5cclxuICAgICAgICAgICAgZm9yICh2YXIgZCA9IDA7IGQgPCB0aGlzLl91bml0aWFsaXplZFtjXS5waXhlbFN0b3JlLmxlbmd0aDsgZCsrKSB7XHJcbiAgICAgICAgICAgICAgICBnbC5waXhlbFN0b3JlaShnbFt0aGlzLl91bml0aWFsaXplZFtjXS5waXhlbFN0b3JlW2RdLnByb3BlcnR5XSwgdGhpcy5fdW5pdGlhbGl6ZWRbY10ucGl4ZWxTdG9yZVtkXS52YWx1ZSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGdsLnRleEltYWdlMkQoZ2wuVEVYVFVSRV8yRCwgMCwgZ2wuUkdCQSwgZ2wuUkdCQSwgZ2wuVU5TSUdORURfQllURSwgdGhpcy5fdW5pdGlhbGl6ZWRbY10udGV4dHVyZSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLl91bml0aWFsaXplZFtjXS5pbml0aWFsaXplZCA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuX3VuaXRpYWxpemVkW2NdLmRpcnR5ID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuX3VuaXRpYWxpemVkID0gW107XHJcbiAgICB9O1xyXG59IiwiZXhwb3J0IGRlZmF1bHQgY2xhc3Mge1xyXG4gICAgLyoqXHJcbiAgICAgKiBjLXRvclxyXG4gICAgICovXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBpbnRlcm5hbCBtYXBwaW5nIG9mIHVuaWZvcm1zXHJcbiAgICAgICAgICogQHR5cGUge3t9fVxyXG4gICAgICAgICAqIEBwcml2YXRlXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdGhpcy5fdW5pZm9ybXMgPSB7fTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGFkZCBhIHVuaWZvcm1cclxuICAgICAqIEBwYXJhbSB0eXBlIHR5cGUgb2YgdW5pZm9ybSAoMWYsIDJmLCAzZiwgNGYsIDFpLCAyaSwgM2ksIDR1XHJcbiAgICAgKi9cclxuICAgIGFkZChuYW1lLCB0eXBlLCB2YWx1ZXMpIHtcclxuICAgICAgICB0aGlzLl91bmlmb3Jtc1tuYW1lXSA9IHsgbmFtZTogbmFtZSwgdHlwZTogdHlwZSwgdmFsdWVzOiB2YWx1ZXMsIGRpcnR5OiB0cnVlIH07XHJcbiAgICB9O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogdXBkYXRlIGEgdW5pZm9ybVxyXG4gICAgICogQHBhcmFtIHR5cGUgdHlwZSBvZiB1bmlmb3JtICgxZiwgMmYsIDNmLCA0ZiwgMWksIDJpLCAzaSwgNHVcclxuICAgICAqL1xyXG4gICAgdXBkYXRlKG5hbWUsIHZhbHVlcykge1xyXG4gICAgICAgIHRoaXMuX3VuaWZvcm1zW25hbWVdLnZhbHVlcyA9IHZhbHVlcztcclxuICAgICAgICB0aGlzLl91bmlmb3Jtc1tuYW1lXS5kaXJ0eSA9IHRydWU7XHJcbiAgICB9O1xyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIHVwZGF0ZSB1bmlmb3JtcyBvbiBHTCBjb250ZXh0IGFuZCBwcm9ncmFtXHJcbiAgICAgKiBAcGFyYW0gZ2wgV2ViR0wgY29udGV4dFxyXG4gICAgICogQHBhcmFtIHByb2dyYW1cclxuICAgICAqL1xyXG4gICAgdXBkYXRlUHJvZ3JhbShnbCwgcHJvZ3JhbSkge1xyXG4gICAgICAgIGZvciAodmFyIGMgaW4gdGhpcy5fdW5pZm9ybXMpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuX3VuaWZvcm1zW2NdLmRpcnR5KSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgdSA9IGdsLmdldFVuaWZvcm1Mb2NhdGlvbihwcm9ncmFtLCB0aGlzLl91bmlmb3Jtc1tjXS5uYW1lKTtcclxuICAgICAgICAgICAgICAgIHN3aXRjaCAodGhpcy5fdW5pZm9ybXNbY10udHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJzFmJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2wudW5pZm9ybTFmKHUsIHRoaXMuX3VuaWZvcm1zW2NdLnZhbHVlc1swXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBjYXNlICcyZic6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsLnVuaWZvcm0yZih1LCB0aGlzLl91bmlmb3Jtc1tjXS52YWx1ZXNbMF0sIHRoaXMuX3VuaWZvcm1zW2NdLnZhbHVlc1sxXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBjYXNlICczZic6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsLnVuaWZvcm0zZih1LCB0aGlzLl91bmlmb3Jtc1tjXS52YWx1ZXNbMF0sIHRoaXMuX3VuaWZvcm1zW2NdLnZhbHVlc1sxXSwgdGhpcy5fdW5pZm9ybXNbY10udmFsdWVzWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJzRmJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2wudW5pZm9ybTRmKHUsIHRoaXMuX3VuaWZvcm1zW2NdLnZhbHVlc1swXSwgdGhpcy5fdW5pZm9ybXNbY10udmFsdWVzWzFdLCB0aGlzLl91bmlmb3Jtc1tjXS52YWx1ZXNbMl0sIHRoaXMuX3VuaWZvcm1zW2NdLnZhbHVlc1szXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBjYXNlICcxaSc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsLnVuaWZvcm0xaSh1LCB0aGlzLl91bmlmb3Jtc1tjXS52YWx1ZXNbMF0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnMmknOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBnbC51bmlmb3JtMmkodSwgdGhpcy5fdW5pZm9ybXNbY10udmFsdWVzWzBdLCB0aGlzLl91bmlmb3Jtc1tjXS52YWx1ZXNbMV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnM2knOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBnbC51bmlmb3JtM2kodSwgdGhpcy5fLnVuaWZvcm1zW2NdLnZhbHVlc1swXSwgdGhpcy5fdW5pZm9ybXNbY10udmFsdWVzWzFdLCB0aGlzLl91bmlmb3Jtc1tjXS52YWx1ZXNbMl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnNGknOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBnbC51bmlmb3JtaWYodSwgdGhpcy5fdW5pZm9ybXNbY10udmFsdWVzWzBdLCB0aGlzLl91bmlmb3Jtc1tjXS52YWx1ZXNbMV0sIHRoaXMuX3VuaWZvcm1zW2NdLnZhbHVlc1syXSwgdGhpcy5fdW5pZm9ybXNbY10udmFsdWVzWzNdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iXX0=
