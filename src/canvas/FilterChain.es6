import Filters from './filters.es6';

export default class {
    /**
     * c-tor
     */
    constructor() {
        this.result = pxs;
    };

    /**
     * convert image to grayscale
     * @param {ImageData} pxs
     * @returns {*}
     */
    toGrayscale() {
        this.result = Filters.toGrayscale(this.result);
        return this;
    };

    /**
     * saturate image
     * @param {ImageData} pxs
     * @param {Number} percentamount percentage saturation
     * @returns {*}
     */
    saturate(percentamount) {
        this.result = Filters.saturate(this.result, percentamount);
        return this;
    };

    /**
     * convert to pure black or pure white
     * @param pxs
     * @param pxs
     * @returns {*}
     */
    toBlackAndWhite(thresholdtoblackpercent) {
        this.result = Filters.toBlackAndWhite(this.result, thresholdtoblackpercent);
        return this;
    };

    /**
     * convert 2 images to an image highlighting differences
     * @param pxs1
     * @param pxs2
     * @param tolerance
     * @returns {*}
     */
    toDiff(compare, tolerance) {
        this.result = Filters.toDiff(this.result, compare, tolerance);
        return this;
    }
}