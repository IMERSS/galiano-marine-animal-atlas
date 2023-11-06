"use strict";

// noinspection ES6ConvertVarToLetConst // otherwise this is a duplicate on minifying
var maxwell = fluid.registerNamespace("maxwell");
// noinspection ES6ConvertVarToLetConst // otherwise this is a duplicate on minifying
var hortis = fluid.registerNamespace("hortis");

fluid.defaults("maxwell.bioblitzDiversityPane", {
    gradeNames: ["maxwell.scrollyPaneHandler", "maxwell.scrollyVizBinder", "maxwell.withNativeLegend"],
    regionStyles: {
        unselectedOpacity: 0
    }
});

fluid.defaults("maxwell.bioblitzStatusPane", {
    gradeNames: ["maxwell.scrollyPaneHandler", "maxwell.scrollyVizBinder", "maxwell.withNativeLegend"],
    members: {
        allCellKeys: {}
    },
    widgets: {
        reportingStatus: {
            type: "maxwell.regionSelectionBar",
            gradeNames: "maxwell.regionSelectionBar.withHoist"
        }
    },
    regionStyles: {
        unselectedOpacity: 0,
        noSelectionOpacity: 0.4
    },
    // So, our mapping is that class -> cell_id, community -> status
    // How SHOULD we have implemented this in the map so that the whole world wasn't polluted with these strange names?
    regionSelectionScheme: {
        clazz: false,
        community: true
    },
    components: {
        paneInfo: {
            type: "maxwell.statusCellPaneInfo"
        }
    },
    invokers: {
        // Override polyOptions from "maxwell.scrollyVizBinder"
        polyOptions: "maxwell.scrollyViz.polyStatusOptions({that}, {arguments}.0, {arguments}.1)",
        // Override handlePoly from "maxwell.scrollyVizBinder"
        handlePoly: "maxwell.scrollyViz.handleStatusPoly({that}, {arguments}.0, {arguments}.1, {arguments}.2)"
    },
    distributeOptions: {
        mapWithStatus: {
            target: "{that hortis.leafletMap}.options.gradeNames",
            record: "maxwell.mapWithStatus",
            priority: "after:bareRegionsExtra"
        }
    }
});

fluid.defaults("maxwell.mapWithStatus", {
    modelListeners: {
        selectedRegions: [{
            namespace: "map",
            path: "mapBlockTooltipId",
            // overrides listener from hortis.leafletMap.withRegionsBase
            func: "hortis.leafletMap.showSelectedStatusRegions",
            args: ["{paneHandler}", "{that}", "{change}.value"]
        }]
    },
    model: {
        selectedStatus: null,
        selectedCell: null
    },
    members: {
        // to make regionSelectionBar work again, in the presence of bareRegionsExtra definition which makes this equal to communities
        // TODO: awkward cross-linking. regions is the unit of drawability in base bare map, but communities is in status map
        regions: "{sunburst}.viz.classes"
    },
    modelRelay: {
        // We relay these up because of our timing issues - we need to communicate to the paneHandler but we are not created
        // in time because of the awkward construction model of the viz
        paneHandlerStatus: {
            source: "selectedStatus",
            target: "{paneHandler}.model.selectedStatus",
            func: status => status && (status + " records")
        },
        paneHandlerCell: {
            source: "selectedCell",
            target: "{paneHandler}.model.selectedCell"
        }
    },
    listeners: {
        "buildMap.drawRegions": "maxwell.drawBareStatusRegions({that}, {scrollyPage})",
        // overrides listener from hortis.leafletMap.withRegionsBase
        //                                                                                class,        community,      source
        "selectRegion.regionSelection": "hortis.leafletMap.statusRegionSelection({that}, {arguments}.0, {arguments}.1, {arguments}.2)",
        "clearMapSelection.status": "hortis.clearSelectedStatusRegions({that}, {arguments}.0)"
    }
});

// TODO this is now back up in leafletMapWithRegions.js, update when we can
hortis.normaliseToClass = function (str) {
    return str.toLowerCase().replace(/[| ]/g, "-");
};

maxwell.transcodeCellStatus = function (status, cell_id) {
    return status && cell_id ? status + "|" + cell_id : status || cell_id;
};

maxwell.parseCellKey = function (key) {
    const parts = key.split("|");
    return {
        status: parts[0],
        cell_id: parts[1]
    };
};

