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

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmNcXGNhbnZhcy5lczYiLCJzcmNcXGNhbnZhc1xcYmxvYnMuZXM2Iiwic3JjXFxjYW52YXNcXGZpbHRlcmNoYWluLmVzNiIsInNyY1xcY2FudmFzXFxmaWx0ZXJzLmVzNiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7QUNJQSxRQUFRLEtBQVIsR0FBZ0I7QUFDWixZQUFRO0FBQ0osOEJBREk7QUFFSiwwQ0FGSTtBQUdKLGtDQUhJO0tBQVI7Q0FESjs7Ozs7Ozs7a0JDSmU7Ozs7QUFJWCxtQkFBYyxFQUFkOzs7Ozs7OztBQVFBLGtDQUFVLEtBQUssS0FBSztBQUNoQixZQUFJLENBQUMsR0FBRCxFQUFNO0FBQ04sa0JBQU0sRUFBTixDQURNO1NBQVY7O0FBSUEsWUFBSSxRQUFRLElBQUksS0FBSixDQUxJO0FBTWhCLFlBQUksVUFBVSxRQUFRLENBQVIsQ0FORTtBQU9oQixZQUFJLE1BQU0sSUFBSSxJQUFKLENBQVMsTUFBVCxDQVBNO0FBUWhCLFlBQUksU0FBUyxJQUFJLFdBQUosQ0FBZ0IsSUFBSSxJQUFKLENBQVMsTUFBVCxDQUF6QixDQVJZO0FBU2hCLGFBQUssSUFBSSxJQUFJLENBQUosRUFBTyxJQUFJLElBQUksSUFBSixDQUFTLE1BQVQsRUFBaUIsR0FBckMsRUFBMEM7QUFDdEMsbUJBQU8sQ0FBUCxJQUFZLElBQUksSUFBSixDQUFTLENBQVQsQ0FBWixDQURzQztTQUExQztBQUdBLFlBQUksUUFBUSxFQUFSLENBWlk7QUFhaEIsWUFBSSxZQUFZLENBQUMsQ0FBRDs7O0FBYkEsWUFnQlosWUFBWSxFQUFaLENBaEJZO0FBaUJoQixhQUFLLElBQUksSUFBSSxDQUFKLEVBQU8sSUFBSSxHQUFKLEVBQVMsS0FBSyxDQUFMLEVBQVE7QUFDN0IsZ0JBQUksT0FBTyxDQUFQLE1BQWMsR0FBZCxFQUFtQjtB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QUksSUFBSixDQUFTLENBQVQsSUFBYyxJQUFJLElBQUosQ0FBUyxJQUFFLENBQUYsQ0FBdkIsR0FBOEIsSUFBSSxJQUFKLENBQVMsSUFBRSxDQUFGLENBQXZDLEdBQThDLFNBQTlDLEVBQTBEO0FBQzFELG9CQUFJLElBQUosQ0FBUyxDQUFULElBQWMsQ0FBZCxDQUQwRDtBQUUxRCxvQkFBSSxJQUFKLENBQVMsSUFBRSxDQUFGLENBQVQsR0FBZ0IsQ0FBaEIsQ0FGMEQ7QUFHMUQsb0JBQUksSUFBSixDQUFTLElBQUUsQ0FBRixDQUFULEdBQWdCLENBQWhCLENBSDBEO2FBQTlELE1BSU87QUFDSCxvQkFBSSxJQUFKLENBQVMsQ0FBVCxJQUFjLEdBQWQsQ0FERztBQUVILG9CQUFJLElBQUosQ0FBUyxJQUFFLENBQUYsQ0FBVCxHQUFnQixHQUFoQixDQUZHO0FBR0gsb0JBQUksSUFBSixDQUFTLElBQUUsQ0FBRixDQUFULEdBQWdCLEdBQWhCLENBSEc7YUFKUDtTQURKOztBQVlBLGVBQU8sR0FBUCxDQWYwQztLQWhFbkMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiaW1wb3J0IEJsb2JzIGZyb20gJy4vY2FudmFzL2Jsb2JzLmVzNic7XHJcbmltcG9ydCBGaWx0ZXJDaGFpbiBmcm9tICcuL2NhbnZhcy9maWx0ZXJjaGFpbi5lczYnO1xyXG5pbXBvcnQgRmlsdGVycyBmcm9tICcuL2NhbnZhcy9maWx0ZXJzLmVzNic7XHJcblxyXG5leHBvcnRzLmltYWdlID0ge1xyXG4gICAgY2FudmFzOiB7XHJcbiAgICAgICAgYmxvYnM6IEJsb2JzLFxyXG4gICAgICAgIGZpbHRlcmNoYWluOiBGaWx0ZXJDaGFpbixcclxuICAgICAgICBmaWx0ZXJzOiBGaWx0ZXJzXHJcbiAgICB9XHJcbn07IiwiZXhwb3J0IGRlZmF1bHQge1xyXG4gICAgLyoqXHJcbiAgICAgKiBtaW5pdW11bSBibG9ic2l6ZSBkZWZhdWx0XHJcbiAgICAgKi9cclxuICAgIE1JTl9CTE9CX1NJWkU6NTAsXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBmaW5kIGJsb2JzXHJcbiAgICAgKiBCTEFDSyBBTkQgV0hJVEUgSU1BR0UgUkVRVUlSRURcclxuICAgICAqIEBwYXJhbSBweHNcclxuICAgICAqIEByZXR1cm4ge0FycmF5fSBibG9iIGNvb3JkaW5hdGVzXHJcbiAgICAgKi9cclxuICAgIGZpbmRCbG9icyhweHMsIGNmZykge1xyXG4gICAgICAgIGlmICghY2ZnKSB7XHJcbiAgICAgICAgICAgIGNmZyA9IHt9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIHdpZHRoID0gcHhzLndpZHRoO1xyXG4gICAgICAgIHZhciByb3dzaXplID0gd2lkdGggKiA0O1xyXG4gICAgICAgIHZhciBsZW4gPSBweHMuZGF0YS5sZW5ndGg7XHJcbiAgICAgICAgdmFyIHBpeGVscyA9IG5ldyBVaW50MTZBcnJheShweHMuZGF0YS5sZW5ndGgpO1xyXG4gICAgICAgIGZvciAodmFyIGQgPSAwOyBkIDwgcHhzLmRhdGEubGVuZ3RoOyBkKyspIHtcclxuICAgICAgICAgICAgcGl4ZWxzW2RdID0gcHhzLmRhdGFbZF07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBibG9icyA9IFtdO1xyXG4gICAgICAgIHZhciBibG9iSW5kZXggPSAtMTtcclxuXHJcbiAgICAgICAgLy8gY29udGFpbnMgcGl4ZWwgaW5kaWNlcyBmb3IgYmxvYnMgdGhhdCB0b3VjaFxyXG4gICAgICAgIHZhciBibG9iVGFibGUgPSBbXTtcclxuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IGxlbjsgYyArPSA0KSB7XHJcbiAgICAgICAgICAgIGlmIChwaXhlbHNbY10gPT09IDI1NSkge1xyXG4gICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFyIG5laWdoYm9ycyA9IFtjIC0gNCwgYyArIDQsIGMgLSByb3dzaXplLCBjICsgcm93c2l6ZSwgYyAtIDQgLSByb3dzaXplLCBjICsgNCAtIHJvd3NpemUsIGMgLSA0ICsgcm93c2l6ZSwgYyArIDQgKyByb3dzaXplXTtcclxuICAgICAgICAgICAgdmFyIG51bU5laWdoYm9ycyA9IG5laWdoYm9ycy5sZW5ndGg7XHJcblxyXG4gICAgICAgICAgICAvLyBqdXN0IGNoZWNrIG9uZSBjaGFubmVsLCBiZWNhdXNlIHdlIGFzc3VtZSBldmVyeSBweCBpcyBibGFjayBvciB3aGl0ZVxyXG4gICAgICAgICAgICB2YXIgYmxvYkluZGV4Rm91bmQgPSAtMTtcclxuICAgICAgICAgICAgZm9yICh2YXIgbmVpZ2hib3IgPSAwOyBuZWlnaGJvciA8IG51bU5laWdoYm9yczsgbmVpZ2hib3IrKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKG5laWdoYm9yc1tuZWlnaGJvcl0gPj0gMCAmJiBuZWlnaGJvcnNbbmVpZ2hib3JdIDwgbGVuICYmIHBpeGVsc1tuZWlnaGJvcnNbbmVpZ2hib3JdXSA9PT0gcGl4ZWxzW2NdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgdG91Y2hpbmcgYSBuZWlnaGJvciwgcmVjb3JkIGluZGV4IG9mIHRoYXQgYmxvYiBpbmRleCBvZiB0aGF0IG5laWdoYm9yXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gYWxzbyBpZiB0b3VjaGluZyBkaWZmZXJlbnQgaW5kaWNlcywgcmVjb3JkIHRoYXQgdGhlc2UgaW5kaWNlcyBzaG91bGQgYmUgdGhlIHNhbWUgaW5kZXhcclxuICAgICAgICAgICAgICAgICAgICAvLyB0aGUgYmxvYiB0YWJsZSByZWNvcmRzIHdoaWNoIGJsb2IgaW5kZXggbWFwcyB0byB3aGljaCBvdGhlciBibG9iIGluZGV4XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBpeGVsc1tuZWlnaGJvcnNbbmVpZ2hib3JdICsgMV0gPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChibG9iSW5kZXhGb3VuZCAhPT0gLTEgJiYgYmxvYkluZGV4Rm91bmQgIT09IHBpeGVsc1tuZWlnaGJvcnNbbmVpZ2hib3JdICsgMV0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGdyZWVuIGNoYW5uZWwgKCsxKSByZWNvcmRzIGJsb2IgaW5kZXhcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb2JUYWJsZS5wdXNoKFtibG9iSW5kZXhGb3VuZCwgcGl4ZWxzW25laWdoYm9yc1tuZWlnaGJvcl0gKyAxXV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJsb2JJbmRleEZvdW5kID0gcGl4ZWxzW25laWdoYm9yc1tuZWlnaGJvcl0gKyAxXTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChibG9iSW5kZXhGb3VuZCA+IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBibG9iIGlzIGZvdW5kLCBtYXJrIHBpeGVsIGFuZCByZWNvcmQgaW4gYmxvYnNcclxuICAgICAgICAgICAgICAgIHBpeGVsc1tjICsgMV0gPSBibG9iSW5kZXhGb3VuZDsgLy8gdXNlIGdyZWVuIGNoYW5uZWwgYXMgYmxvYiB0cmFja2VyXHJcbiAgICAgICAgICAgICAgICBibG9ic1tibG9iSW5kZXhGb3VuZF0ucHVzaChjKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIGJyYW5kIG5ldyBibG9iXHJcbiAgICAgICAgICAgICAgICBibG9iSW5kZXgrKztcclxuICAgICAgICAgICAgICAgIGJsb2JzLnB1c2goW2NdKTtcclxuICAgICAgICAgICAgICAgIHBpeGVsc1tjICsgMV0gPSBibG9iSW5kZXg7IC8vIHVzZSBncmVlbiBjaGFubmVsIGFzIGJsb2IgdHJhY2tlclxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBtZXJnZSBpbnRlcnNlY3RpbmcgcGFpcnNcclxuICAgICAgICAvLyBtYXliZSBub3QgdGhlIG1vc3QgZWZmaWNpZW50IGNvZGUsIGJ1dCBibG9iIGNvdW50IHNob3VsZCBiZSBmYWlybHkgbG93IChob3BlZnVsbHkpXHJcbiAgICAgICAgLy8gcmV2aXNpdCBpZiBzcGVlZCBnZXRzIGluIHRoZSB3YXlcclxuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IGJsb2JUYWJsZS5sZW5ndGg7IGMrKykge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBkID0gMDsgZCA8IGJsb2JUYWJsZS5sZW5ndGg7IGQrKykge1xyXG4gICAgICAgICAgICAgICAgdmFyIGNvbm5lY3RlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgZSA9IDA7IGUgPCBibG9iVGFibGVbZF0ubGVuZ3RoOyBlKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYmxvYlRhYmxlW2NdLmluZGV4T2YoYmxvYlRhYmxlW2RdW2VdKSAhPT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29ubmVjdGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoY29ubmVjdGVkICYmIGQgIT09IGMpIHtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBmID0gMDsgZiA8IGJsb2JUYWJsZVtkXS5sZW5ndGg7IGYrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBvbmx5IGFkZCB1bmlxdWVzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChibG9iVGFibGVbY10uaW5kZXhPZihibG9iVGFibGVbZF1bZl0pID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvYlRhYmxlW2NdLnB1c2goYmxvYlRhYmxlW2RdW2ZdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBibG9iVGFibGVbZF0gPSBbXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gd2VlZCBvdXQgZW1wdGllc1xyXG4gICAgICAgIGJsb2JUYWJsZSA9IGJsb2JUYWJsZS5maWx0ZXIoZnVuY3Rpb24gKHBhaXIpIHtcclxuICAgICAgICAgICAgaWYgKHBhaXIubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gZWFjaCBibG9iIGlzIGEgbGlzdCBvZiBpbWFnZSBpbmRpY2VzXHJcbiAgICAgICAgLy8gdXNlIGJsb2JzIGluZGV4IHRvIG1hdGNoIHRvIGJsb2IgdGFibGUgaW5kZXggYW5kIGNvbmNhdCB0aGUgYmxvYnMgYXQgdGhhdCBpbmRleFxyXG4gICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgYmxvYnMubGVuZ3RoOyBjKyspIHtcclxuICAgICAgICAgICAgZm9yICh2YXIgZCA9IDA7IGQgPCBibG9iVGFibGUubGVuZ3RoOyBkKyspIHtcclxuICAgICAgICAgICAgICAgIGlmIChibG9iVGFibGVbZF0uaW5kZXhPZihjKSAhPT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBlID0gMDsgZSA8IGJsb2JUYWJsZVtkXS5sZW5ndGg7IGUrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYmxvYlRhYmxlW2RdW2VdICE9PSBjKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBibG9ic1tjXSA9IGJsb2JzW2NdLmNvbmNhdChibG9ic1tibG9iVGFibGVbZF1bZV1dKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb2JzW2Jsb2JUYWJsZVtkXVtlXV0gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gcmVmaW5lIGJsb2JzIG5vdyB0aGF0IHRoZSByaWdodCB0aGluZ3MgYXJlIGNvbmNhdGVkIGFuZCB3ZSBkb24ndCBuZWVkIHRvIHRyYWNrXHJcbiAgICAgICAgLy8gbWVhbmluZyB3ZSBjYW4gc3RhcnQgc3BsaWNpbmcgdGhpbmdzIHdpdGhvdXQgd29ycnlpbmcgYWJvdXQgdGhlIGluZGV4XHJcbiAgICAgICAgYmxvYnMgPSBibG9icy5maWx0ZXIoZnVuY3Rpb24gKGJsYikge1xyXG4gICAgICAgICAgICByZXR1cm4gYmxiLmxlbmd0aCA+PSB0aGlzLk1JTl9CTE9CX1NJWkU7XHJcbiAgICAgICAgfSwgdGhpcyk7XHJcblxyXG5cclxuICAgICAgICAvLyBnZXQgYmxvYiBkaW1lbnNpb25zIHBvc2l0aW9uc1xyXG4gICAgICAgIHZhciBibG9iQ29vcmRzID0gW107XHJcbiAgICAgICAgZm9yICh2YXIgYyA9IDA7IGMgPCBibG9icy5sZW5ndGg7IGMrKykge1xyXG4gICAgICAgICAgICB2YXIgbWluWCA9IC0xLCBtYXhYID0gLTEsIG1pblkgPSAtMSwgbWF4WSA9IC0xO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBkID0gMDsgZCA8IGJsb2JzW2NdLmxlbmd0aDsgZCsrKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcHggPSBNYXRoLmZsb29yKGJsb2JzW2NdW2RdIC8gNCk7XHJcbiAgICAgICAgICAgICAgICB2YXIgeCA9IHB4ICUgd2lkdGg7XHJcbiAgICAgICAgICAgICAgICB2YXIgeSA9IHBhcnNlSW50KHB4IC8gd2lkdGgpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh4IDwgbWluWCB8fCBtaW5YID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1pblggPSB4O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKHggPiBtYXhYIHx8IG1heFggPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWF4WCA9IHg7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoeSA8IG1pblkgfHwgbWluWSA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICBtaW5ZID0geTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICh5ID4gbWF4WSB8fCBtYXhZID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1heFkgPSB5O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJsb2JDb29yZHMucHVzaCh7eDogbWluWCwgeTogbWluWSwgd2lkdGg6IG1heFggLSBtaW5YLCBoZWlnaHQ6IG1heFkgLSBtaW5ZfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBwYWludCB0aGUgYmxvYnNcclxuICAgICAgICBpZiAoY2ZnLnBhaW50KSB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGQgPSAwOyBkIDwgYmxvYnMubGVuZ3RoOyBkKyspIHtcclxuICAgICAgICAgICAgICAgIHZhciBjbHIgPSBbTWF0aC5yYW5kb20oKSAqIDI1NSwgTWF0aC5yYW5kb20oKSAqIDI1NSwgTWF0aC5yYW5kb20oKSAqIDI1NV07XHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBlID0gMDsgZSA8IGJsb2JzW2RdLmxlbmd0aDsgZSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcHhzLmRhdGFbYmxvYnNbZF1bZV1dID0gY2xyWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgIHB4cy5kYXRhW2Jsb2JzW2RdW2VdICsgMV0gPSBjbHJbMV07XHJcbiAgICAgICAgICAgICAgICAgICAgcHhzLmRhdGFbYmxvYnNbZF1bZV0gKyAyXSA9IGNsclsyXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4ge2ltYWdlOiBweHMsIGJsb2JzOiBibG9iQ29vcmRzfTtcclxuICAgIH1cclxufSIsImltcG9ydCBGaWx0ZXJzIGZyb20gJy4vZmlsdGVycy5lczYnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3Mge1xyXG4gICAgLyoqXHJcbiAgICAgKiBjLXRvclxyXG4gICAgICovXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLnJlc3VsdCA9IHB4cztcclxuICAgIH07XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBjb252ZXJ0IGltYWdlIHRvIGdyYXlzY2FsZVxyXG4gICAgICogQHBhcmFtIHtJbWFnZURhdGF9IHB4c1xyXG4gICAgICogQHJldHVybnMgeyp9XHJcbiAgICAgKi9cclxuICAgIHRvR3JheXNjYWxlKCkge1xyXG4gICAgICAgIHRoaXMucmVzdWx0ID0gRmlsdGVycy50b0dyYXlzY2FsZSh0aGlzLnJlc3VsdCk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogc2F0dXJhdGUgaW1hZ2VcclxuICAgICAqIEBwYXJhbSB7SW1hZ2VEYXRhfSBweHNcclxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBwZXJjZW50YW1vdW50IHBlcmNlbnRhZ2Ugc2F0dXJhdGlvblxyXG4gICAgICogQHJldHVybnMgeyp9XHJcbiAgICAgKi9cclxuICAgIHNhdHVyYXRlKHBlcmNlbnRhbW91bnQpIHtcclxuICAgICAgICB0aGlzLnJlc3VsdCA9IEZpbHRlcnMuc2F0dXJhdGUodGhpcy5yZXN1bHQsIHBlcmNlbnRhbW91bnQpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIGNvbnZlcnQgdG8gcHVyZSBibGFjayBvciBwdXJlIHdoaXRlXHJcbiAgICAgKiBAcGFyYW0gcHhzXHJcbiAgICAgKiBAcGFyYW0gcHhzXHJcbiAgICAgKiBAcmV0dXJucyB7Kn1cclxuICAgICAqL1xyXG4gICAgdG9CbGFja0FuZFdoaXRlKHRocmVzaG9sZHRvYmxhY2twZXJjZW50KSB7XHJcbiAgICAgICAgdGhpcy5yZXN1bHQgPSBGaWx0ZXJzLnRvQmxhY2tBbmRXaGl0ZSh0aGlzLnJlc3VsdCwgdGhyZXNob2xkdG9ibGFja3BlcmNlbnQpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIGNvbnZlcnQgMiBpbWFnZXMgdG8gYW4gaW1hZ2UgaGlnaGxpZ2h0aW5nIGRpZmZlcmVuY2VzXHJcbiAgICAgKiBAcGFyYW0gcHhzMVxyXG4gICAgICogQHBhcmFtIHB4czJcclxuICAgICAqIEBwYXJhbSB0b2xlcmFuY2VcclxuICAgICAqIEByZXR1cm5zIHsqfVxyXG4gICAgICovXHJcbiAgICB0b0RpZmYoY29tcGFyZSwgdG9sZXJhbmNlKSB7XHJcbiAgICAgICAgdGhpcy5yZXN1bHQgPSBGaWx0ZXJzLnRvRGlmZih0aGlzLnJlc3VsdCwgY29tcGFyZSwgdG9sZXJhbmNlKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxufSIsImV4cG9ydCBkZWZhdWx0IHtcclxuICAgIC8qKlxyXG4gICAgICogY29udmVydCBpbWFnZSB0byBncmF5c2NhbGVcclxuICAgICAqIEBwYXJhbSB7SW1hZ2VEYXRhfSBweHNcclxuICAgICAqIEByZXR1cm5zIHsqfVxyXG4gICAgICovXHJcbiAgICB0b0dyYXlzY2FsZShweHMpIHtcclxuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IHB4cy5kYXRhLmxlbmd0aDsgYys9NCkge1xyXG4gICAgICAgICAgICB2YXIgZ3JheSA9IChweHMuZGF0YVtjXSArIHB4cy5kYXRhW2MrMV0gKyBweHMuZGF0YVtjKzJdKS8zO1xyXG4gICAgICAgICAgICBweHMuZGF0YVtjXSA9IHB4cy5kYXRhW2MrMV0gPSBweHMuZGF0YVtjKzJdID0gZ3JheTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHB4cztcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBzYXR1cmF0ZSBpbWFnZVxyXG4gICAgICogQHBhcmFtIHtJbWFnZURhdGF9IHB4c1xyXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHBlcmNlbnRhbW91bnQgcGVyY2VudGFnZSBzYXR1cmF0aW9uXHJcbiAgICAgKiBAcmV0dXJucyB7Kn1cclxuICAgICAqL1xyXG4gICAgc2F0dXJhdGUocHhzLCBwZXJjZW50YW1vdW50KSB7XHJcbiAgICAgICAgaWYgKCFwZXJjZW50YW1vdW50KSB7IHBlcmNlbnRhbW91bnQgPSA1MDsgfVxyXG4gICAgICAgIHZhciBhbXQgPSBwZXJjZW50YW1vdW50LzEwMCAqIDI1NTtcclxuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IHB4cy5kYXRhLmxlbmd0aDsgYys9NCkge1xyXG4gICAgICAgICAgICBweHMuZGF0YVtjXSA9IHB4cy5kYXRhW2NdICsgYW10O1xyXG4gICAgICAgICAgICBweHMuZGF0YVtjKzFdID0gcHhzLmRhdGFbYysxXSArIGFtdDtcclxuICAgICAgICAgICAgcHhzLmRhdGFbYysyXSA9IHB4cy5kYXRhW2MrMl0gKyBhbXQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBweHM7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogY29udmVydCAyIGltYWdlcyB0byBhbiBpbWFnZSBoaWdobGlnaHRpbmcgZGlmZmVyZW5jZXNcclxuICAgICAqIEBwYXJhbSBweHMxXHJcbiAgICAgKiBAcGFyYW0gcHhzMlxyXG4gICAgICogQHBhcmFtIHRvbGVyYW5jZVxyXG4gICAgICogQHJldHVybnMgeyp9XHJcbiAgICAgKi9cclxuICAgIHRvRGlmZihweHMxLCBweHMyLCB0b2xlcmFuY2UpIHtcclxuICAgICAgICBpZiAocHhzMS5kYXRhLmxlbmd0aCAhPT0gcHhzMi5kYXRhLmxlbmd0aCkgeyB0aHJvdyBuZXcgRXJyb3IoJ2ltYWdlcyBub3QgdGhlIHNhbWUgc2l6ZScpOyB9XHJcbiAgICAgICAgdmFyIGRpZmYgPSBuZXcgSW1hZ2VEYXRhKHB4czEud2lkdGgsIHB4czEuaGVpZ2h0KTtcclxuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IHB4czEuZGF0YS5sZW5ndGg7IGMrPTQpIHtcclxuICAgICAgICAgICAgdmFyIGRyYXcgPSAyNTU7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGQgPSAwOyBkIDwgNDsgZCsrKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAocHhzMS5kYXRhW2MrZF0gLSBweHMyLmRhdGFbYytkXSA+IHRvbGVyYW5jZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGRyYXcgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBkaWZmLmRhdGFbY10gPSBkcmF3O1xyXG4gICAgICAgICAgICBkaWZmLmRhdGFbYysxXSA9IGRyYXc7XHJcbiAgICAgICAgICAgIGRpZmYuZGF0YVtjKzJdID0gZHJhdztcclxuICAgICAgICAgICAgZGlmZi5kYXRhW2MrM109IDI1NTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGRpZmY7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogY29udmVydCB0byBwdXJlIGJsYWNrIG9yIHB1cmUgd2hpdGVcclxuICAgICAqIEBwYXJhbSBweHNcclxuICAgICAqIEBwYXJhbSBweHNcclxuICAgICAqIEByZXR1cm5zIHsqfVxyXG4gICAgICovXHJcbiAgICB0b0JsYWNrQW5kV2hpdGUocHhzLCB0aHJlc2hvbGR0b2JsYWNrcGVyY2VudCkge1xyXG4gICAgICAgIGlmICghdGhyZXNob2xkdG9ibGFja3BlcmNlbnQpIHsgdGhyZXNob2xkdG9ibGFja3BlcmNlbnQgPSA1MDsgfVxyXG4gICAgICAgIHZhciB0aHJlc2hvbGQgPSB0aHJlc2hvbGR0b2JsYWNrcGVyY2VudC8xMDAgKiAoMjU1ICsgMjU1ICsgMjU1KTtcclxuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IHB4cy5kYXRhLmxlbmd0aDsgYys9NCkge1xyXG4gICAgICAgICAgICBpZiAocHhzLmRhdGFbY10gKyBweHMuZGF0YVtjKzFdICsgcHhzLmRhdGFbYysyXSA8IHRocmVzaG9sZCApIHtcclxuICAgICAgICAgICAgICAgIHB4cy5kYXRhW2NdID0gMDtcclxuICAgICAgICAgICAgICAgIHB4cy5kYXRhW2MrMV0gPSAwO1xyXG4gICAgICAgICAgICAgICAgcHhzLmRhdGFbYysyXSA9IDA7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBweHMuZGF0YVtjXSA9IDI1NTtcclxuICAgICAgICAgICAgICAgIHB4cy5kYXRhW2MrMV0gPSAyNTU7XHJcbiAgICAgICAgICAgICAgICBweHMuZGF0YVtjKzJdID0gMjU1O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gcHhzO1xyXG4gICAgfVxyXG59Il19
