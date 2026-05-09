// WebGL2 post-process layer. Blits the main 2D canvas to a texture each
// frame and runs a fragment shader chain (vignette + color grade). Falls back
// gracefully when WebGL2 is unavailable.
//
// Usage:
//   const pp = createPostProcessor(gameCanvas);   // call once on init
//   if (pp) pp.render(enabled, intensity);         // call at end of each frame
//   if (pp) pp.resize(w, h);                       // call on resize
//   if (pp) pp.destroy();                          // call on teardown

const VERT = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  // Flip Y: Canvas 2D y=0 is top, WebGL y=0 is bottom
  v_uv.y = 1.0 - v_uv.y;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision mediump float;
uniform sampler2D u_scene;
uniform float u_vignette;
uniform float u_colorGrade;
in vec2 v_uv;
out vec4 fragColor;

vec3 colorGrade(vec3 col, float strength) {
  // Lift shadows slightly toward sepia; mute highlights toward warm amber.
  vec3 lift = vec3(0.04, 0.02, 0.00);
  vec3 gain = vec3(1.08, 1.03, 0.92);
  return mix(col, clamp(col * gain + lift, 0.0, 1.0), strength);
}

void main() {
  vec4 scene = texture(u_scene, v_uv);

  // Vignette: darken toward edges
  vec2 uv = v_uv * 2.0 - 1.0;
  float dist = dot(uv, uv);
  float vignette = 1.0 - dist * u_vignette * 0.55;

  vec3 col = scene.rgb * clamp(vignette, 0.0, 1.0);
  col = colorGrade(col, u_colorGrade);

  fragColor = vec4(col, scene.a);
}
`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("[postProcess] shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vert, frag) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vert);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("[postProcess] program link error:", gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}

export function createPostProcessor(sourceCanvas) {
  if (typeof document === "undefined") return null;

  const glCanvas = document.createElement("canvas");
  glCanvas.style.cssText = "position:absolute;top:0;left:0;pointer-events:none;";
  glCanvas.width = sourceCanvas.width;
  glCanvas.height = sourceCanvas.height;

  const gl = glCanvas.getContext("webgl2", { alpha: false, antialias: false, depth: false });
  if (!gl) return null;

  const program = createProgram(gl, VERT, FRAG);
  if (!program) return null;

  // Full-screen quad
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const posLoc = gl.getAttribLocation(program, "a_pos");
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const uScene = gl.getUniformLocation(program, "u_scene");
  const uVignette = gl.getUniformLocation(program, "u_vignette");
  const uColorGrade = gl.getUniformLocation(program, "u_colorGrade");

  // Insert the GL canvas immediately after the source canvas in the DOM
  if (sourceCanvas.parentNode) {
    sourceCanvas.parentNode.insertBefore(glCanvas, sourceCanvas.nextSibling);
  }

  return {
    glCanvas,
    render(enabled, { vignette = 0.6, colorGrade = 0.35 } = {}) {
      if (!enabled) {
        glCanvas.style.display = "none";
        return;
      }
      glCanvas.style.display = "";
      gl.viewport(0, 0, glCanvas.width, glCanvas.height);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);
      } catch {
        return;
      }
      gl.useProgram(program);
      gl.uniform1i(uScene, 0);
      gl.uniform1f(uVignette, vignette);
      gl.uniform1f(uColorGrade, colorGrade);
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    resize(w, h) {
      glCanvas.width = w;
      glCanvas.height = h;
    },
    destroy() {
      gl.deleteProgram(program);
      gl.deleteTexture(tex);
      gl.deleteBuffer(quad);
      gl.deleteVertexArray(vao);
      glCanvas.remove();
    },
  };
}
