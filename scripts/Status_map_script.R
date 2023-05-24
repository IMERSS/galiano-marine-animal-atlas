# Map reporting status of Galiano Island's marine species by taxonomic group

# Load libraries

library(dplyr)
library(gapminder)
library(gganimate)
library(ggplot2)
library(ggthemes)
library(gifski)
library(hrbrthemes)
library(leaflet)
library(raster)
library(sf)
library(stringr)
library(tidyr)
library(viridis)
library(jsonlite)

library(plotly)

# Source dependencies

source("scripts/utils.R")

mx_statusRowToOptions <- function (row) {
  return (list(mx_regionId = row$status, mx_cell_id = row$cell_id, mx_richness = row$richness))
}

mx_status_map <- function (taxon) {
    # Read records and summary
    
    marine <- read.csv("tabular_data/Galiano_marine_animal_records_consolidated_2023-04-22.csv")
    
    summary <- read.csv(mx_paste("tabular_data/", taxon, "_summary.csv"))
    
    # Subset historical, confirmed and new records
    
    new <- summary %>% filter(str_detect(reportingStatus, "new"))
    confirmed <- summary %>% filter(reportingStatus == "confirmed")
    reported <- summary %>% filter(reportingStatus == "reported")
    
    # Create vectors of historical, confirmed and new taxa to query catalog of occurrence records
    
    new.taxa <- unique(new$scientificName)
    confirmed.taxa <- unique(confirmed$scientificName)
    reported.taxa <- unique(reported$scientificName)

    confirmed.taxa.records <- summary %>% filter(scientificName %in% confirmed.taxa)
    # Note that this approach works whether the list is empty or not
    confirmed.taxa.records <- confirmed.taxa.records %>% mutate(status = "confirmed")
    
    new.taxa.records <- summary %>% filter(scientificName %in% new.taxa)
    new.taxa.records <- new.taxa.records %>% mutate(status = "new")
    
    reported.taxa.records <- summary %>% filter(scientificName %in% reported.taxa)
    reported.taxa.records <- reported.taxa.records %>% mutate(status = "historic")
    
    records <- rbind(new.taxa.records, confirmed.taxa.records, reported.taxa.records)
    
    # Summarise taxon species by reporting status
    
    taxa.status <- records %>% group_by(status) %>% 
      summarize(taxa = paste(sort(unique(scientificName)),collapse=", "))
    
    # Load choropleths
    
    gridded.confirmed.records <- mx_read(mx_paste("spatial_data/vectors/", taxon, "_confirmed"))
    gridded.new.records <- mx_read(mx_paste("spatial_data/vectors/", taxon, "_new"))
    gridded.historic.records <- mx_read(mx_paste("spatial_data/vectors/", taxon, "_reported"))
    
    # Combine records to create normalized palette
    
    gridded.records <- rbind(gridded.confirmed.records, gridded.historic.records, gridded.new.records)
    
    # Create color palette for species richness
    
    richness <- gridded.records$richness
    values <- richness %>% unique
    values <- sort(values)
    t <- length(values)
    pal <- leaflet::colorFactor(viridis_pal(option = "D")(t), domain = values)
    
    # Plot map

    reportingStatusMap <- leaflet(options=list(mx_mapId="Status")) %>%
      fitBounds(-123.6, 48.85,  -123.2917, 49.03) %>%
      addTiles(options = providerTileOptions(opacity = 0.5)) %>%
      addLegend(position = 'topright',
                colors = viridis_pal(option = "D")(t),
                labels = values)
    
    # Draw the gridded data in a funny way so that richness, cell_id etc. can be tunnelled through options one at a time
    for (i in 1:nrow(gridded.records)) {
       row <- gridded.records[i,]
       reportingStatusMap <- reportingStatusMap %>% addPolygons(data = row, fillColor = pal(row$richness), fillOpacity = 0.6, weight = 0, 
                                                                options = mx_statusRowToOptions(row))
    }

    #Note that this statement is only effective in standalone R
    print(reportingStatusMap)
    
    # Stacked bar plot of historical vs confirmed vs new records
    
    y <- c('records')
    confirmed.no <- c(nrow(confirmed))
    historic.no <- c(nrow(reported))
    new.no <- c(nrow(new))
    
    reporting.status <- data.frame(y, confirmed.no, historic.no, new.no)
    
    reportingStatusFig <- plot_ly(reporting.status, height=140, x = ~confirmed.no, y = ~y, type = 'bar', orientation = 'h', name = 'confirmed',
                                  marker = list(color = '#5a96d2',
                                           line = list(color = '#5a96d2',
                                                      width = 1)))
    reportingStatusFig <- reportingStatusFig %>% add_trace(x = ~historic.no, name = 'historic',
                                  marker = list(color = '#decb90',
                                           line = list(color = '#decb90',
                                                      width = 1)))
    reportingStatusFig <- reportingStatusFig %>% add_trace(x = ~new.no, name = 'new',
                                  marker = list(color = '#7562b4',
                                           line = list(color = '#7562b4',
                                                      width = 1)))
    reportingStatusFig <- reportingStatusFig %>% layout(barmode = 'stack', autosize=F, showlegend=FALSE,
                                                        xaxis = list(title = "Species Reported"),
                                                        yaxis = list(title ="Records")) %>% 
      layout(meta = list(mx_widgetId = "reportingStatus")) %>%
      layout(yaxis= list(showticklabels = FALSE)) %>%
      layout(yaxis= list(title = "")) %>%
      config(displayModeBar = FALSE)
    
    reportingStatusFig
    
    statusPal <- list("confirmed" = "#5a96d2", "historic" = "#decb90", "new" = "#7562b4")
    
    # Read gridded marine per-taxon dataset
    
    records.confirmed.gridded <- read.csv(mx_paste("tabular_data/", taxon, "_confirmed_records_gridded.csv"))
    records.new.gridded <- read.csv(mx_paste("tabular_data/", taxon, "_new_records_gridded.csv"))
    records.reported.gridded <- read.csv(mx_paste("tabular_data/", taxon, "_reported_records_gridded.csv"))
    
    statusTaxa <- list("confirmed" = mx_griddedObsToHash(records.confirmed.gridded),
                       "historic" = mx_griddedObsToHash(records.reported.gridded),
                       "new" = mx_griddedObsToHash(records.new.gridded))
    
    statusData <- structure(list(palette = statusPal, taxa = statusTaxa, mapTitle = "Species Reporting Status"))
    
    mx_writeJSON(statusData, mx_paste("viz_data/Status-", taxon, "PlotData.json"))
    
    list("reportingStatusMap" = reportingStatusMap, "reportingStatusFig" = reportingStatusFig)
}