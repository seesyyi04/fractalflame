import { buffer_flame_data_color, render_flame } from "./renderer.js";

let render_state = null;
let buffer_state = null;
let current_worker = null;
let animate_id = null;
let is_paused = false;

const all_variations = ['linear', 'sinusoidal', 'spherical'];
let selected_variations = ['linear'];

function transform_lib() {
  return [
    {
      id: 'fern', // barnsley fern
      weight: 0.5,
      affine_coefs: { a: 0.85, b: 0.04, c: 0.0, d: 0.0, e: -0.04, f: 0.85, g: 0.0, h: 1.6, i: 0.0, j: 0.0, k: 1.0, l: 0.0 },
      variations: [{f: selected_variations[0], weight: 1.0}],
    },
    {
      id: 'curl',
      weight: 0.5,
      affine_coefs: { a: 0.2, b: -0.26, c: 0.0, d: 0.0, e: 0.23, f: 0.22, g: 0.0, h: 0.8, i: 0.0, j: 0.0, k: 0.8, l: 0.0 }, 
      variations: [{f: selected_variations[1] || 'sinusoidal', weight: 1.0}],
    }
  ]
}

const ITERATION_COUNT = 5000000;

window.addEventListener('DOMContentLoaded', main);
window.addEventListener('resize', () => {
  const cv = document.querySelector("#glcanvas");
  cv.width = window.innerWidth * 0.8;
  cv.height = window.innerHeight * 0.8;
});

function main() {
  const canvas = document.querySelector("#glcanvas");
  canvas.width = window.innerWidth * 0.80;
  canvas.height = window.innerHeight * 0.80;
  // Initialize the GL context
  const gl = canvas.getContext("webgl");
  console.log('WebGL context:', gl);
  if (gl === null) {
    alert("Unable to initialize WebGL. Your browser or machine may not support it.");
    return;
  }

  variation_controls();

  const vertex_shader = `
    attribute vec3 aVertexPosition;
    attribute vec3 aVertexColor;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    varying lowp vec4 vColor;

    void main() {
      vec4 mvPosition = uModelViewMatrix * vec4(aVertexPosition, 1.0);

      // size of points
      gl_Position = uProjectionMatrix * mvPosition;
      gl_PointSize = 5.26 / -mvPosition.z;

      // depth fading
      float fade = clamp(5.0 / -mvPosition.z, 0.75, 1.25);
      vColor = vec4(aVertexColor * fade, 0.6);
    }
  `;

  const frgmnt_shader = `
    varying lowp vec4 vColor;
    void main() {
      gl_FragColor = vColor;
    }
  `;

  const shader_program = initShader(gl, vertex_shader, frgmnt_shader);

  // collect info needed to use shader program
  render_state = {
    gl: gl,
    program: shader_program,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shader_program, "aVertexPosition"),
      vertexColor: gl.getAttribLocation(shader_program, "aVertexColor"),
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
  // gl.viewport(0,0,canvas.width, canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT);
  start_generation(transform_lib(), ITERATION_COUNT, selected_variations);
}

function variation_controls() {
  const checkboxesDiv = document.getElementById('variation-checkboxes');
  checkboxesDiv.innerHTML = '';

  all_variations.forEach(variation => {
    const div = document.createElement('div');
    div.className = 'variation-option';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `var-${variation}`;
    checkbox.value = variation;
    checkbox.checked = selected_variations.includes(variation);

    checkbox.addEventListener('change', function() {
      if (this.checked && !selected_variations.includes(this.value)) {
        selected_variations.push(this.value);
      } else if (!this.checked) {
        selected_variations = selected_variations.filter(v => v !== this.value);
      }
    });
    const label = document.createElement('label');
    label.htmlFor = `var-${variation}`;
    label.textContent = variation;
    label.style.marginLeft = '5px';
    label.style.cursor = 'pointer';
    div.appendChild(checkbox);
    div.appendChild(label);
    checkboxesDiv.appendChild(div);
  });

  // pause
  const pause_check = document.getElementById('pause-animation');
  pause_check.addEventListener('change', function() {
    is_paused = this.checked;
    if (current_worker) {
      current_worker.postMessage({ type: is_paused ? 'pause' : 'resume' });
    }
  });

  // regenerate button
  document.getElementById('regenerate-btn').addEventListener('click', () => {
    if (selected_variations.length < 1) {
      alert('Please select at least 1 variation'); return;
    }
    if (current_worker) current_worker.terminate();
    start_generation(transform_lib(), ITERATION_COUNT, selected_variations);
  })
}

function start_generation(transforms, iterations, available_variations) {
  if(animate_id) {
    cancelAnimationFrame(animate_id);
    animate_id = null;
  }
  
  const worker = new Worker('./fractalflame.js');
  worker.onmessage = function(e) {
    if (e.data.type === 'complete') {
      const point_data = e.data.point_data;
      buffer_state = buffer_flame_data_color(render_state.gl, point_data);
      animate();
    }
  }
  worker.postMessage({
    type: 'start',
    transforms: transforms,
    iterations: iterations,
    available_variations: available_variations
  });
}

function animate() {
  if (!is_paused && buffer_state) {
    const gl = render_state.gl;
    gl.viewport(0,0, gl.canvas.width, gl.canvas.height);
    render_flame(render_state.gl, render_state, buffer_state);
  }
  animate_id = requestAnimationFrame(animate);
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