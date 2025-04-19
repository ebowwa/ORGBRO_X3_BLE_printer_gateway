#  i want to be able to manipulate unique pixels
# i want an llm to be able to do this
# i see we can modify the density of the whole image but im sure we can be far more specific and niche than that

import numpy as np
from PIL import Image

def create_density_map(image_path: str, default_density: int = 127) -> np.ndarray:
    """Generate a density map filled with the default_density for the given image dimensions."""
    img = Image.open(image_path).convert("L")
    arr = np.array(img)
    return np.full(arr.shape, default_density, dtype=np.uint8)

def set_pixel_density(density_map: np.ndarray, x: int, y: int, density: int):
    """Set the density value for a single pixel at (x, y)."""
    density_map[y, x] = density

def set_region_density(density_map: np.ndarray, x0: int, y0: int, width: int, height: int, density: int):
    """Set a rectangular region to a specific density."""
    density_map[y0:y0+height, x0:x0+width] = density