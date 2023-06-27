"use strict";

/* global L */

// noinspection ES6ConvertVarToLetConst // otherwise this is a duplicate on minifying
var maxwell = fluid.registerNamespace("maxwell");
// noinspection ES6ConvertVarToLetConst // otherwise this is a duplicate on minifying
var hortis = fluid.registerNamespace("hortis");

maxwell.toggleClass = function (container, isVisible, clazz, inverse) {
    console.log("toggleClass ", container, " isVisible ", isVisible, " clazz ", clazz);
    container.classList[isVisible ^ inverse ? "remove" : "add"](clazz);
};

fluid.defaults("maxwell.markupTemplateRenderer", {
    // Bodge the sunburst loader to being a traditional templateRenderingView so that its markup arrives earlier -
    // In practice didn't manage to break the race condition. Port this into core imerss-viz
    rendererTemplateResources: {
        template: false,
        markup: true
    },
    invokers: {
        renderMarkup: "fluid.identity({that}.resources.markup.parsed)"
    }
});

// mixin grade which mediates event flow from IMERSS viz to Leaflet pane
fluid.defaults("maxwell.scrollyVizBinder", {
    // Put these last to continue to override "container" member due to FLUID-5800
    gradeNames: ["hortis.scrollyMapLoader", "maxwell.scrollyPaneHandler",
        "maxwell.templateScrollyPaneHandler", "maxwell.markupTemplateRenderer"],
    resourceBase: ".",
    // Override this since we need proper ordering of overrides, review why the comment in leafletMap.js refers to FLUID-5836
    mapFlavourGrade: [],
    markupTemplate: "%resourceBase/html/imerss-viz-scrolly.html",
    renderMarkup: true,
    events: {
        selectRegion: null
    },
    regionIdFromLabel: false,
    regionStyles: {
        strokeWidth: 2,
        noSelectionOpacity: 0.6,
        selectedOpacity: 0.8,
        unselectedOpacity: 0.5
    },
    listeners: {
        // Override the built-in old fashioned rendering
        "onResourcesLoaded.renderMarkup": "fluid.identity",
        "sunburstLoaded.listenHash": {
            funcName: "maxwell.scrollyViz.listenHash",
            args: "{that}",
            priority: "after:fluid-componentConstruction"
        }
    },
    // Override non-rendering selector from hortis.scrollyMapLoader
    selectors: { // The map does not render
        mapHolder: "{maxwell.scrollyLeafletMap}.container"
    },
    invokers: {
        polyOptions: "maxwell.scrollyViz.polyOptions({that}, {arguments}.0, {arguments}.1)",
        handlePoly: "maxwell.scrollyViz.handlePoly({that}, {arguments}.0, {arguments}.1, {arguments}.2)"
    },
    distributeOptions: {
        bareRegionsExtra: {
            target: "{that hortis.leafletMap}.options.gradeNames",
            record: ["hortis.leafletMap.withBareRegions", "maxwell.bareRegionsExtra"]
        },
        map: {
            target: "{that hortis.leafletMap}.options.members.map",
            record: "{scrollyLeafletMap}.map"
        },
        regionStyles: {
            target: "{that hortis.leafletMap}.options.regionStyles",
            record: "{paneHandler}.options.regionStyles"
        }
    }
});

fluid.defaults("maxwell.scrollyVizBinder.withLegend", {
    distributeOptions: {
        withLegend: {
            target: "{that hortis.leafletMap}.options.gradeNames",
            record: "maxwell.bareRegionsExtra.withLegend"
        }
    }
});


fluid.registerNamespace("maxwell.legendKey");

maxwell.legendKey.rowTemplate = "<div class=\"fld-imerss-legend-row %rowClass\">" +
    "<span class=\"fld-imerss-legend-icon\"></span>" +
    "<span class=\"fld-imerss-legend-preview %previewClass\" style=\"%previewStyle\"></span>" +
    "<span class=\"fld-imerss-legend-label\">%keyLabel</span>" +
    "</div>";


maxwell.legendKey.renderMarkup = function (markup, clazz, className) {
    const style = hortis.fillColorToStyle(clazz.fillColor || clazz.color);
    const normal = hortis.normaliseToClass(className);
    return fluid.stringTemplate(markup, {
        rowClass: "fld-imerss-legend-row-" + normal,
        previewClass: "fld-imerss-class-" + normal,
        previewStyle: "background-color: " + style.fillColor,
        keyLabel: className
    });
};

