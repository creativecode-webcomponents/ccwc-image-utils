if (!window.ccwc) { ccwc = {}; }

ccwc.WebGLFilter = function(webglcontext, texture) {
    if (!webglcontext) {
        var canvas = document.getElementById("c");
        webglcontext = canvas.getContext("webgl");
    }

    /** image texture for filter */
    this.texture = texture;

    /**
     * use filter
     * @param name filter name
     */
    this.useFilter = function(name) {
        var vtx = ccwc.WebGLFilter.shaders[name + '_VERTEX'];
        var frg = ccwc.WebGLFilter.shaders[name + '_FRAGMENT'];
        this.useShaders(vtx, frg);
    };

    /**
     * use shaders
     * @param vertexShader
     * @param fragmentShader
     */
    this.useShaders = function(vertexShader, fragmentShader) {
        this._glSetup(webglcontext, vertexShader, fragmentShader);
    };

    /**
     * internal method to setup webgl
     * @param glctx
     * @param vtxShaderText
     * @param frgShaderText
     * @private
     */
    this._glSetup = function(glctx, vtxShaderText, frgShaderText) {
        var vertexShader = glctx.createShader(glctx.VERTEX_SHADER);
        glctx.shaderSource(vertexShader, vtxShaderText);
        glctx.compileShader(vertexShader);

        var fragmentShader = glctx.createShader(glctx.FRAGMENT_SHADER);
        glctx.shaderSource(fragmentShader, frgShaderText);
        glctx.compileShader(fragmentShader);

        var program = glctx.createProgram();
        glctx.attachShader(program, vertexShader);
        glctx.attachShader(program, fragmentShader);
        glctx.linkProgram(program);
        glctx.useProgram(program);

        // look up where the vertex data needs to go.
        var positionLocation = glctx.getAttribLocation(program, 'a_position');
        var texCoordLocation = glctx.getAttribLocation(program, 'a_texCoord');

        // provide texture coordinates for the rectangle.
        var texCoordBuffer = glctx.createBuffer();
        glctx.bindBuffer(glctx.ARRAY_BUFFER, texCoordBuffer);
        glctx.bufferData(glctx.ARRAY_BUFFER, new Float32Array([
            0.0,  0.0, 1.0,  0.0, 0.0,  1.0, 0.0,  1.0, 1.0,  0.0, 1.0,  1.0]), glctx.STATIC_DRAW);
        glctx.enableVertexAttribArray(texCoordLocation);
        glctx.vertexAttribPointer(texCoordLocation, 2, glctx.FLOAT, false, 0, 0);

        // Create a texture.
        var texture = glctx.createTexture();
        glctx.bindTexture(glctx.TEXTURE_2D, texture);

        // Set the parameters so we can render any size image.
        glctx.texParameteri(glctx.TEXTURE_2D, glctx.TEXTURE_WRAP_S, glctx.CLAMP_TO_EDGE);
        glctx.texParameteri(glctx.TEXTURE_2D, glctx.TEXTURE_WRAP_T, glctx.CLAMP_TO_EDGE);
        glctx.texParameteri(glctx.TEXTURE_2D, glctx.TEXTURE_MIN_FILTER, glctx.NEAREST);
        glctx.texParameteri(glctx.TEXTURE_2D, glctx.TEXTURE_MAG_FILTER, glctx.NEAREST);

        // Upload the image into the texture.
        glctx.texImage2D(glctx.TEXTURE_2D, 0, glctx.RGBA, glctx.RGBA, glctx.UNSIGNED_BYTE, this.texture);

        // lookup uniforms
        var resolutionLocationVertex = glctx.getUniformLocation(program, 'u_resolution');
        glctx.uniform2f(resolutionLocationVertex, webglcontext.canvas.width, webglcontext.canvas.height);

        var resolutionLocationFragment = glctx.getUniformLocation(program, 'f_resolution');
        glctx.uniform2f(resolutionLocationFragment, webglcontext.canvas.width, webglcontext.canvas.height);


        // Create a buffer for the position of the rectangle corners.
        var buffer = glctx.createBuffer();
        glctx.bindBuffer(glctx.ARRAY_BUFFER, buffer);
        glctx.enableVertexAttribArray(positionLocation);
        glctx.vertexAttribPointer(positionLocation, 2, glctx.FLOAT, false, 0, 0);

        // Set a rectangle the same size as the image.
        glctx.bufferData(glctx.ARRAY_BUFFER, new Float32Array([
            0, 0, this.texture.width, 0, 0, this.texture.height, 0, this.texture.height, this.texture.width, 0, this.texture.width, this.texture.height]), glctx.STATIC_DRAW);

        // Draw the rectangle.
        glctx.drawArrays(glctx.TRIANGLES, 0, 6);
    }
};

