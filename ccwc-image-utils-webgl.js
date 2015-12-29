if (!window.ccwc) { ccwc = {}; }
if (!window.ccwc.image) { ccwc.image = {}; }
if (!window.ccwc.image.webgl) { ccwc.image.webgl = {}; }

ccwc.image.webgl.filter = {
    /**
     * create filter from shaders
     * @param vertexShader
     * @param fragmentShader
     * @returns {{vertexShader: *, fragmentShader: *}}
     */
    createFilterFromShaders: function(vertexShader, fragmentShader) {
        return { vertexShader: vertexShader, fragmentShader: fragmentShader };
    },

    /**
     * create a filter from filter name
     * @param name
     * @param memory space/variable to pull shader from
     */
    createFilterFromName: function(name, shaderloc) {
        if (!shaderloc) {
            shaderloc = ccwc.image.webgl.shaders;
        }
        if (!shaderloc[name]) {
            console.log('Shader ', name, 'not found in ', shaderloc, ' using a passthrough shader instead');
            shaderloc = ccwc.image.webgl.shaders;
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
    createRenderObject: function(params) {
        var props = {};
        props.gl = params.gl;
        props.filter = params.filter;
        props.textures = new ccwc.image.webgl.textures(props.gl.canvas.width,props.gl.canvas.height);

        props.canvas2DHelper = document.createElement('canvas');
        props.canvas2DHelper.width = props.gl.canvas.width;
        props.canvas2DHelper.height = props.gl.canvas.height;
        props.canvas2DHelperContext = props.canvas2DHelper.getContext('2d');

        props.uniforms = new ccwc.image.webgl.uniforms();
        props.textures = new ccwc.image.webgl.textures(props.gl, props.gl.canvas.width, props.gl.canvas.height);

        if (params.textures) {
            for (var c = 0; c < params.textures.length; c++) {
                props.textures.add(params.textures[c].name, params.textures[c].texture, params.textures[c].index );
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
    render: function(glprops) {
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
            var texCoords = new Float32Array([0.0,  0.0, 1.0,  0.0, 0.0,  1.0, 0.0,  1.0, 1.0,  0.0, 1.0,  1.0]);
            var rectCoords = new Float32Array([0, 0, glprops.textures.width, 0, 0, glprops.textures.height, 0,
                glprops.textures.height, glprops.textures.width, 0, glprops.textures.width, glprops.textures.height]);

            glprops.gl.bindBuffer(glprops.gl.ARRAY_BUFFER, texCoordBuffer);
            glprops.gl.bufferData(glprops.gl.ARRAY_BUFFER, texCoords, glprops.gl.STATIC_DRAW);

            var texCoordLocation = glprops.gl.getAttribLocation(glprops.program, 'a_texCoord');
            glprops.gl.enableVertexAttribArray(texCoordLocation);
            glprops.gl.vertexAttribPointer(texCoordLocation, 2, glprops.gl.FLOAT, false, 0, 0);

            glprops.uniforms.add('u_resolution', ccwc.image.webgl.uniforms.UNIFORM2f, [glprops.gl.canvas.width, glprops.gl.canvas.height]);
            glprops.uniforms.add('f_resolution', ccwc.image.webgl.uniforms.UNIFORM2f, [glprops.gl.canvas.width, glprops.gl.canvas.height]);

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
    getCanvasPixels: function(glprops) {
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
ccwc.image.webgl.shaders = {
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
if (!window.ccwc) { ccwc = {}; }
if (!window.ccwc.image) { ccwc.image = {}; }
if (!window.ccwc.image) { ccwc.image = {}; }
if (!window.ccwc.image.webgl) { ccwc.image.webgl = {}; }

ccwc.image.webgl.uniforms = function() {
    /**
     * internal mapping of uniforms
     * @type {{}}
     * @private
     */
    this._uniforms = {};

    /**
     * add a uniform
     * @param type type of uniform (1f, 2f, 3f, 4f, 1i, 2i, 3i, 4u
     */
    this.add = function(name, type, values) {
        this._uniforms[name] = { name: name, type: type, values: values, dirty: true };
    };

    /**
     * update a uniform
     * @param type type of uniform (1f, 2f, 3f, 4f, 1i, 2i, 3i, 4u
     */
    this.update = function(name, values) {
        this._uniforms[name].values = values;
        this._uniforms[name].dirty = true;
    };


    /**
     * update uniforms on GL context and program
     * @param gl WebGL context
     * @param program
     */
    this.updateProgram = function(gl, program) {
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

};

ccwc.image.webgl.uniforms.UNIFORM1f = '1f';
ccwc.image.webgl.uniforms.UNIFORM2f = '2f';
ccwc.image.webgl.uniforms.UNIFORM3f = '3f';
ccwc.image.webgl.uniforms.UNIFORM4f = '4f';

ccwc.image.webgl.uniforms.UNIFORM1i = '1i';
ccwc.image.webgl.uniforms.UNIFORM2i = '2i';
ccwc.image.webgl.uniforms.UNIFORM3i = '3i';
ccwc.image.webgl.uniforms.UNIFORM4i = '4i';