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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmNcXGNhbnZhcy5lczYiLCJzcmNcXGNhbnZhc1xcYmxvYnMuZXM2Iiwic3JjXFxjYW52YXNcXGZpbHRlcmNoYWluLmVzNiIsInNyY1xcY2FudmFzXFxmaWx0ZXJzLmVzNiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7QUNJQSxRQUFRLEtBQVIsR0FBZ0I7QUFDWixZQUFRO0FBQ0osOEJBREk7QUFFSiwwQ0FGSTtBQUdKLGtDQUhJO0tBQVI7Q0FESjs7Ozs7Ozs7a0JDSmU7Ozs7QUFJWCxtQkFBYyxFQUFkOzs7Ozs7OztBQVFBLGtDQUFVLEtBQUssS0FBSztBQUNoQixZQUFJLENBQUMsR0FBRCxFQUFNO0FBQ04sa0JBQU0sRUFBTixDQURNO1NBQVY7O0FBSUEsWUFBSSxDQUFDLElBQUksV0FBSixFQUFpQjtBQUNsQixnQkFBSSxXQUFKLEdBQWtCLEtBQUssYUFBTCxDQURBO1NBQXRCOztBQUlBLFlBQUksUUFBUSxJQUFJLEtBQUosQ0FUSTtBQVVoQixZQUFJLFVBQVUsUUFBUSxDQUFSLENBVkU7QUFXaEIsWUFBSSxNQUFNLElBQUksSUFBSixDQUFTLE1BQVQsQ0FYTTtBQVloQixZQUFJLFNBQVMsSUFBSSxXQUFKLENBQWdCLElBQUksSUFBSixDQUFTLE1BQVQsQ0FBekIsQ0FaWTtBQWFoQixhQUFLLElBQUksSUFBSSxDQUFKLEVBQU8sSUFBSSxJQUFJLElBQUosQ0FBUyxNQUFULEVBQWlCLEdBQXJDLEVBQTBDO0FBQ3RDLG1CQUFPLENBQVAsSUFBWSxJQUFJLElBQUosQ0FBUyxDQUFULENBQVosQ0FEc0M7U0FBMUM7QUFHQSxZQUFJLFFBQVEsRUFBUixDQWhCWTtBQWlCaEIsWUFBSSxZQUFZLENBQUMsQ0FBRDs7O0FBakJBLFlBb0JaLFlBQVksRUFBWixDQXBCWTtBQXFCaEIsYUFBSyxJQUFJLElBQUksQ0FBSixFQUFPLElBQUksR0FBSixFQUFT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QUFJLENBQUosRUFBTyxJQUFJLElBQUksSUFBSixDQUFTLE1BQVQsRUFBaUIsS0FBRyxDQUFILEVBQU07QUFDdkMsZ0JBQUksSUFBSSxJQUFKLENBQVMsQ0FBVCxJQUFjLElBQUksSUFBSixDQUFTLElBQUUsQ0FBRixDQUF2QixHQUE4QixJQUFJLElBQUosQ0FBUyxJQUFFLENBQUYsQ0FBdkMsR0FBOEMsU0FBOUMsRUFBMEQ7QUFDMUQsb0JBQUksSUFBSixDQUFTLENBQVQsSUFBYyxDQUFkLENBRDBEO0FBRTFELG9CQUFJLElBQUosQ0FBUyxJQUFFLENBQUYsQ0FBVCxHQUFnQixDQUFoQixDQUYwRDtBQUcxRCxvQkFBSSxJQUFKLENBQVMsSUFBRSxDQUFGLENBQVQsR0FBZ0IsQ0FBaEIsQ0FIMEQ7YUFBOUQsTUFJTztBQUNILG9CQUFJLElBQUosQ0FBUyxDQUFULElBQWMsR0FBZCxDQURHO0FBRUgsb0JBQUksSUFBSixDQUFTLElBQUUsQ0FBRixDQUFULEdBQWdCLEdBQWhCLENBRkc7QUFHSCxvQkFBSSxJQUFKLENBQVMsSUFBRSxDQUFGLENBQVQsR0FBZ0IsR0FBaEIsQ0FIRzthQUpQO1NBREo7O0FBWUEsZUFBTyxHQUFQLENBZjBDO0tBaEVuQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJpbXBvcnQgQmxvYnMgZnJvbSAnLi9jYW52YXMvYmxvYnMuZXM2JztcclxuaW1wb3J0IEZpbHRlckNoYWluIGZyb20gJy4vY2FudmFzL2ZpbHRlcmNoYWluLmVzNic7XHJcbmltcG9ydCBGaWx0ZXJzIGZyb20gJy4vY2FudmFzL2ZpbHRlcnMuZXM2JztcclxuXHJcbmV4cG9ydHMuaW1hZ2UgPSB7XHJcbiAgICBjYW52YXM6IHtcclxuICAgICAgICBibG9iczogQmxvYnMsXHJcbiAgICAgICAgZmlsdGVyY2hhaW46IEZpbHRlckNoYWluLFxyXG4gICAgICAgIGZpbHRlcnM6IEZpbHRlcnNcclxuICAgIH1cclxufTsiLCJleHBvcnQgZGVmYXVsdCB7XHJcbiAgICAvKipcclxuICAgICAqIG1pbml1bXVtIGJsb2JzaXplIGRlZmF1bHRcclxuICAgICAqL1xyXG4gICAgTUlOX0JMT0JfU0laRTo1MCxcclxuXHJcbiAgICAvKipcclxuICAgICAqIGZpbmQgYmxvYnNcclxuICAgICAqIEJMQUNLIEFORCBXSElURSBJTUFHRSBSRVFVSVJFRFxyXG4gICAgICogQHBhcmFtIHB4c1xyXG4gICAgICogQHJldHVybiB7QXJyYXl9IGJsb2IgY29vcmRpbmF0ZXNcclxuICAgICAqL1xyXG4gICAgZmluZEJsb2JzKHB4cywgY2ZnKSB7XHJcbiAgICAgICAgaWYgKCFjZmcpIHtcclxuICAgICAgICAgICAgY2ZnID0ge307XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIWNmZy5taW5CbG9iU2l6ZSkge1xyXG4gICAgICAgICAgICBjZmcubWluQmxvYlNpemUgPSB0aGlzLk1JTl9CTE9CX1NJWkU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgd2lkdGggPSBweHMud2lkdGg7XHJcbiAgICAgICAgdmFyIHJvd3NpemUgPSB3aWR0aCAqIDQ7XHJcbiAgICAgICAgdmFyIGxlbiA9IHB4cy5kYXRhLmxlbmd0aDtcclxuICAgICAgICB2YXIgcGl4ZWxzID0gbmV3IFVpbnQxNkFycmF5KHB4cy5kYXRhLmxlbmd0aCk7XHJcbiAgICAgICAgZm9yICh2YXIgZCA9IDA7IGQgPCBweHMuZGF0YS5sZW5ndGg7IGQrKykge1xyXG4gICAgICAgICAgICBwaXhlbHNbZF0gPSBweHMuZGF0YVtkXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGJsb2JzID0gW107XHJcbiAgICAgICAgdmFyIGJsb2JJbmRleCA9IC0xO1xyXG5cclxuICAgICAgICAvLyBjb250YWlucyBwaXhlbCBpbmRpY2VzIGZvciBibG9icyB0aGF0IHRvdWNoXHJcbiAgICAgICAgdmFyIGJsb2JUYWJsZSA9IFtdO1xyXG4gICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgbGVuOyBjICs9IDQpIHtcclxuICAgICAgICAgICAgaWYgKHBpeGVsc1tjXSA9PT0gMjU1KSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2YXIgbmVpZ2hib3JzID0gW2MgLSA0LCBjICsgNCwgYyAtIHJvd3NpemUsIGMgKyByb3dzaXplLCBjIC0gNCAtIHJvd3NpemUsIGMgKyA0IC0gcm93c2l6ZSwgYyAtIDQgKyByb3dzaXplLCBjICsgNCArIHJvd3NpemVdO1xyXG4gICAgICAgICAgICB2YXIgbnVtTmVpZ2hib3JzID0gbmVpZ2hib3JzLmxlbmd0aDtcclxuXHJcbiAgICAgICAgICAgIC8vIGp1c3QgY2hlY2sgb25lIGNoYW5uZWwsIGJlY2F1c2Ugd2UgYXNzdW1lIGV2ZXJ5IHB4IGlzIGJsYWNrIG9yIHdoaXRlXHJcbiAgICAgICAgICAgIHZhciBibG9iSW5kZXhGb3VuZCA9IC0xO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBuZWlnaGJvciA9IDA7IG5laWdoYm9yIDwgbnVtTmVpZ2hib3JzOyBuZWlnaGJvcisrKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAobmVpZ2hib3JzW25laWdoYm9yXSA+PSAwICYmIG5laWdoYm9yc1tuZWlnaGJvcl0gPCBsZW4gJiYgcGl4ZWxzW25laWdoYm9yc1tuZWlnaGJvcl1dID09PSBwaXhlbHNbY10pIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBpZiB0b3VjaGluZyBhIG5laWdoYm9yLCByZWNvcmQgaW5kZXggb2YgdGhhdCBibG9iIGluZGV4IG9mIHRoYXQgbmVpZ2hib3JcclxuICAgICAgICAgICAgICAgICAgICAvLyBhbHNvIGlmIHRvdWNoaW5nIGRpZmZlcmVudCBpbmRpY2VzLCByZWNvcmQgdGhhdCB0aGVzZSBpbmRpY2VzIHNob3VsZCBiZSB0aGUgc2FtZSBpbmRleFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIHRoZSBibG9iIHRhYmxlIHJlY29yZHMgd2hpY2ggYmxvYiBpbmRleCBtYXBzIHRvIHdoaWNoIG90aGVyIGJsb2IgaW5kZXhcclxuICAgICAgICAgICAgICAgICAgICBpZiAocGl4ZWxzW25laWdoYm9yc1tuZWlnaGJvcl0gKyAxXSA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGJsb2JJbmRleEZvdW5kICE9PSAtMSAmJiBibG9iSW5kZXhGb3VuZCAhPT0gcGl4ZWxzW25laWdoYm9yc1tuZWlnaGJvcl0gKyAxXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZ3JlZW4gY2hhbm5lbCAoKzEpIHJlY29yZHMgYmxvYiBpbmRleFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvYlRhYmxlLnB1c2goW2Jsb2JJbmRleEZvdW5kLCBwaXhlbHNbbmVpZ2hib3JzW25laWdoYm9yXSArIDFdXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgYmxvYkluZGV4Rm91bmQgPSBwaXhlbHNbbmVpZ2hib3JzW25laWdoYm9yXSArIDFdO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGJsb2JJbmRleEZvdW5kID4gLTEpIHtcclxuICAgICAgICAgICAgICAgIC8vIGJsb2IgaXMgZm91bmQsIG1hcmsgcGl4ZWwgYW5kIHJlY29yZCBpbiBibG9ic1xyXG4gICAgICAgICAgICAgICAgcGl4ZWxzW2MgKyAxXSA9IGJsb2JJbmRleEZvdW5kOyAvLyB1c2UgZ3JlZW4gY2hhbm5lbCBhcyBibG9iIHRyYWNrZXJcclxuICAgICAgICAgICAgICAgIGJsb2JzW2Jsb2JJbmRleEZvdW5kXS5wdXNoKGMpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gYnJhbmQgbmV3IGJsb2JcclxuICAgICAgICAgICAgICAgIGJsb2JJbmRleCsrO1xyXG4gICAgICAgICAgICAgICAgYmxvYnMucHVzaChbY10pO1xyXG4gICAgICAgICAgICAgICAgcGl4ZWxzW2MgKyAxXSA9IGJsb2JJbmRleDsgLy8gdXNlIGdyZWVuIGNoYW5uZWwgYXMgYmxvYiB0cmFja2VyXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIG1lcmdlIGludGVyc2VjdGluZyBwYWlyc1xyXG4gICAgICAgIC8vIG1heWJlIG5vdCB0aGUgbW9zdCBlZmZpY2llbnQgY29kZSwgYnV0IGJsb2IgY291bnQgc2hvdWxkIGJlIGZhaXJseSBsb3cgKGhvcGVmdWxseSlcclxuICAgICAgICAvLyByZXZpc2l0IGlmIHNwZWVkIGdldHMgaW4gdGhlIHdheVxyXG4gICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgYmxvYlRhYmxlLmxlbmd0aDsgYysrKSB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGQgPSAwOyBkIDwgYmxvYlRhYmxlLmxlbmd0aDsgZCsrKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgY29ubmVjdGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBlID0gMDsgZSA8IGJsb2JUYWJsZVtkXS5sZW5ndGg7IGUrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChibG9iVGFibGVbY10uaW5kZXhPZihibG9iVGFibGVbZF1bZV0pICE9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChjb25uZWN0ZWQgJiYgZCAhPT0gYykge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGYgPSAwOyBmIDwgYmxvYlRhYmxlW2RdLmxlbmd0aDsgZisrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9ubHkgYWRkIHVuaXF1ZXNcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGJsb2JUYWJsZVtjXS5pbmRleE9mKGJsb2JUYWJsZVtkXVtmXSkgPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBibG9iVGFibGVbY10ucHVzaChibG9iVGFibGVbZF1bZl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJsb2JUYWJsZVtkXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyB3ZWVkIG91dCBlbXB0aWVzXHJcbiAgICAgICAgYmxvYlRhYmxlID0gYmxvYlRhYmxlLmZpbHRlcihmdW5jdGlvbiAocGFpcikge1xyXG4gICAgICAgICAgICBpZiAocGFpci5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBlYWNoIGJsb2IgaXMgYSBsaXN0IG9mIGltYWdlIGluZGljZXNcclxuICAgICAgICAvLyB1c2UgYmxvYnMgaW5kZXggdG8gbWF0Y2ggdG8gYmxvYiB0YWJsZSBpbmRleCBhbmQgY29uY2F0IHRoZSBibG9icyBhdCB0aGF0IGluZGV4XHJcbiAgICAgICAgZm9yICh2YXIgYyA9IDA7IGMgPCBibG9icy5sZW5ndGg7IGMrKykge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBkID0gMDsgZCA8IGJsb2JUYWJsZS5sZW5ndGg7IGQrKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKGJsb2JUYWJsZVtkXS5pbmRleE9mKGMpICE9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGUgPSAwOyBlIDwgYmxvYlRhYmxlW2RdLmxlbmd0aDsgZSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChibG9iVGFibGVbZF1bZV0gIT09IGMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb2JzW2NdID0gYmxvYnNbY10uY29uY2F0KGJsb2JzW2Jsb2JUYWJsZVtkXVtlXV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvYnNbYmxvYlRhYmxlW2RdW2VdXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyByZWZpbmUgYmxvYnMgbm93IHRoYXQgdGhlIHJpZ2h0IHRoaW5ncyBhcmUgY29uY2F0ZWQgYW5kIHdlIGRvbid0IG5lZWQgdG8gdHJhY2tcclxuICAgICAgICAvLyBtZWFuaW5nIHdlIGNhbiBzdGFydCBzcGxpY2luZyB0aGluZ3Mgd2l0aG91dCB3b3JyeWluZyBhYm91dCB0aGUgaW5kZXhcclxuICAgICAgICBibG9icyA9IGJsb2JzLmZpbHRlcihmdW5jdGlvbiAoYmxiKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBibGIubGVuZ3RoID49IGNmZy5taW5CbG9iU2l6ZTtcclxuICAgICAgICB9LCB0aGlzKTtcclxuXHJcblxyXG4gICAgICAgIC8vIGdldCBibG9iIGRpbWVuc2lvbnMgcG9zaXRpb25zXHJcbiAgICAgICAgdmFyIGJsb2JDb29yZHMgPSBbXTtcclxuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IGJsb2JzLmxlbmd0aDsgYysrKSB7XHJcbiAgICAgICAgICAgIHZhciBtaW5YID0gLTEsIG1heFggPSAtMSwgbWluWSA9IC0xLCBtYXhZID0gLTE7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGQgPSAwOyBkIDwgYmxvYnNbY10ubGVuZ3RoOyBkKyspIHtcclxuICAgICAgICAgICAgICAgIHZhciBweCA9IE1hdGguZmxvb3IoYmxvYnNbY11bZF0gLyA0KTtcclxuICAgICAgICAgICAgICAgIHZhciB4ID0gcHggJSB3aWR0aDtcclxuICAgICAgICAgICAgICAgIHZhciB5ID0gcGFyc2VJbnQocHggLyB3aWR0aCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHggPCBtaW5YIHx8IG1pblggPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWluWCA9IHg7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoeCA+IG1heFggfHwgbWF4WCA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICBtYXhYID0geDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICh5IDwgbWluWSB8fCBtaW5ZID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1pblkgPSB5O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKHkgPiBtYXhZIHx8IG1heFkgPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWF4WSA9IHk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYmxvYkNvb3Jkcy5wdXNoKHt4OiBtaW5YLCB5OiBtaW5ZLCB3aWR0aDogbWF4WCAtIG1pblgsIGhlaWdodDogbWF4WSAtIG1pbll9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHBhaW50IHRoZSBibG9ic1xyXG4gICAgICAgIGlmIChjZmcucGFpbnQpIHtcclxuICAgICAgICAgICAgZm9yICh2YXIgZCA9IDA7IGQgPCBibG9icy5sZW5ndGg7IGQrKykge1xyXG4gICAgICAgICAgICAgICAgdmFyIGNsciA9IFtNYXRoLnJhbmRvbSgpICogMjU1LCBNYXRoLnJhbmRvbSgpICogMjU1LCBNYXRoLnJhbmRvbSgpICogMjU1XTtcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGUgPSAwOyBlIDwgYmxvYnNbZF0ubGVuZ3RoOyBlKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBweHMuZGF0YVtibG9ic1tkXVtlXV0gPSBjbHJbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgcHhzLmRhdGFbYmxvYnNbZF1bZV0gKyAxXSA9IGNsclsxXTtcclxuICAgICAgICAgICAgICAgICAgICBweHMuZGF0YVtibG9ic1tkXVtlXSArIDJdID0gY2xyWzJdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB7aW1hZ2U6IHB4cywgYmxvYnM6IGJsb2JDb29yZHN9O1xyXG4gICAgfVxyXG59IiwiaW1wb3J0IEZpbHRlcnMgZnJvbSAnLi9maWx0ZXJzLmVzNic7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyB7XHJcbiAgICAvKipcclxuICAgICAqIGMtdG9yXHJcbiAgICAgKi9cclxuICAgIGNvbnN0cnVjdG9yKHB4cykge1xyXG4gICAgICAgIHRoaXMucmVzdWx0ID0gcHhzO1xyXG4gICAgfTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIGNvbnZlcnQgaW1hZ2UgdG8gZ3JheXNjYWxlXHJcbiAgICAgKiBAcGFyYW0ge0ltYWdlRGF0YX0gcHhzXHJcbiAgICAgKiBAcmV0dXJucyB7Kn1cclxuICAgICAqL1xyXG4gICAgdG9HcmF5c2NhbGUoKSB7XHJcbiAgICAgICAgdGhpcy5yZXN1bHQgPSBGaWx0ZXJzLnRvR3JheXNjYWxlKHRoaXMucmVzdWx0KTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH07XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBzYXR1cmF0ZSBpbWFnZVxyXG4gICAgICogQHBhcmFtIHtJbWFnZURhdGF9IHB4c1xyXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHBlcmNlbnRhbW91bnQgcGVyY2VudGFnZSBzYXR1cmF0aW9uXHJcbiAgICAgKiBAcmV0dXJucyB7Kn1cclxuICAgICAqL1xyXG4gICAgc2F0dXJhdGUocGVyY2VudGFtb3VudCkge1xyXG4gICAgICAgIHRoaXMucmVzdWx0ID0gRmlsdGVycy5zYXR1cmF0ZSh0aGlzLnJlc3VsdCwgcGVyY2VudGFtb3VudCk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogY29udmVydCB0byBwdXJlIGJsYWNrIG9yIHB1cmUgd2hpdGVcclxuICAgICAqIEBwYXJhbSBweHNcclxuICAgICAqIEBwYXJhbSBweHNcclxuICAgICAqIEByZXR1cm5zIHsqfVxyXG4gICAgICovXHJcbiAgICB0b0JsYWNrQW5kV2hpdGUodGhyZXNob2xkdG9ibGFja3BlcmNlbnQpIHtcclxuICAgICAgICB0aGlzLnJlc3VsdCA9IEZpbHRlcnMudG9CbGFja0FuZFdoaXRlKHRoaXMucmVzdWx0LCB0aHJlc2hvbGR0b2JsYWNrcGVyY2VudCk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogY29udmVydCAyIGltYWdlcyB0byBhbiBpbWFnZSBoaWdobGlnaHRpbmcgZGlmZmVyZW5jZXNcclxuICAgICAqIEBwYXJhbSBweHMxXHJcbiAgICAgKiBAcGFyYW0gcHhzMlxyXG4gICAgICogQHBhcmFtIHRvbGVyYW5jZVxyXG4gICAgICogQHJldHVybnMgeyp9XHJcbiAgICAgKi9cclxuICAgIHRvRGlmZihjb21wYXJlLCB0b2xlcmFuY2UpIHtcclxuICAgICAgICB0aGlzLnJlc3VsdCA9IEZpbHRlcnMudG9EaWZmKHRoaXMucmVzdWx0LCBjb21wYXJlLCB0b2xlcmFuY2UpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG59IiwiZXhwb3J0IGRlZmF1bHQge1xyXG4gICAgLyoqXHJcbiAgICAgKiBjb252ZXJ0IGltYWdlIHRvIGdyYXlzY2FsZVxyXG4gICAgICogQHBhcmFtIHtJbWFnZURhdGF9IHB4c1xyXG4gICAgICogQHJldHVybnMgeyp9XHJcbiAgICAgKi9cclxuICAgIHRvR3JheXNjYWxlKHB4cykge1xyXG4gICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgcHhzLmRhdGEubGVuZ3RoOyBjKz00KSB7XHJcbiAgICAgICAgICAgIHZhciBncmF5ID0gKHB4cy5kYXRhW2NdICsgcHhzLmRhdGFbYysxXSArIHB4cy5kYXRhW2MrMl0pLzM7XHJcbiAgICAgICAgICAgIHB4cy5kYXRhW2NdID0gcHhzLmRhdGFbYysxXSA9IHB4cy5kYXRhW2MrMl0gPSBncmF5O1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcHhzO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIHNhdHVyYXRlIGltYWdlXHJcbiAgICAgKiBAcGFyYW0ge0ltYWdlRGF0YX0gcHhzXHJcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gcGVyY2VudGFtb3VudCBwZXJjZW50YWdlIHNhdHVyYXRpb25cclxuICAgICAqIEByZXR1cm5zIHsqfVxyXG4gICAgICovXHJcbiAgICBzYXR1cmF0ZShweHMsIHBlcmNlbnRhbW91bnQpIHtcclxuICAgICAgICBpZiAoIXBlcmNlbnRhbW91bnQpIHsgcGVyY2VudGFtb3VudCA9IDUwOyB9XHJcbiAgICAgICAgdmFyIGFtdCA9IHBlcmNlbnRhbW91bnQvMTAwICogMjU1O1xyXG4gICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgcHhzLmRhdGEubGVuZ3RoOyBjKz00KSB7XHJcbiAgICAgICAgICAgIHB4cy5kYXRhW2NdID0gcHhzLmRhdGFbY10gKyBhbXQ7XHJcbiAgICAgICAgICAgIHB4cy5kYXRhW2MrMV0gPSBweHMuZGF0YVtjKzFdICsgYW10O1xyXG4gICAgICAgICAgICBweHMuZGF0YVtjKzJdID0gcHhzLmRhdGFbYysyXSArIGFtdDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHB4cztcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBjb252ZXJ0IDIgaW1hZ2VzIHRvIGFuIGltYWdlIGhpZ2hsaWdodGluZyBkaWZmZXJlbmNlc1xyXG4gICAgICogQHBhcmFtIHB4czFcclxuICAgICAqIEBwYXJhbSBweHMyXHJcbiAgICAgKiBAcGFyYW0gdG9sZXJhbmNlXHJcbiAgICAgKiBAcmV0dXJucyB7Kn1cclxuICAgICAqL1xyXG4gICAgdG9EaWZmKHB4czEsIHB4czIsIHRvbGVyYW5jZSkge1xyXG4gICAgICAgIGlmIChweHMxLmRhdGEubGVuZ3RoICE9PSBweHMyLmRhdGEubGVuZ3RoKSB7IHRocm93IG5ldyBFcnJvcignaW1hZ2VzIG5vdCB0aGUgc2FtZSBzaXplJyk7IH1cclxuICAgICAgICB2YXIgZGlmZiA9IG5ldyBJbWFnZURhdGEocHhzMS53aWR0aCwgcHhzMS5oZWlnaHQpO1xyXG4gICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgcHhzMS5kYXRhLmxlbmd0aDsgYys9NCkge1xyXG4gICAgICAgICAgICB2YXIgZHJhdyA9IDI1NTtcclxuICAgICAgICAgICAgZm9yICh2YXIgZCA9IDA7IGQgPCA0OyBkKyspIHtcclxuICAgICAgICAgICAgICAgIGlmIChweHMxLmRhdGFbYytkXSAtIHB4czIuZGF0YVtjK2RdID4gdG9sZXJhbmNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZHJhdyA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGRpZmYuZGF0YVtjXSA9IGRyYXc7XHJcbiAgICAgICAgICAgIGRpZmYuZGF0YVtjKzFdID0gZHJhdztcclxuICAgICAgICAgICAgZGlmZi5kYXRhW2MrMl0gPSBkcmF3O1xyXG4gICAgICAgICAgICBkaWZmLmRhdGFbYyszXT0gMjU1O1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZGlmZjtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBjb252ZXJ0IHRvIHB1cmUgYmxhY2sgb3IgcHVyZSB3aGl0ZVxyXG4gICAgICogQHBhcmFtIHB4c1xyXG4gICAgICogQHBhcmFtIHB4c1xyXG4gICAgICogQHJldHVybnMgeyp9XHJcbiAgICAgKi9cclxuICAgIHRvQmxhY2tBbmRXaGl0ZShweHMsIHRocmVzaG9sZHRvYmxhY2twZXJjZW50KSB7XHJcbiAgICAgICAgaWYgKCF0aHJlc2hvbGR0b2JsYWNrcGVyY2VudCkgeyB0aHJlc2hvbGR0b2JsYWNrcGVyY2VudCA9IDUwOyB9XHJcbiAgICAgICAgdmFyIHRocmVzaG9sZCA9IHRocmVzaG9sZHRvYmxhY2twZXJjZW50LzEwMCAqICgyNTUgKyAyNTUgKyAyNTUpO1xyXG4gICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgcHhzLmRhdGEubGVuZ3RoOyBjKz00KSB7XHJcbiAgICAgICAgICAgIGlmIChweHMuZGF0YVtjXSArIHB4cy5kYXRhW2MrMV0gKyBweHMuZGF0YVtjKzJdIDwgdGhyZXNob2xkICkge1xyXG4gICAgICAgICAgICAgICAgcHhzLmRhdGFbY10gPSAwO1xyXG4gICAgICAgICAgICAgICAgcHhzLmRhdGFbYysxXSA9IDA7XHJcbiAgICAgICAgICAgICAgICBweHMuZGF0YVtjKzJdID0gMDtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHB4cy5kYXRhW2NdID0gMjU1O1xyXG4gICAgICAgICAgICAgICAgcHhzLmRhdGFbYysxXSA9IDI1NTtcclxuICAgICAgICAgICAgICAgIHB4cy5kYXRhW2MrMl0gPSAyNTU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBweHM7XHJcbiAgICB9XHJcbn0iXX0=