/**
 * filters
 * @type {string}
 */
ccwc.WebGLFilter.filters = {
    NOFILTER: 'NOFILTER',
    SEPIA: 'SEPIA',
    GREYSCALE: 'GREYSCALE',
    SOBEL_EDGE_DETECTION: 'SOBEL_EDGE_DETECTION',
    FREI_CHEN_EDGE_DETECTION: 'FREI_CHEN_EDGE_DETECTION'
};

/**
 * shaders
 * @type {{UNFILTERED_FRAGMENT: string}}
 */
ccwc.WebGLFilter.shaders = {};
ccwc.WebGLFilter.shaders.NOFILTER_FRAGMENT =
    'precision mediump float;' +
    'uniform sampler2D u_image;' +
    'varying vec2 v_texCoord;' +
    'void main() {' +
        'gl_FragColor = texture2D(u_image, v_texCoord);' +
    '}';

ccwc.WebGLFilter.shaders.NOFILTER_VERTEX =
    'attribute vec2 a_position;' +
    'attribute vec2 a_texCoord;' +
    'uniform vec2 u_resolution;' +
    'varying vec2 v_texCoord;' +
    'void main() {' +
        'vec2 zeroToOne = a_position / u_resolution;' +
        'vec2 zeroToTwo = zeroToOne * 2.0;' +
        'vec2 clipSpace = zeroToTwo - 1.0;' +
        'gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);' +
        'v_texCoord = a_texCoord;' +
    '}';

// From https://github.com/spite/Wagner
ccwc.WebGLFilter.shaders.SEPIA_VERTEX = ccwc.WebGLFilter.shaders.NOFILTER_VERTEX;
ccwc.WebGLFilter.shaders.SEPIA_FRAGMENT =
    'precision mediump float;' +
    'varying vec2 v_texCoord;' +

    'uniform sampler2D u_image;' +
    'uniform vec4 light;' +
    'uniform vec4 dark;' +
    'uniform float desat;' +
    'uniform float toned;' +

    'const mat4 coeff = mat4(' +
        '0.393, 0.349, 0.272, 1.0,' +
        '0.796, 0.686, 0.534, 1.0, ' +
        '0.189, 0.168, 0.131, 1.0, ' +
        '0.0, 0.0, 0.0, 1.0 ' +
    ');' +

    'void main(void) {' +
        'vec4 sourcePixel = texture2D(u_image, v_texCoord);' +
        'gl_FragColor = coeff * sourcePixel;' +
    '}';

ccwc.WebGLFilter.shaders.GREYSCALE_VERTEX = ccwc.WebGLFilter.shaders.NOFILTER_VERTEX;
ccwc.WebGLFilter.shaders.GREYSCALE_FRAGMENT =
    'precision mediump float;' +
    'varying vec2 v_texCoord;' +

    'uniform sampler2D u_image;' +

    'void main(void) {' +
        'vec4 px = texture2D(u_image, v_texCoord);' +
        'float avg = (px.r + px.g + px.b)/3.0;' +
        'gl_FragColor = vec4(avg, avg, avg, px.a);' +
    '}';


ccwc.WebGLFilter.shaders.SOBEL_EDGE_DETECTION_VERTEX = ccwc.WebGLFilter.shaders.NOFILTER_VERTEX;
ccwc.WebGLFilter.shaders.SOBEL_EDGE_DETECTION_FRAGMENT =
    'precision mediump float;' +
    'varying vec2 v_texCoord;' +
    'uniform sampler2D u_image;' +
    'uniform vec2 f_resolution;' +

    'void main(void) {' +
        'float x = 1.0 / f_resolution.x;' +
        'float y = 1.0 / f_resolution.y;' +
        'vec4 horizEdge = vec4( 0.0 );' +
        'horizEdge -= texture2D( u_image, vec2( v_texCoord.x - x, v_texCoord.y - y ) ) * 1.0;' +
        'horizEdge -= texture2D( u_image, vec2( v_texCoord.x - x, v_texCoord.y     ) ) * 2.0;' +
        'horizEdge -= texture2D( u_image, vec2( v_texCoord.x - x, v_texCoord.y + y ) ) * 1.0;' +
        'horizEdge += texture2D( u_image, vec2( v_texCoord.x + x, v_texCoord.y - y ) ) * 1.0;' +
        'horizEdge += texture2D( u_image, vec2( v_texCoord.x + x, v_texCoord.y     ) ) * 2.0;' +
        'horizEdge += texture2D( u_image, vec2( v_texCoord.x + x, v_texCoord.y + y ) ) * 1.0;' +
        'vec4 vertEdge = vec4( 0.0 );' +
        'vertEdge -= texture2D( u_image, vec2( v_texCoord.x - x, v_texCoord.y - y ) ) * 1.0;' +
        'vertEdge -= texture2D( u_image, vec2( v_texCoord.x    , v_texCoord.y - y ) ) * 2.0;' +
        'vertEdge -= texture2D( u_image, vec2( v_texCoord.x + x, v_texCoord.y - y ) ) * 1.0;' +
        'vertEdge += texture2D( u_image, vec2( v_texCoord.x - x, v_texCoord.y + y ) ) * 1.0;' +
        'vertEdge += texture2D( u_image, vec2( v_texCoord.x    , v_texCoord.y + y ) ) * 2.0;' +
        'vertEdge += texture2D( u_image, vec2( v_texCoord.x + x, v_texCoord.y + y ) ) * 1.0;' +
        'vec3 edge = sqrt((horizEdge.rgb * horizEdge.rgb) + (vertEdge.rgb * vertEdge.rgb));' +

        'gl_FragColor = vec4( edge, texture2D( u_image, v_texCoord ).a );' +
    '}';



