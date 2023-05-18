"use strict";

/* global L, HTMLWidgets, Plotly */

window.HTMLWidgets = window.HTMLWidgets || {};

// Taken from https://github.com/ramnathv/htmlwidgets/blob/master/inst/www/htmlwidgets.js
window.HTMLWidgets.dataframeToD3 = function (df) {
    const names = [];
    let length;
    for (const name in df) {
        if (df.hasOwnProperty(name)) {
            names.push(name);
        }
        if (typeof(df[name]) !== "object" || typeof(df[name].length) === "undefined") {
            throw new Error("All fields must be arrays");
        } else if (typeof(length) !== "undefined" && length !== df[name].length) {
            throw new Error("All fields must be arrays of the same length");
        }
        length = df[name].length;
    }
    const results = [];
    let item;
    for (let row = 0; row < length; row++) {
        item = {};
        for (let col = 0; col < names.length; col++) {
            item[names[col]] = df[names[col]][row];
        }
        results.push(item);
    }
    return results;
};

// noinspection ES6ConvertVarToLetConst // otherwise this is a duplicate on minifying
var maxwell = fluid.registerNamespace("maxwell");

/**
 * An integer
 *
 * @typedef {Number} Integer
 */

/**
 * A "call" structure instantiating an HTMLWidget
 *
 * @typedef {Object} HTMLWidgetCall
 * @property {String} method - The name of the method call
 * @property {Object[]} args - The arguments to the call
 */

/**
 * Information about a scrollable section element of a scrollytelling interface
 *
 * @typedef {Object} SectionHolder
 * @property {HTMLElement} section - The section node housing the widget
 * @property {HTMLElement} heading - The heading (currently h2 node) housing the widget
 */

/**
 * Decoded information about a Leaflet widget
 *
 * @typedef {SectionHolder} LeafletWidgetInfo
 * @property {HTMLElement} [widget] - The DOM node holding the widget
 * @property {Object} data - The `data` entry associated with the widget
 * @property {Array} subPanes - Any subpanes to which the widget's calls are allocated
 */

/**
 * A Leaflet Map
 * @typedef {Object} LeafletMap
 */

/**
 * A Leaflet LayerGroup
 * @typedef {Object} LeafletLayerGroup
 */

maxwell.findPlotlyWidgetId = function (widget) {
    return widget.layout?.meta?.mx_widgetId;
};

fluid.defaults("maxwell.choroplethSlider", {
    gradeNames: "maxwell.widgetHandler",
    invokers: {
        bindWidget: "maxwell.choroplethSlider.bind"
    }
});

maxwell.choroplethSlider.bind = function (element, scrollyPage, paneHandler, that) {
    that.element = element;
    const slider = element;
    const paneIndex = paneHandler.options.paneIndex;

    slider.on("plotly_sliderchange", function (e) {
        console.log("Slider change ", e);
        scrollyPage.applier.change(["activeSubPanes", paneIndex], e.slider.active);
    });
    // Initialises with the assumption that the 0th subpane should be initially active - makes sense for choropleths
    // but what about others?
    scrollyPage.applier.change(["activeSubPanes", paneIndex], 0);
};

fluid.defaults("maxwell.regionSelectionBar", {
    gradeNames: "maxwell.widgetHandler",
    invokers: {
        bindWidget: "maxwell.regionSelectionBar.bind"
    }
});

maxwell.regionSelectionBar.bind = function (element, scrollyPage, paneHandler, that) {
    that.element = element;
    const bar = element;
    const vizBinder = paneHandler;
    const names = fluid.getMembers(element.data, "name");
    // In theory this should be done via some options distribution, or at the very least, an IoCSS-driven model
    // listener specification
    vizBinder.events.sunburstLoaded.addListener(() => {
        const map = vizBinder.map;
        map.applier.modelChanged.addListener({path: "selectedRegions.*"}, function (selected, oldSelected, segs) {
            const changed = fluid.peek(segs);
            const index = names.indexOf(changed);
            Plotly.restyle(element, {
                // Should agree with .fld-imerss-selected but seems that plotly cannot be reached via CSS
                "marker.line": selected ? {
                    color: "#FCFF63",
                    width: 2
                } : {
                    color: "#000000",
                    width: 0
                }
            }, index);
        });
    }, "plotlyRegion", "after:fluid-componentConstruction");

    bar.on("plotly_click", function (e) {
        const regionName = e.points[0].data.name;
        vizBinder.map.events.selectRegion.fire(regionName, regionName);
    });
};