// cf. Xetthecum's hortis.legendKey.drawLegend
maxwell.legendKey.drawLegend = function (map) {
    const regionRows = fluid.transform(map.regions, function (troo, regionName) {
        return maxwell.legendKey.renderMarkup(maxwell.legendKey.rowTemplate, map.regions[regionName], regionName);
    });
    const markup = Object.values(regionRows).join("\n");
    const legend = L.control({position: "bottomright"});
    const container = document.createElement("div");
    container.classList.add("mxcw-legend");
    container.innerHTML = markup;
    legend.onAdd = function () {
        return container;
    };
    legend.addTo(map.map);
    map.clazzToLegendNodes = fluid.transform(map.regions, function (troo, regionName) {
        const rowSel = ".fld-imerss-legend-row-" + hortis.normaliseToClass(regionName);
        const row = container.querySelector(rowSel);
        row.addEventListener("click", function () {
            // TODO: this used to be regionName, regionName - we've decided that we're using "status" as "class" and "cell_id" as "community".
            map.events.selectRegion.fire(null, regionName);
        });
    });
    return container;
};

// Addon grade for hortis.leafletMap - all this stuff needs to go upstairs into LeafletMapWithBareRegions
fluid.defaults("maxwell.bareRegionsExtra", {
    modelListeners: {
        regionToHash: {
            path: "mapBlockTooltipId",
            func: "maxwell.scrollyViz.updateRegionHash",
            args: ["{that}", "{change}"]
        },
        sortRegions: {
            path: "mapBlockTooltipId",
            func: "maxwell.scrollyViz.sortRegions",
            args: ["{paneHandler}", "{scrollyPage}"]
        }
    },
    members: {
        // Standard regions are drawn in hortis.leafletMap.showSelectedRegions which iterates over map.regions
        // Check that this works in Howe - it at least worked in Xetthecum where "community" was "unit of selection"
        regions: "{sunburst}.viz.communities"
    },
    listeners: {
        "buildMap.fixVizResources": "maxwell.fixVizResources({sunburst})",
        "buildMap.drawRegions": "maxwell.drawBareRegions({that}, {scrollyPage})",
        //                                                                          class,       community       source
        "selectRegion.regionSelection": "hortis.leafletMap.regionSelection({that}, {arguments}.0, {arguments}.1, {arguments}.2)"
    }
});

// Fix for horrific members merging bug occurring through lines like regions: "{sunburst}.viz.communities" above
maxwell.fixVizResources = function (sunburst) {
    sunburst.viz.classes = fluid.copyImmutableResource(sunburst.viz.classes);
    sunburst.viz.communities = fluid.copyImmutableResource(sunburst.viz.communities);
};

fluid.defaults("maxwell.bareRegionsExtra.withLegend", {
    selectors: {
        // key is from Xetthecum, selector is ours - we don't have "keys", normalise this
        legendKeys: ".mxcw-legend"
    },
    modelListeners: {
        legend: {
            path: "selectedRegions.*",
            func: "hortis.legendKey.selectRegion",
            args: ["{that}", "{change}.value", "{change}.path"]
        },
        legendVisible: {
            path: "{paneHandler}.model.isVisible",
            func: "maxwell.toggleClass",
            args: ["{that}.legendContainer", "{change}.value", "mxcw-hidden"]
        }
    },
    members: {
        legendContainer: "@expand:maxwell.legendKey.drawLegend({that}, {paneHandler})"
    },
    listeners: {
        // BUG only one of the legendVisible modelListeners fires onCreate! Perhaps because of the namespace?
        "onCreate.legendVisible": {
            path: "{paneHandler}.model.isVisible",
            func: "maxwell.toggleClass",
            args: ["{that}.legendContainer", "{paneHandler}.model.isVisible", "mxcw-hidden"]
        }
    }
});

fluid.registerNamespace("maxwell.scrollyViz");

maxwell.regionClass = function (className) {
    return "fld-imerss-region-" + hortis.normaliseToClass(className);
};