ccwc.WebGLFilter.shaders.FREI_CHEN_EDGE_DETECTION_VERTEX = ccwc.WebGLFilter.shaders.NOFILTER_VERTEX;
ccwc.WebGLFilter.shaders.FREI_CHEN_EDGE_DETECTION_FRAGMENT =
    'precision mediump float;' +
    'uniform sampler2D u_image;' +
    'varying vec2 v_texCoord;' +
    'uniform vec2 f_resolution;' +
    'vec2 texel = vec2(1.0 / f_resolution.x, 1.0 / f_resolution.y);' +
    'mat3 G[9];' +
    'const mat3 g0 = mat3( 0.3535533845424652, 0, -0.3535533845424652, 0.5, 0, -0.5, 0.3535533845424652, 0, -0.3535533845424652 );' +
    'const mat3 g1 = mat3( 0.3535533845424652, 0.5, 0.3535533845424652, 0, 0, 0, -0.3535533845424652, -0.5, -0.3535533845424652 );' +
    'const mat3 g2 = mat3( 0, 0.3535533845424652, -0.5, -0.3535533845424652, 0, 0.3535533845424652, 0.5, -0.3535533845424652, 0 );' +
    'const mat3 g3 = mat3( 0.5, -0.3535533845424652, 0, -0.3535533845424652, 0, 0.3535533845424652, 0, 0.3535533845424652, -0.5 );' +
    'const mat3 g4 = mat3( 0, -0.5, 0, 0.5, 0, 0.5, 0, -0.5, 0 );' +
    'const mat3 g5 = mat3( -0.5, 0, 0.5, 0, 0, 0, 0.5, 0, -0.5 );' +
    'const mat3 g6 = mat3( 0.1666666716337204, -0.3333333432674408, 0.1666666716337204, -0.3333333432674408, 0.6666666865348816, -0.3333333432674408, 0.1666666716337204, -0.3333333432674408, 0.1666666716337204 );' +
    'const mat3 g7 = mat3( -0.3333333432674408, 0.1666666716337204, -0.3333333432674408, 0.1666666716337204, 0.6666666865348816, 0.1666666716337204, -0.3333333432674408, 0.1666666716337204, -0.3333333432674408 );' +
    'const mat3 g8 = mat3( 0.3333333432674408, 0.3333333432674408, 0.3333333432674408, 0.3333333432674408, 0.3333333432674408, 0.3333333432674408, 0.3333333432674408, 0.3333333432674408, 0.3333333432674408 );' +

    'void main(void) {' +
        'G[0] = g0, G[1] = g1, G[2] = g2, G[3] = g3, G[4] = g4, G[5] = g5, G[6] = g6, G[7] = g7, G[8] = g8;' +
        'mat3 I;' +
        'float cnv[9];' +
        'vec3 sampl;' +
        'for (float i=0.0; i<3.0; i++) {' +
            'for (float j=0.0; j<3.0; j++) {' +
                'sampl = texture2D(u_image, v_texCoord + texel * vec2(i-1.0,j-1.0) ).rgb;' +
                'I[int(i)][int(j)] = length(sampl);' +
            '}' +
        '}' +
        'for (int i=0; i<9; i++) {' +
            'float dp3 = dot(G[i][0], I[0]) + dot(G[i][1], I[1]) + dot(G[i][2], I[2]);' +
            'cnv[i] = dp3 * dp3;' +
        '}' +
        'float M = (cnv[0] + cnv[1]) + (cnv[2] + cnv[3]);' +
        'float S = (cnv[4] + cnv[5]) + (cnv[6] + cnv[7]) + (cnv[8] + M);' +
        'gl_FragColor = vec4(vec3(sqrt(M/S)), texture2D( u_image, v_texCoord ).a );' +
    '}';