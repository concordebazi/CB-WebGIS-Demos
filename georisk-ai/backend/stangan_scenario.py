
from pathlib import Path
import json
import rasterio
from rasterio.warp import transform

# ==========================================
# GEORISK AI — STÅNGÅN SCENARIO
# CB WEB & GIS
# ==========================================

BASE_DIR = Path(__file__).parent

DEM_FILE = BASE_DIR / "linkoping_study_area.tif"
RIVER_FILE = BASE_DIR / "stangan_reference.geojson"

# Load river reference point
with open(RIVER_FILE, "r", encoding="utf-8") as f:
    river_data = json.load(f)

feature = river_data["features"][0]
lon, lat = feature["geometry"]["coordinates"]

# Read elevation at the river point
with rasterio.open(DEM_FILE) as dem:

    xs, ys = transform(
        "EPSG:4326",
        dem.crs,
        [lon],
        [lat]
    )

    x, y = xs[0], ys[0]

    if not (
        dem.bounds.left <= x < dem.bounds.right
        and dem.bounds.bottom < y <= dem.bounds.top
    ):
        raise ValueError("River reference point is outside the DEM.")

    sample = next(dem.sample([(x, y)], masked=True))
    elevation = sample[0]

    if bool(getattr(elevation, "mask", False)):
        raise ValueError("No valid elevation at river reference point.")

    reference_elevation = float(elevation)

    print("GEORISK AI — STÅNGÅN REFERENCE")
    print("--------------------------------")
    print(f"Latitude: {lat:.6f}")
    print(f"Longitude: {lon:.6f}")
    print(f"DEM CRS: {dem.crs}")
    print(f"DEM elevation: {reference_elevation:.2f} m")
    print("--------------------------------")
    print("Provisional DEM-based reference only.")
    print("Not a verified river water-surface measurement.")
    # ==========================================
# HYPOTHETICAL WATER-LEVEL SCENARIOS
# ==========================================

water_level_increases = [
    0.0,
    0.5,
    1.0,
    1.5,
    2.0,
    2.5,
    3.0
]

print()
print("STÅNGÅN — HYPOTHETICAL WATER LEVELS")
print("-----------------------------------")

for increase in water_level_increases:

    scenario_elevation = reference_elevation + increase

    print(
        f"+{increase:.1f} m → "
        f"{scenario_elevation:.2f} m"
    )

print("-----------------------------------")
print("Illustrative scenarios — not flood predictions.")
# ==========================================
# VERIFY STÅNGÅN CENTRELINE AGAINST DEM
# ==========================================

with open(BASE_DIR / "stangan_river.geojson", "r", encoding="utf-8") as f:
    river_geojson = json.load(f)

river_coordinates = river_geojson["features"][0]["geometry"]["coordinates"]

with rasterio.open(DEM_FILE) as dem:

    longitudes = [point[0] for point in river_coordinates]
    latitudes = [point[1] for point in river_coordinates]

    xs, ys = transform(
        "EPSG:4326",
        dem.crs,
        longitudes,
        latitudes
    )

    inside_count = sum(
        dem.bounds.left <= x < dem.bounds.right
        and dem.bounds.bottom < y <= dem.bounds.top
        for x, y in zip(xs, ys)
    )

    print()
    print("STÅNGÅN — RIVER GEOMETRY CHECK")
    print("--------------------------------")
    print("Total river vertices:", len(river_coordinates))
    print("Vertices inside DEM:", inside_count)
    print("Vertices outside DEM:", len(river_coordinates) - inside_count)
    
# ==========================================
# RASTERIZE STÅNGÅN RIVER CENTRELINE
# ==========================================

from rasterio.features import rasterize
from rasterio.warp import transform_geom

RIVER_RASTER_FILE = BASE_DIR / "stangan_river_mask.tif"

with rasterio.open(DEM_FILE) as dem:

    # Transform river geometry into DEM coordinates
    river_geometry = river_geojson["features"][0]["geometry"]

    river_geometry_projected = transform_geom(
        "EPSG:4326",
        dem.crs,
        river_geometry
    )

    # Rasterize using the exact DEM grid
    river_mask = rasterize(
        [(river_geometry_projected, 1)],
        out_shape=(dem.height, dem.width),
        transform=dem.transform,
        fill=0,
        dtype="uint8",
        all_touched=True
    )

    # Verify river pixels overlap valid DEM data
    valid_dem = dem.read_masks(1) > 0

    river_pixels = river_mask == 1
    valid_river_pixels = river_pixels & valid_dem

    print()
    print("STÅNGÅN — RASTERIZATION")
    print("--------------------------------")
    print("Total river pixels:", int(river_pixels.sum()))
    print("River pixels with valid DEM:", int(valid_river_pixels.sum()))
    print("River pixels without valid DEM:", int((river_pixels & ~valid_dem).sum()))

    # Save the raster with the same grid and CRS
    profile = dem.profile.copy()

    profile.update(
        dtype="uint8",
        nodata=0,
        count=1,
        compress="deflate"
    )

    with rasterio.open(RIVER_RASTER_FILE, "w", **profile) as dst:
        dst.write(river_mask, 1)

    print("River raster saved:", RIVER_RASTER_FILE)
    
