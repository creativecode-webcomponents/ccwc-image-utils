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

        if (params.textureOffset) {
            var offsetPercentX = params.textureOffset.x / props.width;
            var offsetPercentY = params.textureOffset.y / props.height;
            console.log(offsetPercentX, offsetPercentY);
            props.uniforms.add('offset', _constants2.default.uniforms.UNIFORM2f, [offsetPercentX, offsetPercentY]);
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
        if (!glprops.pixelarray || glctx.canvas.width * glctx.canvas.height * 4 !== glprops.pixelarray.length) {
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
    "vertex": "attribute vec2 a_position; attribute vec2 a_texCoord; uniform vec2 u_resolution; varying vec2 v_texCoord; uniform vec2 offset;  void main() {     vec2 zeroToOne = a_position / u_resolution;     vec2 zeroToTwo = zeroToOne * 2.0;     vec2 clipSpace = zeroToTwo - 1.0 + offset;     gl_Position = vec4(clipSpace.x * 1.0, clipSpace.y * -1.0, 0.0, 1.0);     v_texCoord = a_texCoord; }"
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYWxsLmVzNiIsInNyYy9jYW52YXMvYmxvYnMuZXM2Iiwic3JjL2NhbnZhcy9maWx0ZXJjaGFpbi5lczYiLCJzcmMvY2FudmFzL2ZpbHRlcnMuZXM2Iiwic3JjL3dlYmdsL2NvbnN0YW50cy5lczYiLCJzcmMvd2ViZ2wvZmlsdGVycy5lczYiLCJzcmMvd2ViZ2wvc2hhZGVycy5lczYiLCJzcmMvd2ViZ2wvdGV4dHVyZXMuZXM2Iiwic3JjL3dlYmdsL3VuaWZvcm1zLmVzNiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDQUE7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7Ozs7O0FBRUEsUUFBUSxLQUFSLEdBQWdCO0FBQ1osWUFBUTtBQUNKLDhCQURJO0FBRUosMENBRkk7QUFHSjtBQUhJLEtBREk7QUFNWixXQUFPO0FBQ0gsa0NBREc7QUFFSCxvQ0FGRztBQUdILG9DQUhHO0FBSUgsa0NBSkc7QUFLSDtBQUxHO0FBTkssQ0FBaEI7Ozs7Ozs7O2tCQ1RlOzs7O0FBSVgsbUJBQWMsRUFKSDs7Ozs7Ozs7QUFZWCxhQVpXLHFCQVlELEdBWkMsRUFZSSxHQVpKLEVBWVM7QUFDaEIsWUFBSSxDQUFDLEdBQUwsRUFBVTtBQUNOLGtCQUFNLEVBQU47QUFDSDs7QUFFRCxZQUFJLENBQUMsSUFBSSxXQUFULEVBQXNCO0FBQ2xCLGdCQUFJLFdBQUosR0FBa0IsS0FBSyxhQUF2QjtBQUNIOztBQUVELFlBQUksUUFBUSxJQUFJLEtBQWhCO0FBQ0EsWUFBSSxVQUFVLFFBQVEsQ0FBdEI7QUFDQSxZQUFJLE1BQU0sSUFBSSxJQUFKLENBQVMsTUFBbkI7QUFDQSxZQUFJLFNBQVMsSUFBSSxXQUFKLENBQWdCLElBQUksSUFBSixDQUFTLE1BQXpCLENBQWI7QUFDQSxhQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLElBQUksSUFBSSxJQUFKLENBQVMsTUFBN0IsRUFBcUMsR0FBckMsRUFBMEM7QUFDdEMsbUJBQU8sQ0FBUCxJQUFZLElBQUksSUFBSixDQUFTLENBQVQsQ0FBWjtBQUNIO0FBQ0QsWUFBSSxRQUFRLEVBQVo7QUFDQSxZQUFJLFlBQVksQ0FBQyxDQUFqQjs7O0FBR0EsWUFBSSxZQUFZLEVBQWhCO0FBQ0EsYUFBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLEdBQXBCLEVBQXlCLEtBQUssQ0FBOUIsRUFBaUM7QUFDN0IsZ0JBQUksT0FBTyxDQUFQLE1BQWMsR0FBbEIsRUFBdUI7QUFDbkI7QUFDSDtBQUNELGdCQUFJLFlBQVksQ0FBQyxJQUFJLENBQUwsRUFBUSxJQUFJLENBQVosRUFBZSxJQUFJLE9BQW5CLEVBQTRCLElBQUksT0FBaEMsRUFBeUMsSUFBSSxDQUFKLEdBQVEsT0FBakQsRUFBMEQsSUFBSSxDQUFKLEdBQVEsT0FBbEUsRUFBMkUsSUFBSSxDQUFKLEdBQVEsT0FBbkYsRUFBNEYsSUFBSSxDQUFKLEdBQVEsT0FBcEcsQ0FBaEI7QUFDQSxnQkFBSSxlQUFlLFVBQVUsTUFBN0I7OztBQUdBLGdCQUFJLGlCQUFpQixDQUFDLENBQXRCO0FBQ0EsaUJBQUssSUFBSSxXQUFXLENBQXBCLEVBQXVCLFdBQVcsWUFBbEMsRUFBZ0QsVUFBaEQsRUFBNEQ7QUFDeEQsb0JBQUksVUFBVSxRQUFWLEtBQXVCLENBQXZCLElBQTRCLFVBQVUsUUFBVixJQUFzQixHQUFsRCxJQUF5RCxPQUFPLFVBQVUsUUFBVixDQUFQLE1BQWdDLE9BQU8sQ0FBUCxDQUE3RixFQUF3Rzs7OztBQUlwRyx3QkFBSSxPQUFPLFVBQVUsUUFBVixJQUFzQixDQUE3QixJQUFrQyxDQUF0QyxFQUF5QztBQUNyQyw0QkFBSSxtQkFBbUIsQ0FBQyxDQUFwQixJQUF5QixtQkFBbUIsT0FBTyxVQUFVLFFBQVYsSUFBc0IsQ0FBN0IsQ0FBaEQsRUFBaUY7O0FBRTdFLHNDQUFVLElBQVYsQ0FBZSxDQUFDLGNBQUQsRUFBaUIsT0FBTyxVQUFVLFFBQVYsSUFBc0IsQ0FBN0IsQ0FBakIsQ0FBZjtBQUNIO0FBQ0QseUNBQWlCLE9BQU8sVUFBVSxRQUFWLElBQXNCLENBQTdCLENBQWpCO0FBQ0g7QUFDSjtBQUNKOztBQUVELGdCQUFJLGlCQUFpQixDQUFDLENBQXRCLEVBQXlCOztBQUVyQix1QkFBTyxJQUFJLENBQVgsSUFBZ0IsY0FBaEIsQztBQUNBLHNCQUFNLGNBQU4sRUFBc0IsSUFBdEIsQ0FBMkIsQ0FBM0I7QUFDSCxhQUpELE1BSU87O0FBRUg7QUFDQSxzQkFBTSxJQUFOLENBQVcsQ0FBQyxDQUFELENBQVg7QUFDQSx1QkFBTyxJQUFJLENBQVgsSUFBZ0IsU0FBaEIsQztBQUNIO0FBQ0o7Ozs7O0FBS0QsYUFBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLFVBQVUsTUFBOUIsRUFBc0MsR0FBdEMsRUFBMkM7QUFDdkMsaUJBQUssSUFBSSxJQUFJLENBQWIsRUFBZ0IsSUFBSSxVQUFVLE1BQTlCLEVBQXNDLEdBQXRDLEVBQTJDO0FBQ3ZDLG9CQUFJLFlBQVksS0FBaEI7QUFDQSxxQkFBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLFVBQVUsQ0FBVixFQUFhLE1BQWpDLEVBQXlDLEdBQXpDLEVBQThDO0FBQzFDLHdCQUFJLFVBQVUsQ0FBVixFQUFhLE9BQWIsQ0FBcUIsVUFBVSxDQUFWLEVBQWEsQ0FBYixDQUFyQixNQUEwQyxDQUFDLENBQS9DLEVBQWtEO0FBQzlDLG9DQUFZLElBQVo7QUFDSDtBQUNKO0FBQ0Qsb0JBQUksYUFBYSxNQUFNLENBQXZCLEVBQTBCO0FBQ3RCLHlCQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLElBQUksVUFBVSxDQUFWLEVBQWEsTUFBakMsRUFBeUMsR0FBekMsRUFBOEM7O0FBRTFDLDRCQUFJLFVBQVUsQ0FBVixFQUFhLE9BQWIsQ0FBcUIsVUFBVSxDQUFWLEVBQWEsQ0FBYixDQUFyQixNQUEwQyxDQUFDLENBQS9DLEVBQWtEO0FBQzlDLHNDQUFVLENBQVYsRUFBYSxJQUFiLENBQWtCLFVBQVUsQ0FBVixFQUFhLENBQWIsQ0FBbEI7QUFDSDtBQUNKO0FBQ0QsOEJBQVUsQ0FBVixJQUFlLEVBQWY7QUFDSDtBQUNKO0FBQ0o7OztBQUdELG9CQUFZLFVBQVUsTUFBVixDQUFpQixVQUFVLElBQVYsRUFBZ0I7QUFDekMsZ0JBQUksS0FBSyxNQUFMLEdBQWMsQ0FBbEIsRUFBcUI7QUFDakIsdUJBQU8sSUFBUDtBQUNIO0FBQ0osU0FKVyxDQUFaOzs7O0FBUUEsYUFBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLE1BQU0sTUFBMUIsRUFBa0MsR0FBbEMsRUFBdUM7QUFDbkMsaUJBQUssSUFBSSxJQUFJLENBQWIsRUFBZ0IsSUFBSSxVQUFVLE1BQTlCLEVBQXNDLEdBQXRDLEVBQTJDO0FBQ3ZDLG9CQUFJLFVBQVUsQ0FBVixFQUFhLE9BQWIsQ0FBcUIsQ0FBckIsTUFBNEIsQ0FBQyxDQUFqQyxFQUFvQztBQUNoQyx5QkFBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLFVBQVUsQ0FBVixFQUFhLE1BQWpDLEVBQXlDLEdBQXpDLEVBQThDO0FBQzFDLDRCQUFJLFVBQVUsQ0FBVixFQUFhLENBQWIsTUFBb0IsQ0FBeEIsRUFBMkI7QUFDdkIsa0NBQU0sQ0FBTixJQUFXLE1BQU0sQ0FBTixFQUFTLE1BQVQsQ0FBZ0IsTUFBTSxVQUFVLENBQVYsRUFBYSxDQUFiLENBQU4sQ0FBaEIsQ0FBWDtBQUNBLGtDQUFNLFVBQVUsQ0FBVixFQUFhLENBQWIsQ0FBTixJQUF5QixFQUF6QjtBQUNIO0FBQ0o7QUFDSjtBQUNKO0FBQ0o7Ozs7QUFJRCxnQkFBUSxNQUFNLE1BQU4sQ0FBYSxVQUFVLEdBQVYsRUFBZTtBQUNoQyxtQkFBTyxJQUFJLE1BQUosSUFBYyxJQUFJLFdBQXpCO0FBQ0gsU0FGTyxFQUVMLElBRkssQ0FBUjs7O0FBTUEsWUFBSSxhQUFhLEVBQWpCO0FBQ0EsYUFBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLE1BQU0sTUFBMUIsRUFBa0MsR0FBbEMsRUFBdUM7QUFDbkMsZ0JBQUksT0FBTyxDQUFDLENBQVo7Z0JBQWUsT0FBTyxDQUFDLENBQXZCO2dCQUEwQixPQUFPLENBQUMsQ0FBbEM7Z0JBQXFDLE9BQU8sQ0FBQyxDQUE3QztBQUNBLGlCQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLElBQUksTUFBTSxDQUFOLEVBQVMsTUFBN0IsRUFBcUMsR0FBckMsRUFBMEM7QUFDdEMsb0JBQUksS0FBSyxLQUFLLEtBQUwsQ0FBVyxNQUFNLENBQU4sRUFBUyxDQUFULElBQWMsQ0FBekIsQ0FBVDtBQUNBLG9CQUFJLElBQUksS0FBSyxLQUFiO0FBQ0Esb0JBQUksSUFBSSxTQUFTLEtBQUssS0FBZCxDQUFSOztBQUVBLG9CQUFJLElBQUksSUFBSixJQUFZLFNBQVMsQ0FBQyxDQUExQixFQUE2QjtBQUN6QiwyQkFBTyxDQUFQO0FBQ0g7QUFDRCxvQkFBSSxJQUFJLElBQUosSUFBWSxTQUFTLENBQUMsQ0FBMUIsRUFBNkI7QUFDekIsMkJBQU8sQ0FBUDtBQUNIO0FBQ0Qsb0JBQUksSUFBSSxJQUFKLElBQVksU0FBUyxDQUFDLENBQTFCLEVBQTZCO0FBQ3pCLDJCQUFPLENBQVA7QUFDSDtBQUNELG9CQUFJLElBQUksSUFBSixJQUFZLFNBQVMsQ0FBQyxDQUExQixFQUE2QjtBQUN6QiwyQkFBTyxDQUFQO0FBQ0g7QUFDSjtBQUNELHVCQUFXLElBQVgsQ0FBZ0IsRUFBQyxHQUFHLElBQUosRUFBVSxHQUFHLElBQWIsRUFBbUIsT0FBTyxPQUFPLElBQWpDLEVBQXVDLFFBQVEsT0FBTyxJQUF0RCxFQUFoQjtBQUNIOzs7QUFHRCxZQUFJLElBQUksS0FBUixFQUFlO0FBQ1gsaUJBQUssSUFBSSxJQUFJLENBQWIsRUFBZ0IsSUFBSSxNQUFNLE1BQTFCLEVBQWtDLEdBQWxDLEVBQXVDO0FBQ25DLG9CQUFJLE1BQU0sQ0FBQyxLQUFLLE1BQUwsS0FBZ0IsR0FBakIsRUFBc0IsS0FBSyxNQUFMLEtBQWdCLEdBQXRDLEVBQTJDLEtBQUssTUFBTCxLQUFnQixHQUEzRCxDQUFWO0FBQ0EscUJBQUssSUFBSSxJQUFJLENBQWIsRUFBZ0IsSUFBSSxNQUFNLENBQU4sRUFBUyxNQUE3QixFQUFxQyxHQUFyQyxFQUEwQztBQUN0Qyx3QkFBSSxJQUFKLENBQVMsTUFBTSxDQUFOLEVBQVMsQ0FBVCxDQUFULElBQXdCLElBQUksQ0FBSixDQUF4QjtBQUNBLHdCQUFJLElBQUosQ0FBUyxNQUFNLENBQU4sRUFBUyxDQUFULElBQWMsQ0FBdkIsSUFBNEIsSUFBSSxDQUFKLENBQTVCO0FBQ0Esd0JBQUksSUFBSixDQUFTLE1BQU0sQ0FBTixFQUFTLENBQVQsSUFBYyxDQUF2QixJQUE0QixJQUFJLENBQUosQ0FBNUI7QUFDSDtBQUNKO0FBQ0o7QUFDRCxlQUFPLEVBQUMsT0FBTyxHQUFSLEVBQWEsT0FBTyxVQUFwQixFQUFQO0FBQ0g7QUE5SlUsQzs7Ozs7Ozs7Ozs7QUNBZjs7Ozs7Ozs7Ozs7OztBQU1JLG9CQUFZLEdBQVosRUFBaUI7QUFBQTs7QUFDYixhQUFLLE1BQUwsR0FBYyxHQUFkO0FBQ0g7Ozs7Ozs7Ozs7O3NDQU9hO0FBQ1YsaUJBQUssTUFBTCxHQUFjLGtCQUFRLFdBQVIsQ0FBb0IsS0FBSyxNQUF6QixDQUFkO0FBQ0EsbUJBQU8sSUFBUDtBQUNIOzs7Ozs7Ozs7OztpQ0FRUSxhLEVBQWU7QUFDcEIsaUJBQUssTUFBTCxHQUFjLGtCQUFRLFFBQVIsQ0FBaUIsS0FBSyxNQUF0QixFQUE4QixhQUE5QixDQUFkO0FBQ0EsbUJBQU8sSUFBUDtBQUNIOzs7Ozs7Ozs7Ozt3Q0FRZSx1QixFQUF5QjtBQUNyQyxpQkFBSyxNQUFMLEdBQWMsa0JBQVEsZUFBUixDQUF3QixLQUFLLE1BQTdCLEVBQXFDLHVCQUFyQyxDQUFkO0FBQ0EsbUJBQU8sSUFBUDtBQUNIOzs7Ozs7Ozs7Ozs7K0JBU00sTyxFQUFTLFMsRUFBVztBQUN2QixpQkFBSyxNQUFMLEdBQWMsa0JBQVEsTUFBUixDQUFlLEtBQUssTUFBcEIsRUFBNEIsT0FBNUIsRUFBcUMsU0FBckMsQ0FBZDtBQUNBLG1CQUFPLElBQVA7QUFDSDs7Ozs7Ozs7Ozs7Ozs7a0JDcERVOzs7Ozs7O0FBTVgsZUFOVyx1QkFNQyxHQU5ELEVBTU07QUFDYixhQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLElBQUksSUFBSSxJQUFKLENBQVMsTUFBN0IsRUFBcUMsS0FBRyxDQUF4QyxFQUEyQztBQUN2QyxnQkFBSSxPQUFPLENBQUMsSUFBSSxJQUFKLENBQVMsQ0FBVCxJQUFjLElBQUksSUFBSixDQUFTLElBQUUsQ0FBWCxDQUFkLEdBQThCLElBQUksSUFBSixDQUFTLElBQUUsQ0FBWCxDQUEvQixJQUE4QyxDQUF6RDtBQUNBLGdCQUFJLElBQUosQ0FBUyxDQUFULElBQWMsSUFBSSxJQUFKLENBQVMsSUFBRSxDQUFYLElBQWdCLElBQUksSUFBSixDQUFTLElBQUUsQ0FBWCxJQUFnQixJQUE5QztBQUNIO0FBQ0QsZUFBTyxHQUFQO0FBQ0gsS0FaVTs7Ozs7Ozs7O0FBb0JYLFlBcEJXLG9CQW9CRixHQXBCRSxFQW9CRyxhQXBCSCxFQW9Ca0I7QUFDekIsWUFBSSxDQUFDLGFBQUwsRUFBb0I7QUFBRSw0QkFBZ0IsRUFBaEI7QUFBcUI7QUFDM0MsWUFBSSxNQUFNLGdCQUFjLEdBQWQsR0FBb0IsR0FBOUI7QUFDQSxhQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLElBQUksSUFBSSxJQUFKLENBQVMsTUFBN0IsRUFBcUMsS0FBRyxDQUF4QyxFQUEyQztBQUN2QyxnQkFBSSxJQUFKLENBQVMsQ0FBVCxJQUFjLElBQUksSUFBSixDQUFTLENBQVQsSUFBYyxHQUE1QjtBQUNBLGdCQUFJLElBQUosQ0FBUyxJQUFFLENBQVgsSUFBZ0IsSUFBSSxJQUFKLENBQVMsSUFBRSxDQUFYLElBQWdCLEdBQWhDO0FBQ0EsZ0JBQUksSUFBSixDQUFTLElBQUUsQ0FBWCxJQUFnQixJQUFJLElBQUosQ0FBUyxJQUFFLENBQVgsSUFBZ0IsR0FBaEM7QUFDSDtBQUNELGVBQU8sR0FBUDtBQUNILEtBN0JVOzs7Ozs7Ozs7O0FBc0NYLFVBdENXLGtCQXNDSixJQXRDSSxFQXNDRSxJQXRDRixFQXNDUSxTQXRDUixFQXNDbUI7QUFDMUIsWUFBSSxLQUFLLElBQUwsQ0FBVSxNQUFWLEtBQXFCLEtBQUssSUFBTCxDQUFVLE1BQW5DLEVBQTJDO0FBQUUsa0JBQU0sSUFBSSxLQUFKLENBQVUsMEJBQVYsQ0FBTjtBQUE4QztBQUMzRixZQUFJLE9BQU8sSUFBSSxTQUFKLENBQWMsS0FBSyxLQUFuQixFQUEwQixLQUFLLE1BQS9CLENBQVg7QUFDQSxhQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLElBQUksS0FBSyxJQUFMLENBQVUsTUFBOUIsRUFBc0MsS0FBRyxDQUF6QyxFQUE0QztBQUN4QyxnQkFBSSxPQUFPLEdBQVg7QUFDQSxpQkFBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLENBQXBCLEVBQXVCLEdBQXZCLEVBQTRCO0FBQ3hCLG9CQUFJLEtBQUssSUFBTCxDQUFVLElBQUUsQ0FBWixJQUFpQixLQUFLLElBQUwsQ0FBVSxJQUFFLENBQVosQ0FBakIsR0FBa0MsU0FBdEMsRUFBaUQ7QUFDN0MsMkJBQU8sQ0FBUDtBQUNBO0FBQ0g7QUFDSjs7QUFFRCxpQkFBSyxJQUFMLENBQVUsQ0FBVixJQUFlLElBQWY7QUFDQSxpQkFBSyxJQUFMLENBQVUsSUFBRSxDQUFaLElBQWlCLElBQWpCO0FBQ0EsaUJBQUssSUFBTCxDQUFVLElBQUUsQ0FBWixJQUFpQixJQUFqQjtBQUNBLGlCQUFLLElBQUwsQ0FBVSxJQUFFLENBQVosSUFBZ0IsR0FBaEI7QUFDSDtBQUNELGVBQU8sSUFBUDtBQUNILEtBeERVOzs7Ozs7Ozs7QUFnRVgsbUJBaEVXLDJCQWdFSyxHQWhFTCxFQWdFVSx1QkFoRVYsRUFnRW1DO0FBQzFDLFlBQUksQ0FBQyx1QkFBTCxFQUE4QjtBQUFFLHNDQUEwQixFQUExQjtBQUErQjtBQUMvRCxZQUFJLFlBQVksMEJBQXdCLEdBQXhCLElBQStCLE1BQU0sR0FBTixHQUFZLEdBQTNDLENBQWhCO0FBQ0EsYUFBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLElBQUksSUFBSixDQUFTLE1BQTdCLEVBQXFDLEtBQUcsQ0FBeEMsRUFBMkM7QUFDdkMsZ0JBQUksSUFBSSxJQUFKLENBQVMsQ0FBVCxJQUFjLElBQUksSUFBSixDQUFTLElBQUUsQ0FBWCxDQUFkLEdBQThCLElBQUksSUFBSixDQUFTLElBQUUsQ0FBWCxDQUE5QixHQUE4QyxTQUFsRCxFQUE4RDtBQUMxRCxvQkFBSSxJQUFKLENBQVMsQ0FBVCxJQUFjLENBQWQ7QUFDQSxvQkFBSSxJQUFKLENBQVMsSUFBRSxDQUFYLElBQWdCLENBQWhCO0FBQ0Esb0JBQUksSUFBSixDQUFTLElBQUUsQ0FBWCxJQUFnQixDQUFoQjtBQUNILGFBSkQsTUFJTztBQUNILG9CQUFJLElBQUosQ0FBUyxDQUFULElBQWMsR0FBZDtBQUNBLG9CQUFJLElBQUosQ0FBUyxJQUFFLENBQVgsSUFBZ0IsR0FBaEI7QUFDQSxvQkFBSSxJQUFKLENBQVMsSUFBRSxDQUFYLElBQWdCLEdBQWhCO0FBQ0g7QUFDSjs7QUFFRCxlQUFPLEdBQVA7QUFDSDtBQWhGVSxDOzs7Ozs7OztrQkNBQTtBQUNYLGNBQVU7QUFDTixtQkFBVyxJQURMO0FBRU4sbUJBQVcsSUFGTDtBQUdOLG1CQUFXLElBSEw7QUFJTixtQkFBVyxJQUpMOztBQU1OLG1CQUFXLElBTkw7QUFPTixtQkFBVyxJQVBMO0FBUU4sbUJBQVcsSUFSTDtBQVNOLG1CQUFXO0FBVEw7QUFEQyxDOzs7Ozs7Ozs7QUNBZjs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7Ozs7a0JBRWU7Ozs7Ozs7O0FBT1gsMkJBUFcsbUNBT2EsWUFQYixFQU8yQixjQVAzQixFQU8yQztBQUNsRCxlQUFPLEVBQUUsY0FBYyxZQUFoQixFQUE4QixnQkFBZ0IsY0FBOUMsRUFBUDtBQUNILEtBVFU7Ozs7Ozs7O0FBZ0JYLHdCQWhCVyxnQ0FnQlUsSUFoQlYsRUFnQmdCLFNBaEJoQixFQWdCMkI7QUFDbEMsWUFBSSxDQUFDLFNBQUwsRUFBZ0I7QUFDWjtBQUNIO0FBQ0QsWUFBSSxDQUFDLFVBQVUsSUFBVixDQUFMLEVBQXNCO0FBQ2xCLG9CQUFRLEdBQVIsQ0FBWSxTQUFaLEVBQXVCLElBQXZCLEVBQTZCLGVBQTdCLEVBQThDLFNBQTlDLEVBQXlELHFDQUF6RDtBQUNBO0FBQ0EsbUJBQU8sYUFBUDtBQUNIO0FBQ0QsWUFBSSxNQUFNLFVBQVUsSUFBVixFQUFnQixNQUExQjtBQUNBLFlBQUksTUFBTSxVQUFVLElBQVYsRUFBZ0IsUUFBMUI7QUFDQSxlQUFPLEtBQUssdUJBQUwsQ0FBNkIsR0FBN0IsRUFBa0MsR0FBbEMsQ0FBUDtBQUNILEtBNUJVOzs7Ozs7O0FBa0NYLHNCQWxDVyw4QkFrQ1EsTUFsQ1IsRUFrQ2dCO0FBQ3ZCLFlBQUksUUFBUSxFQUFaOztBQUVBLGNBQU0sRUFBTixHQUFXLE9BQU8sRUFBbEI7QUFDQSxjQUFNLEtBQU4sR0FBYyxNQUFNLEVBQU4sQ0FBUyxNQUFULENBQWdCLEtBQTlCO0FBQ0EsY0FBTSxNQUFOLEdBQWUsTUFBTSxFQUFOLENBQVMsTUFBVCxDQUFnQixNQUEvQjs7QUFFQSxZQUFJLE9BQU8sS0FBWCxFQUFrQjtBQUFFLGtCQUFNLEtBQU4sR0FBYyxPQUFPLEtBQXJCO0FBQTZCO0FBQ2pELFlBQUksT0FBTyxNQUFYLEVBQW1CO0FBQUUsa0JBQU0sTUFBTixHQUFlLE9BQU8sTUFBdEI7QUFBK0I7O0FBRXBELGNBQU0sTUFBTixHQUFlLE9BQU8sTUFBdEI7QUFDQSxjQUFNLFFBQU4sR0FBaUIsdUJBQWEsTUFBTSxLQUFuQixFQUF5QixNQUFNLE1BQS9CLENBQWpCOztBQUVBLGNBQU0sY0FBTixHQUF1QixTQUFTLGFBQVQsQ0FBdUIsUUFBdkIsQ0FBdkI7QUFDQSxjQUFNLGNBQU4sQ0FBcUIsS0FBckIsR0FBNkIsTUFBTSxLQUFuQztBQUNBLGNBQU0sY0FBTixDQUFxQixNQUFyQixHQUE4QixNQUFNLE1BQXBDO0FBQ0EsY0FBTSxxQkFBTixHQUE4QixNQUFNLGNBQU4sQ0FBcUIsVUFBckIsQ0FBZ0MsSUFBaEMsQ0FBOUI7O0FBRUEsY0FBTSxRQUFOLEdBQWlCLHdCQUFqQjtBQUNBLGNBQU0sUUFBTixHQUFpQix1QkFBYSxNQUFNLEVBQW5CLEVBQXVCLE1BQU0sS0FBN0IsRUFBb0MsTUFBTSxNQUExQyxDQUFqQjs7QUFFQSxZQUFJLE9BQU8sUUFBWCxFQUFxQjtBQUNqQixpQkFBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLE9BQU8sUUFBUCxDQUFnQixNQUFwQyxFQUE0QyxHQUE1QyxFQUFpRDtBQUM3QyxzQkFBTSxRQUFOLENBQWUsR0FBZixDQUFtQixPQUFPLFFBQVAsQ0FBZ0IsQ0FBaEIsRUFBbUIsSUFBdEMsRUFBNEMsT0FBTyxRQUFQLENBQWdCLENBQWhCLEVBQW1CLE9BQS9ELEVBQXdFLE9BQU8sUUFBUCxDQUFnQixDQUFoQixFQUFtQixLQUEzRixFQUFrRyxPQUFPLFFBQVAsQ0FBZ0IsQ0FBaEIsRUFBbUIsVUFBckg7QUFDSDtBQUNKOztBQUVELFlBQUksT0FBTyxRQUFYLEVBQXFCO0FBQ2pCLGlCQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLElBQUksT0FBTyxRQUFQLENBQWdCLE1BQXBDLEVBQTRDLEdBQTVDLEVBQWlEO0FBQzdDLHNCQUFNLFFBQU4sQ0FBZSxHQUFmLENBQW1CLE9BQU8sUUFBUCxDQUFnQixDQUFoQixFQUFtQixJQUF0QyxFQUE0QyxPQUFPLFFBQVAsQ0FBZ0IsQ0FBaEIsRUFBbUIsSUFBL0QsRUFBcUUsT0FBTyxRQUFQLENBQWdCLENBQWhCLEVBQW1CLE1BQXhGO0FBQ0g7QUFDSjs7QUFFRCxZQUFJLE9BQU8sYUFBWCxFQUEwQjtBQUN0QixnQkFBSSxpQkFBaUIsT0FBTyxhQUFQLENBQXFCLENBQXJCLEdBQXlCLE1BQU0sS0FBcEQ7QUFDQSxnQkFBSSxpQkFBaUIsT0FBTyxhQUFQLENBQXFCLENBQXJCLEdBQXlCLE1BQU0sTUFBcEQ7QUFDQSxvQkFBUSxHQUFSLENBQVksY0FBWixFQUE0QixjQUE1QjtBQUNBLGtCQUFNLFFBQU4sQ0FBZSxHQUFmLENBQW1CLFFBQW5CLEVBQTZCLG9CQUFVLFFBQVYsQ0FBbUIsU0FBaEQsRUFBMkQsQ0FBQyxjQUFELEVBQWlCLGNBQWpCLENBQTNEO0FBQ0g7O0FBRUQsWUFBSSxPQUFPLFVBQVgsRUFBdUI7QUFDbkIsbUJBQU8sS0FBSyxNQUFMLENBQVksS0FBWixDQUFQO0FBQ0g7O0FBRUQsZUFBTyxLQUFQO0FBQ0gsS0EvRVU7Ozs7Ozs7OztBQXVGWCxVQXZGVyxrQkF1RkosT0F2RkksRUF1Rks7QUFDWixZQUFJLENBQUMsUUFBUSxhQUFiLEVBQTRCO0FBQ3hCLGdCQUFJLGVBQWUsUUFBUSxFQUFSLENBQVcsWUFBWCxDQUF3QixRQUFRLEVBQVIsQ0FBVyxhQUFuQyxDQUFuQjtBQUNBLG9CQUFRLEVBQVIsQ0FBVyxZQUFYLENBQXdCLFlBQXhCLEVBQXNDLFFBQVEsTUFBUixDQUFlLFlBQXJEO0FBQ0Esb0JBQVEsRUFBUixDQUFXLGFBQVgsQ0FBeUIsWUFBekI7O0FBRUEsZ0JBQUksaUJBQWlCLFFBQVEsRUFBUixDQUFXLFlBQVgsQ0FBd0IsUUFBUSxFQUFSLENBQVcsZUFBbkMsQ0FBckI7QUFDQSxvQkFBUSxFQUFSLENBQVcsWUFBWCxDQUF3QixjQUF4QixFQUF3QyxRQUFRLE1BQVIsQ0FBZSxjQUF2RDtBQUNBLG9CQUFRLEVBQVIsQ0FBVyxhQUFYLENBQXlCLGNBQXpCOztBQUVBLG9CQUFRLE9BQVIsR0FBa0IsUUFBUSxFQUFSLENBQVcsYUFBWCxFQUFsQjtBQUNBLG9CQUFRLEVBQVIsQ0FBVyxZQUFYLENBQXdCLFFBQVEsT0FBaEMsRUFBeUMsWUFBekM7QUFDQSxvQkFBUSxFQUFSLENBQVcsWUFBWCxDQUF3QixRQUFRLE9BQWhDLEVBQXlDLGNBQXpDO0FBQ0Esb0JBQVEsRUFBUixDQUFXLFdBQVgsQ0FBdUIsUUFBUSxPQUEvQjtBQUNBLG9CQUFRLEVBQVIsQ0FBVyxVQUFYLENBQXNCLFFBQVEsT0FBOUI7O0FBRUEsZ0JBQUksbUJBQW1CLFFBQVEsRUFBUixDQUFXLGlCQUFYLENBQTZCLFFBQVEsT0FBckMsRUFBOEMsWUFBOUMsQ0FBdkI7QUFDQSxnQkFBSSxpQkFBaUIsUUFBUSxFQUFSLENBQVcsWUFBWCxFQUFyQjtBQUNBLGdCQUFJLGtCQUFrQixRQUFRLEVBQVIsQ0FBVyxZQUFYLEVBQXRCO0FBQ0EsZ0JBQUksWUFBWSxJQUFJLFlBQUosQ0FBaUIsQ0FBQyxHQUFELEVBQU8sR0FBUCxFQUFZLEdBQVosRUFBa0IsR0FBbEIsRUFBdUIsR0FBdkIsRUFBNkIsR0FBN0IsRUFBa0MsR0FBbEMsRUFBd0MsR0FBeEMsRUFBNkMsR0FBN0MsRUFBbUQsR0FBbkQsRUFBd0QsR0FBeEQsRUFBOEQsR0FBOUQsQ0FBakIsQ0FBaEI7QUFDQSxnQkFBSSxhQUFhLElBQUksWUFBSixDQUFpQixDQUFDLENBQUQsRUFBSSxDQUFKLEVBQU8sUUFBUSxRQUFSLENBQWlCLEtBQXhCLEVBQStCLENBQS9CLEVBQWtDLENBQWxDLEVBQXFDLFFBQVEsUUFBUixDQUFpQixNQUF0RCxFQUE4RCxDQUE5RCxFQUM5QixRQUFRLFFBQVIsQ0FBaUIsTUFEYSxFQUNMLFFBQVEsUUFBUixDQUFpQixLQURaLEVBQ21CLENBRG5CLEVBQ3NCLFFBQVEsUUFBUixDQUFpQixLQUR2QyxFQUM4QyxRQUFRLFFBQVIsQ0FBaUIsTUFEL0QsQ0FBakIsQ0FBakI7O0FBR0Esb0JBQVEsRUFBUixDQUFXLFVBQVgsQ0FBc0IsUUFBUSxFQUFSLENBQVcsWUFBakMsRUFBK0MsY0FBL0M7QUFDQSxvQkFBUSxFQUFSLENBQVcsVUFBWCxDQUFzQixRQUFRLEVBQVIsQ0FBVyxZQUFqQyxFQUErQyxTQUEvQyxFQUEwRCxRQUFRLEVBQVIsQ0FBVyxXQUFyRTs7QUFFQSxnQkFBSSxtQkFBbUIsUUFBUSxFQUFSLENBQVcsaUJBQVgsQ0FBNkIsUUFBUSxPQUFyQyxFQUE4QyxZQUE5QyxDQUF2QjtBQUNBLG9CQUFRLEVBQVIsQ0FBVyx1QkFBWCxDQUFtQyxnQkFBbkM7QUFDQSxvQkFBUSxFQUFSLENBQVcsbUJBQVgsQ0FBK0IsZ0JBQS9CLEVBQWlELENBQWpELEVBQW9ELFFBQVEsRUFBUixDQUFXLEtBQS9ELEVBQXNFLEtBQXRFLEVBQTZFLENBQTdFLEVBQWdGLENBQWhGOztBQUVBLG9CQUFRLFFBQVIsQ0FBaUIsR0FBakIsQ0FBcUIsY0FBckIsRUFBcUMsb0JBQVUsUUFBVixDQUFtQixTQUF4RCxFQUFtRSxDQUFDLFFBQVEsRUFBUixDQUFXLE1BQVgsQ0FBa0IsS0FBbkIsRUFBMEIsUUFBUSxFQUFSLENBQVcsTUFBWCxDQUFrQixNQUE1QyxDQUFuRTtBQUNBLG9CQUFRLFFBQVIsQ0FBaUIsR0FBakIsQ0FBcUIsY0FBckIsRUFBcUMsb0JBQVUsUUFBVixDQUFtQixTQUF4RCxFQUFtRSxDQUFDLFFBQVEsRUFBUixDQUFXLE1BQVgsQ0FBa0IsS0FBbkIsRUFBMEIsUUFBUSxFQUFSLENBQVcsTUFBWCxDQUFrQixNQUE1QyxDQUFuRTs7QUFFQSxvQkFBUSxFQUFSLENBQVcsVUFBWCxDQUFzQixRQUFRLEVBQVIsQ0FBVyxZQUFqQyxFQUErQyxlQUEvQztBQUNBLG9CQUFRLEVBQVIsQ0FBVyx1QkFBWCxDQUFtQyxnQkFBbkM7QUFDQSxvQkFBUSxFQUFSLENBQVcsbUJBQVgsQ0FBK0IsZ0JBQS9CLEVBQWlELENBQWpELEVBQW9ELFFBQVEsRUFBUixDQUFXLEtBQS9ELEVBQXNFLEtBQXRFLEVBQTZFLENBQTdFLEVBQWdGLENBQWhGO0FBQ0Esb0JBQVEsRUFBUixDQUFXLFVBQVgsQ0FBc0IsUUFBUSxFQUFSLENBQVcsWUFBakMsRUFBK0MsVUFBL0MsRUFBMkQsUUFBUSxFQUFSLENBQVcsV0FBdEU7QUFDSDs7QUFFRCxnQkFBUSxRQUFSLENBQWlCLHFCQUFqQixDQUF1QyxRQUFRLE9BQS9DO0FBQ0EsZ0JBQVEsUUFBUixDQUFpQixZQUFqQjtBQUNBLGdCQUFRLFFBQVIsQ0FBaUIsYUFBakIsQ0FBK0IsUUFBUSxFQUF2QyxFQUEyQyxRQUFRLE9BQW5EOztBQUVBLGdCQUFRLEVBQVIsQ0FBVyxVQUFYLENBQXNCLFFBQVEsRUFBUixDQUFXLFNBQWpDLEVBQTRDLENBQTVDLEVBQStDLENBQS9DO0FBQ0EsZ0JBQVEsYUFBUixHQUF3QixJQUF4Qjs7QUFFQSxlQUFPLE9BQVA7QUFDSCxLQXRJVTs7Ozs7OztBQTRJWCxtQkE1SVcsMkJBNElLLE9BNUlMLEVBNEljO0FBQ3JCLFlBQUksUUFBUSxRQUFRLEVBQXBCO0FBQ0EsWUFBSSxDQUFDLFFBQVEsVUFBVCxJQUF1QixNQUFNLE1BQU4sQ0FBYSxLQUFiLEdBQXFCLE1BQU0sTUFBTixDQUFhLE1BQWxDLEdBQTJDLENBQTNDLEtBQWlELFFBQVEsVUFBUixDQUFtQixNQUEvRixFQUF1RztBQUNuRyxvQkFBUSxVQUFSLEdBQXFCLElBQUksVUFBSixDQUFlLE1BQU0sTUFBTixDQUFhLEtBQWIsR0FBcUIsTUFBTSxNQUFOLENBQWEsTUFBbEMsR0FBMkMsQ0FBMUQsQ0FBckI7QUFDSDtBQUNELGNBQU0sVUFBTixDQUFpQixDQUFqQixFQUFvQixDQUFwQixFQUF1QixNQUFNLE1BQU4sQ0FBYSxLQUFwQyxFQUEyQyxNQUFNLE1BQU4sQ0FBYSxNQUF4RCxFQUFnRSxNQUFNLElBQXRFLEVBQTRFLE1BQU0sYUFBbEYsRUFBaUcsUUFBUSxVQUF6RztBQUNBLFlBQUksVUFBVSxRQUFRLHFCQUFSLENBQThCLGVBQTlCLENBQThDLE1BQU0sTUFBTixDQUFhLEtBQTNELEVBQWtFLE1BQU0sTUFBTixDQUFhLE1BQS9FLENBQWQ7QUFDQSxnQkFBUSxJQUFSLENBQWEsR0FBYixDQUFpQixJQUFJLGlCQUFKLENBQXNCLFFBQVEsVUFBOUIsQ0FBakI7QUFDQSxlQUFPLE9BQVA7QUFDSDtBQXJKVSxDOzs7Ozs7OztrQkNOQTtBQUNiLDZCQUEyQjtBQUN6QixnQkFBWSwrcEVBRGE7QUFFekIsY0FBVTtBQUZlLEdBRGQ7QUFLYixlQUFhO0FBQ1gsZ0JBQVksNE9BREQ7QUFFWCxjQUFVO0FBRkMsR0FMQTtBQVNiLGlCQUFlO0FBQ2IsZ0JBQVksb0pBREM7QUFFYixjQUFVO0FBRkcsR0FURjtBQWFiLFdBQVM7QUFDUCxnQkFBWSxvYUFETDtBQUVQLGNBQVU7QUFGSCxHQWJJO0FBaUJiLDBCQUF3QjtBQUN0QixnQkFBWSwwOUNBRFU7QUFFdEIsY0FBVTtBQUZZO0FBakJYLEM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ09YLG9CQUFZLEVBQVosRUFBZ0IsS0FBaEIsRUFBdUIsTUFBdkIsRUFBK0I7QUFBQTs7O0FBRTNCLGFBQUssU0FBTCxHQUFpQixFQUFqQjs7O0FBR0EsYUFBSyxLQUFMLEdBQWEsS0FBYjs7O0FBR0EsYUFBSyxNQUFMLEdBQWMsTUFBZDs7O0FBR0EsYUFBSyxFQUFMLEdBQVUsRUFBVjs7O0FBR0EsYUFBSyxZQUFMLEdBQW9CLEVBQXBCOzs7QUFHQSxhQUFLLE1BQUwsR0FBYyxFQUFkOzs7QUFHQSxhQUFLLGNBQUwsR0FBc0IsRUFBdEI7QUFDSDs7Ozs7Ozs7Ozs7Ozs0QkFTRyxJLEVBQU0sTyxFQUFTLE8sRUFBUyxVLEVBQVk7QUFDcEMsZ0JBQUksQ0FBQyxPQUFMLEVBQWM7QUFDViwwQkFBVSxDQUFWO0FBQ0EsdUJBQU8sS0FBSyxjQUFMLENBQW9CLE9BQXBCLENBQTRCLE9BQTVCLE1BQXlDLENBQUMsQ0FBakQsRUFBb0Q7QUFDaEQ7QUFDSDtBQUNKOztBQUVELGdCQUFJLENBQUMsVUFBTCxFQUFpQjtBQUNiLDZCQUFhLEVBQWI7QUFDSDtBQUNELGlCQUFLLGNBQUwsQ0FBb0IsSUFBcEIsQ0FBeUIsT0FBekI7O0FBRUEsaUJBQUssU0FBTCxDQUFlLElBQWYsSUFBdUI7QUFDbkIsc0JBQU0sSUFEYTtBQUVuQix5QkFBUyxPQUZVO0FBR25CLHlCQUFTLE9BSFU7QUFJbkIsMkJBQVcsS0FBSyxFQUFMLENBQVEsYUFBUixFQUpRO0FBS25CLDZCQUFhLEtBTE07QUFNbkIsNEJBQVksVUFOTztBQU9uQix1QkFBTyxJQVBZLEVBQXZCOztBQVNBLGlCQUFLLFlBQUwsQ0FBa0IsSUFBbEIsQ0FBdUIsS0FBSyxTQUFMLENBQWUsSUFBZixDQUF2QjtBQUNIOzs7Ozs7Ozs7OytCQU9NLEksRUFBTSxPLEVBQVM7QUFDbEIsZ0JBQUksT0FBSixFQUFhO0FBQ1QscUJBQUssU0FBTCxDQUFlLElBQWYsRUFBcUIsT0FBckIsR0FBK0IsT0FBL0I7QUFDSDtBQUNELGlCQUFLLFNBQUwsQ0FBZSxJQUFmLEVBQXFCLEtBQXJCLEdBQTZCLElBQTdCO0FBQ0EsaUJBQUssTUFBTCxDQUFZLElBQVosQ0FBaUIsS0FBSyxTQUFMLENBQWUsSUFBZixDQUFqQjtBQUNIOzs7Ozs7Ozt1Q0FLYztBQUNYLGlCQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLElBQUksS0FBSyxNQUFMLENBQVksTUFBaEMsRUFBd0MsR0FBeEMsRUFBNkM7QUFDekMscUJBQUssRUFBTCxDQUFRLGFBQVIsQ0FBc0IsS0FBSyxFQUFMLENBQVEsWUFBWSxLQUFLLE1BQUwsQ0FBWSxDQUFaLEVBQWUsT0FBbkMsQ0FBdEI7QUFDQSxxQkFBSyxFQUFMLENBQVEsV0FBUixDQUFvQixLQUFLLEVBQUwsQ0FBUSxVQUE1QixFQUF3QyxLQUFLLE1BQUwsQ0FBWSxDQUFaLEVBQWUsU0FBdkQ7QUFDQSxxQkFBSyxFQUFMLENBQVEsYUFBUixDQUFzQixLQUFLLEVBQUwsQ0FBUSxVQUE5QixFQUEwQyxDQUExQyxFQUE2QyxDQUE3QyxFQUFnRCxDQUFoRCxFQUFtRCxLQUFLLEVBQUwsQ0FBUSxJQUEzRCxFQUFpRSxLQUFLLEVBQUwsQ0FBUSxhQUF6RSxFQUF3RixLQUFLLE1BQUwsQ0FBWSxDQUFaLEVBQWUsT0FBdkc7QUFDSDtBQUNELGlCQUFLLE1BQUwsR0FBYyxFQUFkO0FBQ0g7Ozs7Ozs7Ozs4Q0FNcUIsTyxFQUFTO0FBQzNCLGdCQUFJLEtBQUssWUFBTCxDQUFrQixNQUFsQixLQUE2QixDQUFqQyxFQUFvQztBQUFFO0FBQVM7QUFDL0MsZ0JBQUksS0FBSyxLQUFLLEVBQWQ7QUFDQSxpQkFBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLEtBQUssWUFBTCxDQUFrQixNQUF0QyxFQUE4QyxHQUE5QyxFQUFtRDtBQUMvQyxxQkFBSyxZQUFMLENBQWtCLENBQWxCLEVBQXFCLFFBQXJCLEdBQWdDLEdBQUcsa0JBQUgsQ0FBc0IsT0FBdEIsRUFBK0IsWUFBWSxLQUFLLFlBQUwsQ0FBa0IsQ0FBbEIsRUFBcUIsT0FBaEUsQ0FBaEM7QUFDQSxtQkFBRyxTQUFILENBQWEsS0FBSyxZQUFMLENBQWtCLENBQWxCLEVBQXFCLFFBQWxDLEVBQTRDLEtBQUssWUFBTCxDQUFrQixDQUFsQixFQUFxQixPQUFqRTtBQUNBLG1CQUFHLGFBQUgsQ0FBaUIsR0FBRyxZQUFZLEtBQUssWUFBTCxDQUFrQixDQUFsQixFQUFxQixPQUFwQyxDQUFqQjtBQUNBLG1CQUFHLFdBQUgsQ0FBZSxHQUFHLFVBQWxCLEVBQThCLEtBQUssWUFBTCxDQUFrQixDQUFsQixFQUFxQixTQUFuRDtBQUNBLG1CQUFHLGFBQUgsQ0FBaUIsR0FBRyxVQUFwQixFQUFnQyxHQUFHLGNBQW5DLEVBQW1ELEdBQUcsYUFBdEQ7QUFDQSxtQkFBRyxhQUFILENBQWlCLEdBQUcsVUFBcEIsRUFBZ0MsR0FBRyxjQUFuQyxFQUFtRCxHQUFHLGFBQXREO0FBQ0EsbUJBQUcsYUFBSCxDQUFpQixHQUFHLFVBQXBCLEVBQWdDLEdBQUcsa0JBQW5DLEVBQXVELEdBQUcsT0FBMUQ7QUFDQSxtQkFBRyxhQUFILENBQWlCLEdBQUcsVUFBcEIsRUFBZ0MsR0FBRyxrQkFBbkMsRUFBdUQsR0FBRyxPQUExRDs7QUFFQSxxQkFBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLEtBQUssWUFBTCxDQUFrQixDQUFsQixFQUFxQixVQUFyQixDQUFnQyxNQUFwRCxFQUE0RCxHQUE1RCxFQUFpRTtBQUM3RCx1QkFBRyxXQUFILENBQWUsR0FBRyxLQUFLLFlBQUwsQ0FBa0IsQ0FBbEIsRUFBcUIsVUFBckIsQ0FBZ0MsQ0FBaEMsRUFBbUMsUUFBdEMsQ0FBZixFQUFnRSxLQUFLLFlBQUwsQ0FBa0IsQ0FBbEIsRUFBcUIsVUFBckIsQ0FBZ0MsQ0FBaEMsRUFBbUMsS0FBbkc7QUFDSDs7QUFFRCxtQkFBRyxVQUFILENBQWMsR0FBRyxVQUFqQixFQUE2QixDQUE3QixFQUFnQyxHQUFHLElBQW5DLEVBQXlDLEdBQUcsSUFBNUMsRUFBa0QsR0FBRyxhQUFyRCxFQUFvRSxLQUFLLFlBQUwsQ0FBa0IsQ0FBbEIsRUFBcUIsT0FBekY7O0FBRUEscUJBQUssWUFBTCxDQUFrQixDQUFsQixFQUFxQixXQUFyQixHQUFtQyxJQUFuQztBQUNBLHFCQUFLLFlBQUwsQ0FBa0IsQ0FBbEIsRUFBcUIsS0FBckIsR0FBNkIsS0FBN0I7QUFDSDtBQUNELGlCQUFLLFlBQUwsR0FBb0IsRUFBcEI7QUFDSDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDOUdELHNCQUFjO0FBQUE7Ozs7Ozs7QUFNVixhQUFLLFNBQUwsR0FBaUIsRUFBakI7QUFDSDs7Ozs7Ozs7Ozs0QkFNRyxJLEVBQU0sSSxFQUFNLE0sRUFBUTtBQUNwQixpQkFBSyxTQUFMLENBQWUsSUFBZixJQUF1QixFQUFFLE1BQU0sSUFBUixFQUFjLE1BQU0sSUFBcEIsRUFBMEIsUUFBUSxNQUFsQyxFQUEwQyxPQUFPLElBQWpELEVBQXZCO0FBQ0g7Ozs7Ozs7OzsrQkFNTSxJLEVBQU0sTSxFQUFRO0FBQ2pCLGlCQUFLLFNBQUwsQ0FBZSxJQUFmLEVBQXFCLE1BQXJCLEdBQThCLE1BQTlCO0FBQ0EsaUJBQUssU0FBTCxDQUFlLElBQWYsRUFBcUIsS0FBckIsR0FBNkIsSUFBN0I7QUFDSDs7Ozs7Ozs7OztzQ0FRYSxFLEVBQUksTyxFQUFTO0FBQ3ZCLGlCQUFLLElBQUksQ0FBVCxJQUFjLEtBQUssU0FBbkIsRUFBOEI7QUFDMUIsb0JBQUksS0FBSyxTQUFMLENBQWUsQ0FBZixFQUFrQixLQUF0QixFQUE2QjtBQUN6Qix3QkFBSSxJQUFJLEdBQUcsa0JBQUgsQ0FBc0IsT0FBdEIsRUFBK0IsS0FBSyxTQUFMLENBQWUsQ0FBZixFQUFrQixJQUFqRCxDQUFSO0FBQ0EsNEJBQVEsS0FBSyxTQUFMLENBQWUsQ0FBZixFQUFrQixJQUExQjtBQUNJLDZCQUFLLElBQUw7QUFDSSwrQkFBRyxTQUFILENBQWEsQ0FBYixFQUFnQixLQUFLLFNBQUwsQ0FBZSxDQUFmLEVBQWtCLE1BQWxCLENBQXlCLENBQXpCLENBQWhCO0FBQ0E7O0FBRUosNkJBQUssSUFBTDtBQUNJLCtCQUFHLFNBQUgsQ0FBYSxDQUFiLEVBQWdCLEtBQUssU0FBTCxDQUFlLENBQWYsRUFBa0IsTUFBbEIsQ0FBeUIsQ0FBekIsQ0FBaEIsRUFBNkMsS0FBSyxTQUFMLENBQWUsQ0FBZixFQUFrQixNQUFsQixDQUF5QixDQUF6QixDQUE3QztBQUNBOztBQUVKLDZCQUFLLElBQUw7QUFDSSwrQkFBRyxTQUFILENBQWEsQ0FBYixFQUFnQixLQUFLLFNBQUwsQ0FBZSxDQUFmLEVBQWtCLE1BQWxCLENBQXlCLENBQXpCLENBQWhCLEVBQTZDLEtBQUssU0FBTCxDQUFlLENBQWYsRUFBa0IsTUFBbEIsQ0FBeUIsQ0FBekIsQ0FBN0MsRUFBMEUsS0FBSyxTQUFMLENBQWUsQ0FBZixFQUFrQixNQUFsQixDQUF5QixDQUF6QixDQUExRTtBQUNBOztBQUVKLDZCQUFLLElBQUw7QUFDSSwrQkFBRyxTQUFILENBQWEsQ0FBYixFQUFnQixLQUFLLFNBQUwsQ0FBZSxDQUFmLEVBQWtCLE1BQWxCLENBQXlCLENBQXpCLENBQWhCLEVBQTZDLEtBQUssU0FBTCxDQUFlLENBQWYsRUFBa0IsTUFBbEIsQ0FBeUIsQ0FBekIsQ0FBN0MsRUFBMEUsS0FBSyxTQUFMLENBQWUsQ0FBZixFQUFrQixNQUFsQixDQUF5QixDQUF6QixDQUExRSxFQUF1RyxLQUFLLFNBQUwsQ0FBZSxDQUFmLEVBQWtCLE1BQWxCLENBQXlCLENBQXpCLENBQXZHO0FBQ0E7O0FBRUosNkJBQUssSUFBTDtBQUNJLCtCQUFHLFNBQUgsQ0FBYSxDQUFiLEVBQWdCLEtBQUssU0FBTCxDQUFlLENBQWYsRUFBa0IsTUFBbEIsQ0FBeUIsQ0FBekIsQ0FBaEI7QUFDQTs7QUFFSiw2QkFBSyxJQUFMO0FBQ0ksK0JBQUcsU0FBSCxDQUFhLENBQWIsRUFBZ0IsS0FBSyxTQUFMLENBQWUsQ0FBZixFQUFrQixNQUFsQixDQUF5QixDQUF6QixDQUFoQixFQUE2QyxLQUFLLFNBQUwsQ0FBZSxDQUFmLEVBQWtCLE1BQWxCLENBQXlCLENBQXpCLENBQTdDO0FBQ0E7O0FBRUosNkJBQUssSUFBTDtBQUNJLCtCQUFHLFNBQUgsQ0FBYSxDQUFiLEVBQWdCLEtBQUssQ0FBTCxDQUFPLFFBQVAsQ0FBZ0IsQ0FBaEIsRUFBbUIsTUFBbkIsQ0FBMEIsQ0FBMUIsQ0FBaEIsRUFBOEMsS0FBSyxTQUFMLENBQWUsQ0FBZixFQUFrQixNQUFsQixDQUF5QixDQUF6QixDQUE5QyxFQUEyRSxLQUFLLFNBQUwsQ0FBZSxDQUFmLEVBQWtCLE1BQWxCLENBQXlCLENBQXpCLENBQTNFO0FBQ0E7O0FBRUosNkJBQUssSUFBTDtBQUNJLCtCQUFHLFNBQUgsQ0FBYSxDQUFiLEVBQWdCLEtBQUssU0FBTCxDQUFlLENBQWYsRUFBa0IsTUFBbEIsQ0FBeUIsQ0FBekIsQ0FBaEIsRUFBNkMsS0FBSyxTQUFMLENBQWUsQ0FBZixFQUFrQixNQUFsQixDQUF5QixDQUF6QixDQUE3QyxFQUEwRSxLQUFLLFNBQUwsQ0FBZSxDQUFmLEVBQWtCLE1BQWxCLENBQXlCLENBQXpCLENBQTFFLEVBQXVHLEtBQUssU0FBTCxDQUFlLENBQWYsRUFBa0IsTUFBbEIsQ0FBeUIsQ0FBekIsQ0FBdkc7QUFDQTtBQS9CUjtBQWlDSDtBQUNKO0FBQ0oiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiaW1wb3J0IEJsb2JzIGZyb20gJy4vY2FudmFzL2Jsb2JzLmVzNic7XG5pbXBvcnQgRmlsdGVyQ2hhaW4gZnJvbSAnLi9jYW52YXMvZmlsdGVyY2hhaW4uZXM2JztcbmltcG9ydCBDYW52YXNGaWx0ZXJzIGZyb20gJy4vY2FudmFzL2ZpbHRlcnMuZXM2JztcbmltcG9ydCBXZWJHTEZpbHRlcnMgZnJvbSAnLi93ZWJnbC9maWx0ZXJzLmVzNic7XG5pbXBvcnQgU2hhZGVycyBmcm9tICcuL3dlYmdsL3NoYWRlcnMuZXM2JztcbmltcG9ydCBUZXh0dXJlcyBmcm9tICcuL3dlYmdsL3RleHR1cmVzLmVzNic7XG5pbXBvcnQgVW5pZm9ybXMgZnJvbSAnLi93ZWJnbC91bmlmb3Jtcy5lczYnO1xuaW1wb3J0IENvbnN0YW50cyBmcm9tICcuL3dlYmdsL2NvbnN0YW50cy5lczYnO1xuXG5leHBvcnRzLmltYWdlID0ge1xuICAgIGNhbnZhczoge1xuICAgICAgICBibG9iczogQmxvYnMsXG4gICAgICAgIGZpbHRlcmNoYWluOiBGaWx0ZXJDaGFpbixcbiAgICAgICAgZmlsdGVyczogQ2FudmFzRmlsdGVyc1xuICAgIH0sXG4gICAgd2ViZ2w6IHtcbiAgICAgICAgc2hhZGVyczogU2hhZGVycyxcbiAgICAgICAgdGV4dHVyZXM6IFRleHR1cmVzLFxuICAgICAgICB1bmlmb3JtczogVW5pZm9ybXMsXG4gICAgICAgIGZpbHRlcnM6IFdlYkdMRmlsdGVycyxcbiAgICAgICAgY29uc3RhbnRzOiBDb25zdGFudHNcbiAgICB9XG59OyIsImV4cG9ydCBkZWZhdWx0IHtcbiAgICAvKipcbiAgICAgKiBtaW5pdW11bSBibG9ic2l6ZSBkZWZhdWx0XG4gICAgICovXG4gICAgTUlOX0JMT0JfU0laRTo1MCxcblxuICAgIC8qKlxuICAgICAqIGZpbmQgYmxvYnNcbiAgICAgKiBCTEFDSyBBTkQgV0hJVEUgSU1BR0UgUkVRVUlSRURcbiAgICAgKiBAcGFyYW0gcHhzXG4gICAgICogQHJldHVybiB7QXJyYXl9IGJsb2IgY29vcmRpbmF0ZXNcbiAgICAgKi9cbiAgICBmaW5kQmxvYnMocHhzLCBjZmcpIHtcbiAgICAgICAgaWYgKCFjZmcpIHtcbiAgICAgICAgICAgIGNmZyA9IHt9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFjZmcubWluQmxvYlNpemUpIHtcbiAgICAgICAgICAgIGNmZy5taW5CbG9iU2l6ZSA9IHRoaXMuTUlOX0JMT0JfU0laRTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB3aWR0aCA9IHB4cy53aWR0aDtcbiAgICAgICAgdmFyIHJvd3NpemUgPSB3aWR0aCAqIDQ7XG4gICAgICAgIHZhciBsZW4gPSBweHMuZGF0YS5sZW5ndGg7XG4gICAgICAgIHZhciBwaXhlbHMgPSBuZXcgVWludDE2QXJyYXkocHhzLmRhdGEubGVuZ3RoKTtcbiAgICAgICAgZm9yICh2YXIgZCA9IDA7IGQgPCBweHMuZGF0YS5sZW5ndGg7IGQrKykge1xuICAgICAgICAgICAgcGl4ZWxzW2RdID0gcHhzLmRhdGFbZF07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGJsb2JzID0gW107XG4gICAgICAgIHZhciBibG9iSW5kZXggPSAtMTtcblxuICAgICAgICAvLyBjb250YWlucyBwaXhlbCBpbmRpY2VzIGZvciBibG9icyB0aGF0IHRvdWNoXG4gICAgICAgIHZhciBibG9iVGFibGUgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgYyA9IDA7IGMgPCBsZW47IGMgKz0gNCkge1xuICAgICAgICAgICAgaWYgKHBpeGVsc1tjXSA9PT0gMjU1KSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgbmVpZ2hib3JzID0gW2MgLSA0LCBjICsgNCwgYyAtIHJvd3NpemUsIGMgKyByb3dzaXplLCBjIC0gNCAtIHJvd3NpemUsIGMgKyA0IC0gcm93c2l6ZSwgYyAtIDQgKyByb3dzaXplLCBjICsgNCArIHJvd3NpemVdO1xuICAgICAgICAgICAgdmFyIG51bU5laWdoYm9ycyA9IG5laWdoYm9ycy5sZW5ndGg7XG5cbiAgICAgICAgICAgIC8vIGp1c3QgY2hlY2sgb25lIGNoYW5uZWwsIGJlY2F1c2Ugd2UgYXNzdW1lIGV2ZXJ5IHB4IGlzIGJsYWNrIG9yIHdoaXRlXG4gICAgICAgICAgICB2YXIgYmxvYkluZGV4Rm91bmQgPSAtMTtcbiAgICAgICAgICAgIGZvciAodmFyIG5laWdoYm9yID0gMDsgbmVpZ2hib3IgPCBudW1OZWlnaGJvcnM7IG5laWdoYm9yKyspIHtcbiAgICAgICAgICAgICAgICBpZiAobmVpZ2hib3JzW25laWdoYm9yXSA+PSAwICYmIG5laWdoYm9yc1tuZWlnaGJvcl0gPCBsZW4gJiYgcGl4ZWxzW25laWdoYm9yc1tuZWlnaGJvcl1dID09PSBwaXhlbHNbY10pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgdG91Y2hpbmcgYSBuZWlnaGJvciwgcmVjb3JkIGluZGV4IG9mIHRoYXQgYmxvYiBpbmRleCBvZiB0aGF0IG5laWdoYm9yXG4gICAgICAgICAgICAgICAgICAgIC8vIGFsc28gaWYgdG91Y2hpbmcgZGlmZmVyZW50IGluZGljZXMsIHJlY29yZCB0aGF0IHRoZXNlIGluZGljZXMgc2hvdWxkIGJlIHRoZSBzYW1lIGluZGV4XG4gICAgICAgICAgICAgICAgICAgIC8vIHRoZSBibG9iIHRhYmxlIHJlY29yZHMgd2hpY2ggYmxvYiBpbmRleCBtYXBzIHRvIHdoaWNoIG90aGVyIGJsb2IgaW5kZXhcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBpeGVsc1tuZWlnaGJvcnNbbmVpZ2hib3JdICsgMV0gPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYmxvYkluZGV4Rm91bmQgIT09IC0xICYmIGJsb2JJbmRleEZvdW5kICE9PSBwaXhlbHNbbmVpZ2hib3JzW25laWdoYm9yXSArIDFdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZ3JlZW4gY2hhbm5lbCAoKzEpIHJlY29yZHMgYmxvYiBpbmRleFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb2JUYWJsZS5wdXNoKFtibG9iSW5kZXhGb3VuZCwgcGl4ZWxzW25laWdoYm9yc1tuZWlnaGJvcl0gKyAxXV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYmxvYkluZGV4Rm91bmQgPSBwaXhlbHNbbmVpZ2hib3JzW25laWdoYm9yXSArIDFdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYmxvYkluZGV4Rm91bmQgPiAtMSkge1xuICAgICAgICAgICAgICAgIC8vIGJsb2IgaXMgZm91bmQsIG1hcmsgcGl4ZWwgYW5kIHJlY29yZCBpbiBibG9ic1xuICAgICAgICAgICAgICAgIHBpeGVsc1tjICsgMV0gPSBibG9iSW5kZXhGb3VuZDsgLy8gdXNlIGdyZWVuIGNoYW5uZWwgYXMgYmxvYiB0cmFja2VyXG4gICAgICAgICAgICAgICAgYmxvYnNbYmxvYkluZGV4Rm91bmRdLnB1c2goYyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIGJyYW5kIG5ldyBibG9iXG4gICAgICAgICAgICAgICAgYmxvYkluZGV4Kys7XG4gICAgICAgICAgICAgICAgYmxvYnMucHVzaChbY10pO1xuICAgICAgICAgICAgICAgIHBpeGVsc1tjICsgMV0gPSBibG9iSW5kZXg7IC8vIHVzZSBncmVlbiBjaGFubmVsIGFzIGJsb2IgdHJhY2tlclxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gbWVyZ2UgaW50ZXJzZWN0aW5nIHBhaXJzXG4gICAgICAgIC8vIG1heWJlIG5vdCB0aGUgbW9zdCBlZmZpY2llbnQgY29kZSwgYnV0IGJsb2IgY291bnQgc2hvdWxkIGJlIGZhaXJseSBsb3cgKGhvcGVmdWxseSlcbiAgICAgICAgLy8gcmV2aXNpdCBpZiBzcGVlZCBnZXRzIGluIHRoZSB3YXlcbiAgICAgICAgZm9yICh2YXIgYyA9IDA7IGMgPCBibG9iVGFibGUubGVuZ3RoOyBjKyspIHtcbiAgICAgICAgICAgIGZvciAodmFyIGQgPSAwOyBkIDwgYmxvYlRhYmxlLmxlbmd0aDsgZCsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbm5lY3RlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGUgPSAwOyBlIDwgYmxvYlRhYmxlW2RdLmxlbmd0aDsgZSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChibG9iVGFibGVbY10uaW5kZXhPZihibG9iVGFibGVbZF1bZV0pICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29ubmVjdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY29ubmVjdGVkICYmIGQgIT09IGMpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgZiA9IDA7IGYgPCBibG9iVGFibGVbZF0ubGVuZ3RoOyBmKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9ubHkgYWRkIHVuaXF1ZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChibG9iVGFibGVbY10uaW5kZXhPZihibG9iVGFibGVbZF1bZl0pID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb2JUYWJsZVtjXS5wdXNoKGJsb2JUYWJsZVtkXVtmXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYmxvYlRhYmxlW2RdID0gW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gd2VlZCBvdXQgZW1wdGllc1xuICAgICAgICBibG9iVGFibGUgPSBibG9iVGFibGUuZmlsdGVyKGZ1bmN0aW9uIChwYWlyKSB7XG4gICAgICAgICAgICBpZiAocGFpci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIGVhY2ggYmxvYiBpcyBhIGxpc3Qgb2YgaW1hZ2UgaW5kaWNlc1xuICAgICAgICAvLyB1c2UgYmxvYnMgaW5kZXggdG8gbWF0Y2ggdG8gYmxvYiB0YWJsZSBpbmRleCBhbmQgY29uY2F0IHRoZSBibG9icyBhdCB0aGF0IGluZGV4XG4gICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgYmxvYnMubGVuZ3RoOyBjKyspIHtcbiAgICAgICAgICAgIGZvciAodmFyIGQgPSAwOyBkIDwgYmxvYlRhYmxlLmxlbmd0aDsgZCsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGJsb2JUYWJsZVtkXS5pbmRleE9mKGMpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBlID0gMDsgZSA8IGJsb2JUYWJsZVtkXS5sZW5ndGg7IGUrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGJsb2JUYWJsZVtkXVtlXSAhPT0gYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb2JzW2NdID0gYmxvYnNbY10uY29uY2F0KGJsb2JzW2Jsb2JUYWJsZVtkXVtlXV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb2JzW2Jsb2JUYWJsZVtkXVtlXV0gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHJlZmluZSBibG9icyBub3cgdGhhdCB0aGUgcmlnaHQgdGhpbmdzIGFyZSBjb25jYXRlZCBhbmQgd2UgZG9uJ3QgbmVlZCB0byB0cmFja1xuICAgICAgICAvLyBtZWFuaW5nIHdlIGNhbiBzdGFydCBzcGxpY2luZyB0aGluZ3Mgd2l0aG91dCB3b3JyeWluZyBhYm91dCB0aGUgaW5kZXhcbiAgICAgICAgYmxvYnMgPSBibG9icy5maWx0ZXIoZnVuY3Rpb24gKGJsYikge1xuICAgICAgICAgICAgcmV0dXJuIGJsYi5sZW5ndGggPj0gY2ZnLm1pbkJsb2JTaXplO1xuICAgICAgICB9LCB0aGlzKTtcblxuXG4gICAgICAgIC8vIGdldCBibG9iIGRpbWVuc2lvbnMgcG9zaXRpb25zXG4gICAgICAgIHZhciBibG9iQ29vcmRzID0gW107XG4gICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgYmxvYnMubGVuZ3RoOyBjKyspIHtcbiAgICAgICAgICAgIHZhciBtaW5YID0gLTEsIG1heFggPSAtMSwgbWluWSA9IC0xLCBtYXhZID0gLTE7XG4gICAgICAgICAgICBmb3IgKHZhciBkID0gMDsgZCA8IGJsb2JzW2NdLmxlbmd0aDsgZCsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHB4ID0gTWF0aC5mbG9vcihibG9ic1tjXVtkXSAvIDQpO1xuICAgICAgICAgICAgICAgIHZhciB4ID0gcHggJSB3aWR0aDtcbiAgICAgICAgICAgICAgICB2YXIgeSA9IHBhcnNlSW50KHB4IC8gd2lkdGgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHggPCBtaW5YIHx8IG1pblggPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIG1pblggPSB4O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoeCA+IG1heFggfHwgbWF4WCA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgbWF4WCA9IHg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh5IDwgbWluWSB8fCBtaW5ZID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICBtaW5ZID0geTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHkgPiBtYXhZIHx8IG1heFkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIG1heFkgPSB5O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJsb2JDb29yZHMucHVzaCh7eDogbWluWCwgeTogbWluWSwgd2lkdGg6IG1heFggLSBtaW5YLCBoZWlnaHQ6IG1heFkgLSBtaW5ZfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBwYWludCB0aGUgYmxvYnNcbiAgICAgICAgaWYgKGNmZy5wYWludCkge1xuICAgICAgICAgICAgZm9yICh2YXIgZCA9IDA7IGQgPCBibG9icy5sZW5ndGg7IGQrKykge1xuICAgICAgICAgICAgICAgIHZhciBjbHIgPSBbTWF0aC5yYW5kb20oKSAqIDI1NSwgTWF0aC5yYW5kb20oKSAqIDI1NSwgTWF0aC5yYW5kb20oKSAqIDI1NV07XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgZSA9IDA7IGUgPCBibG9ic1tkXS5sZW5ndGg7IGUrKykge1xuICAgICAgICAgICAgICAgICAgICBweHMuZGF0YVtibG9ic1tkXVtlXV0gPSBjbHJbMF07XG4gICAgICAgICAgICAgICAgICAgIHB4cy5kYXRhW2Jsb2JzW2RdW2VdICsgMV0gPSBjbHJbMV07XG4gICAgICAgICAgICAgICAgICAgIHB4cy5kYXRhW2Jsb2JzW2RdW2VdICsgMl0gPSBjbHJbMl07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7aW1hZ2U6IHB4cywgYmxvYnM6IGJsb2JDb29yZHN9O1xuICAgIH1cbn0iLCJpbXBvcnQgRmlsdGVycyBmcm9tICcuL2ZpbHRlcnMuZXM2JztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3Mge1xuICAgIC8qKlxuICAgICAqIGMtdG9yXG4gICAgICovXG4gICAgY29uc3RydWN0b3IocHhzKSB7XG4gICAgICAgIHRoaXMucmVzdWx0ID0gcHhzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBjb252ZXJ0IGltYWdlIHRvIGdyYXlzY2FsZVxuICAgICAqIEBwYXJhbSB7SW1hZ2VEYXRhfSBweHNcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKi9cbiAgICB0b0dyYXlzY2FsZSgpIHtcbiAgICAgICAgdGhpcy5yZXN1bHQgPSBGaWx0ZXJzLnRvR3JheXNjYWxlKHRoaXMucmVzdWx0KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIHNhdHVyYXRlIGltYWdlXG4gICAgICogQHBhcmFtIHtJbWFnZURhdGF9IHB4c1xuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBwZXJjZW50YW1vdW50IHBlcmNlbnRhZ2Ugc2F0dXJhdGlvblxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIHNhdHVyYXRlKHBlcmNlbnRhbW91bnQpIHtcbiAgICAgICAgdGhpcy5yZXN1bHQgPSBGaWx0ZXJzLnNhdHVyYXRlKHRoaXMucmVzdWx0LCBwZXJjZW50YW1vdW50KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIGNvbnZlcnQgdG8gcHVyZSBibGFjayBvciBwdXJlIHdoaXRlXG4gICAgICogQHBhcmFtIHB4c1xuICAgICAqIEBwYXJhbSBweHNcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKi9cbiAgICB0b0JsYWNrQW5kV2hpdGUodGhyZXNob2xkdG9ibGFja3BlcmNlbnQpIHtcbiAgICAgICAgdGhpcy5yZXN1bHQgPSBGaWx0ZXJzLnRvQmxhY2tBbmRXaGl0ZSh0aGlzLnJlc3VsdCwgdGhyZXNob2xkdG9ibGFja3BlcmNlbnQpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogY29udmVydCAyIGltYWdlcyB0byBhbiBpbWFnZSBoaWdobGlnaHRpbmcgZGlmZmVyZW5jZXNcbiAgICAgKiBAcGFyYW0gcHhzMVxuICAgICAqIEBwYXJhbSBweHMyXG4gICAgICogQHBhcmFtIHRvbGVyYW5jZVxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIHRvRGlmZihjb21wYXJlLCB0b2xlcmFuY2UpIHtcbiAgICAgICAgdGhpcy5yZXN1bHQgPSBGaWx0ZXJzLnRvRGlmZih0aGlzLnJlc3VsdCwgY29tcGFyZSwgdG9sZXJhbmNlKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufSIsImV4cG9ydCBkZWZhdWx0IHtcbiAgICAvKipcbiAgICAgKiBjb252ZXJ0IGltYWdlIHRvIGdyYXlzY2FsZVxuICAgICAqIEBwYXJhbSB7SW1hZ2VEYXRhfSBweHNcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKi9cbiAgICB0b0dyYXlzY2FsZShweHMpIHtcbiAgICAgICAgZm9yICh2YXIgYyA9IDA7IGMgPCBweHMuZGF0YS5sZW5ndGg7IGMrPTQpIHtcbiAgICAgICAgICAgIHZhciBncmF5ID0gKHB4cy5kYXRhW2NdICsgcHhzLmRhdGFbYysxXSArIHB4cy5kYXRhW2MrMl0pLzM7XG4gICAgICAgICAgICBweHMuZGF0YVtjXSA9IHB4cy5kYXRhW2MrMV0gPSBweHMuZGF0YVtjKzJdID0gZ3JheTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHhzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBzYXR1cmF0ZSBpbWFnZVxuICAgICAqIEBwYXJhbSB7SW1hZ2VEYXRhfSBweHNcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gcGVyY2VudGFtb3VudCBwZXJjZW50YWdlIHNhdHVyYXRpb25cbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKi9cbiAgICBzYXR1cmF0ZShweHMsIHBlcmNlbnRhbW91bnQpIHtcbiAgICAgICAgaWYgKCFwZXJjZW50YW1vdW50KSB7IHBlcmNlbnRhbW91bnQgPSA1MDsgfVxuICAgICAgICB2YXIgYW10ID0gcGVyY2VudGFtb3VudC8xMDAgKiAyNTU7XG4gICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgcHhzLmRhdGEubGVuZ3RoOyBjKz00KSB7XG4gICAgICAgICAgICBweHMuZGF0YVtjXSA9IHB4cy5kYXRhW2NdICsgYW10O1xuICAgICAgICAgICAgcHhzLmRhdGFbYysxXSA9IHB4cy5kYXRhW2MrMV0gKyBhbXQ7XG4gICAgICAgICAgICBweHMuZGF0YVtjKzJdID0gcHhzLmRhdGFbYysyXSArIGFtdDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHhzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBjb252ZXJ0IDIgaW1hZ2VzIHRvIGFuIGltYWdlIGhpZ2hsaWdodGluZyBkaWZmZXJlbmNlc1xuICAgICAqIEBwYXJhbSBweHMxXG4gICAgICogQHBhcmFtIHB4czJcbiAgICAgKiBAcGFyYW0gdG9sZXJhbmNlXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgdG9EaWZmKHB4czEsIHB4czIsIHRvbGVyYW5jZSkge1xuICAgICAgICBpZiAocHhzMS5kYXRhLmxlbmd0aCAhPT0gcHhzMi5kYXRhLmxlbmd0aCkgeyB0aHJvdyBuZXcgRXJyb3IoJ2ltYWdlcyBub3QgdGhlIHNhbWUgc2l6ZScpOyB9XG4gICAgICAgIHZhciBkaWZmID0gbmV3IEltYWdlRGF0YShweHMxLndpZHRoLCBweHMxLmhlaWdodCk7XG4gICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgcHhzMS5kYXRhLmxlbmd0aDsgYys9NCkge1xuICAgICAgICAgICAgdmFyIGRyYXcgPSAyNTU7XG4gICAgICAgICAgICBmb3IgKHZhciBkID0gMDsgZCA8IDQ7IGQrKykge1xuICAgICAgICAgICAgICAgIGlmIChweHMxLmRhdGFbYytkXSAtIHB4czIuZGF0YVtjK2RdID4gdG9sZXJhbmNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGRyYXcgPSAwO1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGRpZmYuZGF0YVtjXSA9IGRyYXc7XG4gICAgICAgICAgICBkaWZmLmRhdGFbYysxXSA9IGRyYXc7XG4gICAgICAgICAgICBkaWZmLmRhdGFbYysyXSA9IGRyYXc7XG4gICAgICAgICAgICBkaWZmLmRhdGFbYyszXT0gMjU1O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkaWZmO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBjb252ZXJ0IHRvIHB1cmUgYmxhY2sgb3IgcHVyZSB3aGl0ZVxuICAgICAqIEBwYXJhbSBweHNcbiAgICAgKiBAcGFyYW0gcHhzXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgdG9CbGFja0FuZFdoaXRlKHB4cywgdGhyZXNob2xkdG9ibGFja3BlcmNlbnQpIHtcbiAgICAgICAgaWYgKCF0aHJlc2hvbGR0b2JsYWNrcGVyY2VudCkgeyB0aHJlc2hvbGR0b2JsYWNrcGVyY2VudCA9IDUwOyB9XG4gICAgICAgIHZhciB0aHJlc2hvbGQgPSB0aHJlc2hvbGR0b2JsYWNrcGVyY2VudC8xMDAgKiAoMjU1ICsgMjU1ICsgMjU1KTtcbiAgICAgICAgZm9yICh2YXIgYyA9IDA7IGMgPCBweHMuZGF0YS5sZW5ndGg7IGMrPTQpIHtcbiAgICAgICAgICAgIGlmIChweHMuZGF0YVtjXSArIHB4cy5kYXRhW2MrMV0gKyBweHMuZGF0YVtjKzJdIDwgdGhyZXNob2xkICkge1xuICAgICAgICAgICAgICAgIHB4cy5kYXRhW2NdID0gMDtcbiAgICAgICAgICAgICAgICBweHMuZGF0YVtjKzFdID0gMDtcbiAgICAgICAgICAgICAgICBweHMuZGF0YVtjKzJdID0gMDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcHhzLmRhdGFbY10gPSAyNTU7XG4gICAgICAgICAgICAgICAgcHhzLmRhdGFbYysxXSA9IDI1NTtcbiAgICAgICAgICAgICAgICBweHMuZGF0YVtjKzJdID0gMjU1O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHB4cztcbiAgICB9XG59IiwiZXhwb3J0IGRlZmF1bHQge1xuICAgIHVuaWZvcm1zOiB7XG4gICAgICAgIFVOSUZPUk0xZjogJzFmJyxcbiAgICAgICAgVU5JRk9STTJmOiAnMmYnLFxuICAgICAgICBVTklGT1JNM2Y6ICczZicsXG4gICAgICAgIFVOSUZPUk00ZjogJzRmJyxcblxuICAgICAgICBVTklGT1JNMWk6ICcxaScsXG4gICAgICAgIFVOSUZPUk0yaTogJzJpJyxcbiAgICAgICAgVU5JRk9STTNpOiAnM2knLFxuICAgICAgICBVTklGT1JNNGk6ICc0aSdcbiAgICB9XG59IiwiaW1wb3J0IENvbnN0YW50cyBmcm9tICcuL2NvbnN0YW50cy5lczYnO1xuaW1wb3J0IFNoYWRlcnMgZnJvbSAnLi9zaGFkZXJzLmVzNic7XG5pbXBvcnQgRmlsdGVycyBmcm9tICcuL2ZpbHRlcnMuZXM2JztcbmltcG9ydCBUZXh0dXJlcyBmcm9tICcuL3RleHR1cmVzLmVzNic7XG5pbXBvcnQgVW5pZm9ybXMgZnJvbSAnLi91bmlmb3Jtcy5lczYnO1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gICAgLyoqXG4gICAgICogY3JlYXRlIGZpbHRlciBmcm9tIHNoYWRlcnNcbiAgICAgKiBAcGFyYW0gdmVydGV4U2hhZGVyXG4gICAgICogQHBhcmFtIGZyYWdtZW50U2hhZGVyXG4gICAgICogQHJldHVybnMge3t2ZXJ0ZXhTaGFkZXI6ICosIGZyYWdtZW50U2hhZGVyOiAqfX1cbiAgICAgKi9cbiAgICBjcmVhdGVGaWx0ZXJGcm9tU2hhZGVycyh2ZXJ0ZXhTaGFkZXIsIGZyYWdtZW50U2hhZGVyKSB7XG4gICAgICAgIHJldHVybiB7IHZlcnRleFNoYWRlcjogdmVydGV4U2hhZGVyLCBmcmFnbWVudFNoYWRlcjogZnJhZ21lbnRTaGFkZXIgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogY3JlYXRlIGEgZmlsdGVyIGZyb20gZmlsdGVyIG5hbWVcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqIEBwYXJhbSBtZW1vcnkgc3BhY2UvdmFyaWFibGUgdG8gcHVsbCBzaGFkZXIgZnJvbVxuICAgICAqL1xuICAgIGNyZWF0ZUZpbHRlckZyb21OYW1lKG5hbWUsIHNoYWRlcmxvYykge1xuICAgICAgICBpZiAoIXNoYWRlcmxvYykge1xuICAgICAgICAgICAgc2hhZGVybG9jID0gU2hhZGVycztcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXNoYWRlcmxvY1tuYW1lXSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1NoYWRlciAnLCBuYW1lLCAnbm90IGZvdW5kIGluICcsIHNoYWRlcmxvYywgJyB1c2luZyBhIHBhc3N0aHJvdWdoIHNoYWRlciBpbnN0ZWFkJyk7XG4gICAgICAgICAgICBzaGFkZXJsb2MgPSBTaGFkZXJzO1xuICAgICAgICAgICAgbmFtZSA9ICdwYXNzdGhyb3VnaCc7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHZ0eCA9IHNoYWRlcmxvY1tuYW1lXS52ZXJ0ZXg7XG4gICAgICAgIHZhciBmcmcgPSBzaGFkZXJsb2NbbmFtZV0uZnJhZ21lbnQ7XG4gICAgICAgIHJldHVybiB0aGlzLmNyZWF0ZUZpbHRlckZyb21TaGFkZXJzKHZ0eCwgZnJnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogY3JlYXRlIG9iamVjdCBmb3IgcmVuZGVyXG4gICAgICogQHBhcmFtIHtPYmplY3R9cGFyYW1zXG4gICAgICovXG4gICAgY3JlYXRlUmVuZGVyT2JqZWN0KHBhcmFtcykge1xuICAgICAgICB2YXIgcHJvcHMgPSB7fTtcblxuICAgICAgICBwcm9wcy5nbCA9IHBhcmFtcy5nbDtcbiAgICAgICAgcHJvcHMud2lkdGggPSBwcm9wcy5nbC5jYW52YXMud2lkdGg7XG4gICAgICAgIHByb3BzLmhlaWdodCA9IHByb3BzLmdsLmNhbnZhcy5oZWlnaHQ7XG5cbiAgICAgICAgaWYgKHBhcmFtcy53aWR0aCkgeyBwcm9wcy53aWR0aCA9IHBhcmFtcy53aWR0aDsgfVxuICAgICAgICBpZiAocGFyYW1zLmhlaWdodCkgeyBwcm9wcy5oZWlnaHQgPSBwYXJhbXMuaGVpZ2h0OyB9XG5cbiAgICAgICAgcHJvcHMuZmlsdGVyID0gcGFyYW1zLmZpbHRlcjtcbiAgICAgICAgcHJvcHMudGV4dHVyZXMgPSBuZXcgVGV4dHVyZXMocHJvcHMud2lkdGgscHJvcHMuaGVpZ2h0KTtcblxuICAgICAgICBwcm9wcy5jYW52YXMyREhlbHBlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgICAgICBwcm9wcy5jYW52YXMyREhlbHBlci53aWR0aCA9IHByb3BzLndpZHRoO1xuICAgICAgICBwcm9wcy5jYW52YXMyREhlbHBlci5oZWlnaHQgPSBwcm9wcy5oZWlnaHQ7XG4gICAgICAgIHByb3BzLmNhbnZhczJESGVscGVyQ29udGV4dCA9IHByb3BzLmNhbnZhczJESGVscGVyLmdldENvbnRleHQoJzJkJyk7XG5cbiAgICAgICAgcHJvcHMudW5pZm9ybXMgPSBuZXcgVW5pZm9ybXMoKTtcbiAgICAgICAgcHJvcHMudGV4dHVyZXMgPSBuZXcgVGV4dHVyZXMocHJvcHMuZ2wsIHByb3BzLndpZHRoLCBwcm9wcy5oZWlnaHQpO1xuXG4gICAgICAgIGlmIChwYXJhbXMudGV4dHVyZXMpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgcGFyYW1zLnRleHR1cmVzLmxlbmd0aDsgYysrKSB7XG4gICAgICAgICAgICAgICAgcHJvcHMudGV4dHVyZXMuYWRkKHBhcmFtcy50ZXh0dXJlc1tjXS5uYW1lLCBwYXJhbXMudGV4dHVyZXNbY10udGV4dHVyZSwgcGFyYW1zLnRleHR1cmVzW2NdLmluZGV4LCBwYXJhbXMudGV4dHVyZXNbY10ucGl4ZWxTdG9yZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocGFyYW1zLnVuaWZvcm1zKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IHBhcmFtcy51bmlmb3Jtcy5sZW5ndGg7IGMrKykge1xuICAgICAgICAgICAgICAgIHByb3BzLnVuaWZvcm1zLmFkZChwYXJhbXMudW5pZm9ybXNbY10ubmFtZSwgcGFyYW1zLnVuaWZvcm1zW2NdLnR5cGUsIHBhcmFtcy51bmlmb3Jtc1tjXS52YWx1ZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBhcmFtcy50ZXh0dXJlT2Zmc2V0KSB7XG4gICAgICAgICAgICB2YXIgb2Zmc2V0UGVyY2VudFggPSBwYXJhbXMudGV4dHVyZU9mZnNldC54IC8gcHJvcHMud2lkdGg7XG4gICAgICAgICAgICB2YXIgb2Zmc2V0UGVyY2VudFkgPSBwYXJhbXMudGV4dHVyZU9mZnNldC55IC8gcHJvcHMuaGVpZ2h0O1xuICAgICAgICAgICAgY29uc29sZS5sb2cob2Zmc2V0UGVyY2VudFgsIG9mZnNldFBlcmNlbnRZKTtcbiAgICAgICAgICAgIHByb3BzLnVuaWZvcm1zLmFkZCgnb2Zmc2V0JywgQ29uc3RhbnRzLnVuaWZvcm1zLlVOSUZPUk0yZiwgW29mZnNldFBlcmNlbnRYLCBvZmZzZXRQZXJjZW50WV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBhcmFtcy5hdXRvcmVuZGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZW5kZXIocHJvcHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHByb3BzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiByZW5kZXIgV2ViR0wgZmlsdGVyIG9uIGN1cnJlbnQgdGV4dHVyZVxuICAgICAqIEBwYXJhbSBnbHByb3BzXG4gICAgICogQHBhcmFtIHJlZnJlc2hUZXh0dXJlSW5kaWNlcyB0ZXh0dXJlIHJlZnJlc2ggaW5kaWNlcyAob3B0aW9uYWwpXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgcmVuZGVyKGdscHJvcHMpIHtcbiAgICAgICAgaWYgKCFnbHByb3BzLmlzSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgIHZhciB2ZXJ0ZXhTaGFkZXIgPSBnbHByb3BzLmdsLmNyZWF0ZVNoYWRlcihnbHByb3BzLmdsLlZFUlRFWF9TSEFERVIpO1xuICAgICAgICAgICAgZ2xwcm9wcy5nbC5zaGFkZXJTb3VyY2UodmVydGV4U2hhZGVyLCBnbHByb3BzLmZpbHRlci52ZXJ0ZXhTaGFkZXIpO1xuICAgICAgICAgICAgZ2xwcm9wcy5nbC5jb21waWxlU2hhZGVyKHZlcnRleFNoYWRlcik7XG5cbiAgICAgICAgICAgIHZhciBmcmFnbWVudFNoYWRlciA9IGdscHJvcHMuZ2wuY3JlYXRlU2hhZGVyKGdscHJvcHMuZ2wuRlJBR01FTlRfU0hBREVSKTtcbiAgICAgICAgICAgIGdscHJvcHMuZ2wuc2hhZGVyU291cmNlKGZyYWdtZW50U2hhZGVyLCBnbHByb3BzLmZpbHRlci5mcmFnbWVudFNoYWRlcik7XG4gICAgICAgICAgICBnbHByb3BzLmdsLmNvbXBpbGVTaGFkZXIoZnJhZ21lbnRTaGFkZXIpO1xuXG4gICAgICAgICAgICBnbHByb3BzLnByb2dyYW0gPSBnbHByb3BzLmdsLmNyZWF0ZVByb2dyYW0oKTtcbiAgICAgICAgICAgIGdscHJvcHMuZ2wuYXR0YWNoU2hhZGVyKGdscHJvcHMucHJvZ3JhbSwgdmVydGV4U2hhZGVyKTtcbiAgICAgICAgICAgIGdscHJvcHMuZ2wuYXR0YWNoU2hhZGVyKGdscHJvcHMucHJvZ3JhbSwgZnJhZ21lbnRTaGFkZXIpO1xuICAgICAgICAgICAgZ2xwcm9wcy5nbC5saW5rUHJvZ3JhbShnbHByb3BzLnByb2dyYW0pO1xuICAgICAgICAgICAgZ2xwcm9wcy5nbC51c2VQcm9ncmFtKGdscHJvcHMucHJvZ3JhbSk7XG5cbiAgICAgICAgICAgIHZhciBwb3NpdGlvbkxvY2F0aW9uID0gZ2xwcm9wcy5nbC5nZXRBdHRyaWJMb2NhdGlvbihnbHByb3BzLnByb2dyYW0sICdhX3Bvc2l0aW9uJyk7XG4gICAgICAgICAgICB2YXIgdGV4Q29vcmRCdWZmZXIgPSBnbHByb3BzLmdsLmNyZWF0ZUJ1ZmZlcigpO1xuICAgICAgICAgICAgdmFyIHJlY3RDb29yZEJ1ZmZlciA9IGdscHJvcHMuZ2wuY3JlYXRlQnVmZmVyKCk7XG4gICAgICAgICAgICB2YXIgdGV4Q29vcmRzID0gbmV3IEZsb2F0MzJBcnJheShbMC4wLCAgMC4wLCAxLjAsICAwLjAsIDAuMCwgIDEuMCwgMC4wLCAgMS4wLCAxLjAsICAwLjAsIDEuMCwgIDEuMF0pO1xuICAgICAgICAgICAgdmFyIHJlY3RDb29yZHMgPSBuZXcgRmxvYXQzMkFycmF5KFswLCAwLCBnbHByb3BzLnRleHR1cmVzLndpZHRoLCAwLCAwLCBnbHByb3BzLnRleHR1cmVzLmhlaWdodCwgMCxcbiAgICAgICAgICAgICAgICBnbHByb3BzLnRleHR1cmVzLmhlaWdodCwgZ2xwcm9wcy50ZXh0dXJlcy53aWR0aCwgMCwgZ2xwcm9wcy50ZXh0dXJlcy53aWR0aCwgZ2xwcm9wcy50ZXh0dXJlcy5oZWlnaHRdKTtcblxuICAgICAgICAgICAgZ2xwcm9wcy5nbC5iaW5kQnVmZmVyKGdscHJvcHMuZ2wuQVJSQVlfQlVGRkVSLCB0ZXhDb29yZEJ1ZmZlcik7XG4gICAgICAgICAgICBnbHByb3BzLmdsLmJ1ZmZlckRhdGEoZ2xwcm9wcy5nbC5BUlJBWV9CVUZGRVIsIHRleENvb3JkcywgZ2xwcm9wcy5nbC5TVEFUSUNfRFJBVyk7XG5cbiAgICAgICAgICAgIHZhciB0ZXhDb29yZExvY2F0aW9uID0gZ2xwcm9wcy5nbC5nZXRBdHRyaWJMb2NhdGlvbihnbHByb3BzLnByb2dyYW0sICdhX3RleENvb3JkJyk7XG4gICAgICAgICAgICBnbHByb3BzLmdsLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KHRleENvb3JkTG9jYXRpb24pO1xuICAgICAgICAgICAgZ2xwcm9wcy5nbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKHRleENvb3JkTG9jYXRpb24sIDIsIGdscHJvcHMuZ2wuRkxPQVQsIGZhbHNlLCAwLCAwKTtcblxuICAgICAgICAgICAgZ2xwcm9wcy51bmlmb3Jtcy5hZGQoJ3VfcmVzb2x1dGlvbicsIENvbnN0YW50cy51bmlmb3Jtcy5VTklGT1JNMmYsIFtnbHByb3BzLmdsLmNhbnZhcy53aWR0aCwgZ2xwcm9wcy5nbC5jYW52YXMuaGVpZ2h0XSk7XG4gICAgICAgICAgICBnbHByb3BzLnVuaWZvcm1zLmFkZCgnZl9yZXNvbHV0aW9uJywgQ29uc3RhbnRzLnVuaWZvcm1zLlVOSUZPUk0yZiwgW2dscHJvcHMuZ2wuY2FudmFzLndpZHRoLCBnbHByb3BzLmdsLmNhbnZhcy5oZWlnaHRdKTtcblxuICAgICAgICAgICAgZ2xwcm9wcy5nbC5iaW5kQnVmZmVyKGdscHJvcHMuZ2wuQVJSQVlfQlVGRkVSLCByZWN0Q29vcmRCdWZmZXIpO1xuICAgICAgICAgICAgZ2xwcm9wcy5nbC5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheShwb3NpdGlvbkxvY2F0aW9uKTtcbiAgICAgICAgICAgIGdscHJvcHMuZ2wudmVydGV4QXR0cmliUG9pbnRlcihwb3NpdGlvbkxvY2F0aW9uLCAyLCBnbHByb3BzLmdsLkZMT0FULCBmYWxzZSwgMCwgMCk7XG4gICAgICAgICAgICBnbHByb3BzLmdsLmJ1ZmZlckRhdGEoZ2xwcm9wcy5nbC5BUlJBWV9CVUZGRVIsIHJlY3RDb29yZHMsIGdscHJvcHMuZ2wuU1RBVElDX0RSQVcpO1xuICAgICAgICB9XG5cbiAgICAgICAgZ2xwcm9wcy50ZXh0dXJlcy5pbml0aWFsaXplTmV3VGV4dHVyZXMoZ2xwcm9wcy5wcm9ncmFtKTtcbiAgICAgICAgZ2xwcm9wcy50ZXh0dXJlcy5yZWZyZXNoU2NlbmUoKTtcbiAgICAgICAgZ2xwcm9wcy51bmlmb3Jtcy51cGRhdGVQcm9ncmFtKGdscHJvcHMuZ2wsIGdscHJvcHMucHJvZ3JhbSk7XG5cbiAgICAgICAgZ2xwcm9wcy5nbC5kcmF3QXJyYXlzKGdscHJvcHMuZ2wuVFJJQU5HTEVTLCAwLCA2KTtcbiAgICAgICAgZ2xwcm9wcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcblxuICAgICAgICByZXR1cm4gZ2xwcm9wcztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogcmVhZCBwaXhlbHMgZnJvbSBHTCBjb250ZXh0XG4gICAgICogQHBhcmFtIGdsUHJvcHNcbiAgICAgKi9cbiAgICBnZXRDYW52YXNQaXhlbHMoZ2xwcm9wcykge1xuICAgICAgICB2YXIgZ2xjdHggPSBnbHByb3BzLmdsO1xuICAgICAgICBpZiAoIWdscHJvcHMucGl4ZWxhcnJheSB8fCBnbGN0eC5jYW52YXMud2lkdGggKiBnbGN0eC5jYW52YXMuaGVpZ2h0ICogNCAhPT0gZ2xwcm9wcy5waXhlbGFycmF5Lmxlbmd0aCkge1xuICAgICAgICAgICAgZ2xwcm9wcy5waXhlbGFycmF5ID0gbmV3IFVpbnQ4QXJyYXkoZ2xjdHguY2FudmFzLndpZHRoICogZ2xjdHguY2FudmFzLmhlaWdodCAqIDQpO1xuICAgICAgICB9XG4gICAgICAgIGdsY3R4LnJlYWRQaXhlbHMoMCwgMCwgZ2xjdHguY2FudmFzLndpZHRoLCBnbGN0eC5jYW52YXMuaGVpZ2h0LCBnbGN0eC5SR0JBLCBnbGN0eC5VTlNJR05FRF9CWVRFLCBnbHByb3BzLnBpeGVsYXJyYXkpO1xuICAgICAgICB2YXIgaW1nRGF0YSA9IGdscHJvcHMuY2FudmFzMkRIZWxwZXJDb250ZXh0LmNyZWF0ZUltYWdlRGF0YShnbGN0eC5jYW52YXMud2lkdGgsIGdsY3R4LmNhbnZhcy5oZWlnaHQpO1xuICAgICAgICBpbWdEYXRhLmRhdGEuc2V0KG5ldyBVaW50OENsYW1wZWRBcnJheShnbHByb3BzLnBpeGVsYXJyYXkpKTtcbiAgICAgICAgcmV0dXJuIGltZ0RhdGE7XG4gICAgfVxufTsiLCJleHBvcnQgZGVmYXVsdCB7XG4gIFwiZnJlaWNoZW5fZWRnZV9kZXRlY3Rpb25cIjoge1xuICAgIFwiZnJhZ21lbnRcIjogXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDsgdW5pZm9ybSBzYW1wbGVyMkQgdV9pbWFnZTA7IHZhcnlpbmcgdmVjMiB2X3RleENvb3JkOyB1bmlmb3JtIHZlYzIgZl9yZXNvbHV0aW9uOyB2ZWMyIHRleGVsID0gdmVjMigxLjAgLyBmX3Jlc29sdXRpb24ueCwgMS4wIC8gZl9yZXNvbHV0aW9uLnkpOyBtYXQzIEdbOV07ICBjb25zdCBtYXQzIGcwID0gbWF0MyggMC4zNTM1NTMzODQ1NDI0NjUyLCAwLCAtMC4zNTM1NTMzODQ1NDI0NjUyLCAwLjUsIDAsIC0wLjUsIDAuMzUzNTUzMzg0NTQyNDY1MiwgMCwgLTAuMzUzNTUzMzg0NTQyNDY1MiApOyBjb25zdCBtYXQzIGcxID0gbWF0MyggMC4zNTM1NTMzODQ1NDI0NjUyLCAwLjUsIDAuMzUzNTUzMzg0NTQyNDY1MiwgMCwgMCwgMCwgLTAuMzUzNTUzMzg0NTQyNDY1MiwgLTAuNSwgLTAuMzUzNTUzMzg0NTQyNDY1MiApOyBjb25zdCBtYXQzIGcyID0gbWF0MyggMCwgMC4zNTM1NTMzODQ1NDI0NjUyLCAtMC41LCAtMC4zNTM1NTMzODQ1NDI0NjUyLCAwLCAwLjM1MzU1MzM4NDU0MjQ2NTIsIDAuNSwgLTAuMzUzNTUzMzg0NTQyNDY1MiwgMCApOyBjb25zdCBtYXQzIGczID0gbWF0MyggMC41LCAtMC4zNTM1NTMzODQ1NDI0NjUyLCAwLCAtMC4zNTM1NTMzODQ1NDI0NjUyLCAwLCAwLjM1MzU1MzM4NDU0MjQ2NTIsIDAsIDAuMzUzNTUzMzg0NTQyNDY1MiwgLTAuNSApOyBjb25zdCBtYXQzIGc0ID0gbWF0MyggMCwgLTAuNSwgMCwgMC41LCAwLCAwLjUsIDAsIC0wLjUsIDAgKTsgY29uc3QgbWF0MyBnNSA9IG1hdDMoIC0wLjUsIDAsIDAuNSwgMCwgMCwgMCwgMC41LCAwLCAtMC41ICk7IGNvbnN0IG1hdDMgZzYgPSBtYXQzKCAwLjE2NjY2NjY3MTYzMzcyMDQsIC0wLjMzMzMzMzM0MzI2NzQ0MDgsIDAuMTY2NjY2NjcxNjMzNzIwNCwgLTAuMzMzMzMzMzQzMjY3NDQwOCwgMC42NjY2NjY2ODY1MzQ4ODE2LCAtMC4zMzMzMzMzNDMyNjc0NDA4LCAwLjE2NjY2NjY3MTYzMzcyMDQsIC0wLjMzMzMzMzM0MzI2NzQ0MDgsIDAuMTY2NjY2NjcxNjMzNzIwNCApOyBjb25zdCBtYXQzIGc3ID0gbWF0MyggLTAuMzMzMzMzMzQzMjY3NDQwOCwgMC4xNjY2NjY2NzE2MzM3MjA0LCAtMC4zMzMzMzMzNDMyNjc0NDA4LCAwLjE2NjY2NjY3MTYzMzcyMDQsIDAuNjY2NjY2Njg2NTM0ODgxNiwgMC4xNjY2NjY2NzE2MzM3MjA0LCAtMC4zMzMzMzMzNDMyNjc0NDA4LCAwLjE2NjY2NjY3MTYzMzcyMDQsIC0wLjMzMzMzMzM0MzI2NzQ0MDggKTsgY29uc3QgbWF0MyBnOCA9IG1hdDMoIDAuMzMzMzMzMzQzMjY3NDQwOCwgMC4zMzMzMzMzNDMyNjc0NDA4LCAwLjMzMzMzMzM0MzI2NzQ0MDgsIDAuMzMzMzMzMzQzMjY3NDQwOCwgMC4zMzMzMzMzNDMyNjc0NDA4LCAwLjMzMzMzMzM0MzI2NzQ0MDgsIDAuMzMzMzMzMzQzMjY3NDQwOCwgMC4zMzMzMzMzNDMyNjc0NDA4LCAwLjMzMzMzMzM0MzI2NzQ0MDggKTsgIHZvaWQgbWFpbih2b2lkKSB7ICAgICAgR1swXSA9IGcwLCAgICAgR1sxXSA9IGcxLCAgICAgR1syXSA9IGcyLCAgICAgR1szXSA9IGczLCAgICAgR1s0XSA9IGc0LCAgICAgR1s1XSA9IGc1LCAgICAgR1s2XSA9IGc2LCAgICAgR1s3XSA9IGc3LCAgICAgR1s4XSA9IGc4OyAgICAgIG1hdDMgSTsgICAgIGZsb2F0IGNudls5XTsgICAgIHZlYzMgc2FtcGw7ICAgICAgZm9yIChmbG9hdCBpPTAuMDsgaTwzLjA7IGkrKykgeyAgICAgICAgIGZvciAoZmxvYXQgaj0wLjA7IGo8My4wOyBqKyspIHsgICAgICAgICAgICAgc2FtcGwgPSB0ZXh0dXJlMkQodV9pbWFnZTAsIHZfdGV4Q29vcmQgKyB0ZXhlbCAqIHZlYzIoaS0xLjAsai0xLjApICkucmdiOyAgICAgICAgICAgICBJW2ludChpKV1baW50KGopXSA9IGxlbmd0aChzYW1wbCk7ICAgICAgICAgfSAgICAgfSAgICAgIGZvciAoaW50IGk9MDsgaTw5OyBpKyspIHsgICAgICAgICBmbG9hdCBkcDMgPSBkb3QoR1tpXVswXSwgSVswXSkgKyBkb3QoR1tpXVsxXSwgSVsxXSkgKyBkb3QoR1tpXVsyXSwgSVsyXSk7ICAgICAgICAgY252W2ldID0gZHAzICogZHAzOyAgICAgfSAgICAgIGZsb2F0IE0gPSAoY252WzBdICsgY252WzFdKSArIChjbnZbMl0gKyBjbnZbM10pOyAgICAgZmxvYXQgUyA9IChjbnZbNF0gKyBjbnZbNV0pICsgKGNudls2XSArIGNudls3XSkgKyAoY252WzhdICsgTSk7ICAgICAgZ2xfRnJhZ0NvbG9yID0gdmVjNCh2ZWMzKHNxcnQoTS9TKSksIHRleHR1cmUyRCggdV9pbWFnZTAsIHZfdGV4Q29vcmQgKS5hICk7IH1cIixcbiAgICBcInZlcnRleFwiOiBcImF0dHJpYnV0ZSB2ZWMyIGFfcG9zaXRpb247IGF0dHJpYnV0ZSB2ZWMyIGFfdGV4Q29vcmQ7IHVuaWZvcm0gdmVjMiB1X3Jlc29sdXRpb247IHZhcnlpbmcgdmVjMiB2X3RleENvb3JkOyAgdm9pZCBtYWluKCkgeyAgICAgdmVjMiB6ZXJvVG9PbmUgPSBhX3Bvc2l0aW9uIC8gdV9yZXNvbHV0aW9uOyAgICAgdmVjMiB6ZXJvVG9Ud28gPSB6ZXJvVG9PbmUgKiAyLjA7ICAgICB2ZWMyIGNsaXBTcGFjZSA9IHplcm9Ub1R3byAtIDEuMDsgICAgIGdsX1Bvc2l0aW9uID0gdmVjNChjbGlwU3BhY2UgKiB2ZWMyKDEsIC0xKSwgMCwgMSk7ICAgICB2X3RleENvb3JkID0gYV90ZXhDb29yZDsgfVwiXG4gIH0sXG4gIFwiZ3JleXNjYWxlXCI6IHtcbiAgICBcImZyYWdtZW50XCI6IFwicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7IHZhcnlpbmcgdmVjMiB2X3RleENvb3JkOyAgdW5pZm9ybSBzYW1wbGVyMkQgdV9pbWFnZTA7ICB2b2lkIG1haW4odm9pZCkgeyAgICAgdmVjNCBweCA9IHRleHR1cmUyRCh1X2ltYWdlMCwgdl90ZXhDb29yZCk7ICAgICBmbG9hdCBhdmcgPSAocHguciArIHB4LmcgKyBweC5iKS8zLjA7ICAgICBnbF9GcmFnQ29sb3IgPSB2ZWM0KGF2ZywgYXZnLCBhdmcsIHB4LmEpOyB9XCIsXG4gICAgXCJ2ZXJ0ZXhcIjogXCJhdHRyaWJ1dGUgdmVjMiBhX3Bvc2l0aW9uOyBhdHRyaWJ1dGUgdmVjMiBhX3RleENvb3JkOyB1bmlmb3JtIHZlYzIgdV9yZXNvbHV0aW9uOyB2YXJ5aW5nIHZlYzIgdl90ZXhDb29yZDsgIHZvaWQgbWFpbigpIHsgICAgIHZlYzIgemVyb1RvT25lID0gYV9wb3NpdGlvbiAvIHVfcmVzb2x1dGlvbjsgICAgIHZlYzIgemVyb1RvVHdvID0gemVyb1RvT25lICogMi4wOyAgICAgdmVjMiBjbGlwU3BhY2UgPSB6ZXJvVG9Ud28gLSAxLjA7ICAgICBnbF9Qb3NpdGlvbiA9IHZlYzQoY2xpcFNwYWNlICogdmVjMigxLCAtMSksIDAsIDEpOyAgICAgdl90ZXhDb29yZCA9IGFfdGV4Q29vcmQ7IH1cIlxuICB9LFxuICBcInBhc3N0aHJvdWdoXCI6IHtcbiAgICBcImZyYWdtZW50XCI6IFwicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7IHVuaWZvcm0gc2FtcGxlcjJEIHVfaW1hZ2UwOyB2YXJ5aW5nIHZlYzIgdl90ZXhDb29yZDsgIHZvaWQgbWFpbigpIHsgICAgIGdsX0ZyYWdDb2xvciA9IHRleHR1cmUyRCh1X2ltYWdlMCwgdl90ZXhDb29yZCk7IH1cIixcbiAgICBcInZlcnRleFwiOiBcImF0dHJpYnV0ZSB2ZWMyIGFfcG9zaXRpb247IGF0dHJpYnV0ZSB2ZWMyIGFfdGV4Q29vcmQ7IHVuaWZvcm0gdmVjMiB1X3Jlc29sdXRpb247IHZhcnlpbmcgdmVjMiB2X3RleENvb3JkOyAgdm9pZCBtYWluKCkgeyAgICAgdmVjMiB6ZXJvVG9PbmUgPSBhX3Bvc2l0aW9uIC8gdV9yZXNvbHV0aW9uOyAgICAgdmVjMiB6ZXJvVG9Ud28gPSB6ZXJvVG9PbmUgKiAyLjA7ICAgICB2ZWMyIGNsaXBTcGFjZSA9IHplcm9Ub1R3byAtIDEuMDsgICAgIGdsX1Bvc2l0aW9uID0gdmVjNChjbGlwU3BhY2UgKiB2ZWMyKDEsIC0xKSwgMCwgMSk7ICAgICB2X3RleENvb3JkID0gYV90ZXhDb29yZDsgfVwiXG4gIH0sXG4gIFwic2VwaWFcIjoge1xuICAgIFwiZnJhZ21lbnRcIjogXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDsgdmFyeWluZyB2ZWMyIHZfdGV4Q29vcmQ7ICB1bmlmb3JtIHNhbXBsZXIyRCB1X2ltYWdlMDsgdW5pZm9ybSB2ZWM0IGxpZ2h0OyB1bmlmb3JtIHZlYzQgZGFyazsgdW5pZm9ybSBmbG9hdCBkZXNhdDsgdW5pZm9ybSBmbG9hdCB0b25lZDsgIGNvbnN0IG1hdDQgY29lZmYgPSBtYXQ0KCAgICAgMC4zOTMsIDAuMzQ5LCAwLjI3MiwgMS4wLCAgICAgMC43OTYsIDAuNjg2LCAwLjUzNCwgMS4wLCAgICAgMC4xODksIDAuMTY4LCAwLjEzMSwgMS4wLCAgICAgMC4wLCAwLjAsIDAuMCwgMS4wICk7ICB2b2lkIG1haW4odm9pZCkgeyAgICAgdmVjNCBzb3VyY2VQaXhlbCA9IHRleHR1cmUyRCh1X2ltYWdlMCwgdl90ZXhDb29yZCk7ICAgICBnbF9GcmFnQ29sb3IgPSBjb2VmZiAqIHNvdXJjZVBpeGVsOyB9XCIsXG4gICAgXCJ2ZXJ0ZXhcIjogXCJhdHRyaWJ1dGUgdmVjMiBhX3Bvc2l0aW9uOyBhdHRyaWJ1dGUgdmVjMiBhX3RleENvb3JkOyB1bmlmb3JtIHZlYzIgdV9yZXNvbHV0aW9uOyB2YXJ5aW5nIHZlYzIgdl90ZXhDb29yZDsgIHZvaWQgbWFpbigpIHsgICAgIHZlYzIgemVyb1RvT25lID0gYV9wb3NpdGlvbiAvIHVfcmVzb2x1dGlvbjsgICAgIHZlYzIgemVyb1RvVHdvID0gemVyb1RvT25lICogMi4wOyAgICAgdmVjMiBjbGlwU3BhY2UgPSB6ZXJvVG9Ud28gLSAxLjA7ICAgICBnbF9Qb3NpdGlvbiA9IHZlYzQoY2xpcFNwYWNlICogdmVjMigxLCAtMSksIDAsIDEpOyAgICAgdl90ZXhDb29yZCA9IGFfdGV4Q29vcmQ7IH1cIlxuICB9LFxuICBcInNvYmVsX2VkZ2VfZGV0ZWN0aW9uXCI6IHtcbiAgICBcImZyYWdtZW50XCI6IFwicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7IHZhcnlpbmcgdmVjMiB2X3RleENvb3JkOyB1bmlmb3JtIHNhbXBsZXIyRCB1X2ltYWdlMDsgdW5pZm9ybSB2ZWMyIGZfcmVzb2x1dGlvbjsgIHZvaWQgbWFpbih2b2lkKSB7ICAgICBmbG9hdCB4ID0gMS4wIC8gZl9yZXNvbHV0aW9uLng7ICAgICBmbG9hdCB5ID0gMS4wIC8gZl9yZXNvbHV0aW9uLnk7ICAgICB2ZWM0IGhvcml6RWRnZSA9IHZlYzQoIDAuMCApOyAgICAgaG9yaXpFZGdlIC09IHRleHR1cmUyRCggdV9pbWFnZTAsIHZlYzIoIHZfdGV4Q29vcmQueCAtIHgsIHZfdGV4Q29vcmQueSAtIHkgKSApICogMS4wOyAgICAgaG9yaXpFZGdlIC09IHRleHR1cmUyRCggdV9pbWFnZTAsIHZlYzIoIHZfdGV4Q29vcmQueCAtIHgsIHZfdGV4Q29vcmQueSAgICAgKSApICogMi4wOyAgICAgaG9yaXpFZGdlIC09IHRleHR1cmUyRCggdV9pbWFnZTAsIHZlYzIoIHZfdGV4Q29vcmQueCAtIHgsIHZfdGV4Q29vcmQueSArIHkgKSApICogMS4wOyAgICAgaG9yaXpFZGdlICs9IHRleHR1cmUyRCggdV9pbWFnZTAsIHZlYzIoIHZfdGV4Q29vcmQueCArIHgsIHZfdGV4Q29vcmQueSAtIHkgKSApICogMS4wOyAgICAgaG9yaXpFZGdlICs9IHRleHR1cmUyRCggdV9pbWFnZTAsIHZlYzIoIHZfdGV4Q29vcmQueCArIHgsIHZfdGV4Q29vcmQueSAgICAgKSApICogMi4wOyAgICAgaG9yaXpFZGdlICs9IHRleHR1cmUyRCggdV9pbWFnZTAsIHZlYzIoIHZfdGV4Q29vcmQueCArIHgsIHZfdGV4Q29vcmQueSArIHkgKSApICogMS4wOyAgICAgdmVjNCB2ZXJ0RWRnZSA9IHZlYzQoIDAuMCApOyAgICAgdmVydEVkZ2UgLT0gdGV4dHVyZTJEKCB1X2ltYWdlMCwgdmVjMiggdl90ZXhDb29yZC54IC0geCwgdl90ZXhDb29yZC55IC0geSApICkgKiAxLjA7ICAgICB2ZXJ0RWRnZSAtPSB0ZXh0dXJlMkQoIHVfaW1hZ2UwLCB2ZWMyKCB2X3RleENvb3JkLnggICAgLCB2X3RleENvb3JkLnkgLSB5ICkgKSAqIDIuMDsgICAgIHZlcnRFZGdlIC09IHRleHR1cmUyRCggdV9pbWFnZTAsIHZlYzIoIHZfdGV4Q29vcmQueCArIHgsIHZfdGV4Q29vcmQueSAtIHkgKSApICogMS4wOyAgICAgdmVydEVkZ2UgKz0gdGV4dHVyZTJEKCB1X2ltYWdlMCwgdmVjMiggdl90ZXhDb29yZC54IC0geCwgdl90ZXhDb29yZC55ICsgeSApICkgKiAxLjA7ICAgICB2ZXJ0RWRnZSArPSB0ZXh0dXJlMkQoIHVfaW1hZ2UwLCB2ZWMyKCB2X3RleENvb3JkLnggICAgLCB2X3RleENvb3JkLnkgKyB5ICkgKSAqIDIuMDsgICAgIHZlcnRFZGdlICs9IHRleHR1cmUyRCggdV9pbWFnZTAsIHZlYzIoIHZfdGV4Q29vcmQueCArIHgsIHZfdGV4Q29vcmQueSArIHkgKSApICogMS4wOyAgICAgdmVjMyBlZGdlID0gc3FydCgoaG9yaXpFZGdlLnJnYiAqIGhvcml6RWRnZS5yZ2IpICsgKHZlcnRFZGdlLnJnYiAqIHZlcnRFZGdlLnJnYikpOyAgICAgIGdsX0ZyYWdDb2xvciA9IHZlYzQoIGVkZ2UsIHRleHR1cmUyRCggdV9pbWFnZTAsIHZfdGV4Q29vcmQgKS5hICk7IH1cIixcbiAgICBcInZlcnRleFwiOiBcImF0dHJpYnV0ZSB2ZWMyIGFfcG9zaXRpb247IGF0dHJpYnV0ZSB2ZWMyIGFfdGV4Q29vcmQ7IHVuaWZvcm0gdmVjMiB1X3Jlc29sdXRpb247IHZhcnlpbmcgdmVjMiB2X3RleENvb3JkOyB1bmlmb3JtIHZlYzIgb2Zmc2V0OyAgdm9pZCBtYWluKCkgeyAgICAgdmVjMiB6ZXJvVG9PbmUgPSBhX3Bvc2l0aW9uIC8gdV9yZXNvbHV0aW9uOyAgICAgdmVjMiB6ZXJvVG9Ud28gPSB6ZXJvVG9PbmUgKiAyLjA7ICAgICB2ZWMyIGNsaXBTcGFjZSA9IHplcm9Ub1R3byAtIDEuMCArIG9mZnNldDsgICAgIGdsX1Bvc2l0aW9uID0gdmVjNChjbGlwU3BhY2UueCAqIDEuMCwgY2xpcFNwYWNlLnkgKiAtMS4wLCAwLjAsIDEuMCk7ICAgICB2X3RleENvb3JkID0gYV90ZXhDb29yZDsgfVwiXG4gIH1cbn0iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyB7XG4gICAgLyoqXG4gICAgICogYy10b3JcbiAgICAgKiBAcGFyYW0gZ2xcbiAgICAgKiBAcGFyYW0gd2lkdGhcbiAgICAgKiBAcGFyYW0gaGVpZ2h0XG4gICAgICovXG4gICAgY29uc3RydWN0b3IoZ2wsIHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgLyoqIGludGVybmFsIHRleHR1cmUgYXJyYXkgKi9cbiAgICAgICAgdGhpcy5fdGV4dHVyZXMgPSB7fTtcblxuICAgICAgICAvKiogd2lkdGggKi9cbiAgICAgICAgdGhpcy53aWR0aCA9IHdpZHRoO1xuXG4gICAgICAgIC8qKiBoZWlnaHQgKi9cbiAgICAgICAgdGhpcy5oZWlnaHQgPSBoZWlnaHQ7XG5cbiAgICAgICAgLyoqIGdsIGNvbnRleHQgKi9cbiAgICAgICAgdGhpcy5nbCA9IGdsO1xuXG4gICAgICAgIC8qKiB1bmluaXRpYWxpemVkIHRleHR1cmVzICovXG4gICAgICAgIHRoaXMuX3VuaXRpYWxpemVkID0gW107XG5cbiAgICAgICAgLyoqIGRpcnR5IHRleHR1cmVzIChuZWVkcyB1cGRhdGluZykgKi9cbiAgICAgICAgdGhpcy5fZGlydHkgPSBbXTtcblxuICAgICAgICAvKiogdGV4dHVyZSBpbmRpY2VzICovXG4gICAgICAgIHRoaXMudGV4dHVyZUluZGljZXMgPSBbXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBhZGQgYSB0ZXh0dXJlXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gdGV4dHVyZVxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gZ2xpbmRleFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHBpeGVsc3RvcmVcbiAgICAgKi9cbiAgICBhZGQobmFtZSwgdGV4dHVyZSwgZ2xpbmRleCwgcGl4ZWxzdG9yZSkge1xuICAgICAgICBpZiAoIWdsaW5kZXgpIHtcbiAgICAgICAgICAgIGdsaW5kZXggPSAwO1xuICAgICAgICAgICAgd2hpbGUgKHRoaXMudGV4dHVyZUluZGljZXMuaW5kZXhPZihnbGluZGV4KSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICBnbGluZGV4ICsrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFwaXhlbHN0b3JlKSB7XG4gICAgICAgICAgICBwaXhlbHN0b3JlID0gW107XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy50ZXh0dXJlSW5kaWNlcy5wdXNoKGdsaW5kZXgpO1xuXG4gICAgICAgIHRoaXMuX3RleHR1cmVzW25hbWVdID0ge1xuICAgICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICAgIGdsaW5kZXg6IGdsaW5kZXgsXG4gICAgICAgICAgICB0ZXh0dXJlOiB0ZXh0dXJlLFxuICAgICAgICAgICAgZ2x0ZXh0dXJlOiB0aGlzLmdsLmNyZWF0ZVRleHR1cmUoKSxcbiAgICAgICAgICAgIGluaXRpYWxpemVkOiBmYWxzZSxcbiAgICAgICAgICAgIHBpeGVsU3RvcmU6IHBpeGVsc3RvcmUsXG4gICAgICAgICAgICBkaXJ0eTogdHJ1ZSB9O1xuXG4gICAgICAgIHRoaXMuX3VuaXRpYWxpemVkLnB1c2godGhpcy5fdGV4dHVyZXNbbmFtZV0pO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiB1cGRhdGUgYSB1bmlmb3JtXG4gICAgICogQHBhcmFtIG5hbWUgbmFtZSBvZiB0ZXh0dXJlXG4gICAgICogQHBhcmFtIHRleHR1cmVcbiAgICAgKi9cbiAgICB1cGRhdGUobmFtZSwgdGV4dHVyZSkge1xuICAgICAgICBpZiAodGV4dHVyZSkge1xuICAgICAgICAgICAgdGhpcy5fdGV4dHVyZXNbbmFtZV0udGV4dHVyZSA9IHRleHR1cmU7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fdGV4dHVyZXNbbmFtZV0uZGlydHkgPSB0cnVlO1xuICAgICAgICB0aGlzLl9kaXJ0eS5wdXNoKHRoaXMuX3RleHR1cmVzW25hbWVdKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogcmVmcmVzaCBzY2VuZSB3aXRoIHVwZGF0ZWQgdGV4dHVyZXNcbiAgICAgKi9cbiAgICByZWZyZXNoU2NlbmUoKSB7XG4gICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgdGhpcy5fZGlydHkubGVuZ3RoOyBjKyspIHtcbiAgICAgICAgICAgIHRoaXMuZ2wuYWN0aXZlVGV4dHVyZSh0aGlzLmdsWydURVhUVVJFJyArIHRoaXMuX2RpcnR5W2NdLmdsaW5kZXhdKTtcbiAgICAgICAgICAgIHRoaXMuZ2wuYmluZFRleHR1cmUodGhpcy5nbC5URVhUVVJFXzJELCB0aGlzLl9kaXJ0eVtjXS5nbHRleHR1cmUpO1xuICAgICAgICAgICAgdGhpcy5nbC50ZXhTdWJJbWFnZTJEKHRoaXMuZ2wuVEVYVFVSRV8yRCwgMCwgMCwgMCwgdGhpcy5nbC5SR0JBLCB0aGlzLmdsLlVOU0lHTkVEX0JZVEUsIHRoaXMuX2RpcnR5W2NdLnRleHR1cmUpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2RpcnR5ID0gW107XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIGluaXRpYWxpemUgbmV3IHRleHR1cmVzXG4gICAgICogQHBhcmFtIHByb2dyYW1cbiAgICAgKi9cbiAgICBpbml0aWFsaXplTmV3VGV4dHVyZXMocHJvZ3JhbSkge1xuICAgICAgICBpZiAodGhpcy5fdW5pdGlhbGl6ZWQubGVuZ3RoID09PSAwKSB7IHJldHVybjsgfVxuICAgICAgICB2YXIgZ2wgPSB0aGlzLmdsO1xuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IHRoaXMuX3VuaXRpYWxpemVkLmxlbmd0aDsgYysrKSB7XG4gICAgICAgICAgICB0aGlzLl91bml0aWFsaXplZFtjXS5sb2NhdGlvbiA9IGdsLmdldFVuaWZvcm1Mb2NhdGlvbihwcm9ncmFtLCAndV9pbWFnZScgKyB0aGlzLl91bml0aWFsaXplZFtjXS5nbGluZGV4KTtcbiAgICAgICAgICAgIGdsLnVuaWZvcm0xaSh0aGlzLl91bml0aWFsaXplZFtjXS5sb2NhdGlvbiwgdGhpcy5fdW5pdGlhbGl6ZWRbY10uZ2xpbmRleCk7XG4gICAgICAgICAgICBnbC5hY3RpdmVUZXh0dXJlKGdsWydURVhUVVJFJyArIHRoaXMuX3VuaXRpYWxpemVkW2NdLmdsaW5kZXhdKTtcbiAgICAgICAgICAgIGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMuX3VuaXRpYWxpemVkW2NdLmdsdGV4dHVyZSk7XG4gICAgICAgICAgICBnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9TLCBnbC5DTEFNUF9UT19FREdFKTtcbiAgICAgICAgICAgIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1QsIGdsLkNMQU1QX1RPX0VER0UpO1xuICAgICAgICAgICAgZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01JTl9GSUxURVIsIGdsLk5FQVJFU1QpO1xuICAgICAgICAgICAgZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01BR19GSUxURVIsIGdsLk5FQVJFU1QpO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBkID0gMDsgZCA8IHRoaXMuX3VuaXRpYWxpemVkW2NdLnBpeGVsU3RvcmUubGVuZ3RoOyBkKyspIHtcbiAgICAgICAgICAgICAgICBnbC5waXhlbFN0b3JlaShnbFt0aGlzLl91bml0aWFsaXplZFtjXS5waXhlbFN0b3JlW2RdLnByb3BlcnR5XSwgdGhpcy5fdW5pdGlhbGl6ZWRbY10ucGl4ZWxTdG9yZVtkXS52YWx1ZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGdsLnRleEltYWdlMkQoZ2wuVEVYVFVSRV8yRCwgMCwgZ2wuUkdCQSwgZ2wuUkdCQSwgZ2wuVU5TSUdORURfQllURSwgdGhpcy5fdW5pdGlhbGl6ZWRbY10udGV4dHVyZSk7XG5cbiAgICAgICAgICAgIHRoaXMuX3VuaXRpYWxpemVkW2NdLmluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuX3VuaXRpYWxpemVkW2NdLmRpcnR5ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fdW5pdGlhbGl6ZWQgPSBbXTtcbiAgICB9O1xufSIsImV4cG9ydCBkZWZhdWx0IGNsYXNzIHtcbiAgICAvKipcbiAgICAgKiBjLXRvclxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICAvKipcbiAgICAgICAgICogaW50ZXJuYWwgbWFwcGluZyBvZiB1bmlmb3Jtc1xuICAgICAgICAgKiBAdHlwZSB7e319XG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLl91bmlmb3JtcyA9IHt9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGFkZCBhIHVuaWZvcm1cbiAgICAgKiBAcGFyYW0gdHlwZSB0eXBlIG9mIHVuaWZvcm0gKDFmLCAyZiwgM2YsIDRmLCAxaSwgMmksIDNpLCA0dVxuICAgICAqL1xuICAgIGFkZChuYW1lLCB0eXBlLCB2YWx1ZXMpIHtcbiAgICAgICAgdGhpcy5fdW5pZm9ybXNbbmFtZV0gPSB7IG5hbWU6IG5hbWUsIHR5cGU6IHR5cGUsIHZhbHVlczogdmFsdWVzLCBkaXJ0eTogdHJ1ZSB9O1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiB1cGRhdGUgYSB1bmlmb3JtXG4gICAgICogQHBhcmFtIHR5cGUgdHlwZSBvZiB1bmlmb3JtICgxZiwgMmYsIDNmLCA0ZiwgMWksIDJpLCAzaSwgNHVcbiAgICAgKi9cbiAgICB1cGRhdGUobmFtZSwgdmFsdWVzKSB7XG4gICAgICAgIHRoaXMuX3VuaWZvcm1zW25hbWVdLnZhbHVlcyA9IHZhbHVlcztcbiAgICAgICAgdGhpcy5fdW5pZm9ybXNbbmFtZV0uZGlydHkgPSB0cnVlO1xuICAgIH07XG5cblxuICAgIC8qKlxuICAgICAqIHVwZGF0ZSB1bmlmb3JtcyBvbiBHTCBjb250ZXh0IGFuZCBwcm9ncmFtXG4gICAgICogQHBhcmFtIGdsIFdlYkdMIGNvbnRleHRcbiAgICAgKiBAcGFyYW0gcHJvZ3JhbVxuICAgICAqL1xuICAgIHVwZGF0ZVByb2dyYW0oZ2wsIHByb2dyYW0pIHtcbiAgICAgICAgZm9yICh2YXIgYyBpbiB0aGlzLl91bmlmb3Jtcykge1xuICAgICAgICAgICAgaWYgKHRoaXMuX3VuaWZvcm1zW2NdLmRpcnR5KSB7XG4gICAgICAgICAgICAgICAgdmFyIHUgPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24ocHJvZ3JhbSwgdGhpcy5fdW5pZm9ybXNbY10ubmFtZSk7XG4gICAgICAgICAgICAgICAgc3dpdGNoICh0aGlzLl91bmlmb3Jtc1tjXS50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJzFmJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsLnVuaWZvcm0xZih1LCB0aGlzLl91bmlmb3Jtc1tjXS52YWx1ZXNbMF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnMmYnOlxuICAgICAgICAgICAgICAgICAgICAgICAgZ2wudW5pZm9ybTJmKHUsIHRoaXMuX3VuaWZvcm1zW2NdLnZhbHVlc1swXSwgdGhpcy5fdW5pZm9ybXNbY10udmFsdWVzWzFdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJzNmJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsLnVuaWZvcm0zZih1LCB0aGlzLl91bmlmb3Jtc1tjXS52YWx1ZXNbMF0sIHRoaXMuX3VuaWZvcm1zW2NdLnZhbHVlc1sxXSwgdGhpcy5fdW5pZm9ybXNbY10udmFsdWVzWzJdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJzRmJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsLnVuaWZvcm00Zih1LCB0aGlzLl91bmlmb3Jtc1tjXS52YWx1ZXNbMF0sIHRoaXMuX3VuaWZvcm1zW2NdLnZhbHVlc1sxXSwgdGhpcy5fdW5pZm9ybXNbY10udmFsdWVzWzJdLCB0aGlzLl91bmlmb3Jtc1tjXS52YWx1ZXNbM10pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnMWknOlxuICAgICAgICAgICAgICAgICAgICAgICAgZ2wudW5pZm9ybTFpKHUsIHRoaXMuX3VuaWZvcm1zW2NdLnZhbHVlc1swXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgICBjYXNlICcyaSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBnbC51bmlmb3JtMmkodSwgdGhpcy5fdW5pZm9ybXNbY10udmFsdWVzWzBdLCB0aGlzLl91bmlmb3Jtc1tjXS52YWx1ZXNbMV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnM2knOlxuICAgICAgICAgICAgICAgICAgICAgICAgZ2wudW5pZm9ybTNpKHUsIHRoaXMuXy51bmlmb3Jtc1tjXS52YWx1ZXNbMF0sIHRoaXMuX3VuaWZvcm1zW2NdLnZhbHVlc1sxXSwgdGhpcy5fdW5pZm9ybXNbY10udmFsdWVzWzJdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJzRpJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsLnVuaWZvcm1pZih1LCB0aGlzLl91bmlmb3Jtc1tjXS52YWx1ZXNbMF0sIHRoaXMuX3VuaWZvcm1zW2NdLnZhbHVlc1sxXSwgdGhpcy5fdW5pZm9ybXNbY10udmFsdWVzWzJdLCB0aGlzLl91bmlmb3Jtc1tjXS52YWx1ZXNbM10pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufSJdfQ==
