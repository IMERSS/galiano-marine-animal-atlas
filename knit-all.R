knit_one <- function (inputFile) {
    rmarkdown::render(inputFile, output_dir = "docs", output_options = list(copy_resources = TRUE))
}

files <- list("Annelida.Rmd", "Bryozoa.Rmd", "Cnidaria.Rmd", "Ctenophora.Rmd", "Entoprocta.Rmd",
              "Mammalia.Rmd", "Nemertea.Rmd", "Platyhelminthes.Rmd", "Sipuncula.Rmd",
              "Brachiopoda.Rmd", "Chaetognatha.Rmd", "Crustacea.Rmd", "Echinodermata.Rmd",
              "Fishes.Rmd", "Mollusca.Rmd", "Phoronida.Rmd", "Porifera.Rmd", "Tunicata.Rmd")

lapply(files, knit_one)