maxwell.findPlotlyWidgets = function (scrollyPage) {
    const widgets = [...document.querySelectorAll(".html-widget.plotly")];
    const panes = scrollyPage.dataPanes;

    console.log("Found " + widgets.length + " plotly widgets");
    widgets.forEach(function (widget) {
        const pane = widget.closest(".mxcw-widgetPane");
        const widgetId = maxwell.findPlotlyWidgetId(widget);
        const index = panes.indexOf(pane);

        console.log("Plotly widget's pane index is " + index + " with id " + widgetId);
        const paneHandlerName = scrollyPage.leafletWidgets[index].paneHandlerName;
        // cf. leafletWidgetToPane
        const paneHandler = paneHandlerName && maxwell.paneHandlerForName(scrollyPage, paneHandlerName);
        if (widgetId) {
            const handler = maxwell.widgetHandlerForName(paneHandler, widgetId);
            if (handler) {
                handler.bindWidget(widget, scrollyPage, paneHandler, handler);
            } else {
                console.log("No widget handler configured for widget with id ", widgetId);
            }
        } else {
            console.log("Warning: no widget id found for plotly widget ", widget);
        }
    });
};

maxwell.checkDataPanes = function (dataPanes, widgets) {
    if (dataPanes.length !== widgets.length) {
        throw "Error during reknitting - emitted " + dataPanes.length + " data panes for " + widgets.length + " widgets";
    } else {
        return [...dataPanes];
    }
};

maxwell.leafletiseCoords = function (coords) {
    return coords.map(poly => poly.map(HTMLWidgets.dataframeToD3));
};

// Undo bizarre "multiplexing" which is achieved by the HTMLWidgets "dataFrame" system
maxwell.resolveVectorOptions = function (options, index) {
    const entries = Object.entries(options).map(([key, val]) =>
        [key, Array.isArray(val) ? val[index] : val]
    );
    return Object.fromEntries(entries);
};

// Another demultiplexing for dataframe args
maxwell.projectArgs = function (args, index) {
    return args.map(arg => Array.isArray(arg) ? arg[index] : arg);
};

maxwell.divIcon = function (label, className) {
    return L.divIcon({
        html: "<div>" + label + "</div>",
        iconSize: null,
        className: className
    });
};

// From https://gis.stackexchange.com/questions/31951/showing-popup-on-mouse-over-not-on-click-using-leaflet
maxwell.hoverPopup = function (layer, paneOptions) {
    const mouseHandler = function (ev) {
        layer.openPopup(ev.latlng);
        console.log("Open popup for pane " + paneOptions.pane);
    };
    layer.on("mouseover", mouseHandler);
    layer.on("mousemove", mouseHandler);
    layer.on("mouseout", function () {
        this.closePopup();
    });
};

maxwell.addMarkers = function (lat, lon, iconOrRadius, options, label, labelOptions, paneOptions, group) {
    const pane = paneOptions.pane;
    // Note that labelOnlyMarkers are spat out in https://github.com/rstudio/leaflet/blob/main/R/layers.R#L826
    // We detect this through the special case of a width set to 1 and use a div icon which is much
    // easier to configure than the HTMLwidgets strategy of a permanently open tooltip attached to the marker
    if (!iconOrRadius) {
        const markerIcon = new L.Icon.Default();
        markerIcon.options.shadowSize = [0, 0];
        const marker = L.marker([lat, lon], {icon: markerIcon, ...paneOptions}).addTo(group);
        const divIcon = maxwell.divIcon(label, labelOptions.className);
        const labelMarker = L.marker([lat, lon], {icon: divIcon, ...paneOptions}).addTo(group);
        const paneInstance = maxwell.globalOptions.paneMap[pane];
        const clickHandler = function () {
            // TODO: This will become a component
            paneInstance.emitter.emit("click", label);
        };
        if (paneInstance) {
            marker.on("click", clickHandler);
            labelMarker.on("click", clickHandler);
        }
    } else if (typeof(iconOrRadius) === "number") {
        const radius = iconOrRadius;
        const circleMarker = L.circleMarker([lat, lon], {radius, ...options, ...paneOptions}).addTo(group);
        if (label) {
            circleMarker.bindPopup(label, {closeButton: false, ...labelOptions});
            maxwell.hoverPopup(circleMarker, paneOptions);
        }
    } else {
        const icon = iconOrRadius;
        const Licon = icon.iconWidth === 1 ?
            maxwell.divIcon(label) :
            L.icon({
                iconUrl: icon.iconUrl,
                iconSize: [icon.iconWidth, icon.iconHeight]
            });
        L.marker([lat, lon], {icon: Licon, ...paneOptions}).addTo(group);
    }
    // from https://github.com/rstudio/leaflet/blob/main/javascript/src/methods.js#L189
};

