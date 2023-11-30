library(sf)
library(leaflet)
library(dplyr)

source("scripts/utils.R")

#Layer 1: Sample vector
Sample <- mx_read("GL_CONTOUR_10M.shp")

baseMap <- leaflet() %>%
  addTiles(options = providerTileOptions(opacity = 0.5)) %>%
  addPolygons(data = Sample, color = "#440154", weight = 2, fillOpacity = 1, fillColor = "#440154")

print(baseMap)
