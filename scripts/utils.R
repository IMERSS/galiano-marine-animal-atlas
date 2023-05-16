library(sf)
library(jsonlite)

lat_lon <- function (data) {
  return(st_transform(data, "+proj=longlat +datum=WGS84"))
}

mx_read <- function (filename) {
   st_data <- st_read(filename, quiet=TRUE);
   dropped <- st_zm(st_data, drop = T, what = "ZM")
   return(lat_lon(dropped));
}

mx_paste <- function(..., sep='') {
  paste(..., sep=sep, collapse=sep)
}

# Attach the region's label as an "mx_regionId" option in the output data
mx_labelToOption <- function (label) {
  return (list(mx_regionId = label))
}

mx_griddedObsToHash <- function (gridded) {
  summarised <- gridded %>% group_by(cell_id) %>% 
    summarize(taxa = paste(sort(unique(scientificName)),collapse=", "))
  hash <- split(x = summarised$taxa, f=summarised$cell_id)
}

mx_writeJSON = function (data, filename) {
  write(jsonlite::toJSON(data, auto_unbox = TRUE, pretty = TRUE), filename)
}