/**
 * Information about an allocated Leaflet pane
 *
 * @typedef {SectionHolder} PaneInfo
 * @property {String} paneName - The name of the pane, in the form "maxwell-pane-n"
 * @property {HTMLElement} pane - The HTML element for the allocated pane
 * @property {LayerGroup} group - The root LayerGroup allocated for the pane
 * @property {Object} paneOptions - Options to be mixed in to any layers in order to allocate them to this pane,
 * being the member {pane: paneName}
 */

/** Allocates a pane to hold controls at the specified index and subIndex values
 * @param {LeafletMap} map - The Leaflet Map in which the pane is to be allocated
 * @param {Integer} index - The index of the pane to be allocated
 * @param {Integer} [subLayerIndex] - Optional subindex of the pane
 * @param {String} [overridePane] - An optional override pane in case the default algorithm choice is to be overriden - in
 * case, e.g. that the material is destined for a base map pane
 * @return {PaneInfo} - The allocated paneInfo structure
 */
maxwell.allocatePane = function (map, index, subLayerIndex, overridePane) {
    let paneName = "maxwell-pane-" + (index === undefined ? overridePane : index);
    if (subLayerIndex !== undefined) {
        paneName += "-subpane-" + subLayerIndex;
    }
    const paneOptions = {
        pane: paneName
    };
    let group;
    let pane = map.getPane(paneName);
    if (!pane) {
        pane = map.createPane(paneName);
        pane.classList.add("mxcw-mapPane");
        if (subLayerIndex !== undefined) {
            pane.classList.add("mxcw-mapSubPane");
        }
        group = L.layerGroup(paneOptions).addTo(map);
        // We used to jam these onto the map so they could be found - now they go into paneInfo in our own records
        map["mx-group-" + paneName] = group;
    } else {
        group = map["mx-group-" + paneName];
    }

    return {paneName, pane, paneOptions, group};
};

/** Gets a paneHandler component fully ready for handling polygon options, or returns
 * a placeholder if this is a section with no actual leaflet widget (e.g. an inatComponents pane)
 * @param {paneHandler} [paneHandler] - An optional paneHandler component
 * @return {paneHandler} A paneHandler component with resolved members, or a placeholder
 */
maxwell.resolvePaneHandler = function (paneHandler) {
    if (paneHandler) {
        fluid.getForComponent(paneHandler, "handlePoly");
        fluid.getForComponent(paneHandler, "polyOptions");
        return paneHandler;
    } else {
        return {
            polyOptions: fluid.identity,
            handlePoly: fluid.identity
        };
    }
};

// Allocate a polygonal leaflet call into a pane or subpane
maxwell.assignPolyToPane = function (rawPaneHandler, callArgs, polyMethod, paneInfo) {
    const shapes = callArgs[0],
        options = Object.assign({}, callArgs[3], paneInfo.paneOptions);
    const paneHandler = maxwell.resolvePaneHandler(rawPaneHandler);
    shapes.forEach(function (shape, index) {
        const r = v => maxwell.resolveVectorOptions(v, index);
        const args = maxwell.projectArgs(callArgs, index);
        const shapeOptions = r(options);
        const label = args[6];
        const labelOptions = args[7];
        const finalOptions = paneHandler.polyOptions(shapeOptions, label, labelOptions);
        const polygon = L[polyMethod](maxwell.leafletiseCoords(shape), finalOptions).addTo(paneInfo.group);
        if (label) {
            polygon.bindPopup(label, {closeButton: false, ...labelOptions});
            maxwell.hoverPopup(polygon, paneInfo.paneOptions);
        }
        paneHandler.handlePoly(polygon, shapeOptions, label, labelOptions);
    });
};

