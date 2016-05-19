(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.ccwc = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _blobs = require('./canvas/blobs.es6');

var _blobs2 = _interopRequireDefault(_blobs);

var _filterchain = require('./canvas/filterchain.es6');

var _filterchain2 = _interopRequireDefault(_filterchain);

var _filters = require('./canvas/filters.es6');

var _filters2 = _interopRequireDefault(_filters);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.image = {
    canvas: {
        blobs: _blobs2.default,
        filterchain: _filterchain2.default,
        filters: _filters2.default
    }
};

},{"./canvas/blobs.es6":2,"./canvas/filterchain.es6":3,"./canvas/filters.es6":4}],2:[function(require,module,exports){
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

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY2FudmFzLmVzNiIsInNyYy9jYW52YXMvYmxvYnMuZXM2Iiwic3JjL2NhbnZhcy9maWx0ZXJjaGFpbi5lczYiLCJzcmMvY2FudmFzL2ZpbHRlcnMuZXM2Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNBQTs7OztBQUNBOzs7O0FBQ0E7Ozs7OztBQUVBLFFBQVEsS0FBUixHQUFnQjtBQUNaLFlBQVE7QUFDSiw4QkFESTtBQUVKLDBDQUZJO0FBR0o7QUFISTtBQURJLENBQWhCOzs7Ozs7OztrQkNKZTs7OztBQUlYLG1CQUFjLEVBSkg7Ozs7Ozs7O0FBWVgsYUFaVyxxQkFZRCxHQVpDLEVBWUksR0FaSixFQVlTO0FBQ2hCLFlBQUksQ0FBQyxHQUFMLEVBQVU7QUFDTixrQkFBTSxFQUFOO0FBQ0g7O0FBRUQsWUFBSSxDQUFDLElBQUksV0FBVCxFQUFzQjtBQUNsQixnQkFBSSxXQUFKLEdBQWtCLEtBQUssYUFBdkI7QUFDSDs7QUFFRCxZQUFJLFFBQVEsSUFBSSxLQUFoQjtBQUNBLFlBQUksVUFBVSxRQUFRLENBQXRCO0FBQ0EsWUFBSSxNQUFNLElBQUksSUFBSixDQUFTLE1BQW5CO0FBQ0EsWUFBSSxTQUFTLElBQUksV0FBSixDQUFnQixJQUFJLElBQUosQ0FBUyxNQUF6QixDQUFiO0FBQ0EsYUFBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLElBQUksSUFBSixDQUFTLE1BQTdCLEVBQXFDLEdBQXJDLEVBQTBDO0FBQ3RDLG1CQUFPLENBQVAsSUFBWSxJQUFJLElBQUosQ0FBUyxDQUFULENBQVo7QUFDSDtBQUNELFlBQUksUUFBUSxFQUFaO0FBQ0EsWUFBSSxZQUFZLENBQUMsQ0FBakI7OztBQUdBLFlBQUksWUFBWSxFQUFoQjtBQUNBLGFBQUssSUFBSSxJQUFJLENBQWIsRUFBZ0IsSUFBSSxHQUFwQixFQUF5QixLQUFL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Z0IsQ0FBaEI7QUFDSCxhQUpELE1BSU87QUFDSCxvQkFBSSxJQUFKLENBQVMsQ0FBVCxJQUFjLEdBQWQ7QUFDQSxvQkFBSSxJQUFKLENBQVMsSUFBRSxDQUFYLElBQWdCLEdBQWhCO0FBQ0Esb0JBQUksSUFBSixDQUFTLElBQUUsQ0FBWCxJQUFnQixHQUFoQjtBQUNIO0FBQ0o7O0FBRUQsZUFBTyxHQUFQO0FBQ0g7QUFoRlUsQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJpbXBvcnQgQmxvYnMgZnJvbSAnLi9jYW52YXMvYmxvYnMuZXM2JztcbmltcG9ydCBGaWx0ZXJDaGFpbiBmcm9tICcuL2NhbnZhcy9maWx0ZXJjaGFpbi5lczYnO1xuaW1wb3J0IEZpbHRlcnMgZnJvbSAnLi9jYW52YXMvZmlsdGVycy5lczYnO1xuXG5leHBvcnRzLmltYWdlID0ge1xuICAgIGNhbnZhczoge1xuICAgICAgICBibG9iczogQmxvYnMsXG4gICAgICAgIGZpbHRlcmNoYWluOiBGaWx0ZXJDaGFpbixcbiAgICAgICAgZmlsdGVyczogRmlsdGVyc1xuICAgIH1cbn07IiwiZXhwb3J0IGRlZmF1bHQge1xuICAgIC8qKlxuICAgICAqIG1pbml1bXVtIGJsb2JzaXplIGRlZmF1bHRcbiAgICAgKi9cbiAgICBNSU5fQkxPQl9TSVpFOjUwLFxuXG4gICAgLyoqXG4gICAgICogZmluZCBibG9ic1xuICAgICAqIEJMQUNLIEFORCBXSElURSBJTUFHRSBSRVFVSVJFRFxuICAgICAqIEBwYXJhbSBweHNcbiAgICAgKiBAcmV0dXJuIHtBcnJheX0gYmxvYiBjb29yZGluYXRlc1xuICAgICAqL1xuICAgIGZpbmRCbG9icyhweHMsIGNmZykge1xuICAgICAgICBpZiAoIWNmZykge1xuICAgICAgICAgICAgY2ZnID0ge307XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWNmZy5taW5CbG9iU2l6ZSkge1xuICAgICAgICAgICAgY2ZnLm1pbkJsb2JTaXplID0gdGhpcy5NSU5fQkxPQl9TSVpFO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHdpZHRoID0gcHhzLndpZHRoO1xuICAgICAgICB2YXIgcm93c2l6ZSA9IHdpZHRoICogNDtcbiAgICAgICAgdmFyIGxlbiA9IHB4cy5kYXRhLmxlbmd0aDtcbiAgICAgICAgdmFyIHBpeGVscyA9IG5ldyBVaW50MTZBcnJheShweHMuZGF0YS5sZW5ndGgpO1xuICAgICAgICBmb3IgKHZhciBkID0gMDsgZCA8IHB4cy5kYXRhLmxlbmd0aDsgZCsrKSB7XG4gICAgICAgICAgICBwaXhlbHNbZF0gPSBweHMuZGF0YVtkXTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgYmxvYnMgPSBbXTtcbiAgICAgICAgdmFyIGJsb2JJbmRleCA9IC0xO1xuXG4gICAgICAgIC8vIGNvbnRhaW5zIHBpeGVsIGluZGljZXMgZm9yIGJsb2JzIHRoYXQgdG91Y2hcbiAgICAgICAgdmFyIGJsb2JUYWJsZSA9IFtdO1xuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IGxlbjsgYyArPSA0KSB7XG4gICAgICAgICAgICBpZiAocGl4ZWxzW2NdID09PSAyNTUpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBuZWlnaGJvcnMgPSBbYyAtIDQsIGMgKyA0LCBjIC0gcm93c2l6ZSwgYyArIHJvd3NpemUsIGMgLSA0IC0gcm93c2l6ZSwgYyArIDQgLSByb3dzaXplLCBjIC0gNCArIHJvd3NpemUsIGMgKyA0ICsgcm93c2l6ZV07XG4gICAgICAgICAgICB2YXIgbnVtTmVpZ2hib3JzID0gbmVpZ2hib3JzLmxlbmd0aDtcblxuICAgICAgICAgICAgLy8ganVzdCBjaGVjayBvbmUgY2hhbm5lbCwgYmVjYXVzZSB3ZSBhc3N1bWUgZXZlcnkgcHggaXMgYmxhY2sgb3Igd2hpdGVcbiAgICAgICAgICAgIHZhciBibG9iSW5kZXhGb3VuZCA9IC0xO1xuICAgICAgICAgICAgZm9yICh2YXIgbmVpZ2hib3IgPSAwOyBuZWlnaGJvciA8IG51bU5laWdoYm9yczsgbmVpZ2hib3IrKykge1xuICAgICAgICAgICAgICAgIGlmIChuZWlnaGJvcnNbbmVpZ2hib3JdID49IDAgJiYgbmVpZ2hib3JzW25laWdoYm9yXSA8IGxlbiAmJiBwaXhlbHNbbmVpZ2hib3JzW25laWdoYm9yXV0gPT09IHBpeGVsc1tjXSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBpZiB0b3VjaGluZyBhIG5laWdoYm9yLCByZWNvcmQgaW5kZXggb2YgdGhhdCBibG9iIGluZGV4IG9mIHRoYXQgbmVpZ2hib3JcbiAgICAgICAgICAgICAgICAgICAgLy8gYWxzbyBpZiB0b3VjaGluZyBkaWZmZXJlbnQgaW5kaWNlcywgcmVjb3JkIHRoYXQgdGhlc2UgaW5kaWNlcyBzaG91bGQgYmUgdGhlIHNhbWUgaW5kZXhcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhlIGJsb2IgdGFibGUgcmVjb3JkcyB3aGljaCBibG9iIGluZGV4IG1hcHMgdG8gd2hpY2ggb3RoZXIgYmxvYiBpbmRleFxuICAgICAgICAgICAgICAgICAgICBpZiAocGl4ZWxzW25laWdoYm9yc1tuZWlnaGJvcl0gKyAxXSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChibG9iSW5kZXhGb3VuZCAhPT0gLTEgJiYgYmxvYkluZGV4Rm91bmQgIT09IHBpeGVsc1tuZWlnaGJvcnNbbmVpZ2hib3JdICsgMV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBncmVlbiBjaGFubmVsICgrMSkgcmVjb3JkcyBibG9iIGluZGV4XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvYlRhYmxlLnB1c2goW2Jsb2JJbmRleEZvdW5kLCBwaXhlbHNbbmVpZ2hib3JzW25laWdoYm9yXSArIDFdXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBibG9iSW5kZXhGb3VuZCA9IHBpeGVsc1tuZWlnaGJvcnNbbmVpZ2hib3JdICsgMV07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChibG9iSW5kZXhGb3VuZCA+IC0xKSB7XG4gICAgICAgICAgICAgICAgLy8gYmxvYiBpcyBmb3VuZCwgbWFyayBwaXhlbCBhbmQgcmVjb3JkIGluIGJsb2JzXG4gICAgICAgICAgICAgICAgcGl4ZWxzW2MgKyAxXSA9IGJsb2JJbmRleEZvdW5kOyAvLyB1c2UgZ3JlZW4gY2hhbm5lbCBhcyBibG9iIHRyYWNrZXJcbiAgICAgICAgICAgICAgICBibG9ic1tibG9iSW5kZXhGb3VuZF0ucHVzaChjKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gYnJhbmQgbmV3IGJsb2JcbiAgICAgICAgICAgICAgICBibG9iSW5kZXgrKztcbiAgICAgICAgICAgICAgICBibG9icy5wdXNoKFtjXSk7XG4gICAgICAgICAgICAgICAgcGl4ZWxzW2MgKyAxXSA9IGJsb2JJbmRleDsgLy8gdXNlIGdyZWVuIGNoYW5uZWwgYXMgYmxvYiB0cmFja2VyXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBtZXJnZSBpbnRlcnNlY3RpbmcgcGFpcnNcbiAgICAgICAgLy8gbWF5YmUgbm90IHRoZSBtb3N0IGVmZmljaWVudCBjb2RlLCBidXQgYmxvYiBjb3VudCBzaG91bGQgYmUgZmFpcmx5IGxvdyAoaG9wZWZ1bGx5KVxuICAgICAgICAvLyByZXZpc2l0IGlmIHNwZWVkIGdldHMgaW4gdGhlIHdheVxuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IGJsb2JUYWJsZS5sZW5ndGg7IGMrKykge1xuICAgICAgICAgICAgZm9yICh2YXIgZCA9IDA7IGQgPCBibG9iVGFibGUubGVuZ3RoOyBkKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgY29ubmVjdGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgZSA9IDA7IGUgPCBibG9iVGFibGVbZF0ubGVuZ3RoOyBlKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJsb2JUYWJsZVtjXS5pbmRleE9mKGJsb2JUYWJsZVtkXVtlXSkgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjb25uZWN0ZWQgJiYgZCAhPT0gYykge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBmID0gMDsgZiA8IGJsb2JUYWJsZVtkXS5sZW5ndGg7IGYrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gb25seSBhZGQgdW5pcXVlc1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGJsb2JUYWJsZVtjXS5pbmRleE9mKGJsb2JUYWJsZVtkXVtmXSkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvYlRhYmxlW2NdLnB1c2goYmxvYlRhYmxlW2RdW2ZdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBibG9iVGFibGVbZF0gPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyB3ZWVkIG91dCBlbXB0aWVzXG4gICAgICAgIGJsb2JUYWJsZSA9IGJsb2JUYWJsZS5maWx0ZXIoZnVuY3Rpb24gKHBhaXIpIHtcbiAgICAgICAgICAgIGlmIChwYWlyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gZWFjaCBibG9iIGlzIGEgbGlzdCBvZiBpbWFnZSBpbmRpY2VzXG4gICAgICAgIC8vIHVzZSBibG9icyBpbmRleCB0byBtYXRjaCB0byBibG9iIHRhYmxlIGluZGV4IGFuZCBjb25jYXQgdGhlIGJsb2JzIGF0IHRoYXQgaW5kZXhcbiAgICAgICAgZm9yICh2YXIgYyA9IDA7IGMgPCBibG9icy5sZW5ndGg7IGMrKykge1xuICAgICAgICAgICAgZm9yICh2YXIgZCA9IDA7IGQgPCBibG9iVGFibGUubGVuZ3RoOyBkKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoYmxvYlRhYmxlW2RdLmluZGV4T2YoYykgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGUgPSAwOyBlIDwgYmxvYlRhYmxlW2RdLmxlbmd0aDsgZSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYmxvYlRhYmxlW2RdW2VdICE9PSBjKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvYnNbY10gPSBibG9ic1tjXS5jb25jYXQoYmxvYnNbYmxvYlRhYmxlW2RdW2VdXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvYnNbYmxvYlRhYmxlW2RdW2VdXSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gcmVmaW5lIGJsb2JzIG5vdyB0aGF0IHRoZSByaWdodCB0aGluZ3MgYXJlIGNvbmNhdGVkIGFuZCB3ZSBkb24ndCBuZWVkIHRvIHRyYWNrXG4gICAgICAgIC8vIG1lYW5pbmcgd2UgY2FuIHN0YXJ0IHNwbGljaW5nIHRoaW5ncyB3aXRob3V0IHdvcnJ5aW5nIGFib3V0IHRoZSBpbmRleFxuICAgICAgICBibG9icyA9IGJsb2JzLmZpbHRlcihmdW5jdGlvbiAoYmxiKSB7XG4gICAgICAgICAgICByZXR1cm4gYmxiLmxlbmd0aCA+PSBjZmcubWluQmxvYlNpemU7XG4gICAgICAgIH0sIHRoaXMpO1xuXG5cbiAgICAgICAgLy8gZ2V0IGJsb2IgZGltZW5zaW9ucyBwb3NpdGlvbnNcbiAgICAgICAgdmFyIGJsb2JDb29yZHMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgYyA9IDA7IGMgPCBibG9icy5sZW5ndGg7IGMrKykge1xuICAgICAgICAgICAgdmFyIG1pblggPSAtMSwgbWF4WCA9IC0xLCBtaW5ZID0gLTEsIG1heFkgPSAtMTtcbiAgICAgICAgICAgIGZvciAodmFyIGQgPSAwOyBkIDwgYmxvYnNbY10ubGVuZ3RoOyBkKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgcHggPSBNYXRoLmZsb29yKGJsb2JzW2NdW2RdIC8gNCk7XG4gICAgICAgICAgICAgICAgdmFyIHggPSBweCAlIHdpZHRoO1xuICAgICAgICAgICAgICAgIHZhciB5ID0gcGFyc2VJbnQocHggLyB3aWR0aCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoeCA8IG1pblggfHwgbWluWCA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgbWluWCA9IHg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh4ID4gbWF4WCB8fCBtYXhYID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICBtYXhYID0geDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHkgPCBtaW5ZIHx8IG1pblkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIG1pblkgPSB5O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoeSA+IG1heFkgfHwgbWF4WSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgbWF4WSA9IHk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYmxvYkNvb3Jkcy5wdXNoKHt4OiBtaW5YLCB5OiBtaW5ZLCB3aWR0aDogbWF4WCAtIG1pblgsIGhlaWdodDogbWF4WSAtIG1pbll9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHBhaW50IHRoZSBibG9ic1xuICAgICAgICBpZiAoY2ZnLnBhaW50KSB7XG4gICAgICAgICAgICBmb3IgKHZhciBkID0gMDsgZCA8IGJsb2JzLmxlbmd0aDsgZCsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNsciA9IFtNYXRoLnJhbmRvbSgpICogMjU1LCBNYXRoLnJhbmRvbSgpICogMjU1LCBNYXRoLnJhbmRvbSgpICogMjU1XTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBlID0gMDsgZSA8IGJsb2JzW2RdLmxlbmd0aDsgZSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHB4cy5kYXRhW2Jsb2JzW2RdW2VdXSA9IGNsclswXTtcbiAgICAgICAgICAgICAgICAgICAgcHhzLmRhdGFbYmxvYnNbZF1bZV0gKyAxXSA9IGNsclsxXTtcbiAgICAgICAgICAgICAgICAgICAgcHhzLmRhdGFbYmxvYnNbZF1bZV0gKyAyXSA9IGNsclsyXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtpbWFnZTogcHhzLCBibG9iczogYmxvYkNvb3Jkc307XG4gICAgfVxufSIsImltcG9ydCBGaWx0ZXJzIGZyb20gJy4vZmlsdGVycy5lczYnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyB7XG4gICAgLyoqXG4gICAgICogYy10b3JcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihweHMpIHtcbiAgICAgICAgdGhpcy5yZXN1bHQgPSBweHM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIGNvbnZlcnQgaW1hZ2UgdG8gZ3JheXNjYWxlXG4gICAgICogQHBhcmFtIHtJbWFnZURhdGF9IHB4c1xuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIHRvR3JheXNjYWxlKCkge1xuICAgICAgICB0aGlzLnJlc3VsdCA9IEZpbHRlcnMudG9HcmF5c2NhbGUodGhpcy5yZXN1bHQpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogc2F0dXJhdGUgaW1hZ2VcbiAgICAgKiBAcGFyYW0ge0ltYWdlRGF0YX0gcHhzXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHBlcmNlbnRhbW91bnQgcGVyY2VudGFnZSBzYXR1cmF0aW9uXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgc2F0dXJhdGUocGVyY2VudGFtb3VudCkge1xuICAgICAgICB0aGlzLnJlc3VsdCA9IEZpbHRlcnMuc2F0dXJhdGUodGhpcy5yZXN1bHQsIHBlcmNlbnRhbW91bnQpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogY29udmVydCB0byBwdXJlIGJsYWNrIG9yIHB1cmUgd2hpdGVcbiAgICAgKiBAcGFyYW0gcHhzXG4gICAgICogQHBhcmFtIHB4c1xuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIHRvQmxhY2tBbmRXaGl0ZSh0aHJlc2hvbGR0b2JsYWNrcGVyY2VudCkge1xuICAgICAgICB0aGlzLnJlc3VsdCA9IEZpbHRlcnMudG9CbGFja0FuZFdoaXRlKHRoaXMucmVzdWx0LCB0aHJlc2hvbGR0b2JsYWNrcGVyY2VudCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBjb252ZXJ0IDIgaW1hZ2VzIHRvIGFuIGltYWdlIGhpZ2hsaWdodGluZyBkaWZmZXJlbmNlc1xuICAgICAqIEBwYXJhbSBweHMxXG4gICAgICogQHBhcmFtIHB4czJcbiAgICAgKiBAcGFyYW0gdG9sZXJhbmNlXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgdG9EaWZmKGNvbXBhcmUsIHRvbGVyYW5jZSkge1xuICAgICAgICB0aGlzLnJlc3VsdCA9IEZpbHRlcnMudG9EaWZmKHRoaXMucmVzdWx0LCBjb21wYXJlLCB0b2xlcmFuY2UpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59IiwiZXhwb3J0IGRlZmF1bHQge1xuICAgIC8qKlxuICAgICAqIGNvbnZlcnQgaW1hZ2UgdG8gZ3JheXNjYWxlXG4gICAgICogQHBhcmFtIHtJbWFnZURhdGF9IHB4c1xuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIHRvR3JheXNjYWxlKHB4cykge1xuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IHB4cy5kYXRhLmxlbmd0aDsgYys9NCkge1xuICAgICAgICAgICAgdmFyIGdyYXkgPSAocHhzLmRhdGFbY10gKyBweHMuZGF0YVtjKzFdICsgcHhzLmRhdGFbYysyXSkvMztcbiAgICAgICAgICAgIHB4cy5kYXRhW2NdID0gcHhzLmRhdGFbYysxXSA9IHB4cy5kYXRhW2MrMl0gPSBncmF5O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBweHM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIHNhdHVyYXRlIGltYWdlXG4gICAgICogQHBhcmFtIHtJbWFnZURhdGF9IHB4c1xuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBwZXJjZW50YW1vdW50IHBlcmNlbnRhZ2Ugc2F0dXJhdGlvblxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIHNhdHVyYXRlKHB4cywgcGVyY2VudGFtb3VudCkge1xuICAgICAgICBpZiAoIXBlcmNlbnRhbW91bnQpIHsgcGVyY2VudGFtb3VudCA9IDUwOyB9XG4gICAgICAgIHZhciBhbXQgPSBwZXJjZW50YW1vdW50LzEwMCAqIDI1NTtcbiAgICAgICAgZm9yICh2YXIgYyA9IDA7IGMgPCBweHMuZGF0YS5sZW5ndGg7IGMrPTQpIHtcbiAgICAgICAgICAgIHB4cy5kYXRhW2NdID0gcHhzLmRhdGFbY10gKyBhbXQ7XG4gICAgICAgICAgICBweHMuZGF0YVtjKzFdID0gcHhzLmRhdGFbYysxXSArIGFtdDtcbiAgICAgICAgICAgIHB4cy5kYXRhW2MrMl0gPSBweHMuZGF0YVtjKzJdICsgYW10O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBweHM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIGNvbnZlcnQgMiBpbWFnZXMgdG8gYW4gaW1hZ2UgaGlnaGxpZ2h0aW5nIGRpZmZlcmVuY2VzXG4gICAgICogQHBhcmFtIHB4czFcbiAgICAgKiBAcGFyYW0gcHhzMlxuICAgICAqIEBwYXJhbSB0b2xlcmFuY2VcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKi9cbiAgICB0b0RpZmYocHhzMSwgcHhzMiwgdG9sZXJhbmNlKSB7XG4gICAgICAgIGlmIChweHMxLmRhdGEubGVuZ3RoICE9PSBweHMyLmRhdGEubGVuZ3RoKSB7IHRocm93IG5ldyBFcnJvcignaW1hZ2VzIG5vdCB0aGUgc2FtZSBzaXplJyk7IH1cbiAgICAgICAgdmFyIGRpZmYgPSBuZXcgSW1hZ2VEYXRhKHB4czEud2lkdGgsIHB4czEuaGVpZ2h0KTtcbiAgICAgICAgZm9yICh2YXIgYyA9IDA7IGMgPCBweHMxLmRhdGEubGVuZ3RoOyBjKz00KSB7XG4gICAgICAgICAgICB2YXIgZHJhdyA9IDI1NTtcbiAgICAgICAgICAgIGZvciAodmFyIGQgPSAwOyBkIDwgNDsgZCsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKHB4czEuZGF0YVtjK2RdIC0gcHhzMi5kYXRhW2MrZF0gPiB0b2xlcmFuY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgZHJhdyA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZGlmZi5kYXRhW2NdID0gZHJhdztcbiAgICAgICAgICAgIGRpZmYuZGF0YVtjKzFdID0gZHJhdztcbiAgICAgICAgICAgIGRpZmYuZGF0YVtjKzJdID0gZHJhdztcbiAgICAgICAgICAgIGRpZmYuZGF0YVtjKzNdPSAyNTU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRpZmY7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIGNvbnZlcnQgdG8gcHVyZSBibGFjayBvciBwdXJlIHdoaXRlXG4gICAgICogQHBhcmFtIHB4c1xuICAgICAqIEBwYXJhbSBweHNcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKi9cbiAgICB0b0JsYWNrQW5kV2hpdGUocHhzLCB0aHJlc2hvbGR0b2JsYWNrcGVyY2VudCkge1xuICAgICAgICBpZiAoIXRocmVzaG9sZHRvYmxhY2twZXJjZW50KSB7IHRocmVzaG9sZHRvYmxhY2twZXJjZW50ID0gNTA7IH1cbiAgICAgICAgdmFyIHRocmVzaG9sZCA9IHRocmVzaG9sZHRvYmxhY2twZXJjZW50LzEwMCAqICgyNTUgKyAyNTUgKyAyNTUpO1xuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IHB4cy5kYXRhLmxlbmd0aDsgYys9NCkge1xuICAgICAgICAgICAgaWYgKHB4cy5kYXRhW2NdICsgcHhzLmRhdGFbYysxXSArIHB4cy5kYXRhW2MrMl0gPCB0aHJlc2hvbGQgKSB7XG4gICAgICAgICAgICAgICAgcHhzLmRhdGFbY10gPSAwO1xuICAgICAgICAgICAgICAgIHB4cy5kYXRhW2MrMV0gPSAwO1xuICAgICAgICAgICAgICAgIHB4cy5kYXRhW2MrMl0gPSAwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBweHMuZGF0YVtjXSA9IDI1NTtcbiAgICAgICAgICAgICAgICBweHMuZGF0YVtjKzFdID0gMjU1O1xuICAgICAgICAgICAgICAgIHB4cy5kYXRhW2MrMl0gPSAyNTU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcHhzO1xuICAgIH1cbn0iXX0=
