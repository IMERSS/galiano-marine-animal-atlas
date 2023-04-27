# Map reporting status of vascular plants documented in the Átl’ka7tsem/Howe Sound Biosphere

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

# Read records and summary

molluscs <- read.csv("tabular_data/Galiano_marine_animal_records_consolidated_2023-04-22.csv")

summary <- read.csv("tabular_data/mollusc_summary.csv")

# Subset historic, confirmed and new records

new <- summary %>% filter(str_detect(reportingStatus, "new"))
confirmed <- summary %>% filter(reportingStatus == "confirmed")
reported <- summary %>% filter(reportingStatus == "reported")

# Create vectors of historic, confirmed and new taxa to query catalog of occurrence records

new.taxa <- unique(new$scientificName)
new.taxa <- new.taxa %>% paste(collapse = "|")

confirmed.taxa <- unique(confirmed$scientificName)
confirmed.taxa <- confirmed.taxa %>% paste(collapse = "|")

reported.taxa <- unique(reported$scientificName)
reported.taxa <- reported.taxa %>% paste(collapse = "|")

confirmed.taxa.records <- molluscs %>% filter(str_detect(scientificName, confirmed.taxa))
confirmed.taxa.records$status <- 'confirmed'

new.taxa.records <- molluscs %>% filter(str_detect(scientificName, new.taxa))
new.taxa.records$status <- 'new'

reported.taxa.records <- molluscs %>% filter(str_detect(scientificName, reported.taxa))
reported.taxa.records$status <- 'historic'

records <- rbind(new.taxa.records,confirmed.taxa.records,reported.taxa.records)

# Summarise mollusc species by reporting status

taxa.status <- records %>% group_by(status) %>% 
  summarize(taxa = paste(sort(unique(scientificName)),collapse=", "))

# Read gridded marine mollusc dataset

molluscs.confirmed.gridded <- read.csv("tabular_data/molluscs_confirmed_records_gridded.csv")
molluscs.new.gridded <- read.csv("tabular_data/molluscs_new_records_gridded.csv")
molluscs.reported.gridded <- read.csv("tabular_data/molluscs_reported_records_gridded.csv")

# Summarize mollusc by grid cell and export to JSON file for viz

gridded.molluscs.confirmed <- molluscs.confirmed.gridded %>% group_by(cell_id) %>% 
  summarize(taxa = paste(sort(unique(scientificName)),collapse=", "))

gridded.molluscs.new <- molluscs.new.gridded %>% group_by(cell_id) %>% 
  summarize(taxa = paste(sort(unique(scientificName)),collapse=", "))

gridded.molluscs.reported <- molluscs.reported.gridded %>% group_by(cell_id) %>% 
  summarize(taxa = paste(sort(unique(scientificName)),collapse=", "))

write(jsonlite::toJSON(gridded.molluscs.confirmed), "viz_data/molluscConfirmedGridCellData.json")
write(jsonlite::toJSON(gridded.molluscs.new), "viz_data/molluscNewGridCellData.json")
write(jsonlite::toJSON(gridded.molluscs.reported), "viz_data/molluscReportedGridCellData.json")

# Load choropleths

gridded.confirmed.records <- mx_read("spatial_data/vectors/molluscs_confirmed")
gridded.new.records <- mx_read("spatial_data/vectors/molluscs_new")
gridded.historic.records <- mx_read("spatial_data/vectors/molluscs_reported")

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
  addTiles(options = providerTileOptions(opacity = 0.5)) %>%
  addPolygons(data = gridded.confirmed.records, fillColor = ~pal(richness), fillOpacity = 0.6, weight = 0, options = labelToOption("confirmed")) %>%
  addPolygons(data = gridded.historic.records, fillColor = ~pal(richness), fillOpacity = 0.6, weight = 0, options = labelToOption("historic")) %>%
  addPolygons(data = gridded.new.records, fillColor = ~pal(richness), fillOpacity = 0.6, weight = 0, options = labelToOption("new")) %>%
  addLegend(position = 'topright',
            colors = viridis_pal(option = "D")(t),
            labels = values)

#Note that this statement is only effective in standalone R
print(reportingStatusMap)

# Stacked bar plot of historic vs confirmed vs new records

y <- c('records')
confirmed.no <- c(nrow(confirmed))
historic.no <- c(nrow(reported))
new.no <- c(nrow(new))

reporting.status <- data.frame(y, confirmed.no, historic.no, new.no)

reportingStatusFig <- plot_ly(reporting.status, x = ~confirmed.no, y = ~y, type = 'bar', orientation = 'h', name = 'Confirmed',
                      
                      marker = list(color = '#5a96d2',
                             line = list(color = '#5a96d2',
                                         width = 1)))
reportingStatusFig <- reportingStatusFig %>% add_trace(x = ~historic.no, name = 'Historic',
                         marker = list(color = '#decb90',
                                       line = list(color = '#decb90',
                                                   width = 1)))
reportingStatusFig <- reportingStatusFig %>% add_trace(x = ~new.no, name = 'New',
                         marker = list(color = '#7562b4',
                                       line = list(color = '#7562b4',
                                                   width = 1)))
reportingStatusFig <- reportingStatusFig %>% layout(barmode = 'stack', autosize=F, height=140, showlegend=FALSE,
                      xaxis = list(title = "Species Reported"),
                      yaxis = list(title ="Records")) %>% 
  layout(yaxis= list(showticklabels = FALSE)) %>%
  layout(yaxis= list(title = ""))

reportingStatusFig

# Strange structure to mirror that in Molluscs
reportingPal <- data.frame(cat = c("confirmed", "historic", "new"),
                          col = c('#5a96d2','#decb90', '#7562b4'))

# We need to convert out of "tibble" so that JSON can recognise it
statusTaxa <- list(MAP_LABEL=reportingPal$cat, taxa = pull(taxa.status, -1))

# Write summarised plants to JSON file for viz 
# (selection states corresponding with bar plot selections: 'new', 'historic','confirmed')
statusData <- structure(list(palette = reportingPal, taxa = statusTaxa))

write(rjson::toJSON(statusData), "viz_data/Status-molluscPlotData.json")