maxwell.leafletPolyMethods = {
    addPolygons: "polygon",
    addPolylines: "polyline"
};

maxwell.methodToLayoutArg = {
    addPolygons: 1,
    addRasterImage: 4
};

/**
 * Looks up any `layoutId` argument in the supplied Leaflet widget's `call` structure
 * @param {HTMLWidgetCall} call - The call to be searched
 * @return {String|undefined} - The `layoutId` argument, if any
 */
maxwell.decodeLayoutId = function (call) {
    const argPos = maxwell.methodToLayoutArg[call.method];
    return argPos && call.args[argPos];
};

maxwell.decodeNonLeafletHandler = function (widget) {
    const nameHolder = [...widget.node.classList].find(clazz => clazz.startsWith("mxcw-paneName-"));
    return nameHolder.substring("mxcw-paneName-".length);
};

maxwell.decodeLeafletWidgetCall = function (options, call) {
    const {map, widget, index, paneInfo, paneHandler} = options;
    const {paneOptions, group} = paneInfo;
    // TODO: Current assumption is that any choice of layoutId converts to a direct assignment to the same-named pane -
    // which is useful for assigning to "baseMap" e.g. in the community directory but not good for e.g. Howe Sound assignment
    // to clickable "communities".
    const overridePane = maxwell.decodeLayoutId(call);
    let overridePaneInfo, overridePaneOptions, overrideGroup;
    if (overridePane && typeof(overridePane) === "string") { // tmap will allocate a vector layoutId, ignore it
        overridePaneInfo = maxwell.allocatePane(map, undefined, undefined, overridePane);
        overridePaneOptions = overridePaneInfo.paneOptions;
        overrideGroup = overridePaneInfo.group;
    }
    // See https://github.com/rstudio/leaflet/blob/main/javascript/src/methods.js#L550
    const polyMethod = maxwell.leafletPolyMethods[call.method];
    if (polyMethod) {
        // TODO: Note that because we can't tunnel arguments other than layerId for addRasterImage, we should move
        // the subLayerIndex system (used for Howe Sound choropleth) over to layerId as well to support future
        // uses of raster images in a choropleth
        // TODO: We should probably demultiplex these arguments up front so that we can support multiplex assignment of
        // layerId and subLayerIndex on the R side
        const subLayerIndex = call.args[3].mx_subLayerIndex;
        if (subLayerIndex !== undefined) {
            const subPaneInfo = maxwell.allocatePane(map, index, subLayerIndex);
            maxwell.assignPolyToPane(paneHandler, call.args, polyMethod, subPaneInfo);
            widget.subPanes[subLayerIndex] = subPaneInfo;
        } else {
            maxwell.assignPolyToPane(paneHandler, call.args, polyMethod, overridePaneInfo || paneInfo);
        }
    } else if (call.method === "addRasterImage") {
        // args: url, bounds, opacity
        const opacity = call.args[2] ?? 1.0;
        L.imageOverlay(call.args[0], call.args[1], Object.assign({}, {
            opacity: opacity
        }, overridePaneOptions || paneOptions)).addTo(overrideGroup || group);
    } else if (call.method === "addMarkers" || call.method === "addCircleMarkers") {
        // Very limited support currently - just for labelOnlyMarkers used in fire history
        // args: lat, lng, icon || radius, layerId, group, options, popup, popupOptions,
        // clusterOptions, clusterId, label, labelOptions, crosstalkOptions
        const markerArgs = [call.args[0], call.args[1], call.args[2], call.args[5], call.args[10], call.args[11], paneOptions, group];
        if (Array.isArray(call.args[0])) {
            for (let i = 0; i < call.args[0].length; ++i) {
                maxwell.addMarkers.apply(null, maxwell.projectArgs(markerArgs, i));
            }
        } else {
            maxwell.addMarkers.apply(null, markerArgs);
        }
    } else {
        console.log("Unknown R leaflet method " + call.method + " discarded");
    }
};

/** Decodes all the calls in a leaflet widget and allocates them to an appropriate pane or subpane of the overall
 * @param {maxwell.scrollyPage} scrollyPage - The overall scrollyPage component
 * @param {LeafletMap} map - The map holding the pane to which the widget's calls should be assigned
 * @param {LeafletWidgetInfo} widget - The information structure for the widget as returned from findLeafletWidgets. This will
 * be modified by the call to add a member `pane` indicating the base pane to which the widget is allocated (this may
 * be overriden by a `layerId` entry in a particular `call` entry for the widget), as well as an optional member mapId
 * @param {Integer} index - The index of the widget/section heading in the document structure
 */
