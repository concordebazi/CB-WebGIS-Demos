
from pathlib import Path
import rasterio
import numpy as np
from scipy.ndimage import label
import json
from rasterio.transform import xy
from rasterio.warp import transform as transform_coords


# GeoRisk AI - Terrain Low-Point Analysis
# CB Web & GIS

BASE_DIR = Path(__file__).parent
DATA_FILE = BASE_DIR / "linkoping_study_area.tif"

with rasterio.open(DATA_FILE) as dem:
    elevation = dem.read(1, masked=True)
    valid = elevation.compressed()

    print("GeoRisk AI - Low-Point Analysis")
    print("-------------------------------")
    print(f"Minimum elevation: {np.min(valid):.2f} m")
    print(f"Maximum elevation: {np.max(valid):.2f} m")
    print(f"Average elevation: {np.mean(valid):.2f} m")
    print("Elevation reference: RH 2000")

    # ==========================================
    # LOCAL TERRAIN LOW-POINT DETECTION
    # ==========================================

    from scipy.ndimage import minimum_filter

    # Use a 21 x 21 pixel neighborhood
    terrain = elevation.filled(np.nan).astype(float)
    valid_mask = np.isfinite(terrain)

    # Prevent missing pixels from becoming false low points
    terrain_safe = np.where(valid_mask, terrain, np.inf)

    local_minimum = minimum_filter(
        terrain_safe,
        size=21,
        mode="nearest"
    )

    # Identify pixels at the local minimum elevation
    low_points = (
        valid_mask
        & (terrain_safe == local_minimum)
    )

    print("-------------------------------")
    print("LOCAL LOW-POINT DETECTION")
    print("Low-point pixels:", np.sum(low_points))
    print("Neighborhood: 21 x 21 pixels")
    
    # ==========================================
    # EXPORT LOCAL LOW POINTS TO GEOJSON
    # ==========================================

        # ==========================================
    # GROUP CONNECTED LOW-POINT PIXELS
    # ==========================================

    # 8-neighbour connectivity
    structure = np.ones((3, 3), dtype=np.uint8)

    # Identify connected groups
    labeled_points, number_of_groups = label(
        low_points,
        structure=structure
    )

    print("Connected low-point groups:", number_of_groups)

    # Select one representative pixel per group
    representative_rows = []
    representative_cols = []

    for group_id in range(1, number_of_groups + 1):

        group_rows, group_cols = np.where(
            labeled_points == group_id
        )

        # Select the lowest-elevation pixel in the group
        group_elevations = terrain[
            group_rows, group_cols
        ]

        lowest_index = np.argmin(group_elevations)

        representative_rows.append(
            group_rows[lowest_index]
        )

        representative_cols.append(
            group_cols[lowest_index]
        )

    rows = np.array(representative_rows)
    cols = np.array(representative_cols)

    xs, ys = xy(
        dem.transform,
        rows,
        cols,
        offset="center"
    )

    longitudes, latitudes = transform_coords(
        dem.crs,
        "EPSG:4326",
        list(xs),
        list(ys)
    )

    features = []

    for row, col, lon, lat in zip(
        rows, cols, longitudes, latitudes
    ):
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lon, lat]
            },
            "properties": {
                "elevation_m": round(
                    float(terrain[row, col]), 2
                ),
                "type": "local_elevation_minimum"
            }
        })

    geojson = {
        "type": "FeatureCollection",
        "features": features
    }

    output_file = BASE_DIR.parent / "low_points.geojson"

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(geojson, f, indent=2)

    print("-------------------------------")
    print("GeoJSON exported:", output_file)
    print("Exported low points:", len(features))

