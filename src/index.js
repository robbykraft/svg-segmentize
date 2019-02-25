// svg segmentize (c) Robby Kraft

import segmentize from "./segmentize";
const parseable = Object.keys(segmentize);

const svgNS = "http://www.w3.org/2000/svg";

// valid attributes for the <svg> object
const svgAttributes = ["class", "style", "externalResourcesRequired", "x", "y", "width", "height", "viewBox", "preserveAspectRatio", "zoomAndPan", "version", "baseProfile", "contentScriptType", "contentStyleType"];

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

const flatten_tree = function(element) {
	// the container objects in SVG: group, the svg itself
	if (element.tagName === "g" || element.tagName === "svg") {
		return Array.from(element.children)
			.map(child => flatten_tree(child))
			.reduce((a,b) => a.concat(b),[]);
	}
	return [element];
}

const attribute_list = function(element) {
	return Array.from(element.attributes)
		.filter(a => shape_attr[element.tagName].indexOf(a.name) === -1);
}

export const svg = function(svg) {
	let newSVG = document.createElementNS(svgNS, "svg");
	// copy over attributes
	svgAttributes.map(a => ({attribute: a, value: svg.getAttribute(a)}))
		.filter(obj => obj.value != null)
		.forEach(obj => newSVG.setAttribute(obj.attribute, obj.value));
	let elements = flatten_tree(svg);
	// copy over <style> elements
	let styles = elements.filter(e => e.tagName === "style" || e.tagName === "defs");
	if (styles.length > 0) {
		styles.map(style => style.cloneNode(true))
			.forEach(style => newSVG.appendChild(style));
	}
	// convert geometry to segments, preserving class
	let segments = elements
		.filter(e => parseable.indexOf(e.tagName) !== -1)
		.map(e => segmentize[e.tagName](e).map(unit => [...unit, attribute_list(e)]))
		.reduce((a,b) => a.concat(b), []);
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
	return newSVG;
}

export const segments = function(svg) {
	return flatten_tree(svg)
		.filter(e => parseable.indexOf(e.tagName) !== -1)
		.map(e => segmentize[e.tagName](e))
		.reduce((a,b) => a.concat(b), []);
}
