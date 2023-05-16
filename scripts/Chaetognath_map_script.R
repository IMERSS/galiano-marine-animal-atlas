# Map Galiano Island Chaetonath diversity

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

# Read gridded marine arrow worm dataset

arrow_worms.gridded <- read.csv("tabular_data/arrow_worms_records_gridded.csv")

# Summarize arrow worm by grid cell and export to JSON file for viz

diversityTaxa <- mx_griddedObsToHash(arrow_worms.gridded)

diversityData <- list(taxa = diversityTaxa, mapTitle = "Chaetognath diversity")

mx_writeJSON(diversityData, "viz_data/Diversity-arrowWormPlotData.json")

# Load choropleth

choropleth <- mx_read("spatial_data/vectors/arrow_worms")

# Plot choropleth

tmap_mode("view")

animal.grid.map = tm_shape(choropleth) +
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

animal.grid.map