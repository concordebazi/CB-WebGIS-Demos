
from pathlib import Path

import numpy as np
import rasterio
from pysheds.grid import Grid


# ==========================================
# GEORISK AI - TERRAIN DEPRESSION ANALYSIS
# CB WEB & GIS
# ==========================================

BASE_DIR = Path(__file__).parent

DEM_FILE = BASE_DIR / "linkoping_study_area.tif"
OUTPUT_FILE = BASE_DIR / "terrain_depressions.tif"

print("GeoRisk AI - Terrain Depression Analysis")
print("----------------------------------------")

# Load the real Lantmäteriet elevation model
grid = Grid.from_raster(str(DEM_FILE))
dem = grid.read_raster(str(DEM_FILE))

# ==========================================
# HYDROLOGICAL TERRAIN CONDITIONING
# ==========================================

# Step 1: Fill isolated single-cell pits
pit_filled_dem = grid.fill_pits(dem)

# Step 2: Fill larger enclosed depressions
filled_dem = grid.fill_depressions(pit_filled_dem)

# Step 3: Calculate total elevation adjustment
# relative to the original DEM
depression_depth = (
    np.asarray(filled_dem, dtype=np.float64)
    - np.asarray(dem, dtype=np.float64)
)

# Show processing statistics
print("----------------------------------------")
print("Hydrological terrain conditioning completed.")

print(
    "Maximum elevation adjustment:",
    np.nanmax(depression_depth)
)

# Preserve the original NoData mask
with rasterio.open(DEM_FILE) as src:
    valid_mask = src.read_masks(1) > 0
    profile = src.profile.copy()

# Only positive depths are meaningful
depression_depth = np.where(
    valid_mask,
    np.maximum(depression_depth, 0),
    -9999.0
).astype("float32")
# ==========================================
# FILTER SMALL TERRAIN ADJUSTMENTS
# ==========================================

# Display only adjustments of at least 20 cm.
# This is a visualization threshold, not a
# scientifically validated flood-risk threshold.

DISPLAY_THRESHOLD = 0.20

significant_depressions = (
    valid_mask &
    (depression_depth >= DISPLAY_THRESHOLD)
)
# ==========================================
# REMOVE SMALL ISOLATED DEPRESSION AREAS
# ==========================================

from scipy.ndimage import label

# Identify connected groups of depression pixels
labeled_areas, number_of_areas = label(
    significant_depressions
)

# Calculate pixel area from DEM resolution
pixel_area = abs(
    profile["transform"].a *
    profile["transform"].e
)

# Minimum area to display: 25 square metres
MIN_AREA_M2 = 100

# Count pixels in each connected area
area_counts = np.bincount(labeled_areas.ravel())

# Keep only sufficiently large areas
minimum_pixels = max(
    1,
    int(np.ceil(MIN_AREA_M2 / pixel_area))
)

keep_area = area_counts >= minimum_pixels
keep_area[0] = False

significant_depressions = (
    significant_depressions &
    keep_area[labeled_areas]
)

print(
    "Depression pixels after area filtering:",
    np.count_nonzero(significant_depressions)
)
print("----------------------------------------")
print("TERRAIN DEPRESSION FILTER")
print("Display threshold:", DISPLAY_THRESHOLD, "m")
print(
    "Pixels above threshold:",
    np.count_nonzero(significant_depressions)
)
profile.update(
    dtype="float32",
    nodata=-9999.0,
    compress="deflate"
)

# Save the depression-depth raster
with rasterio.open(OUTPUT_FILE, "w", **profile) as dst:
    dst.write(depression_depth, 1)

positive_depths = depression_depth[
    valid_mask & (depression_depth > 0.01)
]

print("Analysis completed.")

if positive_depths.size:
    print(
        f"Maximum depression depth: "
        f"{positive_depths.max():.2f} m"
    )
    print(
        f"Depression pixels (> 1 cm): "
        f"{positive_depths.size}"
    )
else:
    print("No depressions deeper than 1 cm detected.")

print("Output:", OUTPUT_FILE)
print("----------------------------------------")
# ==========================================
# VISUALIZE TERRAIN DEPRESSION DEPTH
# ==========================================

import matplotlib.pyplot as plt

with rasterio.open(OUTPUT_FILE) as src:
    depth = src.read(1, masked=True)

depth = np.ma.masked_less_equal(depth, 0.01)

plt.figure(figsize=(10, 8))

plt.imshow(
    depth,
    cmap="Blues",
    vmin=0.01,
    vmax=4
)

plt.colorbar(label="Terrain conditioning depth (m)")
plt.title("GeoRisk AI - Linköping Terrain Depressions")
plt.axis("off")
plt.tight_layout()

map_file = BASE_DIR / "terrain_depressions_preview.png"
plt.savefig(map_file, dpi=150)
plt.close()

print("Depression preview saved:", map_file)
# ==========================================
# CREATE TRANSPARENT DEPRESSION OVERLAY
# ==========================================

from matplotlib import colormaps
from matplotlib.colors import Normalize
from PIL import Image

with rasterio.open(OUTPUT_FILE) as src:
    depression = src.read(1, masked=True)

values = depression.filled(np.nan)

# Normalize depression conditioning depth
norm = Normalize(vmin=0.01, vmax=4.0, clip=True)

# Yellow -> orange -> red color scale
rgba = colormaps["YlOrRd"](norm(values))
# Hide small terrain adjustments in the map overlay
# Keep the original GeoTIFF unchanged

rgba[~significant_depressions, 3] = 0
# Make areas with no significant adjustment transparent
rgba[
    (~np.isfinite(values)) | (values <= 0.01),
    3
] = 0

# Use stronger opacity for detected depressions
rgba[
    np.isfinite(values) & (values > 0.01),
    3
] = 0.85

overlay_file = BASE_DIR / "linkoping_depressions_overlay.png"

Image.fromarray(
    (rgba * 255).astype(np.uint8)
).save(overlay_file)

print("Transparent depression overlay saved:", overlay_file)