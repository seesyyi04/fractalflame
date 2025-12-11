import { buffer_flame_data, render_flame, setPositionAttribute } from "./renderer.js";

let render_state = null;
let buffer_state = null;

const linear = {
  weight: 1.0,
  affine_coefs: { a: 0.5, b: 0.0, c: 0.0, d: 0.0, e: 0.0, f: 0.5, g: 0.0, h: 0.0, i: 0.0, j: 0.0, k: 0.5, l: 0.0 },
  variations: [{f: 'linear', weight: 1.0}]
};
const transform_data = [linear];
const ITERATION_COUNT = 500000;

window.addEventListener('DOMContentLoaded', main);

function main() {
  const canvas = document.querySelector("#glcanvas");
  // Initialize the GL context
  const gl = canvas.getContext("webgl");
  console.log('WebGL context:', gl);
  if (gl === null) {
    alert(
      "Unable to initialize WebGL. Your browser or machine may not support it.",
    );
    return;
  }
  // gl.clearColor(0.0, 0.0, 0.0, 1.0);
  // gl.clear(gl.COLOR_BUFFER_BIT);

  const vertex_shader = `
    attribute vec3 aVertexPosition;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    void main() {
      gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aVertexPosition, 1.0);
      gl_PointSize = 2.0;
    }
  `;

  const frgmnt_shader = `
    void main() {
      gl_FragColor = vec4(1.0, 0.5, 0.2, 0.8);
    }
  `;

  const shader_program = initShader(gl, vertex_shader, frgmnt_shader);

  // collect info needed to use shader program
  render_state = {
    gl: gl,
    program: shader_program,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shader_program, "aVertexPosition"),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(shader_program, "uProjectionMatrix"),
      modelViewMatrix: gl.getUniformLocation(shader_program, "uModelViewMatrix"),
    },
  };

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.viewport(0,0,canvas.width, canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT);
  console.log('About to call start_generation');
  start_generation(transform_data, ITERATION_COUNT);
  console.log('start_generation called');
}

function start_generation(transforms, iterations) {
  const worker = new Worker('./fractalflame.js');
  worker.onmessage = function(e) {
    if (e.data.type === 'complete') {
      const point_data = e.data.point_data;
      buffer_state = buffer_flame_data(render_state.gl, point_data);
      requestAnimationFrame(animate);
    }
  }
  worker.postMessage({
    type: 'start',
    transforms: transforms,
    iterations: iterations
  });
}

function animate() {
  if (buffer_state) {
    render_flame(render_state.gl, render_state, buffer_state);
  }
  requestAnimationFrame(animate);
}

function initShader(gl, vs, fs) {
  // Initialize shader program so webgl knows how to draw data
  const v_shader = loadShader(gl, gl.VERTEX_SHADER, vs);
  const f_shader = loadShader(gl, gl.FRAGMENT_SHADER, fs);

  // create shader program
  const shader_program = gl.createProgram();
  gl.attachShader(shader_program, v_shader);
  gl.attachShader(shader_program, f_shader);
  gl.linkProgram(shader_program);

  if (!gl.getProgramParameter(shader_program, gl.LINK_STATUS)) {
    alert(`Unable to initialize shader program: ${gl.getProgramInfoLog(shader_program)}`);
    return null;
  }
  return shader_program;
}

// creates a shader of the given type, uploads the source and compiles it
function loadShader(gl, type, source) {
  const shader = gl.createShader(type);
  // send source to the shader object
  gl.shaderSource(shader, source);
  // compile the shader program
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(`Error compiling shaders: ${gl.getShaderInfoLog(shader)}`);
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}