# ==========================================
# ANALYZE DEM VALUES ALONG STÅNGÅN
# ==========================================

import numpy as np

with rasterio.open(DEM_FILE) as dem:
    terrain = dem.read(1, masked=True)

with rasterio.open(RIVER_RASTER_FILE) as river:
    river_mask = river.read(1) == 1

# Extract valid DEM elevations along the river centreline
river_elevations = terrain[river_mask].compressed()

if river_elevations.size == 0:
    raise ValueError("No valid DEM elevations along Stångån.")

print()
print("STÅNGÅN — RIVER DEM ELEVATION STATISTICS")
print("----------------------------------------")
print(f"Minimum: {np.min(river_elevations):.2f} m")
print(f"Maximum: {np.max(river_elevations):.2f} m")
print(f"Average: {np.mean(river_elevations):.2f} m")
print(f"Median:  {np.median(river_elevations):.2f} m")
print(f"Range:   {np.ptp(river_elevations):.2f} m")
print("----------------------------------------")
print("These are DEM values, not measured river levels.")

# ==========================================
# STÅNGÅN — MULTIPLE WATER-LEVEL SCENARIOS
# ==========================================

from scipy.ndimage import binary_propagation
from PIL import Image

# Read the real elevation model
with rasterio.open(DEM_FILE) as dem:
    terrain = dem.read(1, masked=True)

    valid_dem = ~np.ma.getmaskarray(terrain)
    terrain_values = terrain.filled(np.inf)

# Read the Stångån river raster
with rasterio.open(RIVER_RASTER_FILE) as river:
    river_pixels = river.read(1) == 1

# Four-neighbour connectivity
connectivity = np.array([
    [0, 1, 0],
    [1, 1, 1],
    [0, 1, 0]
], dtype=bool)

# Water-level scenarios
scenario_increases = [
    0.0,
    0.5,
    1.0,
    1.5,
    2.0,
    2.5,
    3.0
]

print()
print("STÅNGÅN — GENERATING SCENARIOS")
print("--------------------------------")

for increase in scenario_increases:

    # Hypothetical water-surface elevation
    scenario_level = reference_elevation + increase

    # Terrain below the scenario level
    eligible_cells = (
        valid_dem &
        (terrain_values <= scenario_level)
    )

    # Start from the river
    river_seeds = river_pixels & eligible_cells

    # Calculate connected terrain
    connected_cells = binary_propagation(
        river_seeds,
        structure=connectivity,
        mask=eligible_cells
    )

    # Create transparent RGBA image
    overlay = np.zeros(
        (connected_cells.shape[0],
         connected_cells.shape[1], 4),
        dtype=np.uint8
    )

    # ==========================================
    # ==========================================
    # STÅNGÅN — SCENARIO COLOR PALETTE
    # ==========================================

    scenario_colors = {
        0.0: (0, 207, 255),
        0.5: (22, 136, 255),
        1.0: (0, 181, 168),
        1.5: (233, 196, 74),
        2.0: (255, 152, 46),
        2.5: (240, 91, 54),
        3.0: (229, 54, 78)
    }

    # Select scenario color
    red, green, blue = scenario_colors[increase]

    # Apply color
    overlay[connected_cells, 0] = red
    overlay[connected_cells, 1] = green
    overlay[connected_cells, 2] = blue

    # Transparency
    overlay[connected_cells, 3] = 170
    # Filename
    level_name = f"{increase:g}".replace(".", "_")

    output_file = (
        BASE_DIR /
        f"stangan_scenario_{level_name}m.png"
    )

    Image.fromarray(overlay).save(output_file)

    print(
        f"+{increase:.1f} m | "
        f"Elevation: {scenario_level:.2f} m | "
        f"Connected pixels: {int(connected_cells.sum())} | "
        f"Saved: {output_file.name}"
    )

print("--------------------------------")
print("All Stångån scenario overlays generated.")
print("Illustrative terrain connectivity only.")
print("Not a validated flood prediction.")

