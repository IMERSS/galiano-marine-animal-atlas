pacman::p_load(sf, leaflet, dplyr)

source("scripts/utils.R")

#Layer 1: Sample vector
Sample <- mx_read("spatial_data/vectors/salish sea bioregion/Salish_Sea_Region_Boundary.shp")

baseMap <- leaflet() %>%
  addTiles(options = providerTileOptions(opacity = 0.5)) %>%
  addPolygons(data = Sample, color = "#414487FF", weight = 2, fillOpacity = 0.4)
  #fitBounds(-121.5, 47.5, -126, 52)
