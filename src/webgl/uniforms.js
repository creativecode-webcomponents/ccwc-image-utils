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