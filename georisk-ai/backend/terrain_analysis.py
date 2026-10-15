
from pathlib import Path

import rasterio
import numpy as np
from rasterio.windows import from_bounds
from rasterio.plot import plotting_extent
from rasterio.warp import transform_bounds
from pyproj import Transformer

import matplotlib.pyplot as plt
from matplotlib import colormaps
from matplotlib.colors import Normalize
from PIL import Image


# ==========================================
# GEORISK AI - REAL TERRAIN ANALYSIS
# CB WEB & GIS
# ==========================================

BASE_DIR = Path(__file__).parent
DATA_FILE = BASE_DIR / "data" / "m647_53.tif"

# Central Linköping study area (WGS84)
west, south = 15.615, 58.405
east, north = 15.640, 58.418

# Convert WGS84 coordinates to the source raster CRS (EPSG:5845)
transformer = Transformer.from_crs(
    "EPSG:4326",
    "EPSG:5845",
    always_xy=True
)

left, bottom = transformer.transform(west, south)
right, top = transformer.transform(east, north)

print("GeoRisk AI - Linköping Terrain Analysis")
print("--------------------------------------")


# ==========================================
# OPEN LANTMATERIET ELEVATION MODEL
# ==========================================

with rasterio.open(DATA_FILE) as dem:

    # Select the study area
    window = from_bounds(
        left,
        bottom,
        right,
        top,
        transform=dem.transform
    )

           # Use complete raster pixels without trimming
    from rasterio.windows import Window
    import math

    window = Window(
        col_off=math.floor(window.col_off),
        row_off=math.floor(window.row_off),
        width=math.ceil(window.col_off + window.width) - math.floor(window.col_off),
        height=math.ceil(window.row_off + window.height) - math.floor(window.row_off)
    )

    window_transform = dem.window_transform(window)

    # Read elevation values
    elevation = dem.read(
        1,
        window=window,
        masked=True
    )

    valid = elevation.compressed()

    if valid.size == 0:
        raise ValueError("No valid elevation data found.")

    # ======================================
    # ELEVATION STATISTICS
    # ======================================

    print("Valid elevation pixels:", valid.size)
    print(f"Minimum elevation: {np.min(valid):.2f} m")
    print(f"Maximum elevation: {np.max(valid):.2f} m")
    print(f"Average elevation: {np.mean(valid):.2f} m")
    print(f"Elevation range: {np.ptp(valid):.2f} m")
    print("Vertical reference: RH 2000")

    # ======================================
    # TERRAIN SLOPE ANALYSIS
    # ======================================

    elevation_array = elevation.filled(np.nan).astype(float)

    dy, dx = np.gradient(
        elevation_array,
        abs(dem.res[1]),
        abs(dem.res[0])
    )

    slope_degrees = np.degrees(
        np.arctan(np.sqrt(dx**2 + dy**2))
    )

    valid_slope = slope_degrees[
        np.isfinite(slope_degrees)
    ]

    if valid_slope.size > 0:
        print("----------------------------------")
        print("TERRAIN SLOPE ANALYSIS")
        print(
            f"Average slope: "
            f"{np.mean(valid_slope):.2f} degrees"
        )
        print(
            f"Maximum slope: "
            f"{np.max(valid_slope):.2f} degrees"
        )
        print(
            f"Minimum slope: "
            f"{np.min(valid_slope):.2f} degrees"
        )

    # ======================================
    # EXPORT STUDY AREA GEOTIFF
    # ======================================

    profile = dem.profile.copy()

    profile.update(
        height=elevation.shape[0],
        width=elevation.shape[1],
        transform=window_transform,
        compress="deflate"
    )

    clipped_file = BASE_DIR / "linkoping_study_area.tif"

    with rasterio.open(clipped_file, "w", **profile) as dst:
        dst.write(elevation.filled(dem.nodata), 1)

    print("----------------------------------")
    print("Study area GeoTIFF saved to:", clipped_file)

    # ======================================
    # CREATE ELEVATION MAP
    # ======================================

    print("Creating Linköping elevation map...")

    fig, ax = plt.subplots(figsize=(11, 9))

    image = ax.imshow(
        elevation,
        cmap="terrain",
        extent=plotting_extent(
            elevation,
            window_transform
        ),
        origin="upper"
    )

    ax.set_title(
        "Linköping - Real Terrain Elevation\n"
        "Lantmäteriet | 1 m DTM | RH 2000",
        fontsize=15,
        fontweight="bold"
    )

    ax.set_xlabel("Easting (SWEREF 99 TM)")
    ax.set_ylabel("Northing (SWEREF 99 TM)")

    colorbar = fig.colorbar(
        image,
        ax=ax,
        shrink=0.75
    )

    colorbar.set_label("Elevation (m)")

    ax.set_aspect("equal")
    plt.tight_layout()

    output_file = BASE_DIR / "linkoping_elevation.png"

    plt.savefig(
        output_file,
        dpi=180,
        bbox_inches="tight"
    )

    plt.close(fig)

    print("Elevation map saved to:", output_file)

    # ======================================
    # CREATE LEAFLET TERRAIN OVERLAY
    # ======================================

    terrain_values = elevation.filled(np.nan).astype(float)

    norm = Normalize(
        vmin=float(np.min(valid)),
        vmax=float(np.max(valid))
    )

    rgba = colormaps["terrain"](norm(terrain_values))

    # Transparent pixels where data is missing
    rgba[~np.isfinite(terrain_values), 3] = 0

    overlay_file = BASE_DIR / "linkoping_overlay.png"

    Image.fromarray(
        (rgba * 255).astype(np.uint8)
    ).save(overlay_file)

    print("Leaflet terrain overlay saved to:", overlay_file)
    # ======================================
    # CREATE REAL TERRAIN SLOPE OVERLAY
    # ======================================

    print("Creating terrain slope overlay...")

    # Use the slope values calculated earlier
    # Green = flatter terrain
    # Yellow = moderate slope
    # Red = steeper terrain

    slope_norm = Normalize(
        vmin=0,
        vmax=30,
        clip=True
    )

    slope_rgba = colormaps["RdYlGn_r"](
        slope_norm(slope_degrees)
    )

    # Make missing terrain data transparent
    slope_rgba[~np.isfinite(slope_degrees), 3] = 0

    # Save the slope overlay as a PNG
    slope_overlay_file = BASE_DIR / "linkoping_slope_overlay.png"

    Image.fromarray(
        (slope_rgba * 255).astype(np.uint8)
    ).save(slope_overlay_file)

    print("Slope overlay saved to:", slope_overlay_file)
    # ======================================
    # CALCULATE GEOGRAPHIC BOUNDS
    # ======================================

    raster_bounds = rasterio.windows.bounds(
        window,
        dem.transform
    )

    west_lon, south_lat, east_lon, north_lat = transform_bounds(
        dem.crs,
        "EPSG:4326",
        *raster_bounds
    )

    print("----------------------------------")
    print("LEAFLET IMAGE BOUNDS:")
    print(f"Southwest: [{south_lat:.8f}, {west_lon:.8f}]")
    print(f"Northeast: [{north_lat:.8f}, {east_lon:.8f}]")

print("--------------------------------------")
print("GeoRisk AI terrain processing completed!")
