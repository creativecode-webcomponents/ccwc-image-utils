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
     * @param webglcontext
     * @param filter
     */
    createRenderProps: function(webglcontext, filter, textures, textureWidth, textureHeight) {
        var props = {};
        if (!webglcontext) {
            var canvas = document.createElement('canvas')
            props.gl = canvas.getContext('webgl');
        } else {
            props.gl = webglcontext;
        }

        if (!textures.length) {
            textures = [textures];
        }
        props.filter = filter;
        props.textures = textures;
        props.glTextures = [];
        props.glTextureIndices = [];
        props.flipTexture = false;

        for (var c = 0; c < props.textures.length; c++) {
            props.glTextureIndices.push(c);
        }

        props.textureWidth = textureWidth;
        props.textureHeight = textureHeight;

        props.canvas2DHelper = document.createElement('canvas');
        props.canvas2DHelper.width = props.textureWidth;
        props.canvas2DHelper.height = props.textureHeight;
        props.canvas2DHelperContext = props.canvas2DHelper.getContext('2d');
        props.uniforms = new ccwc.image.webgl.uniforms();

        return props;
    },

    /**
     * render WebGL filter on current texture
     * @param glprops
     * @param refreshTextureIndices texture refresh indices (optional)
     * @returns {*}
     */
    render: function(glprops, refreshTextureIndices) {
        var glctx = glprops.gl;

        if (!refreshTextureIndices) {
            // refresh all textures unless specifying otherwise
            refreshTextureIndices = glprops.glTextureIndices;
        }

        if (!glprops.isInitialized) {
            var vertexShader = glctx.createShader(glctx.VERTEX_SHADER);
            glctx.shaderSource(vertexShader, glprops.filter.vertexShader);
            glctx.compileShader(vertexShader);

            var fragmentShader = glctx.createShader(glctx.FRAGMENT_SHADER);
            glctx.shaderSource(fragmentShader, glprops.filter.fragmentShader);
            glctx.compileShader(fragmentShader);

            glprops.program = glctx.createProgram();
            glctx.attachShader(glprops.program, vertexShader);
            glctx.attachShader(glprops.program, fragmentShader);
            glctx.linkProgram(glprops.program);
            glctx.useProgram(glprops.program);

            for (var c = 0; c < glprops.textures.length; c++) {
                glprops.glTextures.push(glctx.createTexture());
            }

            var positionLocation = glctx.getAttribLocation(glprops.program, 'a_position');
            var texCoordBuffer = glctx.createBuffer();
            var rectCoordBuffer = glctx.createBuffer();
            var texCoords = new Float32Array([0.0,  0.0, 1.0,  0.0, 0.0,  1.0, 0.0,  1.0, 1.0,  0.0, 1.0,  1.0]);
            var rectCoords = new Float32Array([0, 0, glprops.textureWidth, 0, 0, glprops.textureHeight, 0,
                glprops.textureHeight, glprops.textureWidth, 0, glprops.textureWidth, glprops.textureHeight]);

            glctx.bindBuffer(glctx.ARRAY_BUFFER, texCoordBuffer);
            glctx.bufferData(glctx.ARRAY_BUFFER, texCoords, glctx.STATIC_DRAW);

            var texCoordLocation = glctx.getAttribLocation(glprops.program, 'a_texCoord');
            glctx.enableVertexAttribArray(texCoordLocation);
            glctx.vertexAttribPointer(texCoordLocation, 2, glctx.FLOAT, false, 0, 0);
        }

        if (!glprops.isInitialized) {
            for (var c = 0; c < refreshTextureIndices.length; c++) {
                glctx.bindTexture(glctx.TEXTURE_2D, glprops.glTextures[refreshTextureIndices[c]]);
                glctx.texParameteri(glctx.TEXTURE_2D, glctx.TEXTURE_WRAP_S, glctx.CLAMP_TO_EDGE);
                glctx.texParameteri(glctx.TEXTURE_2D, glctx.TEXTURE_WRAP_T, glctx.CLAMP_TO_EDGE);
                glctx.texParameteri(glctx.TEXTURE_2D, glctx.TEXTURE_MIN_FILTER, glctx.NEAREST);
                glctx.texParameteri(glctx.TEXTURE_2D, glctx.TEXTURE_MAG_FILTER, glctx.NEAREST);
                glctx.pixelStorei(glctx.UNPACK_FLIP_Y_WEBGL, glprops.flipTexture);
                glctx.texImage2D(glctx.TEXTURE_2D, 0, glctx.RGBA, glctx.RGBA, glctx.UNSIGNED_BYTE, glprops.textures[refreshTextureIndices[c]]);
            }

            glprops.uniforms.add('u_resolution', ccwc.image.webgl.uniforms.UNIFORM2f, [glctx.canvas.width, glctx.canvas.height]);
            glprops.uniforms.add('f_resolution', ccwc.image.webgl.uniforms.UNIFORM2f, [glctx.canvas.width, glctx.canvas.height]);

            for (var c = 0; c < refreshTextureIndices.length; c++) {
                var u_imageLocation = glctx.getUniformLocation(glprops.program, 'u_image' + refreshTextureIndices[c]);
                glctx.uniform1i(u_imageLocation, refreshTextureIndices[c]);
                glctx.activeTexture(glctx['TEXTURE' + refreshTextureIndices[c]]);
                glctx.bindTexture(glctx.TEXTURE_2D, glprops.glTextures[refreshTextureIndices[c]]);
            }

            glctx.bindBuffer(glctx.ARRAY_BUFFER, rectCoordBuffer);
            glctx.enableVertexAttribArray(positionLocation);
            glctx.vertexAttribPointer(positionLocation, 2, glctx.FLOAT, false, 0, 0);
            glctx.bufferData(glctx.ARRAY_BUFFER, rectCoords, glctx.STATIC_DRAW);
        } else {
            for (var c = 0; c < refreshTextureIndices.length; c++) {
                glctx.bindTexture(glctx.TEXTURE_2D, glprops.glTextures[refreshTextureIndices[c]]);
                glctx.texSubImage2D(glctx.TEXTURE_2D, 0, 0, 0, glctx.RGBA, glctx.UNSIGNED_BYTE, glprops.textures[refreshTextureIndices[c]]);
            }
        }

        glprops.uniforms.updateProgram(glctx, glprops.program);
        glctx.drawArrays(glctx.TRIANGLES, 0, 6);
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
    "fragment": "precision mediump float; uniform sampler2D u_image; varying vec2 v_texCoord; uniform vec2 f_resolution; vec2 texel = vec2(1.0 / f_resolution.x, 1.0 / f_resolution.y); mat3 G[9];  const mat3 g0 = mat3( 0.3535533845424652, 0, -0.3535533845424652, 0.5, 0, -0.5, 0.3535533845424652, 0, -0.3535533845424652 ); const mat3 g1 = mat3( 0.3535533845424652, 0.5, 0.3535533845424652, 0, 0, 0, -0.3535533845424652, -0.5, -0.3535533845424652 ); const mat3 g2 = mat3( 0, 0.3535533845424652, -0.5, -0.3535533845424652, 0, 0.3535533845424652, 0.5, -0.3535533845424652, 0 ); const mat3 g3 = mat3( 0.5, -0.3535533845424652, 0, -0.3535533845424652, 0, 0.3535533845424652, 0, 0.3535533845424652, -0.5 ); const mat3 g4 = mat3( 0, -0.5, 0, 0.5, 0, 0.5, 0, -0.5, 0 ); const mat3 g5 = mat3( -0.5, 0, 0.5, 0, 0, 0, 0.5, 0, -0.5 ); const mat3 g6 = mat3( 0.1666666716337204, -0.3333333432674408, 0.1666666716337204, -0.3333333432674408, 0.6666666865348816, -0.3333333432674408, 0.1666666716337204, -0.3333333432674408, 0.1666666716337204 ); const mat3 g7 = mat3( -0.3333333432674408, 0.1666666716337204, -0.3333333432674408, 0.1666666716337204, 0.6666666865348816, 0.1666666716337204, -0.3333333432674408, 0.1666666716337204, -0.3333333432674408 ); const mat3 g8 = mat3( 0.3333333432674408, 0.3333333432674408, 0.3333333432674408, 0.3333333432674408, 0.3333333432674408, 0.3333333432674408, 0.3333333432674408, 0.3333333432674408, 0.3333333432674408 );  void main(void) {      G[0] = g0,     G[1] = g1,     G[2] = g2,     G[3] = g3,     G[4] = g4,     G[5] = g5,     G[6] = g6,     G[7] = g7,     G[8] = g8;      mat3 I;     float cnv[9];     vec3 sampl;      for (float i=0.0; i<3.0; i++) {         for (float j=0.0; j<3.0; j++) {             sampl = texture2D(u_image, v_texCoord + texel * vec2(i-1.0,j-1.0) ).rgb;             I[int(i)][int(j)] = length(sampl);         }     }      for (int i=0; i<9; i++) {         float dp3 = dot(G[i][0], I[0]) + dot(G[i][1], I[1]) + dot(G[i][2], I[2]);         cnv[i] = dp3 * dp3;     }      float M = (cnv[0] + cnv[1]) + (cnv[2] + cnv[3]);     float S = (cnv[4] + cnv[5]) + (cnv[6] + cnv[7]) + (cnv[8] + M);      gl_FragColor = vec4(vec3(sqrt(M/S)), texture2D( u_image, v_texCoord ).a ); }",
    "vertex": "attribute vec2 a_position; attribute vec2 a_texCoord; uniform vec2 u_resolution; varying vec2 v_texCoord;  void main() {     vec2 zeroToOne = a_position / u_resolution;     vec2 zeroToTwo = zeroToOne * 2.0;     vec2 clipSpace = zeroToTwo - 1.0;     gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);     v_texCoord = a_texCoord; }"
  },
  "greyscale": {
    "fragment": "precision mediump float; varying vec2 v_texCoord;  uniform sampler2D u_image;  void main(void) {     vec4 px = texture2D(u_image, v_texCoord);     float avg = (px.r + px.g + px.b)/3.0;     gl_FragColor = vec4(avg, avg, avg, px.a); }",
    "vertex": "attribute vec2 a_position; attribute vec2 a_texCoord; uniform vec2 u_resolution; varying vec2 v_texCoord;  void main() {     vec2 zeroToOne = a_position / u_resolution;     vec2 zeroToTwo = zeroToOne * 2.0;     vec2 clipSpace = zeroToTwo - 1.0;     gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);     v_texCoord = a_texCoord; }"
  },
  "passthrough": {
    "fragment": "precision mediump float; uniform sampler2D u_image; varying vec2 v_texCoord;  void main() {     gl_FragColor = texture2D(u_image, v_texCoord); }",
    "vertex": "attribute vec2 a_position; attribute vec2 a_texCoord; uniform vec2 u_resolution; varying vec2 v_texCoord;  void main() {     vec2 zeroToOne = a_position / u_resolution;     vec2 zeroToTwo = zeroToOne * 2.0;     vec2 clipSpace = zeroToTwo - 1.0;     gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);     v_texCoord = a_texCoord; }"
  },
  "sepia": {
    "fragment": "precision mediump float; varying vec2 v_texCoord;  uniform sampler2D u_image; uniform vec4 light; uniform vec4 dark; uniform float desat; uniform float toned;  const mat4 coeff = mat4(     0.393, 0.349, 0.272, 1.0,     0.796, 0.686, 0.534, 1.0,     0.189, 0.168, 0.131, 1.0,     0.0, 0.0, 0.0, 1.0 );  void main(void) {     vec4 sourcePixel = texture2D(u_image, v_texCoord);     gl_FragColor = coeff * sourcePixel; }",
    "vertex": "attribute vec2 a_position; attribute vec2 a_texCoord; uniform vec2 u_resolution; varying vec2 v_texCoord;  void main() {     vec2 zeroToOne = a_position / u_resolution;     vec2 zeroToTwo = zeroToOne * 2.0;     vec2 clipSpace = zeroToTwo - 1.0;     gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);     v_texCoord = a_texCoord; }"
  },
  "sobel_edge_detection": {
    "fragment": "precision mediump float; varying vec2 v_texCoord; uniform sampler2D u_image; uniform vec2 f_resolution;  void main(void) {     float x = 1.0 / f_resolution.x;     float y = 1.0 / f_resolution.y;     vec4 horizEdge = vec4( 0.0 );     horizEdge -= texture2D( u_image, vec2( v_texCoord.x - x, v_texCoord.y - y ) ) * 1.0;     horizEdge -= texture2D( u_image, vec2( v_texCoord.x - x, v_texCoord.y     ) ) * 2.0;     horizEdge -= texture2D( u_image, vec2( v_texCoord.x - x, v_texCoord.y + y ) ) * 1.0;     horizEdge += texture2D( u_image, vec2( v_texCoord.x + x, v_texCoord.y - y ) ) * 1.0;     horizEdge += texture2D( u_image, vec2( v_texCoord.x + x, v_texCoord.y     ) ) * 2.0;     horizEdge += texture2D( u_image, vec2( v_texCoord.x + x, v_texCoord.y + y ) ) * 1.0;     vec4 vertEdge = vec4( 0.0 );     vertEdge -= texture2D( u_image, vec2( v_texCoord.x - x, v_texCoord.y - y ) ) * 1.0;     vertEdge -= texture2D( u_image, vec2( v_texCoord.x    , v_texCoord.y - y ) ) * 2.0;     vertEdge -= texture2D( u_image, vec2( v_texCoord.x + x, v_texCoord.y - y ) ) * 1.0;     vertEdge += texture2D( u_image, vec2( v_texCoord.x - x, v_texCoord.y + y ) ) * 1.0;     vertEdge += texture2D( u_image, vec2( v_texCoord.x    , v_texCoord.y + y ) ) * 2.0;     vertEdge += texture2D( u_image, vec2( v_texCoord.x + x, v_texCoord.y + y ) ) * 1.0;     vec3 edge = sqrt((horizEdge.rgb * horizEdge.rgb) + (vertEdge.rgb * vertEdge.rgb));      gl_FragColor = vec4( edge, texture2D( u_image, v_texCoord ).a ); }",
    "vertex": "attribute vec2 a_position; attribute vec2 a_texCoord; uniform vec2 u_resolution; varying vec2 v_texCoord;  void main() {     vec2 zeroToOne = a_position / u_resolution;     vec2 zeroToTwo = zeroToOne * 2.0;     vec2 clipSpace = zeroToTwo - 1.0;     gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);     v_texCoord = a_texCoord; }"
  }
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