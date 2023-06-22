"use strict";

/* global inatComponents */

// noinspection ES6ConvertVarToLetConst // otherwise this is a duplicate on minifying
var maxwell = fluid.registerNamespace("maxwell");

fluid.defaults("maxwell.iNatComponentsPaneHandler", {
    gradeNames: ["maxwell.scrollyPaneHandler", "maxwell.templateScrollyPaneHandler"],
    taxonId: null,
    taxonName: null,
    containerId: "inat-components",
    resources: {
        template: {
            resourceText: "<div id=\"inat-components\"></div>"
        }
    },
    iNatOptions: {
        taxon: {
            id: "{that}.options.taxonId",
            str: "{that}.options.taxonName"
        },
        place: {
            id: 94935,
            str: "galiano"
        },
        dataSource: "autoLoad",
        itemWidth: 180,
        features: [
            {
                feature: "recentObservations",
                numResults: 40,
                desc: "This page lists the most recent %taxonName observations made in BC. Click on any of them to go to the inaturalist site for more information."
            }, {
                feature: "commonTaxa",
                numResults: 40,
                numYears: 10,
                desc: "This page lists the most commonly reported %taxonName species in BC. You can use the dropdown at the top right to filter the results to a particular year."
            }, {
                feature: "favourites",
                numResults: 40,
                numYears: 10,
                desc: "Any time iNaturalist users encounter an observation they like, they can choose to \"favourite\" it. This page lists the most favourited %taxonName observations made in BC."
            }, {
                feature: "stats",
                numTopObservers: 10,
                observersListClass: "inat-observers-list",
                statsCountSummaryClass: "inat-stats-count-summary"
            }
        ],
        generalClasses: {
            tabsElement: "inat-tabs",
            yearsDropdown: "inat-years-dropdown",
            pageHeadings: "inat-page-headings",
            observationLabelTitle: "inat-observation-label-title",
            observationLabelDate: "inat-observation-label-data",
            observationLabelName: "inat-observation-label-name",
            tabDesc: "inat-tab-desc"
        }
    },
    // scriptLocation: "js/inat-components-build-Molluscs.js",
    events: { // TODO: Better as a resource
        scriptLoaded: null
    },
    listeners: {
        "onCreate.instantiate" : "maxwell.instantiateINat({that}.options.containerId, {that}.options.iNatOptions, {that}.options.taxonName)"
    },
    modelListeners: {
        paneVisible: {
            path: "{paneHandler}.model.isVisible",
            func: "maxwell.toggleClass",
            args: ["{scrollyLeafletMap}.container.0", "{change}.value", "mxcw-hideMap", true]
        }
    }
});

maxwell.instantiateINat = function (containerId, iNatOptions, taxonName) {
    const toSubs = ["features.0.desc", "features.1.desc", "features.2.desc"];

    const target = fluid.copy(iNatOptions);

    toSubs.forEach(path => {
        const fetched = fluid.get(iNatOptions, path);
        const subbed = fluid.stringTemplate(fetched, {taxonName});
        fluid.set(target, path, subbed);
    });
    inatComponents.initTaxonPanel(containerId, target);
};

maxwell.reactScriptInjector = function (that) {
    const host = document.createElement("div");
    host.id = "inat-components";
    that.container[0].appendChild(host);
    const script = document.createElement("script");
    script.onload = that.events.scriptLoaded.fire(that);
    script.src = that.options.scriptLocation;
    document.head.appendChild(script);
};

/*
We wanted to write
    modelRelay: {
        regionTextDisplay: {
             target: "{that}.model.dom.regionDisplay.text",
            args: ["{that}.options.markup.region", "{map}.model.mapBlockTooltipId"],
            func: (template, selectedRegion) => fluid.stringTemplate(template, selectedRegion || "None")
        }
    }

But got a circular model evaluation in evaluateContainers - it fires onDomBind immediately after evaluating the
containers and the model is not done yet for some reason - why is it done usually, so that we can materialise
against it?

 */


// Fix the display size of a plotly widget, e.g. in the status pane

fluid.defaults("maxwell.statusPaneBinder", {
    listeners: {
        "onCreate.fixLayout": "maxwell.statusPaneBinder.fixLayout"
    }
});

maxwell.statusPaneBinder.fixLayout = function (that) {
    const widgetPane = that.options.parentContainer[0].querySelector(".plotly.html-widget");
    widgetPane.setAttribute("style", "width: 100%");
    // Tell plotly to resize the widgets inside
    window.dispatchEvent(new Event("resize"));
};
