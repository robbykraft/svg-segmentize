// svg segmentize (c) Robby Kraft

// todo: introduce options {} as a second parameter, make available:
// RES_CIRCLE, RES_PATH

let DOMParser = (typeof window === "undefined" || window === null)
	? undefined
	: window.DOMParser;
if (typeof DOMParser === "undefined" || DOMParser === null) {
	DOMParser = require("xmldom").DOMParser;
}
let XMLSerializer = (typeof window === "undefined" || window === null)
	? undefined
	: window.XMLSerializer;
if (typeof XMLSerializer === "undefined" || XMLSerializer === null) {
	XMLSerializer = require("xmldom").XMLSerializer;
}
let document = (typeof window === "undefined" || window === null)
	? undefined
	: window.document;
if (typeof document === "undefined" || document === null) {
	document = new DOMParser()
		.parseFromString("<!DOCTYPE html><title>a</title>", "text/html")
}

import segmentize from "./segmentize";
import vkXML from "../include/vkbeautify-xml";

const parseable = Object.keys(segmentize);
const svgNS = "http://www.w3.org/2000/svg";

// valid attributes for the <svg> object
const svgAttributes = [
	"version",
	"xmlns",
	"contentScriptType",
	"contentStyleType",
	"baseProfile",
	"class",
	"externalResourcesRequired",
	"x",
	"y",
	"width",
	"height",
	"viewBox",
	"preserveAspectRatio",
	"zoomAndPan",
	"style"
];

// attributes that specify the geometry of each shape type
const shape_attr = {
	"line": ["x1", "y1", "x2", "y2"],
	"rect": ["x", "y", "width", "height"],
	"circle": ["cx", "cy", "r"],
	"ellipse": ["cx", "cy", "rx", "ry"],
	"polygon": ["points"],
	"polyline": ["points"],
	"path": ["d"]
};

const inputIntoXML = function(input) {
	// todo, how do you test for DOM level 2 core Element type in nodejs?
	return (typeof input === "string"
		? new DOMParser().parseFromString(input, "text/xml").documentElement
		: input);
}

const flatten_tree = function(element) {
	// the container objects in SVG: group, the svg itself
	if (element.tagName === "g" || element.tagName === "svg") {
		if (element.childNodes == null) { return []; }
		return Array.from(element.childNodes)
			.map(child => flatten_tree(child))
			.reduce((a,b) => a.concat(b),[]);
	}
	return [element];
}

const attribute_list = function(element) {
	return Array.from(element.attributes)
		.filter(a => shape_attr[element.tagName].indexOf(a.name) === -1);
}

const svg = function(input) {
	let inputSVG = inputIntoXML(input);
	let newSVG = document.createElementNS(svgNS, "svg");
	// copy over attributes
	svgAttributes.map(a => ({attribute: a, value: inputSVG.getAttribute(a)}))
		.filter(obj => obj.value != null && obj.value !== "")
		.forEach(obj => newSVG.setAttribute(obj.attribute, obj.value));
	// xmlns is required. make sure it's present
	if (newSVG.getAttribute("xmlns") === null) {
		newSVG.setAttribute("xmlns", svgNS);
	}
	let elements = flatten_tree(inputSVG);
	// copy over <style> elements
	let styles = elements
		.filter(e => e.tagName === "style" || e.tagName === "defs");
	if (styles.length > 0) {
		styles.map(style => style.cloneNode(true))
			.forEach(style => newSVG.appendChild(style));
	}
	// convert geometry to segments, preserving class
	let segments = elements
		.filter(e => parseable.indexOf(e.tagName) !== -1)
		.map(e => segmentize[e.tagName](e)
			.map(unit => [...unit, attribute_list(e)])
		).reduce((a,b) => a.concat(b), []);
	// write segments into the svg
	segments.forEach(s => {
		let line = document.createElementNS(svgNS, "line");
		line.setAttributeNS(null, "x1", s[0]);
		line.setAttributeNS(null, "y1", s[1]);
		line.setAttributeNS(null, "x2", s[2]);
		line.setAttributeNS(null, "y2", s[3]);
		if (s[4] != null) { 
			s[4].forEach(attr => line.setAttribute(attr.nodeName, attr.nodeValue));
		}
		newSVG.appendChild(line);
	});

	let stringified = new XMLSerializer().serializeToString(newSVG);
	let beautified = vkXML(stringified);
	return beautified;
}

const withAttributes = function(input) {
	let inputSVG = inputIntoXML(input);
	// convert geometry to segments, preserving class
	return flatten_tree(inputSVG)
		.filter(e => parseable.indexOf(e.tagName) !== -1)
		.map(e => segmentize[e.tagName](e).map(s => {
			let obj = ({x1:s[0], y1:s[1], x2:s[2], y2:s[3]});
			attribute_list(e).forEach(a => obj[a.nodeName] = a.value);
			return obj;
		}))
		.reduce((a,b) => a.concat(b), []);
}

const segments = function(input) {
	let inputSVG = inputIntoXML(input);
	return flatten_tree(inputSVG)
		.filter(e => parseable.indexOf(e.tagName) !== -1)
		.map(e => segmentize[e.tagName](e))
		.reduce((a,b) => a.concat(b), []);
}

export {
	svg,
	withAttributes,
	segments,
};
