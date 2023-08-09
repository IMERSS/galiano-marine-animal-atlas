/* eslint-env node */

"use strict";

const linkedom = require("linkedom");

const extractName = function (filename) {
    const regex = /\/([^/]+)\.[^.]+$/;

    const match = regex.exec(filename);
    const segment = match[1];
    const withSpace = segment.replace("_", " ");
    return withSpace;
};

const addHeader = function (document, container, template, rec, config) {
    const jobs = [...config.reknitJobs].sort((a, b) => a.infile.localeCompare(b.infile));
    const links = jobs.map(function (job) {
        return {
            target: job.outfile.replace("%maxwell/docs", "."),
            active: job.outfile !== rec.outfile,
            text: extractName(job.infile)
        };
    });
    const linkmark = links.map(function (link) {
        return link.active ? `<a class="mx-header-link active" href="${link.target}">${link.text}</a>` : `<span class="mx-header-link inactive">${link.text}</span>`;
    }).join("\n");
    const header = `<div class="mx-header">${linkmark}</div>`;
    const h1 = template.querySelector("h1");
    const node = linkedom.parseHTML(header).document.firstChild;
    h1.parentNode.insertBefore(node, h1);
};

const prefixTitle = function (document, container, template) {
    const text = "Galiano Marine Animal Atlas - ";

    const text1 = template.createTextNode(text);
    const h1 = template.querySelector("h1");
    h1.insertBefore(text1, h1.firstChild);

    const text2 = template.createTextNode(text);
    const title = template.querySelector("title");
    title.insertBefore(text2, title.firstChild);
};

module.exports = {addHeader, prefixTitle};
