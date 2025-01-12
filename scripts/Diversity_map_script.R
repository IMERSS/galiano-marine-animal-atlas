# Map Galiano Island's marine animal diversity

# Load libraries

library(dplyr)
library(leaflet)
library(raster)
library(reshape2)
library(rjson)
library(scales)
library(sf)
library(stringr)
library(viridis)

# Source dependencies

source("scripts/utils.R")

mx_diversityRowToOptions <- function (row) {
  return (list(mx_regionId = row$cell_id, mx_richness = row$richness))
}

mx_diversity_map <- function (taxon) {
    title <- str_to_title(taxon);

    # Read gridded marine animal dataset
    
    gridded.records <- read.csv(str_glue("tabular_data/{taxon}_all_records_gridded.csv"))
    
    # Summarize species by grid cell and export to JSON file for viz
    
    diversityTaxa <- mx_griddedObsToHash(gridded.records)
    
    diversityData <- list(taxa = diversityTaxa, mapTitle = str_glue("{title} diversity"))
    
    mx_writeJSON(diversityData, str_glue("viz_data/Diversity-{taxon}PlotData.json"))
    
    # Load choropleth
    
    choropleth <- mx_read(str_glue("spatial_data/vectors/{taxon}_all_grid"))
    
    # Plot choropleth

    richness <- choropleth$richness
    t <- max(richness)
    values <- 0:t
    pal <- leaflet::colorNumeric(viridis_pal(option = "D")(t), domain = values)
    
    # Plot map
    
    diversityMap <- leaflet(options=list(mx_mapId="Diversity")) %>%
      fitBounds(-123.6, 48.85,  -123.2917, 49.03) %>%
      addTiles(options = providerTileOptions(opacity = 0.5)) %>%
      addLegend(position = 'topright',
                pal = pal,
                bins = ifelse(t < 5, t, 5),
                values = values,
                title = "Richness",
                labels = values)
    
    # Draw the gridded data in a funny way so that richness, cell_id etc. can be tunnelled through options one at a time
    for (i in 1:nrow(choropleth)) {
      row <- choropleth[i,]
      diversityMap <- diversityMap %>% addPolygons(data = row, fillColor = pal(row$richness), fillOpacity = 0.4, weight = 0,
                                                   popup = paste("Richness:", row$richness), 
                                                   popupOptions = popupOptions(closeButton = FALSE),
                                                   options = mx_diversityRowToOptions(row))
    }
    
    #Note that this statement is only effective in standalone R
    print(diversityMap)  

}