maxwell.leafletWidgetToPane = function (scrollyPage, map, widget, index) {
    widget.paneHandlerName = widget.data ? widget.data.x?.options?.mx_mapId : maxwell.decodeNonLeafletHandler(widget);
    const paneHandler = widget.paneHandlerName && maxwell.paneHandlerForName(scrollyPage, widget.paneHandlerName);
    const paneInfo = maxwell.allocatePane(map, index);
    if (widget.data) {
        widget.data.x.calls.forEach(call => maxwell.decodeLeafletWidgetCall({map, widget, index, paneInfo, paneHandler}, call));
    }
    widget.paneInfo = paneInfo;
};

/**
 * @param {maxwell.scrollyPage} scrollyPage - The overall scrollyPage component
 * @param {LeafletWidgetInfo[]} leafletWidgets - Array of partially completed leaflet widget structures
 * @param {LeafletMap} map - The map holding the pane to which the widget's calls should be assigned
 */
maxwell.decodeLeafletWidgets = function (scrollyPage, leafletWidgets, map) {
    leafletWidgets.forEach((widget, i) => maxwell.leafletWidgetToPane(scrollyPage, map, widget, i));
};

// Index the collection of leafletWidget components by paneHandlerName
maxwell.leafletWidgetsToIndex = function (leafletWidgets) {
    const togo = {};
    leafletWidgets.forEach(function (widget, index) {
        if (widget.paneHandlerName) {
            togo[widget.paneHandlerName] = index;
        }
    });
    return togo;
};

/**
 * Decodes the document structure surrounding an array of DOM nodes representing Leaflet widgets
 * @param {maxwell.scrollyPage} scrollyPage - The overall scrollyPage component
 * @param {HTMLElement[]} widgets - The array of DOM nodes representing Leaflet widgets
 * @param {LeafletMap} map - The map holding the pane to which the widget's calls should be assigned
 * @return {LeafletWidgetInfo[]} An array of structures representing the Leaflet widgets
 */
maxwell.mapLeafletWidgets = function (scrollyPage, widgets, map) {
    console.log("Found " + widgets.length + " leaflet widgets");
    const togo = [...widgets].map(function (widget) {
        const id = widget.id;
        const dataNode = id ? document.querySelector("[data-for=\"" + id + "\"") : null;
        console.log("Got data node ", dataNode);
        const data = dataNode ? JSON.parse(dataNode.innerHTML) : null;
        console.log("Got data ", data);
        const section = widget.closest(".section.level2");
        const heading = section.querySelector("h2");
        return {
            node: widget,
            data: data,
            subPanes: [],
            section: section,
            heading: heading
        };
    });
    maxwell.decodeLeafletWidgets(scrollyPage, togo, map);
    return togo;
};

// Search through an HTMLWidgets "calls" structure for a method with particular name
maxwell.findCall = function (calls, method) {
    return calls.find(call => call.method === method);
};

maxwell.toggleActiveClass = function (nodes, selectedIndex, clazz) {
    nodes.forEach(function (node, i) {
        if (i === selectedIndex) {
            node.classList.add(clazz);
        } else {
            node.classList.remove(clazz);
        }
    });
};

maxwell.updateActiveWidgetSubPanes = function (that, effectiveActiveSubpanes) {
    effectiveActiveSubpanes.forEach((subPaneIndex, index) => {
        const subPanes = that.leafletWidgets[index].subPanes.map(paneInfo => paneInfo.pane);
        maxwell.toggleActiveClass(subPanes, subPaneIndex, "mxcw-activeMapPane");
    });
};

/** Apply the map bounds found either in a fitBounds or setView call attached to the supplied widget data
 * @param {LeafletMap} map - The map to which the view is to be applied
 * @param {Object} xData - The "data.x" member of the HTMLWidgets Leaflet instantiator
 */
maxwell.applyView = function (map, xData) {
    const bounds = xData.fitBounds;
    const setView = xData.setView;
    if (bounds) {
        map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]]);
    } else if (setView) {
        map.setView(setView[0], setView[1]);
    } else {
        console.error("Unable to find map view information in widget data ", xData);
    }
};

