import JSFeat from './jsfeat.wrapper.js';
import Filters from './filters.js';

export default {
    /**
     * convert image to grayscale
     * @param {ImageData} pxs
     * @returns {*}
     */
    toGrayscale(pxs) {
        let mat = new JSFeat.matrix_t(pxs.width, pxs.height, JSFeat.U8_t | JSFeat.C1_t);
        JSFeat.imgproc.grayscale(pxs.data, pxs.width, pxs.height, mat);
        Filters._applyMatrixToImage(mat, pxs);
        return pxs;
    },

    toSobelDerivative(pxs) {
        let img_u8 = new JSFeat.matrix_t(pxs.width, pxs.height, JSFeat.U8C1_t);
        let img_gxgy = new JSFeat.matrix_t(pxs.width, pxs.height, JSFeat.S32C2_t);
        JSFeat.imgproc.grayscale(pxs.data, pxs.width, pxs.height, img_u8);
        JSFeat.imgproc.sobel_derivatives(img_u8, img_gxgy);
        Filters._applySobelMatrixToImage(img_gxgy, pxs);
        return pxs;
    },

    toPyrdown(pxs) {
        let img_pyr = new JSFeat.pyramid_t(4);
        img_pyr.allocate(pxs.width, pxs.height, JSFeat.U8_t | JSFeat.C1_t);

        JSFeat.imgproc.grayscale(pxs.data, pxs.width, pxs.height, img_pyr.data[0]);

        var i = 2, a = img_pyr.data[0], b = img_pyr.data[1];
        JSFeat.imgproc.pyrdown(a, b);
        for(; i < img_pyr.levels; ++i) {
            a = b;
            b = img_pyr.data[i];
            JSFeat.imgproc.pyrdown(a, b);
        }

        let data_u32 = new Uint32Array(pxs.data.buffer);
        for(i=0; i < img_pyr.levels; ++i){
            Filters._render_mono_image(img_pyr.data[i].data, data_u32, img_pyr.data[i].cols, img_pyr.data[i].rows, pxs.width);
        }
        return pxs;
    },

    toFastCornerVisualization(pxs, threshold) {
        if (!threshold) {
            threshold = 20;
        }
        let img_u8 = new JSFeat.matrix_t(pxs.width, pxs.height, JSFeat.U8_t | JSFeat.C1_t);
        let corners = [];
        let i = pxs.width * pxs.height;
        while(--i >= 0) {
            corners[i] = new JSFeat.keypoint_t(0,0,0,0);
        }

        JSFeat.fast_corners.set_threshold(threshold);
        JSFeat.imgproc.grayscale(pxs.data, pxs.width, pxs.height, img_u8);

        let count = JSFeat.fast_corners.detect(img_u8, corners, 5);
        let data_u32 = new Uint32Array(pxs.data.buffer);
        this._render_corners(corners, count, data_u32, pxs.width);
        return pxs;
    },

    _applyMatrixToImage(mat, image) {
        let data_u32 = new Uint32Array(image.data.buffer);
        let alpha = (0xff << 24);
        let i = mat.cols*mat.rows, pix = 0;
        while(--i >= 0) {
            pix = mat.data[i];
            data_u32[i] = alpha | (pix << 16) | (pix << 8) | pix;
        }
    },

    _render_mono_image(src, dst, sw, sh, dw) {
        var alpha = (0xff << 24);
        for(var i = 0; i < sh; ++i) {
            for(var j = 0; j < sw; ++j) {
                var pix = src[i*sw+j];
                dst[i*dw+j] = alpha | (pix << 16) | (pix << 8) | pix;
            }
        }
    },

    _applySobelMatrixToImage(mat, image) {
        let data_u32 = new Uint32Array(image.data.buffer);
        let alpha = (0xff << 24);
        let i = mat.cols*mat.rows, pix=0, gx = 0, gy = 0;
        while(--i >= 0) {
            gx = Math.abs(mat.data[i<<1]>>2)&0xff;
            gy = Math.abs(mat.data[(i<<1)+1]>>2)&0xff;
            pix = ((gx + gy)>>1)&0xff;
            data_u32[i] = (pix << 24) | (gx << 16) | (0 << 8) | gy;
        }
    },

    _render_corners(corners, count, img, step) {
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
}