/* eslint-env node */

"use strict";

const fs = require("fs");
const fluid = require("infusion");

const buildBase = "src/js/client/inat-components-build-Molluscs.js";

const taxa = {
    "annelids": 47491,
    "brachiopods": 122158,
    "bryozoans": 68104,
    "chaetognaths": 151827,
    "cnidarians": 47534,
    "crustaceans": 85493,
    "ctenophores": 51508,
    "echinoderms": 47549,
    "fishes": 47178, // Actually Actinopterygii, which all are except for 3 Elasmobranchii
    "horseshoe_worms": 48051,
    "mammals": 925158, // Actually Whippomorpha which half are, the rest are Mustelidae, Phocidae, etc
    "nemerteans": 51280,
    "nodding_heads": 151831,
    "peanut_worms": 48665,
    "platyhelminthes": 52319,
    "sponges": 48824,
    "tunicates": 130868
};

fluid.each(taxa, (code, taxon) => {
    const upperTaxon = taxon.charAt(0).toUpperCase() + taxon.slice(1);
    function rewriteFile(fileName) {
        const content = fs.readFileSync(fileName, "utf8");
        const updatedContent = content.replace(/Molluscs/g, upperTaxon)
            .replace(/molluscs/g, taxon)
            .replace(/\"taxonId\":47115/, "\"taxonId\":" + code);

        const target = fileName.replace(/Molluscs/, upperTaxon);
        fs.writeFileSync(target, updatedContent, "utf8");

        console.log(`Created ${target}`);
    }
    rewriteFile(buildBase);
});

console.log("All files created successfully.");