// Identical to last part of hortis.leafletMap.withRegions.drawRegions
maxwell.drawBareRegions = function (map, scrollyPage) {
    map.applier.change("selectedRegions", hortis.leafletMap.selectedRegions(null, map.regions));
    const r = fluid.getForComponent(map, ["options", "regionStyles"]);

    const highlightStyle = Object.keys(map.regions).map(function (key) {
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

// TODO: Monkey-patches of versions in leafletMapWithBareRegions swapping map.classes to map.regions
hortis.leafletMap.regionSelection = function (map, className, community, source) {
    map.applier.change("mapBlockTooltipId", community, "ADD", source);
    map.applier.change("selectedRegions", hortis.leafletMap.selectedRegions(className, map.regions), "ADD", source);
    map.applier.change("selectedCommunities", hortis.leafletMap.selectedRegions(community, map.communities), "ADD", source);
};

hortis.clearSelectedRegions = function (map, source) {
    // mapBlockTooltipId is cleared in LeafletMap
    map.applier.change("selectedRegions", hortis.leafletMap.selectedRegions(null, map.regions), "ADD", source);
    map.applier.change("selectedCommunities", hortis.leafletMap.selectedRegions(null, map.communities), "ADD", source);
};


// TODO: port this back into leafletMapWithBareRegions now it is responsive to options
hortis.leafletMap.showSelectedRegions = function (map, selectedRegions) {
    const style = map.container[0].style;
    const noSelection = map.model.mapBlockTooltipId === null;
    const r = map.options.regionStyles;
    Object.keys(map.regions).forEach(function (key) {
        // TODO: This used to be map.classes - but for diversity map and presumably for others now everything selectable
        // is in "communities". For status map it remains in "colours" but this has its own code.
        const lineFeature = map.regions[key].color;
        const opacity = noSelection ? r.noSelectionOpacity : selectedRegions[key] ? r.selectedOpacity : r.unselectedOpacity;
        style.setProperty(hortis.regionOpacity(key), opacity);
        style.setProperty(hortis.regionBorder(key), selectedRegions[key] ? "#FEF410" : (lineFeature ? fluid.colour.arrayToString(lineFeature) : "none"));
    });
};

maxwell.regionForPath = function (path) {
    let region;
    path.classList.forEach(function (clazz) {
        if (clazz.startsWith("fld-imerss-region-")) {
            region = clazz.substring("fld-imerss-region-".length);
        }
    });
    return region;
};

maxwell.scrollyViz.sortRegions = function (paneHandler, scrollyPage) {
    const paneIndex = paneHandler.options.paneIndex;
    const pane = scrollyPage.leafletWidgets[paneIndex].paneInfo.pane;
    const paths = [...pane.querySelectorAll("path")];
    paths.forEach(function (path) {
        const region = maxwell.regionForPath(path);
        if (region && region === paneHandler.map.model.mapBlockTooltipId) {
            path.parentNode.appendChild(path);
        }
    });
};

maxwell.scrollyViz.regionIdForPoly = function (paneHandler, shapeOptions, label) {
    const regionIdFromLabel = fluid.getForComponent(paneHandler, ["options", "regionIdFromLabel"]); // obviously unsatisfactory
    return "" + (regionIdFromLabel ? label : shapeOptions.mx_regionId);
};

maxwell.scrollyViz.polyOptions = function (paneHandler, shapeOptions, label) {
    const region = maxwell.scrollyViz.regionIdForPoly(paneHandler, shapeOptions, label);
    const overlay = {};
    if (region) {
        const r = fluid.getForComponent(paneHandler, ["options", "regionStyles"]);
        overlay.className = (shapeOptions.className || "") + " fld-imerss-region " + maxwell.regionClass(region);
        overlay.weight = r.strokeWidth;
        overlay.opacity = "1.0";
    }
    return {...shapeOptions, ...overlay};
};

maxwell.scrollyViz.handlePoly = function (paneHandler, Lpolygon, shapeOptions, label) {
    const region = maxwell.scrollyViz.regionIdForPoly(paneHandler, shapeOptions, label);
    // cf.hortis.leafletMap.withRegions.drawRegions
    if (region) {
        Lpolygon.on("click", function () {
            console.log("Map clicked on region ", region, " polygon ", Lpolygon);
            const map = paneHandler.map;
            // Old style - region must be in first argument, unlike for "status" where it should be second.
            map.events.selectRegion.fire(region, region);
        });
    }
};

// TODO: Lots here - demultiplex by panel, etc.
maxwell.scrollyViz.listenHash = function (paneHandler) {
    const map = paneHandler.map;
    window.addEventListener("hashchange", function () {
        const hash = location.hash;
        if (hash.startsWith("#region:")) {
            const region = hash.substring("#region:".length);
            map.events.selectRegion.fire(null, region, "hash");
        } else {
            map.events.clearMapSelection.fire();
        }
        if (hash.startsWith("#taxon:")) {
            const sunburst = paneHandler.sunburst;
            // cf. leafletMapWithRegions hortis.listenTaxonLinks
            const row = hortis.linkToTaxon(sunburst, decodeURIComponent(hash));
            if (row) {
                sunburst.events.changeLayoutId.fire(row.id, "hash");
            }
        }
    });
};

maxwell.scrollyViz.updateRegionHash = function (paneHandler, change) {
    if (!change.transaction.fullSources.hash) {
        window.history.pushState(null, null, change.value ? "#region:" + change.value : "#");
    }
};
