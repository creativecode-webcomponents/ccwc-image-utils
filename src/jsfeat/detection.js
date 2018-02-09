import JSFeat from './jsfeat.wrapper.js';
import Detection from './detection.js';

export default class {
    static get FAST_DETECTOR() { return 'fast'};
    static get YAPE_DETECTOR() { return 'yape'};
    static get YAPE06_DETECTOR() { return 'yape06'};

    static get DEFAULT_FAST_DETECTOR_OPTIONS() {
        return {
            visualize: true,
            maxCorners: 999999,
            threshold: 20,
            border: 5,
            boxBlurRadius: 2,
            detector: 'fast'
        }
    };

    static get DEFAULT_YAPE06_DETECTOR_OPTIONS() {
        return {
            visualize: true,
            maxCorners: 999999,
            threshold: 20,
            border: 5,
            boxBlurRadius: 2,
            detector: 'yape06',
            laplacian_threshold: 20,
            min_eigen_value_threshold: 20
        }
    }

    static get DEFAULT_YAPE_DETECTOR_OPTIONS() {
        return {
            visualize: true,
            maxCorners: 999999,
            threshold: 20,
            border: 4,
            boxBlurRadius: 2,
            detector: 'yape',
            detectorRadius: 5
        }
    }

    static get DEFAULT_OPTICAL_FLOW_OPTIONS() {
        return {
            win_size: 20,
            max_iterations: 30,
            epsilon: 0.01,
            min_eigen: 0.001,
            maxTrackingPoints: 50,
            visualize: true,
            visualizeColor: 'red'
        };
    }

    static ProcessFeatures(pxs, params) {
        let corners = [];
        let i = pxs.width * pxs.height;
        while (--i >= 0) {
            corners[i] = new JSFeat.keypoint_t(0, 0, 0, 0);
        }

        let img_u8 = new JSFeat.matrix_t(pxs.width, pxs.height, JSFeat.U8_t | JSFeat.C1_t);
        JSFeat.imgproc.grayscale(pxs.data, pxs.width, pxs.height, img_u8);
        JSFeat.imgproc.box_blur_gray(img_u8, img_u8, params.boxBlurRadius, 0);

        let count;
        switch (params.detector) {
            case Detection.FAST_DETECTOR:
                JSFeat.fast_corners.set_threshold(params.threshold);
                count = JSFeat.fast_corners.detect(img_u8, corners, params.border);
                break;

            case Detection.YAPE06_DETECTOR:
                JSFeat.yape06.laplacian_threshold = 20;
                JSFeat.yape06.min_eigen_value_threshold = 20;
                count = JSFeat.yape06.detect(img_u8, corners, params.border);
                break;

            case Detection.YAPE_DETECTOR:
                JSFeat.yape.init(pxs.width, pxs.height, params.detectorRadius, 1);
                count = JSFeat.yape.detect(img_u8, corners, params.border);
                break;
        }

        if(count > params.maxCorners) {
            JSFeat.math.qsort(corners, 0, count-1, function(a,b){return (b.score<a.score);});
            count = params.maxCorners;
        }

        let features = corners.slice(0, params.maxCorners);
        if (params.visualize) {
            let data_u32 = new Uint32Array(pxs.data.buffer);
            Detection._render_corners(corners, count, data_u32, pxs.width);
        }
        return {image: pxs, features: features };
    }

    static _render_corners(corners, count, img, step) {
        let pix = (0xff << 24) | (0x00 << 16) | (0xff << 8) | 0x00;
        for (let i = 0; i < count; ++i) {
            let x = corners[i].x;
            let y = corners[i].y;
            let off = (x + y * step);
            img[off] = pix;
            img[off - 1] = pix;
            img[off + 1] = pix;
            img[off - step] = pix;
            img[off + step] = pix;
        }
    }

    set opticalFlowOptions(opt) { this._opticalFlowOptions = opt; }
    get opticalFlowOptions() { return this._opticalFlowOptions; }
    set featureDetectOptions(opt) { this._featureDetectOptions = opt; }
    get featureDetectOptions() { return this._featureDetectOptions };

    constructor(ctx) {
        this.canvasContext = ctx;
        this.opticalFlowOptions = Detection.DEFAULT_OPTICAL_FLOW_OPTIONS;
        this.featureDetectOptions = Detection.DEFAULT_YAPE06_DETECTOR_OPTIONS;
    }

    set context(ctx) {
        this.canvasContext = ctx;
    }

    addFlowPoint(x, y) {
        this._currentPoints[this._pointsCount<<1] = x;
        this._currentPoints[(this._pointsCount<<1)+1] = y;
        this._pointsCount ++;
    }

    updateFlow(pxs) {
        if (!this._flowInitialized) {
            this._flowInitialize(pxs);
        }

        // swap flow data
        let _pt_xy = this._previousPoints;
        this._previousPoints = this._currentPoints;
        this._currentPoints = _pt_xy;

        let _pyr = this._previousPyramid;
        this._previousPyramid = this._currentPyramid;
        this._currentPyramid = _pyr;

        JSFeat.imgproc.grayscale(pxs.data, pxs.width, pxs.height, this._currentPyramid.data[0]);
        this._currentPyramid.build(this._currentPyramid.data[0], true);

        JSFeat.optical_flow_lk.track(
            this._previousPyramid,
            this._currentPyramid,
            this._previousPoints,
            this._currentPoints,
            this._pointsCount,
            this.opticalFlowOptions.win_size, this.opticalFlowOptions.max_iterations,
            this._pointstatus, this.opticalFlowOptions.epsilon, this.opticalFlowOptions.min_eigen);
        this._prune_oflow_points();

        let out = [];
        for (let c = 0; c < this._pointsCount*2; c+=2) {
            out.push({ x: this._currentPoints[c], y: this._currentPoints[c+1]});
            if (this.opticalFlowOptions.visualize) {
                this.canvasContext.fillStyle = this.opticalFlowOptions.visualizeColor;
                this.canvasContext.beginPath();
                this.canvasContext.arc(this._currentPoints[c], this._currentPoints[c+1], 4, 0, Math.PI*2, true);
                this.canvasContext.closePath();
                this.canvasContext.fill();
            }
        }
        return out;
    }

    updateFeatures(pxs) {
        return Detection.ProcessFeatures(pxs, this.featureDetectOptions);
    }

    _flowInitialize(pxs) {
        this._currentPyramid = new JSFeat.pyramid_t(3);
        this._currentPyramid.allocate(pxs.width, pxs.height, JSFeat.U8_t | JSFeat.C1_t);
        this._previousPyramid = new JSFeat.pyramid_t(3);
        this._previousPyramid.allocate(pxs.width, pxs.height, JSFeat.U8_t | JSFeat.C1_t);
        this._pointsCount = 0;
        this._currentPoints = new Uint8Array(this.opticalFlowOptions.maxTrackingPoints);
        this._previousPoints = new Float32Array(this.opticalFlowOptions.maxTrackingPoints*2);
        this._currentPoints = new Float32Array(this.opticalFlowOptions.maxTrackingPoints*2);
        this._pointstatus = new Uint8Array(this.opticalFlowOptions.maxTrackingPoints);
        this._flowInitialized = true;
    }

    _prune_oflow_points(params) {
        let n = this._pointsCount;
        let i=0,j=0;

        for(; i < n; ++i) {
            if(this._pointstatus[i] == 1) {
                if(j < i) {
                    this._currentPoints[j<<1] = this._currentPoints[i<<1];
                    this._currentPoints[(j<<1)+1] = this._currentPoints[(i<<1)+1];
                }
                ++j;
            }
        }
        this._pointsCount = j;
    }
}