/////////////////////////////////////////////////////////////////////////////
// RES in web pages.

// Make canvas for all hieroglyphic.
function ResWeb() {
	var canvass = document.getElementsByTagName("canvas");
	for (var i = 0; i < canvass.length; i++) {
		var canvas = canvass[i];
		if (canvas.className.match(/^res/)) 
			ResWeb.makeSometime(canvas);
	}
}

// Root function for web page.
ResWeb.init =
function() {
	ResWeb();
};

// Make canvas, as soon as possible.
ResWeb.makeSometime =
function(canvas) {
	ResWeb.waitForFonts(function(){ ResWeb.make(canvas); }, 0);
};
// Make canvas now.
ResWeb.make =
function(canvas) {
	var code = canvas.firstChild.nodeValue;
	var style = window.getComputedStyle(canvas, null);
	var size = style.getPropertyValue("font-size").replace("px", "");
	if (code.match(/\s*\$/m)) {
		if (typeof ResLite === 'function') {
			var resLite = ResLite.parse(code);
			resLite.render(canvas, size);
		} else
			console.log("RESlite not available");
	} else {
		if (typeof ResFragment === 'function') {
			try {
				var frag = parser.parse(code);
			} catch(err) {
				var frag = parser.parse("\"?\"");
			}
			frag.render(canvas, size);
		} else
			console.log("RES not available");
	}
};

window.addEventListener("DOMContentLoaded", ResWeb.init);

/////////////////////////////////////////////////////////////////////////////
// Fonts.

// Has font been loaded?
// We look at two signs of which ratio of widths is know. Does this match?
// If not, the right font is not loaded.
// return: "" if correct font loaded, otherwise diagnostic string
ResWeb.fontLoaded =
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
ResWeb.fontsLoaded =
function() {
	var font = "50px Hieroglyphic";
	var fontAux = "50px HieroglyphicAux";
	var fontPlain = "50px HieroglyphicPlain";
	var result1 = "" + ResWeb.fontLoaded(font, "\uE03E", "\uE03F", 0.34);
	var result2 = "" + ResWeb.fontLoaded(fontAux, "\u0023", "\u0028", 0.29);
	var result3 = "" + ResWeb.fontLoaded(fontPlain, "\u0023", "\u0028", 1.39);
	if (result1 === "" && result2 === "" && result3 === "")
		return "";
	else
		return "Hieroglyphic " + result1 +
			"HieroglyphicAux " + result2 +
			"HieroglyphicPlain " + result3;
};

ResWeb.fontsDone = false;

// Check whether fonts have loaded. If not, wait and try anew.
// f: function to be applied if fonts present.
// c: count how often tried already
ResWeb.waitForFonts =
function(f, c) {
	if (ResWeb.fontsDone) {
		f();
	} else if (ResWeb.fontsLoaded() === "") {
		ResWeb.fontsDone = true;
		f();
	} else if (c > 40) {
		console.log("seem unable to load fonts: " + fontsLoaded());
		alert("seem unable to load fonts; perhaps try again later?");
	} else {
		setTimeout(function(){ ResWeb.waitForFonts(f, c+1); }, 1000);
	}
};

