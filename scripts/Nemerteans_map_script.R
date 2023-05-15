# Map Galiano Island's nemertean diversity

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

# Read gridded marine fish dataset

nemerteans.gridded <- read.csv("tabular_data/nemerteans_records_gridded.csv")

# Summarize fish by grid cell and export to JSON file for viz

gridded.nemerteans <- nemerteans.gridded %>% group_by(cell_id) %>% 
  summarize(taxa = paste(sort(unique(scientificName)),collapse=", "))

write(jsonlite::toJSON(gridded.nemerteans), "viz_data/nemerteansGridCellData.json")

# Load choropleth

choropleth <- mx_read("spatial_data/vectors/nemerteans")

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