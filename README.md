# Fractal Flames

https://seesyyi04.github.io/fractalflame/

This repository renders fractal flames with some basic variations, such as linear, sinusoidal, and spherical, with weighted affine transformations, such as the Barnsley fern and curls. <br> Within this variation of the Chaos Game, the flames start by getting a random biunit square 3D point in the histogram and repeatedly applies a predefined, randomly selected, and weighted affine transformation. Then, depending on the front-end input, it will also apply one or multiple variations to that point. After the declared number of iterations, which is currently 5,000,000, and plotting every 20 points (for the sake of eliminating random noise), a fractal flame shape will emerge. <br> The point clouds are colored with a log-density display and applies gamma correction to make areas that are hit by more points to appear brighter and more vibrant. In this current version, when the fern transformation is selected, the points will be colored an orange color, and when the curl transformation is selected, the points will be colored a purple color. How the bright an area is and how much the colors eventually blend together will depend on how many points hit a specific region.

WebGL was used for the 3D rendering. 

The paper 'Fractal Flame Algorithm' by Scott Draves and Erik Reckase was used as a reference for the content.

Future to-do:
* Add more interesting variations (at least 5 more).
* Add more affine transformation options (at least 5 more).
* (1) Add to the UI control panel so user can choose how much each transformation is weighted.
* (2) Be able to see how changing the weights affect the flames in real time.
* Be able to move around the generated flame with keyboard controls.
* Incorporate post transforms.
* Incorporate final transforms.
* Add more color to the flames.
* Attempt motion blur?
