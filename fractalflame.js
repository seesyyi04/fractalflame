const variation_map = {
	'linear' : linear
};

const random_biunit_square = () => Math.random() * 2 - 1;

function linear(p) {
	return {x: p.x, y: p.y, z: p.z};
}

function random_func_weighted(transforms) {
	let total_weight = transforms.reduce((sum, t) => sum + t.weight, 0);
	let random_val = Math.random() * total_weight;
	let cumulative_weight = 0;

	for (const t of transforms) {
		cumulative_weight += t.weight;
		if (random_val < cumulative_weight) {
			return t;
		}
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
		return {x: x_sum / total_weight, y: y_sum / total_weight, z: z_sum / total_weight};
	} else {
		return point;
	}
}

function chaos_game(transforms, num_iterations) {
	let current_point = {
		x: random_biunit_square(),
		y: random_biunit_square(),
		z: random_biunit_square()
	}

	const point_cloud_flat = [];
	const skip_points = 20;

	for (let i = 0; i < num_iterations; i++) {
		// select a weighted transform
		const selected_transform = random_func_weighted(transforms);
		// apply affine transformation
		const intermediate = apply_affine(current_point, selected_transform.affine_coefs);
		// apply weighted variations
		current_point = apply_variation(intermediate, selected_transform.variations);
		// only record after 20 points 
		if (i > skip_points) {
			point_cloud_flat.push(current_point.x, current_point.y, current_point.z);
		}
	}
	return point_cloud_flat;
}

// worker message handler
self.onmessage = function(e) {
	if (e.data.type === 'start') {
		const point_data = chaos_game(e.data.transforms, e.data.iterations);
		self.postMessage({
			type: 'complete',
			point_data: point_data
		});
	}
};