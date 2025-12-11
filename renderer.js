import { mat4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/+esm';
let rotation_angle = 0.0;

// creates 3d points for the flames
export function buffer_flame_data(gl, pointData) {
	// buffer for point positions
	const buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	const positions = new Float32Array(pointData);
	// upload data to GPU
	gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

	return {
		buffer: buffer,
		vertex_count: positions.length/3,
	};
}

// tell webgl how to pull out the positions from the position buffer into the vertexPosition attribute
export function setPositionAttribute(gl, buffers, program_info) {
	const numComponents = 3; // pull out 3 values per iteration
	const type = gl.FLOAT; // 32 bit floats
	const normalize = false; 
	const stride = 0;
	const offset = 0;
	gl.bindBuffer(gl.ARRAY_BUFFER, buffers.buffer);
	gl.vertexAttribPointer(
		program_info.attribLocations.vertexPosition,
		numComponents,
		type,
		normalize,
		stride,
		offset,
	);
	gl.enableVertexAttribArray(program_info.attribLocations.vertexPosition);
}

export function render_flame(gl, program_info, buffers) {
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// projection matrix
	const fov = (45 * Math.PI) / 180; // radians (45 degrees)
	const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
	const zNear = 0.1;
	const zFar = 100.0;
	const projection_matrix = mat4.create();
	// note: glMatrix always has the first argument as the destination to receive the result
	mat4.perspective(projection_matrix, fov, aspect, zNear, zFar);
	
	// modelview matrix
	// set drawing position to the "identity" point (center of scene)
	const model_view_mat = mat4.create();
	mat4.translate(
		model_view_mat, // destination matrix
		model_view_mat, // matrix to translate
		[-0.0, 0.0, -6.0], // amount to translate
	);
	// continuous rotation
	rotation_angle += 0.01;
	mat4.rotateY(model_view_mat, model_view_mat, rotation_angle);
	mat4.rotateX(model_view_mat, model_view_mat, rotation_angle * 0.5);

	// draw
	// tell webgl how to pull out the positions from the position buffer into the vertexPosition attribute
	setPositionAttribute(gl, buffers, program_info);
	// tell webgl to use out program when drawing
	gl.useProgram(program_info.program);
	// set shader uniforms
	gl.uniformMatrix4fv(
		program_info.uniformLocations.projectionMatrix,
		false,
		projection_matrix);
	gl.uniformMatrix4fv(
		program_info.uniformLocations.modelViewMatrix,
		false,
		model_view_mat);
	gl.drawArrays(gl.POINTS, 0, buffers.vertex_count);
}