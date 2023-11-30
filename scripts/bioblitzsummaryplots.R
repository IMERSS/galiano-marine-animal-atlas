pacman::p_load(tidyverse, plotly)
#reading in the total summary dataset
arthropod <- read_csv("tabular_data/bioblitz_summary_data/Galiano_terrestrial_arthropods_review_summary_2023-10-21.csv")
#splitting into data that has data for the first observed date (musueum specimens most likely)
first.observed <- arthropod %>%
  drop_na(First.Observed) %>%
  select(Taxon, First.Observed)%>%
  mutate(full_date = First.Observed)
#reformatting date
first.observed$First.Observed <- format(first.observed$First.Observed, "%Y/%m")

#splitting into data has data for the collected reported date (inat observations?)
collected.reported <- arthropod %>%
  drop_na(Collected.Reported..y.m.d.) %>%
  select(Taxon, Collected.Reported..y.m.d.) %>%
  rename(First.Observed = Collected.Reported..y.m.d.) %>%
  mutate(First.Observed = as.Date(First.Observed))%>%
  mutate(full_date = First.Observed)
#reformatting date
collected.reported$First.Observed <- format(collected.reported$First.Observed, "%Y/%m")

#glueing these  datasets together again for the full analysis
combined <- rbind(first.observed, collected.reported) %>% 
  group_by(Taxon) %>% filter(First.Observed == min(First.Observed)) %>%
  ungroup() %>%
  mutate(date_final = format(lubridate::ymd(full_date), '%Y-%m-%d'),
         year = lubridate::year(date_final), 
         month = lubridate::month(date_final))



#collating by year
split_biodiv_year <- function(df, x, y) {
  split <- df %>% filter(between(year,x,y))
  cum.obs <- nrow(split) # cumulative no. observations
  cum.spp <- length(unique(split$Taxon)) # cumulative no. species
  biodiv_calcs <- data.frame(cum.obs, cum.spp) 
  biodiv_calcs
}

y.1925.1935 <- split_biodiv_year(combined, 1925,1935) %>% mutate(range= "1925-1935")
y.1925.1945 <- split_biodiv_year(combined, 1925,1945) %>% mutate(range= "1925-1945")
y.1925.1955 <- split_biodiv_year(combined, 1925,1955) %>% mutate(range= "1925-1955")
y.1925.1965 <- split_biodiv_year(combined, 1925,1965) %>% mutate(range= "1925-1965")
y.1925.1975 <- split_biodiv_year(combined, 1925,1975) %>% mutate(range= "1925-1975")
y.1925.1985 <- split_biodiv_year(combined, 1925,1985) %>% mutate(range= "1925-1985")
y.1925.1995 <- split_biodiv_year(combined, 1925,1995) %>% mutate(range= "1925-1995")
y.1925.2005 <- split_biodiv_year(combined, 1925,2005) %>% mutate(range= "1925-2005")
y.1925.2015 <- split_biodiv_year(combined, 1925,2015) %>% mutate(range= "1925-2015")
y.1925.2025 <- split_biodiv_year(combined, 1925,2025) %>% mutate(range= "1925-2025")


summary_year <- rbind(y.1925.1935, y.1925.1945, y.1925.1955, y.1925.1965, 
                      y.1925.1975, y.1925.1985, y.1925.1995, y.1925.2005, 
                      y.1925.2025) 


#collating by month 
split_biodiv_month <- function(df, x) {
  split <- df %>% filter(month %in% x)
  cum.obs <- nrow(split) # cumulative no. observations
  cum.spp <- length(unique(split$Taxon)) # cumulative no. species
  biodiv_calcs <- data.frame(cum.obs, cum.spp) 
  biodiv_calcs
}

m.1 <- split_biodiv_month(combined, 1) %>% mutate(month= "1")
m.2 <- split_biodiv_month(combined, 2) %>% mutate(month= "2")
m.3 <- split_biodiv_month(combined, 3) %>% mutate(month= "3")
m.4 <- split_biodiv_month(combined, 4) %>% mutate(month= "4")
m.5 <- split_biodiv_month(combined, 5) %>% mutate(month= "5")
m.6 <- split_biodiv_month(combined, 6) %>% mutate(month= "6")
m.7 <- split_biodiv_month(combined, 7) %>% mutate(month= "7")
m.8 <- split_biodiv_month(combined, 8) %>% mutate(month= "8")
m.9 <- split_biodiv_month(combined, 9) %>% mutate(month= "9")
m.10<- split_biodiv_month(combined, 10) %>% mutate(month= "10")
m.11<- split_biodiv_month(combined, 11) %>% mutate(month= "11")
m.12<- split_biodiv_month(combined, 12) %>% mutate(month= "12")

summary_month <- rbind(m.1, m.2, m.3, m.4, m.5, m.6, m.7, 
                       m.8, m.9, m.10, m.11, m.12)

#focus on one figure after the next, have a separate script for each of these figs
#context for interpretting each figure 
#start with the years going by, then proceed to the 2023 data
summary_monthp <- summary_month %>%
  plot_ly(y = ~cum.spp, x=~as.numeric(month), type="scatter")


summary_2023 <- combined %>%
  filter(year == 2023) %>%
  group_by(month) %>%
  summarise(cum.spp = length(unique(Taxon)))


summary2023_plot<-summary_2023 %>%
  plot_ly(y = ~cum.spp, x=~as.numeric(month), type="scatter")


timeseries<-combined %>%
  group_by(year) %>%
  summarise(cum.spp=length(unique(Taxon))) %>%
  plot_ly(y = ~cum.spp, x=~year, type="scatter")

print(timeseries)
print(summary2023_plot)







