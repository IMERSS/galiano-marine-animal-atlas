"use strict";

// noinspection ES6ConvertVarToLetConst // otherwise this is a duplicate on minifying

fluid.defaults("maxwell.bioblitzDiversityPane", {
    gradeNames: ["maxwell.scrollyPaneHandler", "maxwell.scrollyVizBinder"],
    regionIdFromLabel: true
});

fluid.defaults("maxwell.bioblitzStatusPane", {
    gradeNames: ["maxwell.scrollyPaneHandler", "maxwell.scrollyVizBinder", "maxwell.howeVizBinder", "maxwell.howeStatusBinder"],
    markup: {
        region: "Selected reporting status: %region"
    },
    widgets: {
        reportingStatus: {
            type: "maxwell.regionSelectionBar"
        }
    }
});

