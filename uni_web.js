/////////////////////////////////////////////////////////////////////////////
// RES in web pages.

// Make canvas for all hieroglyphic.
function UniWeb() {
	var canvass = document.getElementsByTagName("canvas");
	for (var i = 0; i < canvass.length; i++) {
		var canvas = canvass[i];
		if (canvas.className.match(/\buni\b/)) 
			UniWeb.makeSometime(canvas);
	}
}
// Make canvas for hieroglyphic in element.
UniWeb.makeIn =
function(elem) {
	var canvass = elem.getElementsByTagName("canvas");
	for (var i = 0; i < canvass.length; i++) {
		var canvas = canvass[i];
		if (canvas.className.match(/\buni\b/))
			UniWeb.make(canvas);
	}
};

// Root function for web page.
UniWeb.init =
function() {
	UniWeb();
	UniWeb.mapSigns();
};

// Make canvas, as soon as possible.
UniWeb.makeSometime =
function(canvas) {
	UniWeb.waitForFonts(function(){ UniWeb.make(canvas); }, 0);
};
// Make canvas now.
UniWeb.make =
function(canvas) {
	var text = canvas.firstChild;
	var code = canvas.firstChild !== null ? canvas.firstChild.nodeValue : "";
	var style = window.getComputedStyle(canvas, null);
	var size = style.getPropertyValue("font-size").replace("px", "");
	if (typeof UniFragment.makeFragment === "function") {
		try {
			var frag = uni_syntax.parse(Uni.SMPtoBMP(code));
			frag = frag.finetuneUni();
			frag.render(canvas, size);
		} catch(err) {
			console.log("Cannot parse " + UniWeb.mapSMPtoPrintable(code) + err);
		}
	} else
		console.log("Ancient Egyptian in Unicode not available");
};

window.addEventListener("DOMContentLoaded", UniWeb.init);

/////////////////////////////////////////////////////////////////////////////
// Fonts.

// Has font been loaded?
// We look at two signs of which ratio of widths is know. Does this match?
// If not, the right font is not loaded.
// return: "" if correct font loaded, otherwise diagnostic string
UniWeb.fontLoaded =
function(font, sign1, sign2, ratio) {
	var measureCanvas = document.createElement("canvas");
	var ctx = measureCanvas.getContext("2d");
	ctx.font = font;
	var w1 = ctx.measureText(sign1).width;
	var w2 = ctx.measureText(sign2).width;
	var measureRatio = 1.0 * w1 / w2;
	var margin = 0.1;
	if (Math.abs(ratio - measureRatio) > margin)
		return "expected " + ratio + " got " + measureRatio;
	else
		return "";
};
// return: "" if correct fonts loaded, otherwise diagnostic string
UniWeb.fontsLoaded =
function() {
	var font = "50px Hieroglyphic";
	var fontAux = "50px HieroglyphicAux";
	var fontPlain = "50px HieroglyphicPlain";
	var result1 = "" + UniWeb.fontLoaded(font, "\uE03E", "\uE03F", 0.34);
	var result2 = "" + UniWeb.fontLoaded(fontAux, "\u0023", "\u0028", 0.29);
	var result3 = "" + UniWeb.fontLoaded(fontPlain, "\u0023", "\u0028", 1.39);
	if (result1 === "" && result2 === "" && result3 === "")
		return "";
	else
		return "Hieroglyphic " + result1 +
			"HieroglyphicAux " + result2 +
			"HieroglyphicPlain " + result3;
};

UniWeb.fontsDone = false;

// Check whether fonts have loaded. If not, wait and try anew.
// f: function to be applied if fonts present.
// c: count how often tried already
UniWeb.waitForFonts =
function(f, c) {
	if (UniWeb.fontsDone) {
		f();
	} else if (UniWeb.fontsLoaded() === "") {
		UniWeb.fontsDone = true;
		f();
	} else if (c > 40) {
		console.log("seem unable to load fonts: " + UniWeb.fontsLoaded());
		alert("seem unable to load fonts; perhaps try again later?");
	} else {
		setTimeout(function(){ UniWeb.waitForFonts(f, c+1); }, 1000);
	}
};

/////////////////////////////////////////////////////////////////////////////
// Individual signs and transliteration.

UniWeb.mapSignsIn =
function(elem) {
	var spans = elem.getElementsByTagName("span");
	for (var i = 0; i < spans.length; i++) {
		var span = spans[i];
		if (span.className.match(/\bsign\b/)) {
			var code = span.firstChild.nodeValue;
			span.innerHTML = Uni.SMPtoBMP(code);
		}
	}
};
UniWeb.mapSigns =
function() {
	UniWeb.mapSignsIn(document);
};

UniWeb.mapSMPtoPrintable =
function(s) {
	var p = "";
	for (let c of s) {
		switch (c.codePointAt(0)) {
			case UniFragment.vertCode: p += "<VERT>"; break;
			case UniFragment.horCode: p += "<HOR>"; break;
			case UniFragment.stCode: p += "<ST>"; break;
			case UniFragment.sbCode: p += "<SB>"; break;
			case UniFragment.etCode: p += "<ET>"; break;
			case UniFragment.ebCode: p += "<EB>"; break;
			case UniFragment.overlayCode: p += "<OV>"; break;
			case UniFragment.beginCode: p += "<BEGIN>"; break;
			case UniFragment.endCode: p += "<END>"; break;
			default: p += c;
		}
	}
	return p
};