maxwell.flyToBounds = function (map, xData, durationInMs) {
    return new Promise(function (resolve) {
        const bounds = xData.fitBounds;
        if (bounds) {
            if (map._loaded) {
                map.flyToBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], {
                    duration: durationInMs / 1000
                });
                map.once("moveend zoomend", resolve);
            } else {
                maxwell.applyView(map, xData);
                resolve();
            }
        } else {
            resolve();
        }
    });
};


maxwell.makeLeafletMap = function (node) {
    return L.map(fluid.unwrap(node));
};

maxwell.paneKeyToIndex = function (handler, scrollyPage) {
    const key = fluid.getForComponent(handler, "options.paneKey");
    const sectionNameToIndex = fluid.getForComponent(scrollyPage, "sectionNameToIndex");
    const index = sectionNameToIndex[key];
    if (index === undefined) {
        fluid.fail("Unable to look up section handler with name " + key + " to a data pane index");
    }
    return index;
};

/**
 * Given a paneHandler component, determine which data pane its contents should be rendered into, by indirecting
 * into the sectionNameToIndex structure.
 * @param {maxwell.scrollyPaneHandler} handler - The paneHandler to be looked up
 * @param {maxwell.scrollyPage} scrollyPage - The overall scrollyPage component
 * @return {jQuery} A jQuery-wrapped container node suitable for instantiating a component.
 */
maxwell.dataPaneForPaneHandler = function (handler, scrollyPage) {
    const index = maxwell.paneKeyToIndex(handler, scrollyPage);
    return fluid.container(scrollyPage.dataPanes[index]);
};

maxwell.leafletWidgetForPaneHandler = function (handler, scrollyPage) {
    const index = maxwell.paneKeyToIndex(handler, scrollyPage);
    return scrollyPage.leafletWidgets[index];
};

maxwell.paneHandlerForName = function (scrollyPage, paneName) {
    const paneHandlers = fluid.queryIoCSelector(scrollyPage, "maxwell.paneHandler", true);
    return paneHandlers.find(handler => fluid.getForComponent(handler, "options.paneKey") === paneName);
};

maxwell.widgetHandlerForName = function (paneHandler, widgetId) {
    const widgetHandlers = fluid.queryIoCSelector(paneHandler, "maxwell.widgetHandler", true);
    return widgetHandlers.find(handler => fluid.getForComponent(handler, "options.widgetKey") === widgetId);
};

maxwell.unflattenOptions = function (records) {
    return fluid.transform(records, record => ({
        type: record.type,
        options: fluid.censorKeys(record, ["type"])
    }));
};

maxwell.resolvePaneHandlers = function () {
    // Written into the markup by maxwell.reknitFile in reknit.js
    const rawPaneHandlers = maxwell.scrollyPaneHandlers;
    return maxwell.unflattenOptions(rawPaneHandlers);
};

