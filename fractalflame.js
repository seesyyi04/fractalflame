const variation_lib = {
	'linear': function(p) {
		return {x: p.x, y: p.y, z: p.z};
	},
	'sinusoidal': function(p) {
		return {
			x: Math.sin(p.x) * 3,
			y: Math.sin(p.y) * 3,
			z: Math.sin(p.z) * 3
		}
	},
	'spherical': function(p) {
		const r_sq = p.x * p.x + p.y * p.y + p.z * p.z + 0.001;
		return {
			x: p.x/r_sq,
			y: p.y/r_sq,
			z: p.z/r_sq,
		}
	},
	// 'julia': function(p) {

	// }
};

let variation_map = {};

const random_biunit_square = () => Math.random() * 2 - 1;

function random_func_weighted(transforms) {
	let total_weight = 0;

	// calculating weight for each transform
	for (const t of transforms) {
		total_weight += t.weight;
	}
	if (total_weight <= 0 || isNaN(total_weight)) {
        return transforms[Math.floor(Math.random() * transforms.length)];
    }

	// select a transform based on new weights
	let rand_val = Math.random() * total_weight;
	let cumulative_weight = 0;
	for (let i = 0; i < transforms.length; i++) {
		cumulative_weight += transforms[i].weight;
		if (rand_val < cumulative_weight) return transforms[i];
	}

	return transforms[transforms.length - 1];
}

function apply_affine(point, coefs) {
	const {x, y, z} = point;
	const {a, b, c, d, e, f, g, h, i, j, k, l} = coefs;

	const x_affine = (a * x + b * y + c * z + d);
	const y_affine = (e * x + f * y + g * z + h);
	const z_affine = (i * x + j * y + k * z + l);

	return {x: x_affine, y: y_affine, z: z_affine};
}

function apply_variation(point, variations) {
	let x_sum = 0.0, y_sum = 0.0, z_sum = 0.0, total_weight = 0.0;

	// weighted sum of variation outputs
	for (const {f, weight} of variations) {
		// run variation function
		const var_func = variation_map[f];

		if (var_func) {
			const var_point = var_func(point);
			x_sum += var_point.x * weight;
			y_sum += var_point.y * weight;
			z_sum += var_point.z * weight;
			total_weight += weight;
		}
	}

	if (total_weight > 0) {
		return {x: x_sum, y: y_sum, z: z_sum};
	} else {
		return point;
	}
}

function chaos_game(transforms, num_iterations) {
	// 3D histogram
	const res = 256;
	const hist_W = res;
	const hist_H = res;
	const hist_D = res;
	const skip_points = 20;
	const range = res, offset = res / 2;

	let current_point = {
		x: random_biunit_square() * offset,
		y: random_biunit_square() * offset,
		z: random_biunit_square() * offset
	}
	const histogram = new Float32Array(hist_W * hist_H * hist_D * 4).fill(0.0); // r, g, b count
	const point_history = [];

	for (let i = 0; i < num_iterations; i++) {
		// select a weighted transform
		const selected_transform = random_func_weighted(transforms);
		// apply affine transformation
		const intermediate = apply_affine(current_point, selected_transform.affine_coefs);
		// apply weighted variations
		current_point = apply_variation(intermediate, selected_transform.variations);

		// only record after 20 points 
		if (i > skip_points) {
			point_history.push({...current_point}) // creates a shallow copy

			// map coordinates (-1 to 1) to screen pixels (0 to width/height)
			const x_norm = (current_point.x + offset) / range;
			const y_norm = (current_point.y + offset) / range;
			const z_norm = (current_point.z + offset) / range;

			const x_pixel = Math.floor(x_norm * hist_W);
			const y_pixel = Math.floor(y_norm * hist_H);
			const z_pixel = Math.floor(z_norm * hist_D);

			if (x_pixel >= 0 && x_pixel < hist_W &&
				y_pixel >= 0 && y_pixel < hist_H &&
				z_pixel >= 0 && z_pixel < hist_D) {
				const index = ((z_pixel * hist_H + y_pixel) * hist_W + x_pixel) * 4; // determines starting pos in the flat 1D arr
				
				let r = 0.0, g = 0.0, b = 0.0;
				if (selected_transform.id.includes('fern')) { 
					r = 1.0; g = 0.65; b = 0.0; 
				} else if (selected_transform.id.includes('curl')) { 
					r = 0.61; g = 0.39; b = 0.55; 
				} 

				// accumulate color sums and increment count
				histogram[index + 0] += r;
				histogram[index + 1] += g;
				histogram[index + 2] += b;
				histogram[index + 3] += 1.0;
			}
		}
	}
	// recalculating log-density parameters
	let max_count = 0;
	for (let i = 3; i < histogram.length; i+=4) {
		if (histogram[i] > max_count) max_count = histogram[i];
	}
	if (max_count === 0) max_count = 1;
	const log_max_count = Math.log10(max_count + 1);
	const gamma = 1.0/2.2;
	const point_cloud = []

	const target_points = 1000000;
	const sample_rate = Math.max(1, Math.floor(point_history.length / target_points));

	for (let i = 0; i < point_history.length; i+=sample_rate) {
		const point = point_history[i];

		// corresponding histogram data for this point's location
		const x_norm = (point.x + offset) / range;
		const y_norm = (point.y + offset) / range;
		const z_norm = (point.z + offset) / range;

		const x_pixel = Math.floor(x_norm * hist_W);
		const y_pixel = Math.floor(y_norm * hist_H);
		const z_pixel = Math.floor(z_norm * hist_D);

		if (x_pixel >= 0 && x_pixel < hist_W &&
			y_pixel >= 0 && y_pixel < hist_H &&
			z_pixel >= 0 && z_pixel < hist_D) {
			const index = ((z_pixel * hist_H + y_pixel) * hist_W + x_pixel) * 4;
			const count = histogram[index + 3];
	
			if (count > 0) {
				const log_density = Math.log10(count + 1);
				let brightness = log_density / log_max_count;
				brightness = Math.pow(brightness, gamma);
	
				// average r, g, b, sums by hit count
				const r_avg = histogram[index + 0] / count;
				const g_avg = histogram[index + 1] / count;
				const b_avg = histogram[index + 2] / count;
	
				// final color = avg color * brightness (log density)
				const r_final = r_avg * brightness;
				const g_final = g_avg * brightness;
				const b_final = b_avg * brightness;
	
				// x, y, z, r, g, b
				point_cloud.push(point.x, point.y, point.z, r_final, g_final, b_final);
				
			}
		}
	}

	return point_cloud;
}

// worker message handler
self.onmessage = function(e) {
	if (e.data.type === 'start') {
		const available_variations = e.data.available_variations || ['linear'];
		variation_map = {};
		for (const v of available_variations) {
			if (variation_lib[v]) {
				variation_map[v] = variation_lib[v];
			}
		}

		const point_data = chaos_game(e.data.transforms, e.data.iterations);
		self.postMessage({
			type: 'complete',
			point_data: point_data
		});
	}
};