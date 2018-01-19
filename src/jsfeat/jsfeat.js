import JSFeatWrapper from './jsfeat.wrapper.js';

let jsfeat = JSFeatWrapper;

jsfeat.applyMatrixToImage = function(mat, image) {
    let data_u32 = new Uint32Array(image.data.buffer);
    let alpha = (0xff << 24);
    let i = mat.cols*mat.rows, pix = 0;
    while(--i >= 0) {
        pix = mat.data[i];
        data_u32[i] = alpha | (pix << 16) | (pix << 8) | pix;
    }
};

jsfeat.applySobelMatrixToImage = function(mat, image) {
    let data_u32 = new Uint32Array(image.data.buffer);
    let alpha = (0xff << 24);
    let i = mat.cols*mat.rows, pix=0, gx = 0, gy = 0;
    while(--i >= 0) {
        gx = Math.abs(mat.data[i<<1]>>2)&0xff;
        gy = Math.abs(mat.data[(i<<1)+1]>>2)&0xff;
        pix = ((gx + gy)>>1)&0xff;
        data_u32[i] = (pix << 24) | (gx << 16) | (0 << 8) | gy;
    }
};

export default jsfeat;