fluid.defaults("maxwell.scrollyPage", {
    gradeNames: ["fluid.viewComponent", "fluid.resourceLoader"],
    container: "body",
    paneMap: {
        // Map of paneName to objects holding an emitter on which "click" is firable - currently only used in
        // Maxwell proper with maxwell.siteSelectable in order to make sites selectable. This will be
        // migrated to paneHandler
    },
    resources: {
        plotlyReady: {
            promiseFunc: "maxwell.HTMLWidgetsPostRender"
        }
    },
    selectors: {
        leafletWidgets: ".html-widget.leaflet",
        dataPanes: ".mxcw-widgetPane",
        leafletMap: ".mxcw-map",
        content: ".mxcw-content"
    },
    components: {
        map: {
            type: "maxwell.scrollyLeafletMap",
            container: "{scrollyPage}.dom.leafletMap"
        }
    },
    paneHandlers: "@expand:maxwell.resolvePaneHandlers()",
    dynamicComponents: {
        paneHandlers: {
            sources: "{that}.options.paneHandlers",
            type: "{source}.type",
            options: "{source}.options"
        }
    },
    members: {
        leafletWidgets: "@expand:maxwell.mapLeafletWidgets({that}, {that}.dom.leafletWidgets, {that}.map.map)",
        sectionHolders: "@expand:{that}.resolveSectionHolders()",
        dataPanes: "@expand:maxwell.checkDataPanes({that}.dom.dataPanes, {that}.leafletWidgets)",
        // Populated by mapLeafletWidgets as it gets mapId out of its options - note that this depends on sectionIndexToWidgetIndex remaining the identity
        sectionNameToIndex: "@expand:maxwell.leafletWidgetsToIndex({that}.leafletWidgets)"
    },
    invokers: {
        sectionIndexToWidgetIndex: "fluid.identity",
        resolveSectionHolders: "fluid.identity({that}.leafletWidgets)"
    },
    model: {
        activeSection: 0,
        activePane: 0,
        // Map of pane indices to active subpanes
        activeSubPanes: [],
        // Map of pane indices to active subpanes, with inactive panes having their subpane index set to -1
        effectiveActiveSubpanes: [],
        // Prevent the component trying to render until plotly's postRenderHandler has fired
        plotlyReady: "{that}.resources.plotlyReady.parsed"
    },
    modelListeners: {
        updateClasses: {
            path: "activeSection",
            funcName: "maxwell.updateSectionClasses",
            args: ["{that}", "{change}.value"]
        },
        updateActiveMapPane: {
            path: "activePane",
            funcName: "maxwell.updateActiveMapPane",
            args: ["{that}", "{change}.value"]
        },
        updateActiveWidgetPane: {
            path: "activePane",
            funcName: "maxwell.updateActiveWidgetPane",
            args: ["{that}", "{change}.value"]
        },
        updateActiveWidgetSubPanes: {
            path: "effectiveActiveSubpanes",
            funcName: "maxwell.updateActiveWidgetSubPanes",
            args: ["{that}", "{change}.value"]
        }
    },
    modelRelay: {
        sectionToPane: {
            source: "activeSection",
            target: "activePane",
            func: "{that}.sectionIndexToWidgetIndex"
        },
        subPanesToEffective: {
            target: "effectiveActiveSubpanes",
            func: "maxwell.subPanesToEffective",
            args: ["{that}.model.activePane", "{that}.model.activeSubPanes"]
        }
    },
    listeners: {
        "onCreate.registerSectionListeners": "maxwell.registerSectionListeners({that})",
        // This will initialise subPaneIndices quite late
        "onCreate.findPlotlyWidgets": "maxwell.findPlotlyWidgets({that}, {that}.dataPanes)"
    }
});

// Convert the HTMLWidgets postRenderHandler into a promise
maxwell.HTMLWidgetsPostRender = function () {
    const togo = fluid.promise();
    HTMLWidgets.addPostRenderHandler(function () {
        togo.resolve(true);
    });
    return togo;
};

maxwell.updateSectionClasses = function (that, activeSection) {
    maxwell.toggleActiveClass(that.sectionHolders.map(sectionHolder => sectionHolder.section), activeSection, "mxcw-activeSection");
};

/**
 * Convert the pane and subpane selection index state to an array of effectively active panes
 * @param {Integer} activePane - The currently active pane
 * @param {Integer[]} activeSubPanes - The array of currently active subpanes
 * @return {Integer[]} An array of pane visibility flags, with inactive panes having subpane index censored to -1
 */
maxwell.subPanesToEffective = function (activePane, activeSubPanes) {
    return activeSubPanes.map((activeSubPane, index) => index === activePane ? activeSubPane : -1);
};

maxwell.updateActiveMapPane = function (that, activePane) {
    const widgets = that.leafletWidgets;
    const widgetPanes = widgets.map(widget => widget.paneInfo.pane);
    maxwell.toggleActiveClass(widgetPanes, -1, "mxcw-activeMapPane");
    widgetPanes[activePane].style.display = "block";
    const data = widgets[activePane].data;
    const zoom = data ? maxwell.flyToBounds(that.map.map, data.x, that.map.options.zoomDuration) : fluid.promise().resolve();
    zoom.then(function () {
        maxwell.toggleActiveClass(widgetPanes, activePane, "mxcw-activeMapPane");
        // This is a hack to cause SVG plotly widgets to resize themselves e.g. the Species Reported bar -
        // find a better solution
        window.dispatchEvent(new Event("resize"));
        window.setTimeout(function () {
            widgetPanes.forEach(function (pane, index) {
                const visibility = (index === activePane ? "block" : "none");
                console.log("Set visibility of index " + index + " to " + visibility);
                pane.style.display = visibility;
            });
        }, 1);
    });
};

