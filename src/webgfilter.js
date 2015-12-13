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
     * @param memory space/variable to pull shader from
     */
    this.useFilter = function(name, shaderloc) {
        if (!shaderloc) {
            shaderloc = ccwc.WebGLFilter.shaders;
        }
        var vtx = ccwc.WebGLFilter.shaders[name].vertex;
        var frg = ccwc.WebGLFilter.shaders[name].fragment;
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