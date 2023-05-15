# Map Galiano Island Mollusc diversity

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

# Read gridded marine mollusc dataset

molluscs.gridded <- read.csv("tabular_data/molluscs_records_gridded.csv")

# Summarize mollusc by grid cell and export to JSON file for viz

diversityTaxa <- mx_griddedObsToHash(molluscs.gridded)

diversityData <- list(taxa = diversityTaxa, mapTitle = "Mollusc diversity")

mx_writeJSON(diversityData, "viz_data/Diversity-molluscPlotData.json")

# Load choropleth

choropleth <- mx_read("spatial_data/vectors/molluscs")

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