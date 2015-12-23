if (!window.ccwc) { ccwc = {}; }
if (!window.ccwc.image) { ccwc.image = {}; }
if (!window.ccwc.image.utils) { ccwc.image.utils = {}; }

ccwc.image.utils.glfilter = {
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
            shaderloc = ccwc.image.glshaders;
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

            var program = glctx.createProgram();
            glctx.attachShader(program, vertexShader);
            glctx.attachShader(program, fragmentShader);
            glctx.linkProgram(program);
            glctx.useProgram(program);

            for (var c = 0; c < glprops.textures.length; c++) {
                glprops.glTextures.push(glctx.createTexture());
            }

            var positionLocation = glctx.getAttribLocation(program, 'a_position');
            var texCoordBuffer = glctx.createBuffer();
            var rectCoordBuffer = glctx.createBuffer();
            var texCoords = new Float32Array([0.0,  0.0, 1.0,  0.0, 0.0,  1.0, 0.0,  1.0, 1.0,  0.0, 1.0,  1.0]);
            var rectCoords = new Float32Array([0, 0, glprops.textureWidth, 0, 0, glprops.textureHeight, 0,
                glprops.textureHeight, glprops.textureWidth, 0, glprops.textureWidth, glprops.textureHeight]);

            glctx.bindBuffer(glctx.ARRAY_BUFFER, texCoordBuffer);
            glctx.bufferData(glctx.ARRAY_BUFFER, texCoords, glctx.STATIC_DRAW);

            var texCoordLocation = glctx.getAttribLocation(program, 'a_texCoord');
            glctx.enableVertexAttribArray(texCoordLocation);
            glctx.vertexAttribPointer(texCoordLocation, 2, glctx.FLOAT, false, 0, 0);
        }

        for (var c = 0; c < refreshTextureIndices.length; c++) {
            glctx.bindTexture(glctx.TEXTURE_2D, glprops.glTextures[refreshTextureIndices[c]]);

            if (!glprops.isInitialized) {
                glctx.texParameteri(glctx.TEXTURE_2D, glctx.TEXTURE_WRAP_S, glctx.CLAMP_TO_EDGE);
                glctx.texParameteri(glctx.TEXTURE_2D, glctx.TEXTURE_WRAP_T, glctx.CLAMP_TO_EDGE);
                glctx.texParameteri(glctx.TEXTURE_2D, glctx.TEXTURE_MIN_FILTER, glctx.NEAREST);
                glctx.texParameteri(glctx.TEXTURE_2D, glctx.TEXTURE_MAG_FILTER, glctx.NEAREST);
                glctx.pixelStorei(glctx.UNPACK_FLIP_Y_WEBGL, glprops.flipTexture);
                glctx.texImage2D(glctx.TEXTURE_2D, 0, glctx.RGBA, glctx.RGBA, glctx.UNSIGNED_BYTE, glprops.textures[refreshTextureIndices[c]]);

                var resolutionLocationVertex = glctx.getUniformLocation(program, 'u_resolution');
                var resolutionLocationFragment = glctx.getUniformLocation(program, 'f_resolution');
                glctx.uniform2f(resolutionLocationVertex, glctx.canvas.width, glctx.canvas.height);
                glctx.uniform2f(resolutionLocationFragment, glctx.canvas.width, glctx.canvas.height);

                glctx.bindBuffer(glctx.ARRAY_BUFFER, rectCoordBuffer);
                glctx.enableVertexAttribArray(positionLocation);
                glctx.vertexAttribPointer(positionLocation, 2, glctx.FLOAT, false, 0, 0);
                glctx.bufferData(glctx.ARRAY_BUFFER, rectCoords, glctx.STATIC_DRAW);
            } else {
                glctx.texSubImage2D(glctx.TEXTURE_2D, 0, 0, 0, glctx.RGBA, glctx.UNSIGNED_BYTE, glprops.textures[refreshTextureIndices[c]]);
            }
        }


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