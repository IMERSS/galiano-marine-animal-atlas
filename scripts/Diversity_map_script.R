# Map Galiano Island's marine animal diversity

# Load libraries

library(dplyr)
library(leaflet)
library(raster)
library(reshape2)
library(rjson)
library(scales)
library(sf)
library(tmap)
library(viridis)

# Source dependencies

source("scripts/utils.R")

mx_diversity_map <- function (taxon) {
    title <- str_to_title(taxon);

    # Read gridded marine animal dataset
    
    records.gridded <- read.csv(mx_paste("tabular_data/", taxon, "_records_gridded.csv"))
    
    # Summarize species by grid cell and export to JSON file for viz
    
    diversityTaxa <- mx_griddedObsToHash(records.gridded)
    
    diversityData <- list(taxa = diversityTaxa, mapTitle = mx_paste(title, " diversity"))
    
    mx_writeJSON(diversityData, mx_paste("viz_data/Diversity-", taxon, "PlotData.json"))
    
    # Load choropleth
    
    choropleth <- mx_read(mx_paste("spatial_data/vectors/", taxon))
    
    # Plot choropleth
    
    tmap_mode("view")
    bbox <- st_bbox(c(xmin = -123.6, xmax = -123.2917, ymin = 48.85, ymax = 49.03), crs = st_crs(4326))
    
    grid.map = tm_shape(choropleth, bbox=bbox) +
      tm_fill(
        col = "richness",
        palette = "viridis",
        style = "cont",
        title = "Richness",
        showNA = FALSE,
        alpha = 0.5,
        popup.vars = c(
          "Richness: " = "richness"
        ),
        popup.format = list(
          richness = list(format = "f", digits = 0)
        )
      ) +
      tm_borders(col = "grey40", lwd = 0.7) +
      tm_view(leaflet.options = list(mx_mapId="Diversity"))
    
    grid.map
}