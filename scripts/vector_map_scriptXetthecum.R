library(sf)
library(leaflet)
library(dplyr)

source("scripts/utils.R")

#Layer 1: Sample vector
Sample <- mx_read("spatial_data/vectors/xetthecum/xetthecum.shp")

baseMap <- leaflet() %>%
  addTiles(options = providerTileOptions(opacity = 0.5)) %>%
  addPolygons(data = Sample, color = "#440154", weight = 2, fillOpacity = .5, fillColor = "#440154")%>%
  fitBounds(-123.5, 48.93, -123.506, 48.95)

print(baseMap)