maxwell.registerSectionListeners = function (that) {
    const sectionHolders = that.sectionHolders;
    sectionHolders.forEach(function (sectionHolder, i) {
        sectionHolder.heading.addEventListener("click", () => that.applier.change("activeSection", i));
    });
    const content = that.dom.locate("content")[0];
    content.addEventListener("scroll", function () {
        const scrollTop = content.scrollTop;
        const offsets = sectionHolders.map(widget => widget.section.offsetTop);
        let index = offsets.findIndex(offset => offset > (scrollTop - 10));
        if (index === -1) {
            index = sectionHolders.length - 1;
        }
        that.applier.change("activeSection", index);
    });
};

maxwell.updateActiveWidgetPane = function (that, activePane) {
    maxwell.toggleActiveClass(that.dataPanes, activePane, "mxcw-activeWidgetPane");
};

fluid.defaults("maxwell.scrollyLeafletMap", {
    gradeNames: "fluid.viewComponent",
    members: {
        map: "@expand:maxwell.makeLeafletMap({that}.container)"
    },
    zoomDuration: 2000,
    listeners: {
        "onCreate.getTiles": "maxwell.applyZerothTiles({scrollyPage}.leafletWidgets, {that}.map)",
        "onCreate.applyView": "maxwell.applyZerothView({scrollyPage}.leafletWidgets, {that}.map)"
    }
});

maxwell.applyZerothTiles = function (leafletWidgets, map) {
    const data0 = leafletWidgets[0].data.x;
    const tiles = maxwell.findCall(data0.calls, "addTiles");
    if (tiles) {
        L.tileLayer(tiles.args[0], tiles.args[3]).addTo(map);
    } else {
        const pTiles = maxwell.findCall(data0.calls, "addProviderTiles");
        L.tileLayer.provider(pTiles.args[0], pTiles.args[3]).addTo(map);
    }
};

maxwell.applyZerothView = function (leafletWidgets, map) {
    const data0 = leafletWidgets[0].data.x;
    maxwell.applyView(map, data0);
};

fluid.defaults("maxwell.paneHandler", {
    gradeNames: "fluid.viewComponent",
    paneKey: "{sourcePath}",
    paneIndex: "@expand:maxwell.paneKeyToIndex({that}, {maxwell.scrollyPage})",
    leafletWidget: "@expand:maxwell.leafletWidgetForPaneHandler({that}, {maxwell.scrollyPage})",
    modelRelay: {
        isVisible: {
            args: ["{maxwell.scrollyPage}.model.activePane", "{that}.options.paneIndex"],
            func: (activePane, paneIndex) => activePane === paneIndex,
            target: "isVisible"
        }
    },
    listeners: {
        "onCreate.addPaneClass": "maxwell.paneHandler.addPaneClass"
    },
    resolvedWidgets: "@expand:maxwell.unflattenOptions({that}.options.widgets)",
    dynamicComponents: {
        widgets: {
            sources: "{that}.options.resolvedWidgets",
            type: "{source}.type",
            options: "{source}.options"
        }
    }
});

fluid.defaults("maxwell.widgetHandler", {
    gradeNames: "fluid.component",
    widgetKey: "{sourcePath}"
});

maxwell.paneHandler.addPaneClass = function (that) {
    that.container[0].classList.add("mxcw-widgetPane-" + that.options.paneKey);
};

fluid.defaults("maxwell.scrollyPaneHandler", {
    gradeNames: "maxwell.paneHandler",
    members: {
        container: "@expand:maxwell.dataPaneForPaneHandler({that}, {maxwell.scrollyPage})"
    },
    invokers: {
        polyOptions: "fluid.identity",
        handlePoly: "fluid.identity"
    }
});

fluid.defaults("maxwell.templateScrollyPaneHandler", {
    gradeNames: ["maxwell.paneHandler", "fluid.templateRenderingView"],
    // Bodge the sunburst loader to being a traditional templateRenderingView so that its markup arrives earlier -
    // In practice didn't manage to break the race condition. Port this into core imerss-viz
    rendererTemplateResources: {
        template: false,
        markup: true
    },
    invokers: {
        renderMarkup: "fluid.identity({that}.resources.markup.parsed)"
    },
    parentContainer: "@expand:maxwell.dataPaneForPaneHandler({that}, {maxwell.scrollyPage})"
});
