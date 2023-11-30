# Load libraries
pacman::p_load(sf, tidyverse, sf, viridis)

# Source dependencies

source("scripts/utils.R")

# Analysis of historical collection activities
inat_tidy <- read_csv("tabular_data/bioblitz_summary_data/intersection_inat_hunterstonmap_assoc_polygons.csv") %>%
  filter(quality_grade == "research") #lose ~1000 rows of data
hunterston2023 <- inat_tidy %>%
  drop_na(Id_2)%>% #70% data loss 
  mutate(year=2023) %>%
  rename(type = Type, Id = Id_2, scientificName = scientific_name) %>%
  select(scientificName, Id, latitude, longitude, year, type)
hunterston2010 <- read_csv("tabular_data/bioblitz_summary_data/hunterston2010_data+updatedpolygons.csv") %>%
  mutate(year=2010) %>%
  rename(scientificName = Scientific, 
         type = Type, 
         latitude = Latitude, 
         longitude = Longitude) %>%
  select(scientificName, Id, latitude, longitude, year, type)

hunterston2010_names <- unique(hunterston2010$scientificName)
hunterston2023_coords <- hunterston2023 %>% select(Id, latitude, longitude)
confirmed_obs <- hunterston2023 %>% filter(scientificName %in% hunterston2010_names) #261 confirmed observations
new_obs <- hunterston2023 %>% filter(!scientificName %in% hunterston2010_names) #134 new observations
hulq <- read_csv("tabular_data/bioblitz_summary_data/reintegrated-hulq.csv") %>%
  rename(scientificName = `iNaturalist taxon name`)%>%
  select(scientificName, `Food Value`, `Medicinal Value`, `Spiritual Value`, `Material Value`, 
         `Trade Value`, `Indicator Value`, `Hulquminum Name`, `Hulquminum Authority`)
hulq.names <- unique(hulq$scientificName) 

confirmed_cultr <- confirmed_obs %>% filter(scientificName %in% hulq.names) # 2 confirmed
new_cult <- new_obs %>% filter(scientificName %in% hulq.names) # 2 new 

summary_2010 <- hunterston2010 %>%
  group_by(Id) %>%
  summarise(species=length(unique(scientificName)))

summary_2023 <- hunterston2023 %>%
  group_by(Id) %>%
  summarise(species=length(unique(scientificName)))

summary_new <- new_obs %>%
  group_by(Id) %>%
  summarise(species=length(unique(scientificName)))

#species list per community 
#geoJson list of species present

summary_confirmed <- confirmed_obs %>%
  group_by(Id) %>%
  summarise(species=length(unique(scientificName)))

# loading in polygons from shp file
grid <- st_read("spatial_data/vectors/hunterston/new_hunterston_map.shp") %>%
  select(Id, geometry)
#merging shp file with biodiversity summary
summary_2010pn <- merge(grid, summary_2010, by="Id")
summary_2023pn <- merge(grid, summary_2023, by="Id")
summary_newpn <- merge(grid, summary_new, by="Id")
summary_confirmedpn <- merge(grid, summary_confirmed, by="Id")

#plotting

summary_2010pnplot <- summary_2010pn %>%
  ggplot()+
  geom_sf(aes(fill=species))+
  scale_fill_viridis(option="D")+
  ggtitle("2010")

summary_2023pnplot <- summary_2023pn %>%
  ggplot()+
  geom_sf(aes(fill=species))+
  scale_fill_viridis(option="D")+
  ggtitle("2023")

summary_newpnplot <- summary_newpn %>%
  ggplot()+
  geom_sf(aes(fill=species))+
  scale_fill_viridis(option="D")+
  ggtitle("new species")

summary_confirmedpnplot <- summary_confirmedpn %>%
  ggplot()+
  geom_sf(aes(fill=species))+
  scale_fill_viridis(option="D")+
  ggtitle("confirmed species")



print(summary_2010pnplot)
print(summary_2023pnplot)
print(summary_newpnplot)
print(summary_confirmedpnplot)











