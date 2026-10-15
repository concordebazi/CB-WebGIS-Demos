
from pathlib import Path

import rasterio
from rasterio.warp import transform as transform_coords
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
from rasterio.windows import Window
from scipy.ndimage import binary_propagation
app = FastAPI(
    title="GeoRisk AI API",
    description="Real terrain analysis using Lantmäteriet elevation data",
    version="1.0"
)


# Allow local development and the public GeoRisk AI demo
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "https://concordebazi.github.io"
    ],
    allow_methods=["GET"],
    allow_headers=["*"]
)


DATA_FILE = Path(__file__).parent / "linkoping_study_area.tif"
# Terrain depression raster generated from the DEM
DEPRESSION_FILE = (
    Path(__file__).parent / "terrain_depressions.tif"
)
# ==========================================
# STÅNGÅN — ILLUSTRATIVE SCENARIO ANALYSIS
# ==========================================

RIVER_MASK_FILE = (
    Path(__file__).parent / "stangan_river_mask.tif"
)

REFERENCE_ELEVATION = 36.60  # Provisional DEM-based reference, RH 2000

SCENARIO_LEVELS = (0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0)


def analyze_stangan_scenario(lat, lon, water_level):

    if water_level not in SCENARIO_LEVELS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported Stångån scenario level"
        )

    if not RIVER_MASK_FILE.exists():
        return None

    with rasterio.open(DATA_FILE) as dem, \
         rasterio.open(RIVER_MASK_FILE) as river:

        # Verify both rasters use the same grid
        if (
            dem.crs != river.crs
            or dem.transform != river.transform
            or dem.shape != river.shape
        ):
            raise HTTPException(
                status_code=500,
                detail="Stångån river mask does not match the DEM"
            )

        terrain = dem.read(1, masked=True)
        valid_dem = ~np.ma.getmaskarray(terrain)
        terrain_values = terrain.filled(np.inf)

        river_pixels = river.read(1) == 1

        scenario_elevation = (
            REFERENCE_ELEVATION + water_level
        )

        eligible_cells = (
            valid_dem &
            (terrain_values <= scenario_elevation)
        )

        river_seeds = river_pixels & eligible_cells

        connectivity = np.array([
            [0, 1, 0],
            [1, 1, 1],
            [0, 1, 0]
        ], dtype=bool)

        connected_cells = binary_propagation(
            river_seeds,
            structure=connectivity,
            mask=eligible_cells
        )

        xs, ys = transform_coords(
            "EPSG:4326",
            dem.crs,
            [lon],
            [lat]
        )

        row, col = dem.index(xs[0], ys[0])

        if not (
            0 <= row < dem.height
            and 0 <= col < dem.width
        ):
            return None

        return {
            "water_level_increase_m": water_level,
            "scenario_elevation_m": round(
                scenario_elevation, 2
            ),
            "within_scenario": bool(
                connected_cells[row, col]
            ),
            "method": "DEM-based terrain connectivity",
            "validated_flood_prediction": False
        }
@app.get("/")
def home():
    return {
        "application": "GeoRisk AI",
        "status": "running",
        "data_source": "Lantmäteriet"
    }


@app.get("/elevation")
def get_elevation(
    lat: float,
    lon: float,
    water_level: float = 1.0
):

    if not DATA_FILE.exists():
        raise HTTPException(
            status_code=500,
            detail="Elevation dataset not found"
        )

    with rasterio.open(DATA_FILE) as dem:

        # Convert WGS84 coordinates to raster CRS
        xs, ys = transform_coords(
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
            raise HTTPException(
                status_code=400,
                detail="Location outside study area"
            )

        # Sample the actual elevation raster
        value = next(
            dem.sample([(x, y)], masked=True)
        )[0]

        if bool(getattr(value, "mask", False)):
            raise HTTPException(
                status_code=404,
                detail="No elevation data at this location"
            )

        elevation = float(value)

        if dem.nodata is not None and elevation == dem.nodata:
            raise HTTPException(
                status_code=404,
                detail="No elevation data at this location"
            )

                # ==========================================
        # REAL TERRAIN SLOPE ANALYSIS
        # Lantmäteriet 1-metre elevation model
        # ==========================================

        row, col = dem.index(x, y)

        slope_degrees = None

        # A 3x3 elevation neighbourhood is required
        # for calculating the local terrain gradient.
        if (
            1 <= row < dem.height - 1
            and 1 <= col < dem.width - 1
        ):
            window = Window(col - 1, row - 1, 3, 3)

            terrain = dem.read(
                1,
                window=window,
                masked=True
            )

            if not np.ma.getmaskarray(terrain).any():

                z = terrain.astype(float).filled(np.nan)

                pixel_x = abs(dem.res[0])
                pixel_y = abs(dem.res[1])

                # Central difference gradient
                dz_dx = (z[1, 2] - z[1, 0]) / (2 * pixel_x)
                dz_dy = (z[2, 1] - z[0, 1]) / (2 * pixel_y)

                slope_degrees = round(
                    float(
                        np.degrees(
                            np.arctan(
                                np.sqrt(dz_dx**2 + dz_dy**2)
                            )
                        )
                    ),
                    2
                )
        # ==========================================
        # TERRAIN DEPRESSION ANALYSIS
        # ==========================================

        depression_depth_m = None

        if DEPRESSION_FILE.exists():
            with rasterio.open(DEPRESSION_FILE) as depression_raster:

                # Convert coordinates to the depression raster CRS
                dx, dy = transform_coords(
                    "EPSG:4326",
                    depression_raster.crs,
                    [lon],
                    [lat]
                )

                depression_value = next(
                    depression_raster.sample(
                        [(dx[0], dy[0])],
                        masked=True
                    )
                )[0]

                if not np.ma.is_masked(depression_value):
                    depth = float(depression_value)

                    
                    if np.isfinite(depth):
                        depression_depth_m = round(
                            max(depth, 0.0),
                            2
                        )

        # ==========================================
        # STÅNGÅN — SCENARIO ANALYSIS
        # ==========================================

        stangan_scenario = analyze_stangan_scenario(
            lat,
            lon,
            water_level
        )

        # ==========================================
        # RETURN COMPLETE GIS ANALYSIS
        # ==========================================

        return {
            "latitude": lat,
            "longitude": lon,
            "elevation_m": round(elevation, 2),
            "slope_degrees": slope_degrees,
            "depression_depth_m": depression_depth_m,
            "stangan_scenario": stangan_scenario,
            "vertical_reference": "RH 2000",
            "source": "Lantmäteriet"
        }

