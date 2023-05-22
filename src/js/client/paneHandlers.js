"use strict";

// noinspection ES6ConvertVarToLetConst // otherwise this is a duplicate on minifying
var maxwell = fluid.registerNamespace("maxwell");

// Leftover contents from Howe Sound

fluid.defaults("maxwell.iNatComponentsPaneHandler", {
    gradeNames: "maxwell.scrollyPaneHandler",
    // scriptLocation: "js/inat-components-build-Molluscs.js",
    events: { // TODO: Better as a resource
        scriptLoaded: null
    },
    listeners: {
        "onCreate.injectScript" : "maxwell.reactScriptInjector"
    },
    modelListeners: {
        paneVisible: {
            path: "{paneHandler}.model.isVisible",
            func: "maxwell.toggleClass",
            args: ["{scrollyLeafletMap}.container.0", "{change}.value", "mxcw-hideMap", true]
        }
    }
});

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