maxwell.scrollyViz.polyStatusOptions = function (paneHandler, shapeOptions/*, label*/) {
    // These will both be set, this is a "full id"
    const regionId = maxwell.transcodeCellStatus(shapeOptions.mx_regionId, shapeOptions.mx_cell_id);
    const overlay = {};
    if (regionId) {
        const r = fluid.getForComponent(paneHandler, ["options", "regionStyles"]);
        overlay.className = (shapeOptions.className || "") + " fld-imerss-region " + maxwell.regionClass(regionId);
        overlay.weight = r.strokeWidth;
        overlay.opacity = "1.0";
    }
    paneHandler.allCellKeys[regionId] = true;
    return {...shapeOptions, ...overlay};
};


maxwell.scrollyViz.handleStatusPoly = function (paneHandler, Lpolygon, shapeOptions) {
    const status = shapeOptions.mx_regionId;
    const cell_id = "" + shapeOptions.mx_cell_id;
    // cf.hortis.leafletMap.withRegions.drawRegions
    if (status || cell_id) {
        Lpolygon.on("click", function () {
            console.log("Map clicked on status ", status, " polygon ", Lpolygon);
            const map = paneHandler.map;
            const currentStatus = map.model.selectedStatus;
            // Fires to regionSelection -> hortis.leafletMap.statusRegionSelection
            map.events.selectRegion.fire(cell_id, currentStatus);
        });
    }
};


// Overrides ancestral Xetthecum behaviour where selection was on the basis of "community" - which here we have coopted to mean "any structure"
hortis.leafletMap.statusRegionSelection = function (map, cell_id, status, source) {
    map.applier.change("selectedStatus", status);
    map.applier.change("selectedCell", cell_id);
    map.applier.change("mapBlockTooltipId", maxwell.transcodeCellStatus(status, cell_id), "ADD", source);

    // This is use by the legend in imerss-viz-reknit.js for rendering
    map.applier.change("selectedRegions", hortis.leafletMap.selectedRegions(status, map.classes), "ADD", source);
    // This only appears in "withRegions" in base framework
    // map.applier.change("selectedCommunities", hortis.leafletMap.selectedRegions(status, map.communities), "ADD", source);
};

// This is clearly nuts and this "selectRegions" and "clearMapSelection" events should not exist and instead be performed through derived state
hortis.clearSelectedStatusRegions = function (map) {
    map.applier.change("selectedStatus", null);
    map.applier.change("selectedCell", null);
};

hortis.leafletMap.showSelectedStatusRegions = function (paneHandler, map) {
    const style = map.container[0].style;
    const selectedStatus = map.model.selectedStatus;
    const selectedCell = map.model.selectedCell;
    const noSelection = map.model.mapBlockTooltipId === null;
    const doubleSelection = selectedStatus && selectedCell;
    const r = map.options.regionStyles;
    // This hash is initialised in polyStatusOptions as we see them go by for the first time
    Object.keys(paneHandler.allCellKeys).forEach(function (key) {
        const parsed = maxwell.parseCellKey(key);
        const isSelected = !noSelection && (doubleSelection ? parsed.status === selectedStatus && parsed.cell_id === selectedCell
            : parsed.status === selectedStatus || parsed.cell_id === selectedCell);
        const opacity = noSelection ? r.noSelectionOpacity : isSelected ? r.selectedOpacity : r.unselectedOpacity;
        style.setProperty(hortis.regionOpacity(key), opacity);
        style.setProperty(hortis.regionBorder(key), map.model.selectedCommunities[key] ? "#FEF410" : "none");
    });
};

// Identical to last part of hortis.leafletMap.withRegions.drawRegions
// TODO: Copied from imerss-viz-reknit.js and looks like we didn't need to change it
maxwell.drawBareStatusRegions = function (map, scrollyPage) {
    map.applier.change("selectedCommunities", hortis.leafletMap.selectedRegions(null, map.communities));
    const r = fluid.getForComponent(map, ["options", "regionStyles"]);

    const highlightStyle = Object.keys(map.communities).map(function (key) {
        return "." + maxwell.regionClass(key) + " {\n" +
            "  fill-opacity: var(" + hortis.regionOpacity(key) + ");\n" +
            "  stroke: var(" + hortis.regionBorder(key) + ");\n" +
            "  stroke-width: " + r.strokeWidth + ";\n" + // For some reason Leaflet ignores our weight
            "}\n";
    });
    hortis.addStyle(highlightStyle.join("\n"));

    const container = scrollyPage.map.map.getContainer();
    $(container).on("click", function (event) {
        if (event.target === container) {
            map.events.clearMapSelection.fire();
        }
    });
    $(document).on("click", function (event) {
        const closest = event.target.closest(".fld-imerss-nodismiss-map");
        // Mysteriously SVG paths are not in the document
        if (!closest && event.target.closest("body")) {
            map.events.clearMapSelection.fire();
        }
    });

    const regions = container.querySelectorAll("path.fld-imerss-region");
    [...regions].forEach(region => region.setAttribute("stroke-width", 3));

};
