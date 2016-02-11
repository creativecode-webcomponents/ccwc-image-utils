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

        if (!cfg.minBlobSize) {
            cfg.minBlobSize = this.MIN_BLOB_SIZE;
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
            return blb.length >= cfg.minBlobSize;
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

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _filters = require('./filters.es6');

var _filters2 = _interopRequireDefault(_filters);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _class = function () {
    /**
     * c-tor
     */

    function _class(pxs) {
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

},{}],9:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmNcXGFsbC5lczYiLCJzcmNcXGNhbnZhc1xcYmxvYnMuZXM2Iiwic3JjXFxjYW52YXNcXGZpbHRlcmNoYWluLmVzNiIsInNyY1xcY2FudmFzXFxmaWx0ZXJzLmVzNiIsInNyY1xcd2ViZ2xcXGNvbnN0YW50cy5lczYiLCJzcmNcXHdlYmdsXFxmaWx0ZXJzLmVzNiIsInNyY1xcd2ViZ2xcXHNoYWRlcnMuZXM2Iiwic3JjXFx3ZWJnbFxcdGV4dHVyZXMuZXM2Iiwic3JjXFx3ZWJnbFxcdW5pZm9ybXMuZXM2Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDU0EsUUFBUSxLQUFSLEdBQWdCO0FBQ1osWUFBUTtBQUNKLDhCQURJO0FBRUosMENBRkk7QUFHSixrQ0FISTtLQUFSO0FBS0EsV0FBTztBQUNILGtDQURHO0FBRUgsb0NBRkc7QUFHSCxvQ0FIRztBQUlILGtDQUpHO0FBS0gsc0NBTEc7S0FBUDtDQU5KOzs7Ozs7OztrQkNUZTs7OztBQUlYLG1CQUFjLEVBQWQ7Ozs7Ozs7O0FBUUEsa0NBQVUsS0FBSyxLQUFLO0FBQ2hCLFlBQUksQ0FBQyxHQUFELEVBQU07QUFDTixrQkFBTSxFQUFOLENBRE07U0FBVjs7QUFJQSxZQUFJLENBQUMsSUFBSSxXQUFKLEVBQWlCO0FBQ2xCLGdCQUFJLFdBQUosR0FBa0IsS0FBSyxhQUFMLENBREE7U0FBdEI7O0FBSUEsWUFBSSxRQUFRLElBQUksS0FBSixDQVRJO0FBVWhCLFlBQUksVUFBVSxRQUFRLENBQVIsQ0FWRTtBQVdoQixZQUFJLE1BQU0sSUFBSSxJQUFKLENBQVMsTUFBVCxDQVhNO0FBWWhCLFlBQUksU0FBUyxJQUFJLFdBQUosQ0FBZ0IsSUFBSSxJQUFKLENBQVMsTUFBVCxDQUF6QixDQVpZO0FBYWhCLGFBQUssSUFBSSxJQUFJLENBQUosRUFBTyxJQUFJLElBQUks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QWYsRUFBa0IsTUFBbEIsQ0FBeUIsQ0FBekIsQ0FBN0MsRUFBMEUsS0FBSyxTQUFMLENBQWUsQ0FBZixFQUFrQixNQUFsQixDQUF5QixDQUF6QixDQUExRSxFQUF1RyxLQUFLLFNBQUwsQ0FBZSxDQUFmLEVBQWtCLE1BQWxCLENBQXlCLENBQXpCLENBQXZHLEVBREo7QUFFSSxrQ0FGSjtBQTdCSixxQkFGeUI7aUJBQTdCO2FBREoiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiaW1wb3J0IEJsb2JzIGZyb20gJy4vY2FudmFzL2Jsb2JzLmVzNic7XHJcbmltcG9ydCBGaWx0ZXJDaGFpbiBmcm9tICcuL2NhbnZhcy9maWx0ZXJjaGFpbi5lczYnO1xyXG5pbXBvcnQgQ2FudmFzRmlsdGVycyBmcm9tICcuL2NhbnZhcy9maWx0ZXJzLmVzNic7XHJcbmltcG9ydCBXZWJHTEZpbHRlcnMgZnJvbSAnLi93ZWJnbC9maWx0ZXJzLmVzNic7XHJcbmltcG9ydCBTaGFkZXJzIGZyb20gJy4vd2ViZ2wvc2hhZGVycy5lczYnO1xyXG5pbXBvcnQgVGV4dHVyZXMgZnJvbSAnLi93ZWJnbC90ZXh0dXJlcy5lczYnO1xyXG5pbXBvcnQgVW5pZm9ybXMgZnJvbSAnLi93ZWJnbC91bmlmb3Jtcy5lczYnO1xyXG5pbXBvcnQgQ29uc3RhbnRzIGZyb20gJy4vd2ViZ2wvY29uc3RhbnRzLmVzNic7XHJcblxyXG5leHBvcnRzLmltYWdlID0ge1xyXG4gICAgY2FudmFzOiB7XHJcbiAgICAgICAgYmxvYnM6IEJsb2JzLFxyXG4gICAgICAgIGZpbHRlcmNoYWluOiBGaWx0ZXJDaGFpbixcclxuICAgICAgICBmaWx0ZXJzOiBDYW52YXNGaWx0ZXJzXHJcbiAgICB9LFxyXG4gICAgd2ViZ2w6IHtcclxuICAgICAgICBzaGFkZXJzOiBTaGFkZXJzLFxyXG4gICAgICAgIHRleHR1cmVzOiBUZXh0dXJlcyxcclxuICAgICAgICB1bmlmb3JtczogVW5pZm9ybXMsXHJcbiAgICAgICAgZmlsdGVyczogV2ViR0xGaWx0ZXJzLFxyXG4gICAgICAgIGNvbnN0YW50czogQ29uc3RhbnRzXHJcbiAgICB9XHJcbn07IiwiZXhwb3J0IGRlZmF1bHQge1xyXG4gICAgLyoqXHJcbiAgICAgKiBtaW5pdW11bSBibG9ic2l6ZSBkZWZhdWx0XHJcbiAgICAgKi9cclxuICAgIE1JTl9CTE9CX1NJWkU6NTAsXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBmaW5kIGJsb2JzXHJcbiAgICAgKiBCTEFDSyBBTkQgV0hJVEUgSU1BR0UgUkVRVUlSRURcclxuICAgICAqIEBwYXJhbSBweHNcclxuICAgICAqIEByZXR1cm4ge0FycmF5fSBibG9iIGNvb3JkaW5hdGVzXHJcbiAgICAgKi9cclxuICAgIGZpbmRCbG9icyhweHMsIGNmZykge1xyXG4gICAgICAgIGlmICghY2ZnKSB7XHJcbiAgICAgICAgICAgIGNmZyA9IHt9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFjZmcubWluQmxvYlNpemUpIHtcclxuICAgICAgICAgICAgY2ZnLm1pbkJsb2JTaXplID0gdGhpcy5NSU5fQkxPQl9TSVpFO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIHdpZHRoID0gcHhzLndpZHRoO1xyXG4gICAgICAgIHZhciByb3dzaXplID0gd2lkdGggKiA0O1xyXG4gICAgICAgIHZhciBsZW4gPSBweHMuZGF0YS5sZW5ndGg7XHJcbiAgICAgICAgdmFyIHBpeGVscyA9IG5ldyBVaW50MTZBcnJheShweHMuZGF0YS5sZW5ndGgpO1xyXG4gICAgICAgIGZvciAodmFyIGQgPSAwOyBkIDwgcHhzLmRhdGEubGVuZ3RoOyBkKyspIHtcclxuICAgICAgICAgICAgcGl4ZWxzW2RdID0gcHhzLmRhdGFbZF07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBibG9icyA9IFtdO1xyXG4gICAgICAgIHZhciBibG9iSW5kZXggPSAtMTtcclxuXHJcbiAgICAgICAgLy8gY29udGFpbnMgcGl4ZWwgaW5kaWNlcyBmb3IgYmxvYnMgdGhhdCB0b3VjaFxyXG4gICAgICAgIHZhciBibG9iVGFibGUgPSBbXTtcclxuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IGxlbjsgYyArPSA0KSB7XHJcbiAgICAgICAgICAgIGlmIChwaXhlbHNbY10gPT09IDI1NSkge1xyXG4gICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFyIG5laWdoYm9ycyA9IFtjIC0gNCwgYyArIDQsIGMgLSByb3dzaXplLCBjICsgcm93c2l6ZSwgYyAtIDQgLSByb3dzaXplLCBjICsgNCAtIHJvd3NpemUsIGMgLSA0ICsgcm93c2l6ZSwgYyArIDQgKyByb3dzaXplXTtcclxuICAgICAgICAgICAgdmFyIG51bU5laWdoYm9ycyA9IG5laWdoYm9ycy5sZW5ndGg7XHJcblxyXG4gICAgICAgICAgICAvLyBqdXN0IGNoZWNrIG9uZSBjaGFubmVsLCBiZWNhdXNlIHdlIGFzc3VtZSBldmVyeSBweCBpcyBibGFjayBvciB3aGl0ZVxyXG4gICAgICAgICAgICB2YXIgYmxvYkluZGV4Rm91bmQgPSAtMTtcclxuICAgICAgICAgICAgZm9yICh2YXIgbmVpZ2hib3IgPSAwOyBuZWlnaGJvciA8IG51bU5laWdoYm9yczsgbmVpZ2hib3IrKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKG5laWdoYm9yc1tuZWlnaGJvcl0gPj0gMCAmJiBuZWlnaGJvcnNbbmVpZ2hib3JdIDwgbGVuICYmIHBpeGVsc1tuZWlnaGJvcnNbbmVpZ2hib3JdXSA9PT0gcGl4ZWxzW2NdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgdG91Y2hpbmcgYSBuZWlnaGJvciwgcmVjb3JkIGluZGV4IG9mIHRoYXQgYmxvYiBpbmRleCBvZiB0aGF0IG5laWdoYm9yXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gYWxzbyBpZiB0b3VjaGluZyBkaWZmZXJlbnQgaW5kaWNlcywgcmVjb3JkIHRoYXQgdGhlc2UgaW5kaWNlcyBzaG91bGQgYmUgdGhlIHNhbWUgaW5kZXhcclxuICAgICAgICAgICAgICAgICAgICAvLyB0aGUgYmxvYiB0YWJsZSByZWNvcmRzIHdoaWNoIGJsb2IgaW5kZXggbWFwcyB0byB3aGljaCBvdGhlciBibG9iIGluZGV4XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBpeGVsc1tuZWlnaGJvcnNbbmVpZ2hib3JdICsgMV0gPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChibG9iSW5kZXhGb3VuZCAhPT0gLTEgJiYgYmxvYkluZGV4Rm91bmQgIT09IHBpeGVsc1tuZWlnaGJvcnNbbmVpZ2hib3JdICsgMV0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGdyZWVuIGNoYW5uZWwgKCsxKSByZWNvcmRzIGJsb2IgaW5kZXhcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb2JUYWJsZS5wdXNoKFtibG9iSW5kZXhGb3VuZCwgcGl4ZWxzW25laWdoYm9yc1tuZWlnaGJvcl0gKyAxXV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJsb2JJbmRleEZvdW5kID0gcGl4ZWxzW25laWdoYm9yc1tuZWlnaGJvcl0gKyAxXTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChibG9iSW5kZXhGb3VuZCA+IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBibG9iIGlzIGZvdW5kLCBtYXJrIHBpeGVsIGFuZCByZWNvcmQgaW4gYmxvYnNcclxuICAgICAgICAgICAgICAgIHBpeGVsc1tjICsgMV0gPSBibG9iSW5kZXhGb3VuZDsgLy8gdXNlIGdyZWVuIGNoYW5uZWwgYXMgYmxvYiB0cmFja2VyXHJcbiAgICAgICAgICAgICAgICBibG9ic1tibG9iSW5kZXhGb3VuZF0ucHVzaChjKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIGJyYW5kIG5ldyBibG9iXHJcbiAgICAgICAgICAgICAgICBibG9iSW5kZXgrKztcclxuICAgICAgICAgICAgICAgIGJsb2JzLnB1c2goW2NdKTtcclxuICAgICAgICAgICAgICAgIHBpeGVsc1tjICsgMV0gPSBibG9iSW5kZXg7IC8vIHVzZSBncmVlbiBjaGFubmVsIGFzIGJsb2IgdHJhY2tlclxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBtZXJnZSBpbnRlcnNlY3RpbmcgcGFpcnNcclxuICAgICAgICAvLyBtYXliZSBub3QgdGhlIG1vc3QgZWZmaWNpZW50IGNvZGUsIGJ1dCBibG9iIGNvdW50IHNob3VsZCBiZSBmYWlybHkgbG93IChob3BlZnVsbHkpXHJcbiAgICAgICAgLy8gcmV2aXNpdCBpZiBzcGVlZCBnZXRzIGluIHRoZSB3YXlcclxuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IGJsb2JUYWJsZS5sZW5ndGg7IGMrKykge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBkID0gMDsgZCA8IGJsb2JUYWJsZS5sZW5ndGg7IGQrKykge1xyXG4gICAgICAgICAgICAgICAgdmFyIGNvbm5lY3RlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgZSA9IDA7IGUgPCBibG9iVGFibGVbZF0ubGVuZ3RoOyBlKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYmxvYlRhYmxlW2NdLmluZGV4T2YoYmxvYlRhYmxlW2RdW2VdKSAhPT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29ubmVjdGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoY29ubmVjdGVkICYmIGQgIT09IGMpIHtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBmID0gMDsgZiA8IGJsb2JUYWJsZVtkXS5sZW5ndGg7IGYrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBvbmx5IGFkZCB1bmlxdWVzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChibG9iVGFibGVbY10uaW5kZXhPZihibG9iVGFibGVbZF1bZl0pID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvYlRhYmxlW2NdLnB1c2goYmxvYlRhYmxlW2RdW2ZdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBibG9iVGFibGVbZF0gPSBbXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gd2VlZCBvdXQgZW1wdGllc1xyXG4gICAgICAgIGJsb2JUYWJsZSA9IGJsb2JUYWJsZS5maWx0ZXIoZnVuY3Rpb24gKHBhaXIpIHtcclxuICAgICAgICAgICAgaWYgKHBhaXIubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gZWFjaCBibG9iIGlzIGEgbGlzdCBvZiBpbWFnZSBpbmRpY2VzXHJcbiAgICAgICAgLy8gdXNlIGJsb2JzIGluZGV4IHRvIG1hdGNoIHRvIGJsb2IgdGFibGUgaW5kZXggYW5kIGNvbmNhdCB0aGUgYmxvYnMgYXQgdGhhdCBpbmRleFxyXG4gICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgYmxvYnMubGVuZ3RoOyBjKyspIHtcclxuICAgICAgICAgICAgZm9yICh2YXIgZCA9IDA7IGQgPCBibG9iVGFibGUubGVuZ3RoOyBkKyspIHtcclxuICAgICAgICAgICAgICAgIGlmIChibG9iVGFibGVbZF0uaW5kZXhPZihjKSAhPT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBlID0gMDsgZSA8IGJsb2JUYWJsZVtkXS5sZW5ndGg7IGUrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYmxvYlRhYmxlW2RdW2VdICE9PSBjKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBibG9ic1tjXSA9IGJsb2JzW2NdLmNvbmNhdChibG9ic1tibG9iVGFibGVbZF1bZV1dKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb2JzW2Jsb2JUYWJsZVtkXVtlXV0gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gcmVmaW5lIGJsb2JzIG5vdyB0aGF0IHRoZSByaWdodCB0aGluZ3MgYXJlIGNvbmNhdGVkIGFuZCB3ZSBkb24ndCBuZWVkIHRvIHRyYWNrXHJcbiAgICAgICAgLy8gbWVhbmluZyB3ZSBjYW4gc3RhcnQgc3BsaWNpbmcgdGhpbmdzIHdpdGhvdXQgd29ycnlpbmcgYWJvdXQgdGhlIGluZGV4XHJcbiAgICAgICAgYmxvYnMgPSBibG9icy5maWx0ZXIoZnVuY3Rpb24gKGJsYikge1xyXG4gICAgICAgICAgICByZXR1cm4gYmxiLmxlbmd0aCA+PSBjZmcubWluQmxvYlNpemU7XHJcbiAgICAgICAgfSwgdGhpcyk7XHJcblxyXG5cclxuICAgICAgICAvLyBnZXQgYmxvYiBkaW1lbnNpb25zIHBvc2l0aW9uc1xyXG4gICAgICAgIHZhciBibG9iQ29vcmRzID0gW107XHJcbiAgICAgICAgZm9yICh2YXIgYyA9IDA7IGMgPCBibG9icy5sZW5ndGg7IGMrKykge1xyXG4gICAgICAgICAgICB2YXIgbWluWCA9IC0xLCBtYXhYID0gLTEsIG1pblkgPSAtMSwgbWF4WSA9IC0xO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBkID0gMDsgZCA8IGJsb2JzW2NdLmxlbmd0aDsgZCsrKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcHggPSBNYXRoLmZsb29yKGJsb2JzW2NdW2RdIC8gNCk7XHJcbiAgICAgICAgICAgICAgICB2YXIgeCA9IHB4ICUgd2lkdGg7XHJcbiAgICAgICAgICAgICAgICB2YXIgeSA9IHBhcnNlSW50KHB4IC8gd2lkdGgpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh4IDwgbWluWCB8fCBtaW5YID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1pblggPSB4O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKHggPiBtYXhYIHx8IG1heFggPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWF4WCA9IHg7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoeSA8IG1pblkgfHwgbWluWSA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICBtaW5ZID0geTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICh5ID4gbWF4WSB8fCBtYXhZID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1heFkgPSB5O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJsb2JDb29yZHMucHVzaCh7eDogbWluWCwgeTogbWluWSwgd2lkdGg6IG1heFggLSBtaW5YLCBoZWlnaHQ6IG1heFkgLSBtaW5ZfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBwYWludCB0aGUgYmxvYnNcclxuICAgICAgICBpZiAoY2ZnLnBhaW50KSB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGQgPSAwOyBkIDwgYmxvYnMubGVuZ3RoOyBkKyspIHtcclxuICAgICAgICAgICAgICAgIHZhciBjbHIgPSBbTWF0aC5yYW5kb20oKSAqIDI1NSwgTWF0aC5yYW5kb20oKSAqIDI1NSwgTWF0aC5yYW5kb20oKSAqIDI1NV07XHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBlID0gMDsgZSA8IGJsb2JzW2RdLmxlbmd0aDsgZSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcHhzLmRhdGFbYmxvYnNbZF1bZV1dID0gY2xyWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgIHB4cy5kYXRhW2Jsb2JzW2RdW2VdICsgMV0gPSBjbHJbMV07XHJcbiAgICAgICAgICAgICAgICAgICAgcHhzLmRhdGFbYmxvYnNbZF1bZV0gKyAyXSA9IGNsclsyXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4ge2ltYWdlOiBweHMsIGJsb2JzOiBibG9iQ29vcmRzfTtcclxuICAgIH1cclxufSIsImltcG9ydCBGaWx0ZXJzIGZyb20gJy4vZmlsdGVycy5lczYnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3Mge1xyXG4gICAgLyoqXHJcbiAgICAgKiBjLXRvclxyXG4gICAgICovXHJcbiAgICBjb25zdHJ1Y3RvcihweHMpIHtcclxuICAgICAgICB0aGlzLnJlc3VsdCA9IHB4cztcclxuICAgIH07XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBjb252ZXJ0IGltYWdlIHRvIGdyYXlzY2FsZVxyXG4gICAgICogQHBhcmFtIHtJbWFnZURhdGF9IHB4c1xyXG4gICAgICogQHJldHVybnMgeyp9XHJcbiAgICAgKi9cclxuICAgIHRvR3JheXNjYWxlKCkge1xyXG4gICAgICAgIHRoaXMucmVzdWx0ID0gRmlsdGVycy50b0dyYXlzY2FsZSh0aGlzLnJlc3VsdCk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogc2F0dXJhdGUgaW1hZ2VcclxuICAgICAqIEBwYXJhbSB7SW1hZ2VEYXRhfSBweHNcclxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBwZXJjZW50YW1vdW50IHBlcmNlbnRhZ2Ugc2F0dXJhdGlvblxyXG4gICAgICogQHJldHVybnMgeyp9XHJcbiAgICAgKi9cclxuICAgIHNhdHVyYXRlKHBlcmNlbnRhbW91bnQpIHtcclxuICAgICAgICB0aGlzLnJlc3VsdCA9IEZpbHRlcnMuc2F0dXJhdGUodGhpcy5yZXN1bHQsIHBlcmNlbnRhbW91bnQpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIGNvbnZlcnQgdG8gcHVyZSBibGFjayBvciBwdXJlIHdoaXRlXHJcbiAgICAgKiBAcGFyYW0gcHhzXHJcbiAgICAgKiBAcGFyYW0gcHhzXHJcbiAgICAgKiBAcmV0dXJucyB7Kn1cclxuICAgICAqL1xyXG4gICAgdG9CbGFja0FuZFdoaXRlKHRocmVzaG9sZHRvYmxhY2twZXJjZW50KSB7XHJcbiAgICAgICAgdGhpcy5yZXN1bHQgPSBGaWx0ZXJzLnRvQmxhY2tBbmRXaGl0ZSh0aGlzLnJlc3VsdCwgdGhyZXNob2xkdG9ibGFja3BlcmNlbnQpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIGNvbnZlcnQgMiBpbWFnZXMgdG8gYW4gaW1hZ2UgaGlnaGxpZ2h0aW5nIGRpZmZlcmVuY2VzXHJcbiAgICAgKiBAcGFyYW0gcHhzMVxyXG4gICAgICogQHBhcmFtIHB4czJcclxuICAgICAqIEBwYXJhbSB0b2xlcmFuY2VcclxuICAgICAqIEByZXR1cm5zIHsqfVxyXG4gICAgICovXHJcbiAgICB0b0RpZmYoY29tcGFyZSwgdG9sZXJhbmNlKSB7XHJcbiAgICAgICAgdGhpcy5yZXN1bHQgPSBGaWx0ZXJzLnRvRGlmZih0aGlzLnJlc3VsdCwgY29tcGFyZSwgdG9sZXJhbmNlKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxufSIsImV4cG9ydCBkZWZhdWx0IHtcclxuICAgIC8qKlxyXG4gICAgICogY29udmVydCBpbWFnZSB0byBncmF5c2NhbGVcclxuICAgICAqIEBwYXJhbSB7SW1hZ2VEYXRhfSBweHNcclxuICAgICAqIEByZXR1cm5zIHsqfVxyXG4gICAgICovXHJcbiAgICB0b0dyYXlzY2FsZShweHMpIHtcclxuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IHB4cy5kYXRhLmxlbmd0aDsgYys9NCkge1xyXG4gICAgICAgICAgICB2YXIgZ3JheSA9IChweHMuZGF0YVtjXSArIHB4cy5kYXRhW2MrMV0gKyBweHMuZGF0YVtjKzJdKS8zO1xyXG4gICAgICAgICAgICBweHMuZGF0YVtjXSA9IHB4cy5kYXRhW2MrMV0gPSBweHMuZGF0YVtjKzJdID0gZ3JheTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHB4cztcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBzYXR1cmF0ZSBpbWFnZVxyXG4gICAgICogQHBhcmFtIHtJbWFnZURhdGF9IHB4c1xyXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHBlcmNlbnRhbW91bnQgcGVyY2VudGFnZSBzYXR1cmF0aW9uXHJcbiAgICAgKiBAcmV0dXJucyB7Kn1cclxuICAgICAqL1xyXG4gICAgc2F0dXJhdGUocHhzLCBwZXJjZW50YW1vdW50KSB7XHJcbiAgICAgICAgaWYgKCFwZXJjZW50YW1vdW50KSB7IHBlcmNlbnRhbW91bnQgPSA1MDsgfVxyXG4gICAgICAgIHZhciBhbXQgPSBwZXJjZW50YW1vdW50LzEwMCAqIDI1NTtcclxuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IHB4cy5kYXRhLmxlbmd0aDsgYys9NCkge1xyXG4gICAgICAgICAgICBweHMuZGF0YVtjXSA9IHB4cy5kYXRhW2NdICsgYW10O1xyXG4gICAgICAgICAgICBweHMuZGF0YVtjKzFdID0gcHhzLmRhdGFbYysxXSArIGFtdDtcclxuICAgICAgICAgICAgcHhzLmRhdGFbYysyXSA9IHB4cy5kYXRhW2MrMl0gKyBhbXQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBweHM7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogY29udmVydCAyIGltYWdlcyB0byBhbiBpbWFnZSBoaWdobGlnaHRpbmcgZGlmZmVyZW5jZXNcclxuICAgICAqIEBwYXJhbSBweHMxXHJcbiAgICAgKiBAcGFyYW0gcHhzMlxyXG4gICAgICogQHBhcmFtIHRvbGVyYW5jZVxyXG4gICAgICogQHJldHVybnMgeyp9XHJcbiAgICAgKi9cclxuICAgIHRvRGlmZihweHMxLCBweHMyLCB0b2xlcmFuY2UpIHtcclxuICAgICAgICBpZiAocHhzMS5kYXRhLmxlbmd0aCAhPT0gcHhzMi5kYXRhLmxlbmd0aCkgeyB0aHJvdyBuZXcgRXJyb3IoJ2ltYWdlcyBub3QgdGhlIHNhbWUgc2l6ZScpOyB9XHJcbiAgICAgICAgdmFyIGRpZmYgPSBuZXcgSW1hZ2VEYXRhKHB4czEud2lkdGgsIHB4czEuaGVpZ2h0KTtcclxuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IHB4czEuZGF0YS5sZW5ndGg7IGMrPTQpIHtcclxuICAgICAgICAgICAgdmFyIGRyYXcgPSAyNTU7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGQgPSAwOyBkIDwgNDsgZCsrKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAocHhzMS5kYXRhW2MrZF0gLSBweHMyLmRhdGFbYytkXSA+IHRvbGVyYW5jZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGRyYXcgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBkaWZmLmRhdGFbY10gPSBkcmF3O1xyXG4gICAgICAgICAgICBkaWZmLmRhdGFbYysxXSA9IGRyYXc7XHJcbiAgICAgICAgICAgIGRpZmYuZGF0YVtjKzJdID0gZHJhdztcclxuICAgICAgICAgICAgZGlmZi5kYXRhW2MrM109IDI1NTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGRpZmY7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogY29udmVydCB0byBwdXJlIGJsYWNrIG9yIHB1cmUgd2hpdGVcclxuICAgICAqIEBwYXJhbSBweHNcclxuICAgICAqIEBwYXJhbSBweHNcclxuICAgICAqIEByZXR1cm5zIHsqfVxyXG4gICAgICovXHJcbiAgICB0b0JsYWNrQW5kV2hpdGUocHhzLCB0aHJlc2hvbGR0b2JsYWNrcGVyY2VudCkge1xyXG4gICAgICAgIGlmICghdGhyZXNob2xkdG9ibGFja3BlcmNlbnQpIHsgdGhyZXNob2xkdG9ibGFja3BlcmNlbnQgPSA1MDsgfVxyXG4gICAgICAgIHZhciB0aHJlc2hvbGQgPSB0aHJlc2hvbGR0b2JsYWNrcGVyY2VudC8xMDAgKiAoMjU1ICsgMjU1ICsgMjU1KTtcclxuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IHB4cy5kYXRhLmxlbmd0aDsgYys9NCkge1xyXG4gICAgICAgICAgICBpZiAocHhzLmRhdGFbY10gKyBweHMuZGF0YVtjKzFdICsgcHhzLmRhdGFbYysyXSA8IHRocmVzaG9sZCApIHtcclxuICAgICAgICAgICAgICAgIHB4cy5kYXRhW2NdID0gMDtcclxuICAgICAgICAgICAgICAgIHB4cy5kYXRhW2MrMV0gPSAwO1xyXG4gICAgICAgICAgICAgICAgcHhzLmRhdGFbYysyXSA9IDA7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBweHMuZGF0YVtjXSA9IDI1NTtcclxuICAgICAgICAgICAgICAgIHB4cy5kYXRhW2MrMV0gPSAyNTU7XHJcbiAgICAgICAgICAgICAgICBweHMuZGF0YVtjKzJdID0gMjU1O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gcHhzO1xyXG4gICAgfVxyXG59IiwiZXhwb3J0IGRlZmF1bHQge1xyXG4gICAgdW5pZm9ybXM6IHtcclxuICAgICAgICBVTklGT1JNMWY6ICcxZicsXHJcbiAgICAgICAgVU5JRk9STTJmOiAnMmYnLFxyXG4gICAgICAgIFVOSUZPUk0zZjogJzNmJyxcclxuICAgICAgICBVTklGT1JNNGY6ICc0ZicsXHJcblxyXG4gICAgICAgIFVOSUZPUk0xaTogJzFpJyxcclxuICAgICAgICBVTklGT1JNMmk6ICcyaScsXHJcbiAgICAgICAgVU5JRk9STTNpOiAnM2knLFxyXG4gICAgICAgIFVOSUZPUk00aTogJzRpJ1xyXG4gICAgfVxyXG59IiwiaW1wb3J0IENvbnN0YW50cyBmcm9tICcuL2NvbnN0YW50cy5lczYnO1xyXG5pbXBvcnQgU2hhZGVycyBmcm9tICcuL3NoYWRlcnMuZXM2JztcclxuaW1wb3J0IEZpbHRlcnMgZnJvbSAnLi9maWx0ZXJzLmVzNic7XHJcbmltcG9ydCBUZXh0dXJlcyBmcm9tICcuL3RleHR1cmVzLmVzNic7XHJcbmltcG9ydCBVbmlmb3JtcyBmcm9tICcuL3VuaWZvcm1zLmVzNic7XHJcblxyXG5leHBvcnQgZGVmYXVsdCB7XHJcbiAgICAvKipcclxuICAgICAqIGNyZWF0ZSBmaWx0ZXIgZnJvbSBzaGFkZXJzXHJcbiAgICAgKiBAcGFyYW0gdmVydGV4U2hhZGVyXHJcbiAgICAgKiBAcGFyYW0gZnJhZ21lbnRTaGFkZXJcclxuICAgICAqIEByZXR1cm5zIHt7dmVydGV4U2hhZGVyOiAqLCBmcmFnbWVudFNoYWRlcjogKn19XHJcbiAgICAgKi9cclxuICAgIGNyZWF0ZUZpbHRlckZyb21TaGFkZXJzKHZlcnRleFNoYWRlciwgZnJhZ21lbnRTaGFkZXIpIHtcclxuICAgICAgICByZXR1cm4geyB2ZXJ0ZXhTaGFkZXI6IHZlcnRleFNoYWRlciwgZnJhZ21lbnRTaGFkZXI6IGZyYWdtZW50U2hhZGVyIH07XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogY3JlYXRlIGEgZmlsdGVyIGZyb20gZmlsdGVyIG5hbWVcclxuICAgICAqIEBwYXJhbSBuYW1lXHJcbiAgICAgKiBAcGFyYW0gbWVtb3J5IHNwYWNlL3ZhcmlhYmxlIHRvIHB1bGwgc2hhZGVyIGZyb21cclxuICAgICAqL1xyXG4gICAgY3JlYXRlRmlsdGVyRnJvbU5hbWUobmFtZSwgc2hhZGVybG9jKSB7XHJcbiAgICAgICAgaWYgKCFzaGFkZXJsb2MpIHtcclxuICAgICAgICAgICAgc2hhZGVybG9jID0gU2hhZGVycztcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCFzaGFkZXJsb2NbbmFtZV0pIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1NoYWRlciAnLCBuYW1lLCAnbm90IGZvdW5kIGluICcsIHNoYWRlcmxvYywgJyB1c2luZyBhIHBhc3N0aHJvdWdoIHNoYWRlciBpbnN0ZWFkJyk7XHJcbiAgICAgICAgICAgIHNoYWRlcmxvYyA9IFNoYWRlcnM7XHJcbiAgICAgICAgICAgIG5hbWUgPSAncGFzc3Rocm91Z2gnO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgdnR4ID0gc2hhZGVybG9jW25hbWVdLnZlcnRleDtcclxuICAgICAgICB2YXIgZnJnID0gc2hhZGVybG9jW25hbWVdLmZyYWdtZW50O1xyXG4gICAgICAgIHJldHVybiB0aGlzLmNyZWF0ZUZpbHRlckZyb21TaGFkZXJzKHZ0eCwgZnJnKTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBjcmVhdGUgb2JqZWN0IGZvciByZW5kZXJcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fXBhcmFtc1xyXG4gICAgICovXHJcbiAgICBjcmVhdGVSZW5kZXJPYmplY3QocGFyYW1zKSB7XHJcbiAgICAgICAgdmFyIHByb3BzID0ge307XHJcblxyXG4gICAgICAgIHByb3BzLmdsID0gcGFyYW1zLmdsO1xyXG4gICAgICAgIHByb3BzLndpZHRoID0gcHJvcHMuZ2wuY2FudmFzLndpZHRoO1xyXG4gICAgICAgIHByb3BzLmhlaWdodCA9IHByb3BzLmdsLmNhbnZhcy5oZWlnaHQ7XHJcblxyXG4gICAgICAgIGlmIChwYXJhbXMud2lkdGgpIHsgcHJvcHMud2lkdGggPSBwYXJhbXMud2lkdGg7IH1cclxuICAgICAgICBpZiAocGFyYW1zLmhlaWdodCkgeyBwcm9wcy5oZWlnaHQgPSBwYXJhbXMuaGVpZ2h0OyB9XHJcblxyXG4gICAgICAgIHByb3BzLmZpbHRlciA9IHBhcmFtcy5maWx0ZXI7XHJcbiAgICAgICAgcHJvcHMudGV4dHVyZXMgPSBuZXcgVGV4dHVyZXMocHJvcHMud2lkdGgscHJvcHMuaGVpZ2h0KTtcclxuXHJcbiAgICAgICAgcHJvcHMuY2FudmFzMkRIZWxwZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcclxuICAgICAgICBwcm9wcy5jYW52YXMyREhlbHBlci53aWR0aCA9IHByb3BzLndpZHRoO1xyXG4gICAgICAgIHByb3BzLmNhbnZhczJESGVscGVyLmhlaWdodCA9IHByb3BzLmhlaWdodDtcclxuICAgICAgICBwcm9wcy5jYW52YXMyREhlbHBlckNvbnRleHQgPSBwcm9wcy5jYW52YXMyREhlbHBlci5nZXRDb250ZXh0KCcyZCcpO1xyXG5cclxuICAgICAgICBwcm9wcy51bmlmb3JtcyA9IG5ldyBVbmlmb3JtcygpO1xyXG4gICAgICAgIHByb3BzLnRleHR1cmVzID0gbmV3IFRleHR1cmVzKHByb3BzLmdsLCBwcm9wcy53aWR0aCwgcHJvcHMuaGVpZ2h0KTtcclxuXHJcbiAgICAgICAgaWYgKHBhcmFtcy50ZXh0dXJlcykge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IHBhcmFtcy50ZXh0dXJlcy5sZW5ndGg7IGMrKykge1xyXG4gICAgICAgICAgICAgICAgcHJvcHMudGV4dHVyZXMuYWRkKHBhcmFtcy50ZXh0dXJlc1tjXS5uYW1lLCBwYXJhbXMudGV4dHVyZXNbY10udGV4dHVyZSwgcGFyYW1zLnRleHR1cmVzW2NdLmluZGV4LCBwYXJhbXMudGV4dHVyZXNbY10ucGl4ZWxTdG9yZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChwYXJhbXMudW5pZm9ybXMpIHtcclxuICAgICAgICAgICAgZm9yICh2YXIgYyA9IDA7IGMgPCBwYXJhbXMudW5pZm9ybXMubGVuZ3RoOyBjKyspIHtcclxuICAgICAgICAgICAgICAgIHByb3BzLnVuaWZvcm1zLmFkZChwYXJhbXMudW5pZm9ybXNbY10ubmFtZSwgcGFyYW1zLnVuaWZvcm1zW2NdLnR5cGUsIHBhcmFtcy51bmlmb3Jtc1tjXS52YWx1ZXMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocGFyYW1zLmF1dG9yZW5kZXIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVuZGVyKHByb3BzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBwcm9wcztcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiByZW5kZXIgV2ViR0wgZmlsdGVyIG9uIGN1cnJlbnQgdGV4dHVyZVxyXG4gICAgICogQHBhcmFtIGdscHJvcHNcclxuICAgICAqIEBwYXJhbSByZWZyZXNoVGV4dHVyZUluZGljZXMgdGV4dHVyZSByZWZyZXNoIGluZGljZXMgKG9wdGlvbmFsKVxyXG4gICAgICogQHJldHVybnMgeyp9XHJcbiAgICAgKi9cclxuICAgIHJlbmRlcihnbHByb3BzKSB7XHJcbiAgICAgICAgaWYgKCFnbHByb3BzLmlzSW5pdGlhbGl6ZWQpIHtcclxuICAgICAgICAgICAgdmFyIHZlcnRleFNoYWRlciA9IGdscHJvcHMuZ2wuY3JlYXRlU2hhZGVyKGdscHJvcHMuZ2wuVkVSVEVYX1NIQURFUik7XHJcbiAgICAgICAgICAgIGdscHJvcHMuZ2wuc2hhZGVyU291cmNlKHZlcnRleFNoYWRlciwgZ2xwcm9wcy5maWx0ZXIudmVydGV4U2hhZGVyKTtcclxuICAgICAgICAgICAgZ2xwcm9wcy5nbC5jb21waWxlU2hhZGVyKHZlcnRleFNoYWRlcik7XHJcblxyXG4gICAgICAgICAgICB2YXIgZnJhZ21lbnRTaGFkZXIgPSBnbHByb3BzLmdsLmNyZWF0ZVNoYWRlcihnbHByb3BzLmdsLkZSQUdNRU5UX1NIQURFUik7XHJcbiAgICAgICAgICAgIGdscHJvcHMuZ2wuc2hhZGVyU291cmNlKGZyYWdtZW50U2hhZGVyLCBnbHByb3BzLmZpbHRlci5mcmFnbWVudFNoYWRlcik7XHJcbiAgICAgICAgICAgIGdscHJvcHMuZ2wuY29tcGlsZVNoYWRlcihmcmFnbWVudFNoYWRlcik7XHJcblxyXG4gICAgICAgICAgICBnbHByb3BzLnByb2dyYW0gPSBnbHByb3BzLmdsLmNyZWF0ZVByb2dyYW0oKTtcclxuICAgICAgICAgICAgZ2xwcm9wcy5nbC5hdHRhY2hTaGFkZXIoZ2xwcm9wcy5wcm9ncmFtLCB2ZXJ0ZXhTaGFkZXIpO1xyXG4gICAgICAgICAgICBnbHByb3BzLmdsLmF0dGFjaFNoYWRlcihnbHByb3BzLnByb2dyYW0sIGZyYWdtZW50U2hhZGVyKTtcclxuICAgICAgICAgICAgZ2xwcm9wcy5nbC5saW5rUHJvZ3JhbShnbHByb3BzLnByb2dyYW0pO1xyXG4gICAgICAgICAgICBnbHByb3BzLmdsLnVzZVByb2dyYW0oZ2xwcm9wcy5wcm9ncmFtKTtcclxuXHJcbiAgICAgICAgICAgIHZhciBwb3NpdGlvbkxvY2F0aW9uID0gZ2xwcm9wcy5nbC5nZXRBdHRyaWJMb2NhdGlvbihnbHByb3BzLnByb2dyYW0sICdhX3Bvc2l0aW9uJyk7XHJcbiAgICAgICAgICAgIHZhciB0ZXhDb29yZEJ1ZmZlciA9IGdscHJvcHMuZ2wuY3JlYXRlQnVmZmVyKCk7XHJcbiAgICAgICAgICAgIHZhciByZWN0Q29vcmRCdWZmZXIgPSBnbHByb3BzLmdsLmNyZWF0ZUJ1ZmZlcigpO1xyXG4gICAgICAgICAgICB2YXIgdGV4Q29vcmRzID0gbmV3IEZsb2F0MzJBcnJheShbMC4wLCAgMC4wLCAxLjAsICAwLjAsIDAuMCwgIDEuMCwgMC4wLCAgMS4wLCAxLjAsICAwLjAsIDEuMCwgIDEuMF0pO1xyXG4gICAgICAgICAgICB2YXIgcmVjdENvb3JkcyA9IG5ldyBGbG9hdDMyQXJyYXkoWzAsIDAsIGdscHJvcHMudGV4dHVyZXMud2lkdGgsIDAsIDAsIGdscHJvcHMudGV4dHVyZXMuaGVpZ2h0LCAwLFxyXG4gICAgICAgICAgICAgICAgZ2xwcm9wcy50ZXh0dXJlcy5oZWlnaHQsIGdscHJvcHMudGV4dHVyZXMud2lkdGgsIDAsIGdscHJvcHMudGV4dHVyZXMud2lkdGgsIGdscHJvcHMudGV4dHVyZXMuaGVpZ2h0XSk7XHJcblxyXG4gICAgICAgICAgICBnbHByb3BzLmdsLmJpbmRCdWZmZXIoZ2xwcm9wcy5nbC5BUlJBWV9CVUZGRVIsIHRleENvb3JkQnVmZmVyKTtcclxuICAgICAgICAgICAgZ2xwcm9wcy5nbC5idWZmZXJEYXRhKGdscHJvcHMuZ2wuQVJSQVlfQlVGRkVSLCB0ZXhDb29yZHMsIGdscHJvcHMuZ2wuU1RBVElDX0RSQVcpO1xyXG5cclxuICAgICAgICAgICAgdmFyIHRleENvb3JkTG9jYXRpb24gPSBnbHByb3BzLmdsLmdldEF0dHJpYkxvY2F0aW9uKGdscHJvcHMucHJvZ3JhbSwgJ2FfdGV4Q29vcmQnKTtcclxuICAgICAgICAgICAgZ2xwcm9wcy5nbC5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheSh0ZXhDb29yZExvY2F0aW9uKTtcclxuICAgICAgICAgICAgZ2xwcm9wcy5nbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKHRleENvb3JkTG9jYXRpb24sIDIsIGdscHJvcHMuZ2wuRkxPQVQsIGZhbHNlLCAwLCAwKTtcclxuXHJcbiAgICAgICAgICAgIGdscHJvcHMudW5pZm9ybXMuYWRkKCd1X3Jlc29sdXRpb24nLCBDb25zdGFudHMudW5pZm9ybXMuVU5JRk9STTJmLCBbZ2xwcm9wcy5nbC5jYW52YXMud2lkdGgsIGdscHJvcHMuZ2wuY2FudmFzLmhlaWdodF0pO1xyXG4gICAgICAgICAgICBnbHByb3BzLnVuaWZvcm1zLmFkZCgnZl9yZXNvbHV0aW9uJywgQ29uc3RhbnRzLnVuaWZvcm1zLlVOSUZPUk0yZiwgW2dscHJvcHMuZ2wuY2FudmFzLndpZHRoLCBnbHByb3BzLmdsLmNhbnZhcy5oZWlnaHRdKTtcclxuXHJcbiAgICAgICAgICAgIGdscHJvcHMuZ2wuYmluZEJ1ZmZlcihnbHByb3BzLmdsLkFSUkFZX0JVRkZFUiwgcmVjdENvb3JkQnVmZmVyKTtcclxuICAgICAgICAgICAgZ2xwcm9wcy5nbC5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheShwb3NpdGlvbkxvY2F0aW9uKTtcclxuICAgICAgICAgICAgZ2xwcm9wcy5nbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKHBvc2l0aW9uTG9jYXRpb24sIDIsIGdscHJvcHMuZ2wuRkxPQVQsIGZhbHNlLCAwLCAwKTtcclxuICAgICAgICAgICAgZ2xwcm9wcy5nbC5idWZmZXJEYXRhKGdscHJvcHMuZ2wuQVJSQVlfQlVGRkVSLCByZWN0Q29vcmRzLCBnbHByb3BzLmdsLlNUQVRJQ19EUkFXKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdscHJvcHMudGV4dHVyZXMuaW5pdGlhbGl6ZU5ld1RleHR1cmVzKGdscHJvcHMucHJvZ3JhbSk7XHJcbiAgICAgICAgZ2xwcm9wcy50ZXh0dXJlcy5yZWZyZXNoU2NlbmUoKTtcclxuICAgICAgICBnbHByb3BzLnVuaWZvcm1zLnVwZGF0ZVByb2dyYW0oZ2xwcm9wcy5nbCwgZ2xwcm9wcy5wcm9ncmFtKTtcclxuXHJcbiAgICAgICAgZ2xwcm9wcy5nbC5kcmF3QXJyYXlzKGdscHJvcHMuZ2wuVFJJQU5HTEVTLCAwLCA2KTtcclxuICAgICAgICBnbHByb3BzLmlzSW5pdGlhbGl6ZWQgPSB0cnVlO1xyXG5cclxuICAgICAgICByZXR1cm4gZ2xwcm9wcztcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiByZWFkIHBpeGVscyBmcm9tIEdMIGNvbnRleHRcclxuICAgICAqIEBwYXJhbSBnbFByb3BzXHJcbiAgICAgKi9cclxuICAgIGdldENhbnZhc1BpeGVscyhnbHByb3BzKSB7XHJcbiAgICAgICAgdmFyIGdsY3R4ID0gZ2xwcm9wcy5nbDtcclxuICAgICAgICBpZiAoIWdscHJvcHMucGl4ZWxhcnJheSkge1xyXG4gICAgICAgICAgICBnbHByb3BzLnBpeGVsYXJyYXkgPSBuZXcgVWludDhBcnJheShnbGN0eC5jYW52YXMud2lkdGggKiBnbGN0eC5jYW52YXMuaGVpZ2h0ICogNCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGdsY3R4LnJlYWRQaXhlbHMoMCwgMCwgZ2xjdHguY2FudmFzLndpZHRoLCBnbGN0eC5jYW52YXMuaGVpZ2h0LCBnbGN0eC5SR0JBLCBnbGN0eC5VTlNJR05FRF9CWVRFLCBnbHByb3BzLnBpeGVsYXJyYXkpO1xyXG4gICAgICAgIHZhciBpbWdEYXRhID0gZ2xwcm9wcy5jYW52YXMyREhlbHBlckNvbnRleHQuY3JlYXRlSW1hZ2VEYXRhKGdsY3R4LmNhbnZhcy53aWR0aCwgZ2xjdHguY2FudmFzLmhlaWdodCk7XHJcbiAgICAgICAgaW1nRGF0YS5kYXRhLnNldChuZXcgVWludDhDbGFtcGVkQXJyYXkoZ2xwcm9wcy5waXhlbGFycmF5KSk7XHJcbiAgICAgICAgcmV0dXJuIGltZ0RhdGE7XHJcbiAgICB9XHJcbn07IiwiZXhwb3J0IGRlZmF1bHQge1xuICBcImZyZWljaGVuX2VkZ2VfZGV0ZWN0aW9uXCI6IHtcbiAgICBcImZyYWdtZW50XCI6IFwicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7IHVuaWZvcm0gc2FtcGxlcjJEIHVfaW1hZ2UwOyB2YXJ5aW5nIHZlYzIgdl90ZXhDb29yZDsgdW5pZm9ybSB2ZWMyIGZfcmVzb2x1dGlvbjsgdmVjMiB0ZXhlbCA9IHZlYzIoMS4wIC8gZl9yZXNvbHV0aW9uLngsIDEuMCAvIGZfcmVzb2x1dGlvbi55KTsgbWF0MyBHWzldOyAgY29uc3QgbWF0MyBnMCA9IG1hdDMoIDAuMzUzNTUzMzg0NTQyNDY1MiwgMCwgLTAuMzUzNTUzMzg0NTQyNDY1MiwgMC41LCAwLCAtMC41LCAwLjM1MzU1MzM4NDU0MjQ2NTIsIDAsIC0wLjM1MzU1MzM4NDU0MjQ2NTIgKTsgY29uc3QgbWF0MyBnMSA9IG1hdDMoIDAuMzUzNTUzMzg0NTQyNDY1MiwgMC41LCAwLjM1MzU1MzM4NDU0MjQ2NTIsIDAsIDAsIDAsIC0wLjM1MzU1MzM4NDU0MjQ2NTIsIC0wLjUsIC0wLjM1MzU1MzM4NDU0MjQ2NTIgKTsgY29uc3QgbWF0MyBnMiA9IG1hdDMoIDAsIDAuMzUzNTUzMzg0NTQyNDY1MiwgLTAuNSwgLTAuMzUzNTUzMzg0NTQyNDY1MiwgMCwgMC4zNTM1NTMzODQ1NDI0NjUyLCAwLjUsIC0wLjM1MzU1MzM4NDU0MjQ2NTIsIDAgKTsgY29uc3QgbWF0MyBnMyA9IG1hdDMoIDAuNSwgLTAuMzUzNTUzMzg0NTQyNDY1MiwgMCwgLTAuMzUzNTUzMzg0NTQyNDY1MiwgMCwgMC4zNTM1NTMzODQ1NDI0NjUyLCAwLCAwLjM1MzU1MzM4NDU0MjQ2NTIsIC0wLjUgKTsgY29uc3QgbWF0MyBnNCA9IG1hdDMoIDAsIC0wLjUsIDAsIDAuNSwgMCwgMC41LCAwLCAtMC41LCAwICk7IGNvbnN0IG1hdDMgZzUgPSBtYXQzKCAtMC41LCAwLCAwLjUsIDAsIDAsIDAsIDAuNSwgMCwgLTAuNSApOyBjb25zdCBtYXQzIGc2ID0gbWF0MyggMC4xNjY2NjY2NzE2MzM3MjA0LCAtMC4zMzMzMzMzNDMyNjc0NDA4LCAwLjE2NjY2NjY3MTYzMzcyMDQsIC0wLjMzMzMzMzM0MzI2NzQ0MDgsIDAuNjY2NjY2Njg2NTM0ODgxNiwgLTAuMzMzMzMzMzQzMjY3NDQwOCwgMC4xNjY2NjY2NzE2MzM3MjA0LCAtMC4zMzMzMzMzNDMyNjc0NDA4LCAwLjE2NjY2NjY3MTYzMzcyMDQgKTsgY29uc3QgbWF0MyBnNyA9IG1hdDMoIC0wLjMzMzMzMzM0MzI2NzQ0MDgsIDAuMTY2NjY2NjcxNjMzNzIwNCwgLTAuMzMzMzMzMzQzMjY3NDQwOCwgMC4xNjY2NjY2NzE2MzM3MjA0LCAwLjY2NjY2NjY4NjUzNDg4MTYsIDAuMTY2NjY2NjcxNjMzNzIwNCwgLTAuMzMzMzMzMzQzMjY3NDQwOCwgMC4xNjY2NjY2NzE2MzM3MjA0LCAtMC4zMzMzMzMzNDMyNjc0NDA4ICk7IGNvbnN0IG1hdDMgZzggPSBtYXQzKCAwLjMzMzMzMzM0MzI2NzQ0MDgsIDAuMzMzMzMzMzQzMjY3NDQwOCwgMC4zMzMzMzMzNDMyNjc0NDA4LCAwLjMzMzMzMzM0MzI2NzQ0MDgsIDAuMzMzMzMzMzQzMjY3NDQwOCwgMC4zMzMzMzMzNDMyNjc0NDA4LCAwLjMzMzMzMzM0MzI2NzQ0MDgsIDAuMzMzMzMzMzQzMjY3NDQwOCwgMC4zMzMzMzMzNDMyNjc0NDA4ICk7ICB2b2lkIG1haW4odm9pZCkgeyAgICAgIEdbMF0gPSBnMCwgICAgIEdbMV0gPSBnMSwgICAgIEdbMl0gPSBnMiwgICAgIEdbM10gPSBnMywgICAgIEdbNF0gPSBnNCwgICAgIEdbNV0gPSBnNSwgICAgIEdbNl0gPSBnNiwgICAgIEdbN10gPSBnNywgICAgIEdbOF0gPSBnODsgICAgICBtYXQzIEk7ICAgICBmbG9hdCBjbnZbOV07ICAgICB2ZWMzIHNhbXBsOyAgICAgIGZvciAoZmxvYXQgaT0wLjA7IGk8My4wOyBpKyspIHsgICAgICAgICBmb3IgKGZsb2F0IGo9MC4wOyBqPDMuMDsgaisrKSB7ICAgICAgICAgICAgIHNhbXBsID0gdGV4dHVyZTJEKHVfaW1hZ2UwLCB2X3RleENvb3JkICsgdGV4ZWwgKiB2ZWMyKGktMS4wLGotMS4wKSApLnJnYjsgICAgICAgICAgICAgSVtpbnQoaSldW2ludChqKV0gPSBsZW5ndGgoc2FtcGwpOyAgICAgICAgIH0gICAgIH0gICAgICBmb3IgKGludCBpPTA7IGk8OTsgaSsrKSB7ICAgICAgICAgZmxvYXQgZHAzID0gZG90KEdbaV1bMF0sIElbMF0pICsgZG90KEdbaV1bMV0sIElbMV0pICsgZG90KEdbaV1bMl0sIElbMl0pOyAgICAgICAgIGNudltpXSA9IGRwMyAqIGRwMzsgICAgIH0gICAgICBmbG9hdCBNID0gKGNudlswXSArIGNudlsxXSkgKyAoY252WzJdICsgY252WzNdKTsgICAgIGZsb2F0IFMgPSAoY252WzRdICsgY252WzVdKSArIChjbnZbNl0gKyBjbnZbN10pICsgKGNudls4XSArIE0pOyAgICAgIGdsX0ZyYWdDb2xvciA9IHZlYzQodmVjMyhzcXJ0KE0vUykpLCB0ZXh0dXJlMkQoIHVfaW1hZ2UwLCB2X3RleENvb3JkICkuYSApOyB9XCIsXG4gICAgXCJ2ZXJ0ZXhcIjogXCJhdHRyaWJ1dGUgdmVjMiBhX3Bvc2l0aW9uOyBhdHRyaWJ1dGUgdmVjMiBhX3RleENvb3JkOyB1bmlmb3JtIHZlYzIgdV9yZXNvbHV0aW9uOyB2YXJ5aW5nIHZlYzIgdl90ZXhDb29yZDsgIHZvaWQgbWFpbigpIHsgICAgIHZlYzIgemVyb1RvT25lID0gYV9wb3NpdGlvbiAvIHVfcmVzb2x1dGlvbjsgICAgIHZlYzIgemVyb1RvVHdvID0gemVyb1RvT25lICogMi4wOyAgICAgdmVjMiBjbGlwU3BhY2UgPSB6ZXJvVG9Ud28gLSAxLjA7ICAgICBnbF9Qb3NpdGlvbiA9IHZlYzQoY2xpcFNwYWNlICogdmVjMigxLCAtMSksIDAsIDEpOyAgICAgdl90ZXhDb29yZCA9IGFfdGV4Q29vcmQ7IH1cIlxuICB9LFxuICBcImdyZXlzY2FsZVwiOiB7XG4gICAgXCJmcmFnbWVudFwiOiBcInByZWNpc2lvbiBtZWRpdW1wIGZsb2F0OyB2YXJ5aW5nIHZlYzIgdl90ZXhDb29yZDsgIHVuaWZvcm0gc2FtcGxlcjJEIHVfaW1hZ2UwOyAgdm9pZCBtYWluKHZvaWQpIHsgICAgIHZlYzQgcHggPSB0ZXh0dXJlMkQodV9pbWFnZTAsIHZfdGV4Q29vcmQpOyAgICAgZmxvYXQgYXZnID0gKHB4LnIgKyBweC5nICsgcHguYikvMy4wOyAgICAgZ2xfRnJhZ0NvbG9yID0gdmVjNChhdmcsIGF2ZywgYXZnLCBweC5hKTsgfVwiLFxuICAgIFwidmVydGV4XCI6IFwiYXR0cmlidXRlIHZlYzIgYV9wb3NpdGlvbjsgYXR0cmlidXRlIHZlYzIgYV90ZXhDb29yZDsgdW5pZm9ybSB2ZWMyIHVfcmVzb2x1dGlvbjsgdmFyeWluZyB2ZWMyIHZfdGV4Q29vcmQ7ICB2b2lkIG1haW4oKSB7ICAgICB2ZWMyIHplcm9Ub09uZSA9IGFfcG9zaXRpb24gLyB1X3Jlc29sdXRpb247ICAgICB2ZWMyIHplcm9Ub1R3byA9IHplcm9Ub09uZSAqIDIuMDsgICAgIHZlYzIgY2xpcFNwYWNlID0gemVyb1RvVHdvIC0gMS4wOyAgICAgZ2xfUG9zaXRpb24gPSB2ZWM0KGNsaXBTcGFjZSAqIHZlYzIoMSwgLTEpLCAwLCAxKTsgICAgIHZfdGV4Q29vcmQgPSBhX3RleENvb3JkOyB9XCJcbiAgfSxcbiAgXCJwYXNzdGhyb3VnaFwiOiB7XG4gICAgXCJmcmFnbWVudFwiOiBcInByZWNpc2lvbiBtZWRpdW1wIGZsb2F0OyB1bmlmb3JtIHNhbXBsZXIyRCB1X2ltYWdlMDsgdmFyeWluZyB2ZWMyIHZfdGV4Q29vcmQ7ICB2b2lkIG1haW4oKSB7ICAgICBnbF9GcmFnQ29sb3IgPSB0ZXh0dXJlMkQodV9pbWFnZTAsIHZfdGV4Q29vcmQpOyB9XCIsXG4gICAgXCJ2ZXJ0ZXhcIjogXCJhdHRyaWJ1dGUgdmVjMiBhX3Bvc2l0aW9uOyBhdHRyaWJ1dGUgdmVjMiBhX3RleENvb3JkOyB1bmlmb3JtIHZlYzIgdV9yZXNvbHV0aW9uOyB2YXJ5aW5nIHZlYzIgdl90ZXhDb29yZDsgIHZvaWQgbWFpbigpIHsgICAgIHZlYzIgemVyb1RvT25lID0gYV9wb3NpdGlvbiAvIHVfcmVzb2x1dGlvbjsgICAgIHZlYzIgemVyb1RvVHdvID0gemVyb1RvT25lICogMi4wOyAgICAgdmVjMiBjbGlwU3BhY2UgPSB6ZXJvVG9Ud28gLSAxLjA7ICAgICBnbF9Qb3NpdGlvbiA9IHZlYzQoY2xpcFNwYWNlICogdmVjMigxLCAtMSksIDAsIDEpOyAgICAgdl90ZXhDb29yZCA9IGFfdGV4Q29vcmQ7IH1cIlxuICB9LFxuICBcInNlcGlhXCI6IHtcbiAgICBcImZyYWdtZW50XCI6IFwicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7IHZhcnlpbmcgdmVjMiB2X3RleENvb3JkOyAgdW5pZm9ybSBzYW1wbGVyMkQgdV9pbWFnZTA7IHVuaWZvcm0gdmVjNCBsaWdodDsgdW5pZm9ybSB2ZWM0IGRhcms7IHVuaWZvcm0gZmxvYXQgZGVzYXQ7IHVuaWZvcm0gZmxvYXQgdG9uZWQ7ICBjb25zdCBtYXQ0IGNvZWZmID0gbWF0NCggICAgIDAuMzkzLCAwLjM0OSwgMC4yNzIsIDEuMCwgICAgIDAuNzk2LCAwLjY4NiwgMC41MzQsIDEuMCwgICAgIDAuMTg5LCAwLjE2OCwgMC4xMzEsIDEuMCwgICAgIDAuMCwgMC4wLCAwLjAsIDEuMCApOyAgdm9pZCBtYWluKHZvaWQpIHsgICAgIHZlYzQgc291cmNlUGl4ZWwgPSB0ZXh0dXJlMkQodV9pbWFnZTAsIHZfdGV4Q29vcmQpOyAgICAgZ2xfRnJhZ0NvbG9yID0gY29lZmYgKiBzb3VyY2VQaXhlbDsgfVwiLFxuICAgIFwidmVydGV4XCI6IFwiYXR0cmlidXRlIHZlYzIgYV9wb3NpdGlvbjsgYXR0cmlidXRlIHZlYzIgYV90ZXhDb29yZDsgdW5pZm9ybSB2ZWMyIHVfcmVzb2x1dGlvbjsgdmFyeWluZyB2ZWMyIHZfdGV4Q29vcmQ7ICB2b2lkIG1haW4oKSB7ICAgICB2ZWMyIHplcm9Ub09uZSA9IGFfcG9zaXRpb24gLyB1X3Jlc29sdXRpb247ICAgICB2ZWMyIHplcm9Ub1R3byA9IHplcm9Ub09uZSAqIDIuMDsgICAgIHZlYzIgY2xpcFNwYWNlID0gemVyb1RvVHdvIC0gMS4wOyAgICAgZ2xfUG9zaXRpb24gPSB2ZWM0KGNsaXBTcGFjZSAqIHZlYzIoMSwgLTEpLCAwLCAxKTsgICAgIHZfdGV4Q29vcmQgPSBhX3RleENvb3JkOyB9XCJcbiAgfSxcbiAgXCJzb2JlbF9lZGdlX2RldGVjdGlvblwiOiB7XG4gICAgXCJmcmFnbWVudFwiOiBcInByZWNpc2lvbiBtZWRpdW1wIGZsb2F0OyB2YXJ5aW5nIHZlYzIgdl90ZXhDb29yZDsgdW5pZm9ybSBzYW1wbGVyMkQgdV9pbWFnZTA7IHVuaWZvcm0gdmVjMiBmX3Jlc29sdXRpb247ICB2b2lkIG1haW4odm9pZCkgeyAgICAgZmxvYXQgeCA9IDEuMCAvIGZfcmVzb2x1dGlvbi54OyAgICAgZmxvYXQgeSA9IDEuMCAvIGZfcmVzb2x1dGlvbi55OyAgICAgdmVjNCBob3JpekVkZ2UgPSB2ZWM0KCAwLjAgKTsgICAgIGhvcml6RWRnZSAtPSB0ZXh0dXJlMkQoIHVfaW1hZ2UwLCB2ZWMyKCB2X3RleENvb3JkLnggLSB4LCB2X3RleENvb3JkLnkgLSB5ICkgKSAqIDEuMDsgICAgIGhvcml6RWRnZSAtPSB0ZXh0dXJlMkQoIHVfaW1hZ2UwLCB2ZWMyKCB2X3RleENvb3JkLnggLSB4LCB2X3RleENvb3JkLnkgICAgICkgKSAqIDIuMDsgICAgIGhvcml6RWRnZSAtPSB0ZXh0dXJlMkQoIHVfaW1hZ2UwLCB2ZWMyKCB2X3RleENvb3JkLnggLSB4LCB2X3RleENvb3JkLnkgKyB5ICkgKSAqIDEuMDsgICAgIGhvcml6RWRnZSArPSB0ZXh0dXJlMkQoIHVfaW1hZ2UwLCB2ZWMyKCB2X3RleENvb3JkLnggKyB4LCB2X3RleENvb3JkLnkgLSB5ICkgKSAqIDEuMDsgICAgIGhvcml6RWRnZSArPSB0ZXh0dXJlMkQoIHVfaW1hZ2UwLCB2ZWMyKCB2X3RleENvb3JkLnggKyB4LCB2X3RleENvb3JkLnkgICAgICkgKSAqIDIuMDsgICAgIGhvcml6RWRnZSArPSB0ZXh0dXJlMkQoIHVfaW1hZ2UwLCB2ZWMyKCB2X3RleENvb3JkLnggKyB4LCB2X3RleENvb3JkLnkgKyB5ICkgKSAqIDEuMDsgICAgIHZlYzQgdmVydEVkZ2UgPSB2ZWM0KCAwLjAgKTsgICAgIHZlcnRFZGdlIC09IHRleHR1cmUyRCggdV9pbWFnZTAsIHZlYzIoIHZfdGV4Q29vcmQueCAtIHgsIHZfdGV4Q29vcmQueSAtIHkgKSApICogMS4wOyAgICAgdmVydEVkZ2UgLT0gdGV4dHVyZTJEKCB1X2ltYWdlMCwgdmVjMiggdl90ZXhDb29yZC54ICAgICwgdl90ZXhDb29yZC55IC0geSApICkgKiAyLjA7ICAgICB2ZXJ0RWRnZSAtPSB0ZXh0dXJlMkQoIHVfaW1hZ2UwLCB2ZWMyKCB2X3RleENvb3JkLnggKyB4LCB2X3RleENvb3JkLnkgLSB5ICkgKSAqIDEuMDsgICAgIHZlcnRFZGdlICs9IHRleHR1cmUyRCggdV9pbWFnZTAsIHZlYzIoIHZfdGV4Q29vcmQueCAtIHgsIHZfdGV4Q29vcmQueSArIHkgKSApICogMS4wOyAgICAgdmVydEVkZ2UgKz0gdGV4dHVyZTJEKCB1X2ltYWdlMCwgdmVjMiggdl90ZXhDb29yZC54ICAgICwgdl90ZXhDb29yZC55ICsgeSApICkgKiAyLjA7ICAgICB2ZXJ0RWRnZSArPSB0ZXh0dXJlMkQoIHVfaW1hZ2UwLCB2ZWMyKCB2X3RleENvb3JkLnggKyB4LCB2X3RleENvb3JkLnkgKyB5ICkgKSAqIDEuMDsgICAgIHZlYzMgZWRnZSA9IHNxcnQoKGhvcml6RWRnZS5yZ2IgKiBob3JpekVkZ2UucmdiKSArICh2ZXJ0RWRnZS5yZ2IgKiB2ZXJ0RWRnZS5yZ2IpKTsgICAgICBnbF9GcmFnQ29sb3IgPSB2ZWM0KCBlZGdlLCB0ZXh0dXJlMkQoIHVfaW1hZ2UwLCB2X3RleENvb3JkICkuYSApOyB9XCIsXG4gICAgXCJ2ZXJ0ZXhcIjogXCJhdHRyaWJ1dGUgdmVjMiBhX3Bvc2l0aW9uOyBhdHRyaWJ1dGUgdmVjMiBhX3RleENvb3JkOyB1bmlmb3JtIHZlYzIgdV9yZXNvbHV0aW9uOyB2YXJ5aW5nIHZlYzIgdl90ZXhDb29yZDsgIHZvaWQgbWFpbigpIHsgICAgIHZlYzIgemVyb1RvT25lID0gYV9wb3NpdGlvbiAvIHVfcmVzb2x1dGlvbjsgICAgIHZlYzIgemVyb1RvVHdvID0gemVyb1RvT25lICogMi4wOyAgICAgdmVjMiBjbGlwU3BhY2UgPSB6ZXJvVG9Ud28gLSAxLjA7ICAgICBnbF9Qb3NpdGlvbiA9IHZlYzQoY2xpcFNwYWNlICogdmVjMigxLCAtMSksIDAsIDEpOyAgICAgdl90ZXhDb29yZCA9IGFfdGV4Q29vcmQ7IH1cIlxuICB9XG59IiwiZXhwb3J0IGRlZmF1bHQgY2xhc3Mge1xyXG4gICAgLyoqXHJcbiAgICAgKiBjLXRvclxyXG4gICAgICogQHBhcmFtIGdsXHJcbiAgICAgKiBAcGFyYW0gd2lkdGhcclxuICAgICAqIEBwYXJhbSBoZWlnaHRcclxuICAgICAqL1xyXG4gICAgY29uc3RydWN0b3IoZ2wsIHdpZHRoLCBoZWlnaHQpIHtcclxuICAgICAgICAvKiogaW50ZXJuYWwgdGV4dHVyZSBhcnJheSAqL1xyXG4gICAgICAgIHRoaXMuX3RleHR1cmVzID0ge307XHJcblxyXG4gICAgICAgIC8qKiB3aWR0aCAqL1xyXG4gICAgICAgIHRoaXMud2lkdGggPSB3aWR0aDtcclxuXHJcbiAgICAgICAgLyoqIGhlaWdodCAqL1xyXG4gICAgICAgIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xyXG5cclxuICAgICAgICAvKiogZ2wgY29udGV4dCAqL1xyXG4gICAgICAgIHRoaXMuZ2wgPSBnbDtcclxuXHJcbiAgICAgICAgLyoqIHVuaW5pdGlhbGl6ZWQgdGV4dHVyZXMgKi9cclxuICAgICAgICB0aGlzLl91bml0aWFsaXplZCA9IFtdO1xyXG5cclxuICAgICAgICAvKiogZGlydHkgdGV4dHVyZXMgKG5lZWRzIHVwZGF0aW5nKSAqL1xyXG4gICAgICAgIHRoaXMuX2RpcnR5ID0gW107XHJcblxyXG4gICAgICAgIC8qKiB0ZXh0dXJlIGluZGljZXMgKi9cclxuICAgICAgICB0aGlzLnRleHR1cmVJbmRpY2VzID0gW107XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBhZGQgYSB0ZXh0dXJlXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHRleHR1cmVcclxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gZ2xpbmRleFxyXG4gICAgICogQHBhcmFtIHtBcnJheX0gcGl4ZWxzdG9yZVxyXG4gICAgICovXHJcbiAgICBhZGQobmFtZSwgdGV4dHVyZSwgZ2xpbmRleCwgcGl4ZWxzdG9yZSkge1xyXG4gICAgICAgIGlmICghZ2xpbmRleCkge1xyXG4gICAgICAgICAgICBnbGluZGV4ID0gMDtcclxuICAgICAgICAgICAgd2hpbGUgKHRoaXMudGV4dHVyZUluZGljZXMuaW5kZXhPZihnbGluZGV4KSAhPT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIGdsaW5kZXggKys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghcGl4ZWxzdG9yZSkge1xyXG4gICAgICAgICAgICBwaXhlbHN0b3JlID0gW107XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMudGV4dHVyZUluZGljZXMucHVzaChnbGluZGV4KTtcclxuXHJcbiAgICAgICAgdGhpcy5fdGV4dHVyZXNbbmFtZV0gPSB7XHJcbiAgICAgICAgICAgIG5hbWU6IG5hbWUsXHJcbiAgICAgICAgICAgIGdsaW5kZXg6IGdsaW5kZXgsXHJcbiAgICAgICAgICAgIHRleHR1cmU6IHRleHR1cmUsXHJcbiAgICAgICAgICAgIGdsdGV4dHVyZTogdGhpcy5nbC5jcmVhdGVUZXh0dXJlKCksXHJcbiAgICAgICAgICAgIGluaXRpYWxpemVkOiBmYWxzZSxcclxuICAgICAgICAgICAgcGl4ZWxTdG9yZTogcGl4ZWxzdG9yZSxcclxuICAgICAgICAgICAgZGlydHk6IHRydWUgfTtcclxuXHJcbiAgICAgICAgdGhpcy5fdW5pdGlhbGl6ZWQucHVzaCh0aGlzLl90ZXh0dXJlc1tuYW1lXSk7XHJcbiAgICB9O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogdXBkYXRlIGEgdW5pZm9ybVxyXG4gICAgICogQHBhcmFtIG5hbWUgbmFtZSBvZiB0ZXh0dXJlXHJcbiAgICAgKiBAcGFyYW0gdGV4dHVyZVxyXG4gICAgICovXHJcbiAgICB1cGRhdGUobmFtZSwgdGV4dHVyZSkge1xyXG4gICAgICAgIGlmICh0ZXh0dXJlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX3RleHR1cmVzW25hbWVdLnRleHR1cmUgPSB0ZXh0dXJlO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLl90ZXh0dXJlc1tuYW1lXS5kaXJ0eSA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5fZGlydHkucHVzaCh0aGlzLl90ZXh0dXJlc1tuYW1lXSk7XHJcbiAgICB9O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogcmVmcmVzaCBzY2VuZSB3aXRoIHVwZGF0ZWQgdGV4dHVyZXNcclxuICAgICAqL1xyXG4gICAgcmVmcmVzaFNjZW5lKCkge1xyXG4gICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgdGhpcy5fZGlydHkubGVuZ3RoOyBjKyspIHtcclxuICAgICAgICAgICAgdGhpcy5nbC5hY3RpdmVUZXh0dXJlKHRoaXMuZ2xbJ1RFWFRVUkUnICsgdGhpcy5fZGlydHlbY10uZ2xpbmRleF0pO1xyXG4gICAgICAgICAgICB0aGlzLmdsLmJpbmRUZXh0dXJlKHRoaXMuZ2wuVEVYVFVSRV8yRCwgdGhpcy5fZGlydHlbY10uZ2x0ZXh0dXJlKTtcclxuICAgICAgICAgICAgdGhpcy5nbC50ZXhTdWJJbWFnZTJEKHRoaXMuZ2wuVEVYVFVSRV8yRCwgMCwgMCwgMCwgdGhpcy5nbC5SR0JBLCB0aGlzLmdsLlVOU0lHTkVEX0JZVEUsIHRoaXMuX2RpcnR5W2NdLnRleHR1cmUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLl9kaXJ0eSA9IFtdO1xyXG4gICAgfTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIGluaXRpYWxpemUgbmV3IHRleHR1cmVzXHJcbiAgICAgKiBAcGFyYW0gcHJvZ3JhbVxyXG4gICAgICovXHJcbiAgICBpbml0aWFsaXplTmV3VGV4dHVyZXMocHJvZ3JhbSkge1xyXG4gICAgICAgIGlmICh0aGlzLl91bml0aWFsaXplZC5sZW5ndGggPT09IDApIHsgcmV0dXJuOyB9XHJcbiAgICAgICAgdmFyIGdsID0gdGhpcy5nbDtcclxuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IHRoaXMuX3VuaXRpYWxpemVkLmxlbmd0aDsgYysrKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX3VuaXRpYWxpemVkW2NdLmxvY2F0aW9uID0gZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHByb2dyYW0sICd1X2ltYWdlJyArIHRoaXMuX3VuaXRpYWxpemVkW2NdLmdsaW5kZXgpO1xyXG4gICAgICAgICAgICBnbC51bmlmb3JtMWkodGhpcy5fdW5pdGlhbGl6ZWRbY10ubG9jYXRpb24sIHRoaXMuX3VuaXRpYWxpemVkW2NdLmdsaW5kZXgpO1xyXG4gICAgICAgICAgICBnbC5hY3RpdmVUZXh0dXJlKGdsWydURVhUVVJFJyArIHRoaXMuX3VuaXRpYWxpemVkW2NdLmdsaW5kZXhdKTtcclxuICAgICAgICAgICAgZ2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy5fdW5pdGlhbGl6ZWRbY10uZ2x0ZXh0dXJlKTtcclxuICAgICAgICAgICAgZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfUywgZ2wuQ0xBTVBfVE9fRURHRSk7XHJcbiAgICAgICAgICAgIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1QsIGdsLkNMQU1QX1RPX0VER0UpO1xyXG4gICAgICAgICAgICBnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUlOX0ZJTFRFUiwgZ2wuTkVBUkVTVCk7XHJcbiAgICAgICAgICAgIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NQUdfRklMVEVSLCBnbC5ORUFSRVNUKTtcclxuXHJcbiAgICAgICAgICAgIGZvciAodmFyIGQgPSAwOyBkIDwgdGhpcy5fdW5pdGlhbGl6ZWRbY10ucGl4ZWxTdG9yZS5sZW5ndGg7IGQrKykge1xyXG4gICAgICAgICAgICAgICAgZ2wucGl4ZWxTdG9yZWkoZ2xbdGhpcy5fdW5pdGlhbGl6ZWRbY10ucGl4ZWxTdG9yZVtkXS5wcm9wZXJ0eV0sIHRoaXMuX3VuaXRpYWxpemVkW2NdLnBpeGVsU3RvcmVbZF0udmFsdWUpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBnbC50ZXhJbWFnZTJEKGdsLlRFWFRVUkVfMkQsIDAsIGdsLlJHQkEsIGdsLlJHQkEsIGdsLlVOU0lHTkVEX0JZVEUsIHRoaXMuX3VuaXRpYWxpemVkW2NdLnRleHR1cmUpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5fdW5pdGlhbGl6ZWRbY10uaW5pdGlhbGl6ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLl91bml0aWFsaXplZFtjXS5kaXJ0eSA9IGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLl91bml0aWFsaXplZCA9IFtdO1xyXG4gICAgfTtcclxufSIsImV4cG9ydCBkZWZhdWx0IGNsYXNzIHtcclxuICAgIC8qKlxyXG4gICAgICogYy10b3JcclxuICAgICAqL1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogaW50ZXJuYWwgbWFwcGluZyBvZiB1bmlmb3Jtc1xyXG4gICAgICAgICAqIEB0eXBlIHt7fX1cclxuICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMuX3VuaWZvcm1zID0ge307XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBhZGQgYSB1bmlmb3JtXHJcbiAgICAgKiBAcGFyYW0gdHlwZSB0eXBlIG9mIHVuaWZvcm0gKDFmLCAyZiwgM2YsIDRmLCAxaSwgMmksIDNpLCA0dVxyXG4gICAgICovXHJcbiAgICBhZGQobmFtZSwgdHlwZSwgdmFsdWVzKSB7XHJcbiAgICAgICAgdGhpcy5fdW5pZm9ybXNbbmFtZV0gPSB7IG5hbWU6IG5hbWUsIHR5cGU6IHR5cGUsIHZhbHVlczogdmFsdWVzLCBkaXJ0eTogdHJ1ZSB9O1xyXG4gICAgfTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIHVwZGF0ZSBhIHVuaWZvcm1cclxuICAgICAqIEBwYXJhbSB0eXBlIHR5cGUgb2YgdW5pZm9ybSAoMWYsIDJmLCAzZiwgNGYsIDFpLCAyaSwgM2ksIDR1XHJcbiAgICAgKi9cclxuICAgIHVwZGF0ZShuYW1lLCB2YWx1ZXMpIHtcclxuICAgICAgICB0aGlzLl91bmlmb3Jtc1tuYW1lXS52YWx1ZXMgPSB2YWx1ZXM7XHJcbiAgICAgICAgdGhpcy5fdW5pZm9ybXNbbmFtZV0uZGlydHkgPSB0cnVlO1xyXG4gICAgfTtcclxuXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiB1cGRhdGUgdW5pZm9ybXMgb24gR0wgY29udGV4dCBhbmQgcHJvZ3JhbVxyXG4gICAgICogQHBhcmFtIGdsIFdlYkdMIGNvbnRleHRcclxuICAgICAqIEBwYXJhbSBwcm9ncmFtXHJcbiAgICAgKi9cclxuICAgIHVwZGF0ZVByb2dyYW0oZ2wsIHByb2dyYW0pIHtcclxuICAgICAgICBmb3IgKHZhciBjIGluIHRoaXMuX3VuaWZvcm1zKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLl91bmlmb3Jtc1tjXS5kaXJ0eSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHUgPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24ocHJvZ3JhbSwgdGhpcy5fdW5pZm9ybXNbY10ubmFtZSk7XHJcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHRoaXMuX3VuaWZvcm1zW2NdLnR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlICcxZic6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsLnVuaWZvcm0xZih1LCB0aGlzLl91bmlmb3Jtc1tjXS52YWx1ZXNbMF0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnMmYnOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBnbC51bmlmb3JtMmYodSwgdGhpcy5fdW5pZm9ybXNbY10udmFsdWVzWzBdLCB0aGlzLl91bmlmb3Jtc1tjXS52YWx1ZXNbMV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnM2YnOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBnbC51bmlmb3JtM2YodSwgdGhpcy5fdW5pZm9ybXNbY10udmFsdWVzWzBdLCB0aGlzLl91bmlmb3Jtc1tjXS52YWx1ZXNbMV0sIHRoaXMuX3VuaWZvcm1zW2NdLnZhbHVlc1syXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBjYXNlICc0Zic6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsLnVuaWZvcm00Zih1LCB0aGlzLl91bmlmb3Jtc1tjXS52YWx1ZXNbMF0sIHRoaXMuX3VuaWZvcm1zW2NdLnZhbHVlc1sxXSwgdGhpcy5fdW5pZm9ybXNbY10udmFsdWVzWzJdLCB0aGlzLl91bmlmb3Jtc1tjXS52YWx1ZXNbM10pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnMWknOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBnbC51bmlmb3JtMWkodSwgdGhpcy5fdW5pZm9ybXNbY10udmFsdWVzWzBdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJzJpJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2wudW5pZm9ybTJpKHUsIHRoaXMuX3VuaWZvcm1zW2NdLnZhbHVlc1swXSwgdGhpcy5fdW5pZm9ybXNbY10udmFsdWVzWzFdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJzNpJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2wudW5pZm9ybTNpKHUsIHRoaXMuXy51bmlmb3Jtc1tjXS52YWx1ZXNbMF0sIHRoaXMuX3VuaWZvcm1zW2NdLnZhbHVlc1sxXSwgdGhpcy5fdW5pZm9ybXNbY10udmFsdWVzWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJzRpJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2wudW5pZm9ybWlmKHUsIHRoaXMuX3VuaWZvcm1zW2NdLnZhbHVlc1swXSwgdGhpcy5fdW5pZm9ybXNbY10udmFsdWVzWzFdLCB0aGlzLl91bmlmb3Jtc1tjXS52YWx1ZXNbMl0sIHRoaXMuX3VuaWZvcm1zW2NdLnZhbHVlc1szXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59Il19
