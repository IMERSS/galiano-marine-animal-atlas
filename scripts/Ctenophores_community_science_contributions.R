# Map reporting status of Galiano Island's ctenophore species

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

ctenophores <- read.csv("tabular_data/Galiano_marine_animal_records_consolidated_2023-04-22.csv")

summary <- read.csv("tabular_data/ctenophore_summary.csv")

# Subset historical, confirmed and new records

new <- summary %>% filter(str_detect(reportingStatus, "new"))
confirmed <- summary %>% filter(reportingStatus == "confirmed")
reported <- summary %>% filter(reportingStatus == "reported")

# Create vectors of historical, confirmed and new taxa to query catalog of occurrence records

new.taxa <- unique(new$scientificName)
new.taxa <- new.taxa %>% paste(collapse = "|")

confirmed.taxa <- unique(confirmed$scientificName)
confirmed.taxa <- confirmed.taxa %>% paste(collapse = "|")

reported.taxa <- unique(reported$scientificName)
reported.taxa <- reported.taxa %>% paste(collapse = "|")

confirmed.taxa.records <- ctenophores %>% filter(str_detect(scientificName, confirmed.taxa))
confirmed.taxa.records$status <- 'confirmed'

new.taxa.records <- ctenophores %>% filter(str_detect(scientificName, new.taxa))
new.taxa.records$status <- 'new'

reported.taxa.records <- ctenophores %>% filter(str_detect(scientificName, reported.taxa))
reported.taxa.records$status <- 'historical'

records <- rbind(new.taxa.records,confirmed.taxa.records,reported.taxa.records)

# Summarise fish species by reporting status

taxa.status <- records %>% group_by(status) %>% 
  summarize(taxa = paste(sort(unique(scientificName)),collapse=", "))

# Read gridded marine ctenophores dataset

ctenophores.confirmed.gridded <- read.csv("tabular_data/ctenophores_confirmed_records_gridded.csv")
ctenophores.new.gridded <- read.csv("tabular_data/ctenophores_new_records_gridded.csv")
ctenophores.reported.gridded <- read.csv("tabular_data/ctenophores_reported_records_gridded.csv")

# Summarize fish by grid cell and export to JSON file for viz

gridded.ctenophores.confirmed <- ctenophores.confirmed.gridded %>% group_by(cell_id) %>% 
  summarize(taxa = paste(sort(unique(scientificName)),collapse=", "))

gridded.ctenophores.new <- ctenophores.new.gridded %>% group_by(cell_id) %>% 
  summarize(taxa = paste(sort(unique(scientificName)),collapse=", "))

gridded.ctenophores.reported <- ctenophores.reported.gridded %>% group_by(cell_id) %>% 
  summarize(taxa = paste(sort(unique(scientificName)),collapse=", "))

write(jsonlite::toJSON(gridded.ctenophores.confirmed), "viz_data/fishconfirmedGridCellData.json")
write(jsonlite::toJSON(gridded.ctenophores.new), "viz_data/fishnewGridCellData.json")
write(jsonlite::toJSON(gridded.ctenophores.reported), "viz_data/fishReportedGridCellData.json")

# Load choropleths

gridded.confirmed.records <- mx_read("spatial_data/vectors/ctenophores_confirmed")
gridded.new.records <- mx_read("spatial_data/vectors/ctenophores_new")
gridded.historical.records <- mx_read("spatial_data/vectors/ctenophores_reported")

# Combine records to create normalized palette

gridded.records <- rbind(gridded.confirmed.records, gridded.historical.records, gridded.new.records)

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
  addPolygons(data = gridded.historical.records, fillColor = ~pal(richness), fillOpacity = 0.6, weight = 0, options = labelToOption("historical")) %>%
  addPolygons(data = gridded.new.records, fillColor = ~pal(richness), fillOpacity = 0.6, weight = 0, options = labelToOption("new")) %>%
  addLegend(position = 'topright',
            colors = viridis_pal(option = "D")(t),
            labels = values)

#Note that this statement is only effective in standalone R
print(reportingStatusMap)

# Stacked bar plot of historical vs confirmed vs new records

y <- c('records')
confirmed.no <- c(nrow(confirmed))
historical.no <- c(nrow(reported))
new.no <- c(nrow(new))

reporting.status <- data.frame(y, confirmed.no, historical.no, new.no)

reportingStatusFig <- plot_ly(reporting.status, x = ~confirmed.no, y = ~y, type = 'bar', orientation = 'h', name = 'confirmed',
                      
                      marker = list(color = '#5a96d2',
                             line = list(color = '#5a96d2',
                                         width = 1)))
reportingStatusFig <- reportingStatusFig %>% add_trace(x = ~historical.no, name = 'historical',
                         marker = list(color = '#decb90',
                                       line = list(color = '#decb90',
                                                   width = 1)))
reportingStatusFig <- reportingStatusFig %>% add_trace(x = ~new.no, name = 'new',
                         marker = list(color = '#7562b4',
                                       line = list(color = '#7562b4',
                                                   width = 1)))
reportingStatusFig <- reportingStatusFig %>% layout(barmode = 'stack', autosize=F, height=140, showlegend=FALSE,
                      xaxis = list(title = "Species Reported"),
                      yaxis = list(title ="Records")) %>% 
  layout(meta = list(mx_widgetId = "reportingStatus")) %>%
  layout(yaxis= list(showticklabels = FALSE)) %>%
  layout(yaxis= list(title = ""))

reportingStatusFig

# Strange structure to mirror that in ctenophores
reportingPal <- data.frame(cat = c("confirmed", "historical", "new"),
                          col = c('#5a96d2','#decb90', '#7562b4'))

# We need to convert out of "tibble" so that JSON can recognise it
statusTaxa <- list(MAP_LABEL=reportingPal$cat, taxa = pull(taxa.status, -1))

# Write summarised plants to JSON file for viz 
# (selection states corresponding with bar plot selections: 'new', 'historical','confirmed')
statusData <- structure(list(palette = reportingPal, taxa = statusTaxa))

write(rjson::toJSON(statusData), "viz_data/Status-fishPlotData.json")
