if (!window.ccwc) { ccwc = {}; }
if (!window.ccwc.image) { ccwc.image = {}; }
if (!window.ccwc.image) { ccwc.image = {}; }
if (!window.ccwc.image.webgl) { ccwc.image.webgl = {}; }

ccwc.image.webgl.textures = function(gl, width, height) {

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

    /**
     * add a texture
     * @param name
     * @param texture
     * @param glindex
     */
    this.add = function(name, texture, glindex) {
        if (!glindex) {
            glindex = 0;
            while (this.textureIndices.indexOf(glindex) !== -1) {
                glindex ++;
            }
        }
        this.textureIndices.push(glindex);

        this._textures[name] = {
            name: name,
            glindex: glindex,
            texture: texture,
            gltexture: gl.createTexture(),
            initialized: false,
            pixelStore: [], //[{ property: gl.UNPACK_FLIP_Y_WEBGL, value: true }],
            dirty: true };

        this._unitialized.push(this._textures[name]);
    };

    /**
     * update a uniform
     * @param name name of texture
     * @param texture
     */
    this.update = function(name, texture) {
        if (texture) {
            this._textures[name].texture = texture;
        }
        this._textures[name].dirty = true;
        this._dirty.push(this._textures[name]);
    };

    /**
     * refresh scene with updated textures
     */
    this.refreshScene = function() {
        for (var c = 0; c < this._dirty.length; c++) {
            this.gl.activeTexture(this.gl['TEXTURE' + this._dirty[c].glindex]);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this._dirty[c].gltexture);
            this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this._dirty[c].texture);
        }
        this._dirty = [];
    };

    /**
     * initialize new textures
     * @param program
     */
    this.initializeNewTextures = function(program) {
        if (this._unitialized.length === 0) { return; }
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
                gl.pixelStorei(this._unitialized[c].pixelStore[d].property, this._unitialized[c].pixelStore[d].value);
            }

            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this._unitialized[c].texture);

            this._unitialized[c].initialized = true;
            this._unitialized[c].dirty = false;
        }
        this._unitialized = [];
    };
};