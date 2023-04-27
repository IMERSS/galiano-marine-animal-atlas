"use strict";

// noinspection ES6ConvertVarToLetConst // otherwise this is a duplicate on minifying
var maxwell = fluid.registerNamespace("maxwell");

fluid.defaults("maxwell.howeVizBinder", {
    phyloMap: "%resourceBase/json/howePhyloMap.json",
    markup: {
        region: "Selected biogeoclimatic region: %region"
    },

    selectors: {
        regionDisplay: ".fld-imerss-region"
    },
    invokers: {
        renderRegionName: "maxwell.renderRegionName({that}.dom.regionDisplay, {that}.options.markup.region, {arguments}.0)"
    },
    distributeOptions: {
        target: "{that hortis.leafletMap}.options.modelListeners.regionTextDisplay",
        record: {
            // TOOD: rename mapBlockTooltipId to selectedRegion
            path: "{that}.model.mapBlockTooltipId",
            listener: "{maxwell.howeVizBinder}.renderRegionName",
            args: "{change}.value"
        }
    }
});

maxwell.renderRegionName = function (target, template, region) {
    const text = fluid.stringTemplate(template, {region: region || "None"});
    target.text(text);
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


fluid.defaults("maxwell.howeStatusBinder", {
    listeners: {
        "onCreate.fixLayout": "maxwell.howeStatusBinder.fixLayout"
    }
});

maxwell.howeStatusBinder.fixLayout = function (that) {
    const widgetPane = that.options.parentContainer[0].querySelector(".plotly.html-widget");
    widgetPane.setAttribute("style", "width: 100%");
    // Tell plotly to resize the widgets inside
    window.dispatchEvent(new Event("resize"));
};
