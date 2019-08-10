/* Concatenation of source files */

/* res_aux.js */

/////////////////////////////////////////////////////////////////////////////
// Points and rectangles.

function ResPoint(x, y) {
	this.x = x;
	this.y = y;
}
ResPoint.fromAngle =
function(angle, dist) {
	var theta = 2 * Math.PI * angle;
	var x = dist * Math.cos(theta);
	var y = dist * Math.sin(theta);
	return new ResPoint(x, y);
};

function ResRectangle(x, y, width, height) {
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
}
ResRectangle.prototype.mirror =
function(width) {
	return new ResRectangle(width - this.x - this.width, this.y, this.width, this.height);
};
ResRectangle.prototype.intersect =
function(other) {
	var xLeft = Math.max(this.x, other.x);
	var xRight = Math.min(this.x + this.width, other.x + other.width);
	var yTop = Math.max(this.y, other.y);
	var yBottom = Math.min(this.y + this.height, other.y + other.height);
	var w = Math.max(xRight - xLeft, 0);
	var h = Math.max(yBottom - yTop, 0);
	return new ResRectangle(xLeft, yTop, w, h);
};
ResRectangle.prototype.includes =
function(x, y) {
	return this.x <= x && x < this.x+this.width && this.y <= y && y < this.y+this.height;
};
ResRectangle.prototype.chopStartH =
function(x) {
	return new ResRectangle(this.x, this.y, x - this.x, this.height);
};
ResRectangle.prototype.chopEndH =
function(x) {
	return new ResRectangle(x, this.y, this.width - x + this.x, this.height);
};
ResRectangle.prototype.chopStartV =
function(y) {
	return new ResRectangle(this.x, this.y, this.width, y - this.y);
};
ResRectangle.prototype.chopEndV =
function(y) {
	return new ResRectangle(this.x, y, this.width, this.height - y + this.y);
};
ResRectangle.prototype.chopPattern =
function(pattern) {
	var r = this;
	for (var i = 0; i < pattern.length; i++) {
		if (pattern.charAt(i) === 't') {
			r = new ResRectangle(r.x, r.y, r.width, r.height / 2);
		} else if (pattern.charAt(i) === 'b') {
			r = new ResRectangle(r.x, r.y + r.height / 2, r.width, r.height / 2);
		} else if (pattern.charAt(i) === 's') {
			r = new ResRectangle(r.x, r.y, r.width / 2, r.height);
		} else if (pattern.charAt(i) === 'e') {
			r = new ResRectangle(r.x + r.width / 2, r.y, r.width / 2, r.height);
		}
	}
	return r;
};
ResRectangle.prototype.center =
function(other) {
	var horSurplus = this.width - other.width;
	var vertSurplus = this.height - other.height;
	var x = this.x + horSurplus / 2 - other.x;
	var y = this.y + vertSurplus / 2 - other.y;
	return new ResRectangle(x, y, other.width, other.height);
};

/////////////////////////////////////////////////////////////////////////////
// Context.

function ResContext() {
	// fonts
	this.fonts = ["Hieroglyphic", "HieroglyphicAux", "HieroglyphicPlain"];
	// unit font size
	this.emSizePx = 36;
	// note size
	this.noteSizePx = 12;

	// separation between groups
	this.opSepEm = 0.15; // normal separation for operators
	this.boxSepEm = 0.04; // separation in box 
	this.paddingFactor = 1.0; // as factor of unpadded separation between groups
	this.paddingAllowed = false;

	// shading
	this.shadingSep = 4;
	this.shadingThickness = 1;
	this.shadingColor = "gray";
	this.shadingPattern = "x_is_y"; // is one of "x_is_y", "x_is_minus_y"

	// formatting
	this.iterateLimit = 4; // how often attempted to scaled down group
	this.scaleLimitEm = 0.01; // no group can be scaled down smaller than this

	// insert
	this.scaleInit = 0.05; // initial scale down for insert
	this.scaleStep = 1; // initial step for increasing scale
	this.scaleStepMin = 0.02; // smallest step for increasing scale
	this.scaleStepFactor = 0.4; // for decreasing scale step
	this.moveStepMin = 0.02; // minimal move step
	this.moveStepFactor = 0.6; // for decreasing move step

	// rendering
	this.marginPx = 2;
	this.boxOverlapPx = 1; // overlap of segments of box

	// notes
	this.noteColor = "black"; // default color of notes
	this.noteMargin = 2; // pixels around note

	// forced direction
	this.dir = undefined; // for RESlite can be null, "lr", "rl"
}

// Convert size between 1/1000 EM and number of pixels.
ResContext.prototype.milEmToPx =
function(sizeMilEm) {
	return sizeMilEm * this.emSizePx / 1000.0;
};
ResContext.prototype.pxToMilEm =
function(sizePx) {
	return sizePx === Number.MAX_VALUE ? Number.MAX_VALUE : 1000.0 * sizePx / this.emSizePx;
};

/////////////////////////////////////////////////////////////////////////////
// Environment for rendering.

function ResEnv(context) {
	this.resContext = context;
	var initialMarginPx = context.marginPx;
	this.minLeftMarginPx = initialMarginPx;
	this.minTopMarginPx = initialMarginPx;
	this.minRightMarginPx = initialMarginPx;
	this.minBottomMarginPx = initialMarginPx;
	this.updateMargins();
}
// Ensure that rectangle fits. If not, adjust dimensions for next time.
ResEnv.prototype.ensureRect =
function(rect) {
	var xMin = rect.x;
	var xMax = rect.x + rect.width;
	var yMin = rect.y;
	var yMax = rect.y + rect.height;
	this.ensureLeftMargin(this.leftMarginPx-xMin);
	this.ensureRightMargin(this.rightMarginPx+xMax-this.totalWidthPx);
	this.ensureTopMargin(this.topMarginPx-yMin);
	this.ensureBottomMargin(this.bottomMarginPx+yMax-this.totalHeightPx);
};
ResEnv.prototype.ensureLeftMargin =
function(m) {
	this.minLeftMarginPx = Math.max(this.minLeftMarginPx, m);
};
ResEnv.prototype.ensureRightMargin =
function(m) {
	this.minRightMarginPx = Math.max(this.minRightMarginPx, m);
};
ResEnv.prototype.ensureTopMargin =
function(m) {
	this.minTopMarginPx = Math.max(this.minTopMarginPx, m);
};
ResEnv.prototype.ensureBottomMargin =
function(m) {
	this.minBottomMarginPx = Math.max(this.minBottomMarginPx, m);
};
ResEnv.prototype.updateMargins =
function() {
	this.leftMarginPx = this.minLeftMarginPx;
	this.topMarginPx = this.minTopMarginPx;
	this.rightMarginPx = this.minRightMarginPx;
	this.bottomMarginPx = this.minBottomMarginPx;
};
ResEnv.prototype.marginsUnchanged =
function() {
	return this.minLeftMarginPx === this.leftMarginPx &&
		this.minTopMarginPx === this.topMarginPx &&
		this.minRightMarginPx === this.rightMarginPx &&
		this.minBottomMarginPx === this.bottomMarginPx;
};

/////////////////////////////////////////////////////////////////////////////
// Canvas operations.

function ResCanvas() {
}

// Make canvas with sizes, which must be at least 1.
ResCanvas.make =
function(width, height) {
	var canvas = document.createElement("canvas");
	canvas.width = Math.max(Math.round(width), 1);
	canvas.height = Math.max(Math.round(height), 1);
	return canvas;
};

// Clear canvas.
ResCanvas.clear =
function(canvas) {
	this.ctx = canvas.getContext("2d");
	this.ctx.clearRect(0, 0, canvas.width, canvas.height);
};

// Sum all values from pixel in data from canvas with dimensions.
// return: if there is non-blank pixel.
ResCanvas.isNotBlank =
function(data, width, x, y) {
	return data[y * width * 4 + x * 4 + 3] +
		data[y * width * 4 + x * 4 + 0] +
		data[y * width * 4 + x * 4 + 1] +
		data[y * width * 4 + x * 4 + 2] > 0;
};

// Find external pixels of sign.
// ctx: context of canvas
// w, h: dimensions
// return: 2-dimensional boolean array indicating which pixels are external
ResCanvas.externalPixels =
function(ctx, w, h) {
	var external = new Array(w);
	for (var x = 0; x < w; x++) {
		external[x] = new Array(h);
		for (var y = 0; y < h; y++) 
			external[x][y] = false;
	}
	if (w === 0 || h === 0)
		return external;
	var data = ctx.getImageData(0, 0, w, h).data;
	for (var x = 0; x < w; x++) {
		if (!ResCanvas.isNotBlank(data, w, x, 0))
			external[x][0] = true;
		if (!ResCanvas.isNotBlank(data, w, x, h-1))
			external[x][h-1] = true;
	}
	for (var y = 1; y < h-1; y++) {
		ResCanvas.externalPixelsSideways(data, w, 0, y, external);
		ResCanvas.externalPixelsSideways(data, w, w-1, y, external);
	}
	var changed = true;
	while (changed) {
		changed = false;
		for (var y = 1; y < h-1; y++) 
			for (var x = 1; x < w-1; x++) 
				if (external[x][y-1])
					changed |= ResCanvas.externalPixelsSideways(data, w, x, y, external);
		for (var y = h-2; y > 0; y--) 
			for (var x = 1; x < w-1; x++) 
				if (external[x][y+1])
					changed |= ResCanvas.externalPixelsSideways(data, w, x, y, external);
	}
	return external;
};
ResCanvas.externalPixelsSideways =
function(data, w, x, y, external) {
	if (external[x][y] || ResCanvas.isNotBlank(data, w, x, y)) 
		return false;
	external[x][y] = true; 
	for (var x2 = x-1; x2 >= 1; x2--) {
		if (!external[x2][y] && !ResCanvas.isNotBlank(data, w, x2, y)) 
			external[x2][y] = true; 
		else
			break;
	}
	for (var x2 = x+1; x2 < w-1; x2++) {
		if (!external[x2][y] && !ResCanvas.isNotBlank(data, w, x2, y)) 
			external[x2][y] = true; 
		else
			break;
	}
	return true;
};

// Erase pixels that are not valid. 
// valids: 2-dimensional boolean array 
ResCanvas.erasePixels =
function(ctx, w, h, valids) {
	var white = ctx.createImageData(1,1);
	var data = white.data;
	data[0] = 0;
	data[1] = 0;
	data[2] = 0;
	data[3] = 0;
	for (var x = 0; x < w; x++) 
		for (var y = 0; y < h; y++) 
			if (!valids[x][y]) 
				ctx.putImageData(white, x, y);
};

// Take big-enough canvas for sign, print sign, and measure
// dimensions and location of actual shape.
// str: string
// size: font size in px
// font: string describing font
// return: ResRectangle of bounding glyph as it is actually printed
ResCanvas.glyphRect =
function(str, size, xScale, font, rotate, mirror) {
	var sizedFont = "" + size + "px " + font;
	var measCanvas = document.createElement("canvas");
	var ctx = measCanvas.getContext("2d");
	ctx.font = sizedFont;
	ctx.fillStyle = "black";
	ctx.textBaseline = "alphabetic";
	var width = Math.max(1, Math.round(ctx.measureText(str).width));
	var height = Math.max(1, Math.round(size));
	if (rotate === 0) {
		var lMargin = Math.ceil(width / 5);
		var rMargin = Math.ceil(width / 5);
		var tMargin = Math.ceil(height / 5);
		var bMargin = Math.ceil(height / 2);
	} else {
		var dim = Math.max(width, height);
		var lMargin = Math.ceil(dim / 2);
		var rMargin = Math.ceil(dim / 2);
		var tMargin = Math.ceil(dim / 2);
		var bMargin = Math.ceil(dim / 2);
	}
	var maxRepeats = 3;
	for (var i = 0; i < maxRepeats; i++) {
		var w = width + lMargin + rMargin;
		var h = height + tMargin + bMargin;
		measCanvas.width = w;
		measCanvas.height = h;
		ctx = measCanvas.getContext("2d");
		ctx.font = sizedFont;
		ctx.fillStyle = "black";
		ctx.textBaseline = "alphabetic";
		if (rotate === 0 && !mirror && xScale === 1)
			ctx.fillText(str, lMargin, height + tMargin);
		else {
			ctx.translate(lMargin + width/2, tMargin + height/2);
			ctx.rotate(rotate*Math.PI/180);
			ctx.scale((mirror ? -1 : 1) * xScale, 1);
			ctx.fillText(str, -width/2, height/2);
		}
		var data = ctx.getImageData(0, 0, w, h).data;
		var margins = ResCanvas.margins(data, w, h);
		if (margins.t > 0 && margins.b > 0 && margins.l > 0 && margins.r > 0)
			break;
		lMargin *= 2;
		rMargin *= 2;
		tMargin *= 2;
		bMargin *= 2;
	}
	var realHeight = h - margins.t - margins.b;
	var realWidth = w - margins.l - margins.r;
	return new ResRectangle(margins.l - lMargin, bMargin - margins.b,
				realWidth, realHeight);
};
ResCanvas.printGlyph =
function(ctx, x, y, testRect, str, size, xScale, font, color, rotate, mirror) {
	var sizedFont = "" + size + "px " + font;
	ctx.save();
	ctx.font = sizedFont;
	ctx.fillStyle = color;
	ctx.textBaseline = "alphabetic";
	var width = Math.max(1, Math.round(ctx.measureText(str).width));
	var height = Math.max(1, Math.round(size));
	if (rotate === 0 && !mirror && xScale === 1) 
		ctx.fillText(str, x - testRect.x, y - testRect.y + testRect.height);
	else {
		var l = testRect.x;
		var r = width - l - testRect.width;
		var b = -testRect.y;
		var t = height - b - testRect.height;
		ctx.translate(x + width/2 - testRect.x, y - height/2 + testRect.height - testRect.y);
		ctx.rotate(rotate*Math.PI/180);
		ctx.scale((mirror ? -1 : 1) * xScale, 1);
		ctx.fillText(str, -width/2, height/2);
	}
	ctx.restore();
};

// Compute margins in data of canvas.
ResCanvas.margins =
function(data, w, h) {
	var t = 0;
	for (var y = 0; y < h; y++) {
		var rowEmpty = true;
		for (var x = 0; x < w; x++)
			if (ResCanvas.isNotBlank(data, w, x, y)) {
				rowEmpty = false;
				break;
			}
		if (rowEmpty)
			t++;
		else
			break;
	}
	var b = 0;
	for (var y = h-1; y >= 0; y--) {
		var rowEmpty = true;
		for (var x = 0; x < w; x++)
			if (ResCanvas.isNotBlank(data, w, x, y)) {
				rowEmpty = false;
				break;
			}
		if (rowEmpty)
			b++;
		else
			break;
	}
	var l = 0;
	for (var x = 0; x < w; x++) {
		var colEmpty = true;
		for (var y = 0; y < h; y++)
			if (ResCanvas.isNotBlank(data, w, x, y)) {
				colEmpty = false;
				break;
			}
		if (colEmpty)
			l++;
		else
			break;
	}
	var r = 0;
	for (var x = w-1; x >= 0; x--) {
		var colEmpty = true;
		for (var y = 0; y < h; y++)
			if (ResCanvas.isNotBlank(data, w, x, y)) {
				colEmpty = false;
				break;
			}
		if (colEmpty)
			r++;
		else
			break;
	}
	return {t: t, b: b, l: l, r: r};
};

// Take two images and compute how far they can approach while leaving sep
// between.
// First make aura around left-most pixels of second image.
ResCanvas.fitHor =
function(ctx1, ctx2, w1, w2, h, sepInit, sepMax) {
	var data1 = w1 > 0 && h > 0 ? ctx1.getImageData(0, 0, w1, h).data : null;
	var data2 = w2 > 0 && h > 0 ? ctx2.getImageData(0, 0, w2, h).data : null;
	var w = w2 + sepInit;
	var canvas = document.createElement("canvas");
	canvas.width = w;
	canvas.height = h;
	var ctx = canvas.getContext("2d");
	for (var y = 0; y < h; y++) 
		for (var x = 0; x < w2; x++) 
			if (ResCanvas.isNotBlank(data2, w2, x, y)) {
				ctx.fillStyle = "black";
				ctx.beginPath();
				ctx.arc(sepInit + x, y, Math.max(0.5,sepInit), 0.5*Math.PI, 1.5*Math.PI);
				ctx.stroke();
				break;
			}
	var data = w > 0 && h > 0 ? ctx.getImageData(0, 0, w, h).data : null;
	dist = -sepMax;
	for (var y = 0; y < h; y++) {
		for (var spLeft = 0; spLeft < w1; spLeft++)
			if (ResCanvas.isNotBlank(data1, w1, w1-1-spLeft, y))
				break;
		for (var spRight = 0; spRight < w; spRight++)
			if (ResCanvas.isNotBlank(data, w, spRight, y))
				break;
		if (spLeft < w1 && spRight < w)
			dist = Math.max(dist, sepInit - spLeft - spRight);
	}
	return dist;
};
ResCanvas.fitVert =
function(ctx1, ctx2, w, h1, h2, sepInit, sepMax) {
	var data1 = w > 0 && h1 > 0 ? ctx1.getImageData(0, 0, w, h1).data : null;
	var data2 = w > 0 && h2 > 0 ? ctx2.getImageData(0, 0, w, h2).data : null;
	var h = h2 + sepInit;
	var canvas = document.createElement("canvas");
	canvas.width = w;
	canvas.height = h;
	var ctx = canvas.getContext("2d");
	for (var x = 0; x < w; x++) 
		for (var y = 0; y < h2; y++) 
			if (ResCanvas.isNotBlank(data2, w, x, y)) {
				ctx.beginPath();
				ctx.arc(x, sepInit + y, Math.max(0.5,sepInit), 1.0*Math.PI, 2.0*Math.PI);
				ctx.stroke();
				break;
			}
	var data = w > 0 && h > 0 ? ctx.getImageData(0, 0, w, h).data : null;
	dist = -sepMax;
	for (var x = 0; x < w; x++) {
		for (var spTop = 0; spTop < h1; spTop++)
			if (ResCanvas.isNotBlank(data1, w, x, h1-1-spTop))
				break;
		for (var spBottom = 0; spBottom < h; spBottom++)
			if (ResCanvas.isNotBlank(data, w, x, spBottom))
				break;
		if (spTop < h1 && spBottom < h)
			dist = Math.max(dist, sepInit - spTop - spBottom);
	}
	return dist;
};

// Draw multiple times around coordinate.
ResCanvas.drawWithAura =
function(ctx, canvas, x, y, w, h, sep) {
	for (var angle = 0; angle < 0.99; angle += 1/8) {
		var p = ResPoint.fromAngle(angle, sep);
		ctx.drawImage(canvas, x + p.x, y + p.y, w, h);
	}
};

// Take two images of same size and compute whether they have black pixel in common.
ResCanvas.disjoint =
function(ctx1, ctx2, w, h) {
	if (w === 0 || h === 0)
		return false;
	var data1 = ctx1.getImageData(0, 0, w, h).data;
	var data2 = ctx2.getImageData(0, 0, w, h).data;
	for (var x = 0; x < w; x++)
		for (var y = 0; y < h; y++)
			if (ResCanvas.isNotBlank(data1, w, x, y) && ResCanvas.isNotBlank(data2, w, x, y))
				return false;
	return true;
};

// Internal space in horizontal box. 
ResCanvas.internalHor =
function(ctx, w, h) {
	var data = w > 0 && h > 0 ? ctx.getImageData(0, 0, w, h).data : null;
	var t = 0;
	for (var y = Math.round(1/3*h); y >= 0 && t === 0; y--)
		for (var x = 0; x < w; x++)
			if (ResCanvas.isNotBlank(data, w, x, y)) {
				t = y+1;
				break;
			}
	var b = 0;
	for (var y = Math.round(2/3*h); y < h && b === 0; y++)
		for (var x = 0; x < w; x++)
			if (ResCanvas.isNotBlank(data, w, x, y)) {
				b = h-y;
				break;
			}
	return {over: t, under: b};
};
ResCanvas.internalVert =
function(ctx, w, h) {
	var data = w > 0 && h > 0 ? ctx.getImageData(0, 0, w, h).data : null;
	var l = 0;
	for (var x = Math.round(1/3*w); x >= 0 && l === 0; x--)
		for (var y = 0; y < h; y++)
			if (ResCanvas.isNotBlank(data, w, x, y)) {
				l = x+1;
				break;
			}
	var r = 0;
	for (var x = Math.round(2/3*w); x < w && r === 0; x++)
		for (var y = 0; y < h; y++)
			if (ResCanvas.isNotBlank(data, w, x, y)) {
				r = w-x;
				break;
			}
	return {over: l, under: r};
};

// Find rectangle of given width within rectangle that is complete blank.
// Find it from right to left.
// return: top-left point, or false if unsuccesful.
ResCanvas.findFreeRectRightLeft =
function(ctx, w, h, rect, width) {
	var data = w > 0 && h > 0 ? ctx.getImageData(0, 0, w, h).data : null;
	var n = 0;
	for (var x = rect.x + rect.width-1; x >= rect.x; x--) {
		var isBlank = true;
		for (var y = rect.y; y < rect.y + rect.height; y++)
			if (0 <= x && x < w && 0 <= y && y < h && ResCanvas.isNotBlank(data, w, x, y)) {
				isBlank = false;
				break;
			}
		if (isBlank) {
			n++;
			if (n >= width)
				return new ResPoint(x, rect.y);
		} else 
			n = 0;
	}
	return false;
};
ResCanvas.findFreeRectLeftRight =
function(ctx, w, h, rect, width) {
	var data = w > 0 && h > 0 ? ctx.getImageData(0, 0, w, h).data : null;
	var n = 0;
	for (var x = rect.x; x < rect.x + rect.width; x++) {
		var isBlank = true;
		for (var y = rect.y; y < rect.y + rect.height; y++)
			if (0 <= x && x < w && 0 <= y && y < h && ResCanvas.isNotBlank(data, w, x, y)) {
				isBlank = false;
				break;
			}
		if (isBlank) {
			n++;
			if (n >= width)
				return new ResPoint(x-width, rect.y);
		} else 
			n = 0;
	}
	return false;
};
ResCanvas.findFreeRectBottomTop =
function(ctx, w, h, rect, height) {
	var data = w > 0 && h > 0 ? ctx.getImageData(0, 0, w, h).data : null;
	var n = 0;
	for (var y = rect.y + rect.height-1; y >= rect.y; y--) {
		var isBlank = true;
		for (var x = rect.x; x < rect.x + rect.width; x++)
			if (0 <= x && x < w && 0 <= y && y < h && ResCanvas.isNotBlank(data, w, x, y)) {
				isBlank = false;
				break;
			}
		if (isBlank) {
			n++;
			if (n >= height)
				return new ResPoint(rect.x, y);
		} else 
			n = 0;
	}
	return false;
};
ResCanvas.findFreeRectTopBottom =
function(ctx, w, h, rect, height) {
	var data = w > 0 && h > 0 ? ctx.getImageData(0, 0, w, h).data : null;
	var n = 0;
	for (var y = rect.y; y < rect.y + rect.height; y++) {
		var isBlank = true;
		for (var x = rect.x; x < rect.x + rect.width; x++)
			if (0 <= x && x < w && 0 <= y && y < h && ResCanvas.isNotBlank(data, w, x, y)) {
				isBlank = false;
				break;
			}
		if (isBlank) {
			n++;
			if (n >= height)
				return new ResPoint(rect.x, y-height);
		} else 
			n = 0;
	}
	return false;
};

/////////////////////////////////////////////////////////////////////////////
// Shading.

// Maps x coordinate (on x axis) to list of pairs of x coordinates 
// each delimiting a line segment of shading (hatching).
// context: ResContext
// mirror: boolean (whether mirrored)
// width: of canvas (in px)
function ResShading(context, mirror) {
	this.resContext = context;
	this.mirror = mirror;
	this.xToPairs = {};
}
ResShading.prototype.commonPattern =
function() {
	return this.resContext.shadingPattern === "x_is_y" && !this.mirror ||
		this.resContext.shadingPattern === "x_is_minus_y" && this.mirror;
};
ResShading.prototype.add =
function(x, xMin, xMax) {
	if (this.xToPairs[x] === undefined)
		this.xToPairs[x] = [];
	this.xToPairs[x].push([xMin, xMax]);
};
// rect: ResRectangle
ResShading.prototype.addRect =
function(rect) {
	var x = rect.x;
	var y = rect.y;
	var w = rect.width;
	var h = rect.height
	var sep = this.resContext.shadingSep;
	if (this.commonPattern()) {
		var xAxisMin = Math.floor((x + y) / sep) * sep;
		var xAxisMax = Math.ceil(x + w + y + h);
		for (var xAxis = xAxisMin; xAxis <= xAxisMax; xAxis += sep) {
			var xMin = Math.max(x, xAxis - y - h);
			var xMax = Math.min(x + w, xAxis - y);
			if (xMin < xMax)
				this.add(xAxis, xMin, xMax);
		}
	} else {
		var xAxisMin = Math.floor((x - y - h) / sep) * sep;
		var xAxisMax = Math.ceil(x + w - y);
		for (var xAxis = xAxisMin; xAxis <= xAxisMax; xAxis += sep) {
			var xMin = Math.max(x, xAxis + y);
			var xMax = Math.min(x + w, xAxis + y + h);
			if (xMin < xMax)
				this.add(xAxis, xMin, xMax);
		}
	}
};
// Connect lines of shading with small interruption.
ResShading.prototype.compress =
function() {
	for (var x in this.xToPairs) {
		var pairs = this.xToPairs[x];
		var changed = true;
		while (changed) {
			changed = false;
			for (var i = 0; i < pairs.length; i++) {
				var pair1 = pairs[i];
				for (var j = 0; j < i; j++) {
					var pair2 = pairs[j];
					if (this.overlap(pair1, pair2)) {
						pairs[j] = this.join(pair1, pair2);
						pairs.splice(i, 1);
						i--;
						changed = true;
						break;
					}
				}
			}
		}
	}
};
ResShading.prototype.overlap =
function(pair1, pair2) {
	var margin = 2;
	return (pair1[0] >= pair2[0] - margin && pair1[0] <= pair2[1] + margin) ||
		(pair1[1] >= pair2[0] - margin && pair1[1] <= pair2[1] + margin);
};
ResShading.prototype.join =
function(pair1, pair2) {
	return [Math.min(pair1[0], pair2[0]), Math.max(pair1[1], pair2[1])];
};
ResShading.prototype.print =
function(ctx) {
	for (var xAxis in this.xToPairs) {
		var pairs = this.xToPairs[xAxis];
		for (var i = 0; i < pairs.length; i++) {
			var xMin = pairs[i][0];
			var xMax = pairs[i][1];
			if (this.commonPattern()) {
				var yMin = xAxis - xMin;
				var yMax = xAxis - xMax;
			} else {
				var yMin = xMin - xAxis;
				var yMax = xMax - xAxis;
			}
			ctx.strokeStyle = this.resContext.shadingColor;
			ctx.lineWidth = this.resContext.shadingThickness;
			ctx.beginPath();
			ctx.moveTo(xMin,yMin);
			ctx.lineTo(xMax,yMax);
			ctx.stroke();
		}
	}
};
ResShading.shadeBasicgroup =
function(env, g, shadeRect) {
	if (g.shade !== null || g.shades.length > 0) {
		if (g.shade === true)
			env.shading.addRect(shadeRect);
		else {
			for (var i = 0; i < g.shades.length; i++) {
				var s = shadeRect.chopPattern(g.shades[i]);
				env.shading.addRect(s);
			}
		}
	} else if (g.globals.shade)
		env.shading.addRect(shadeRect);
};
ResShading.shadeBox =
function(env, g, shadeRect, innerRect) {
	var x0 = shadeRect.x;
	var x1 = innerRect.x;
	var x2 = innerRect.x + innerRect.width;
	var x3 = shadeRect.x + shadeRect.width;
	var y0 = shadeRect.y;
	var y1 = innerRect.y;
	var y2 = innerRect.y + innerRect.height;
	var y3 = shadeRect.y + shadeRect.height;
	var topSlice = new ResRectangle(x0, y0, x3-x0, y1-y0);
	var bottomSlice = new ResRectangle(x0, y2, x3-x0, y3-y2);
	var leftSlice = new ResRectangle(x0, y0, x1-x0, y3-y0);
	var rightSlice = new ResRectangle(x2, y0, x3-x2, y3-y0);
	var slices = [topSlice, bottomSlice, leftSlice, rightSlice];
	if (g.shade !== null || g.shades.length > 0) {
		if (g.shade === true)
			for (var j = 0; j < slices.length; j++)
				env.shading.addRect(slices[j]);
		else {
			for (var i = 0; i < g.shades.length; i++) {
				var s = shadeRect.chopPattern(g.shades[i]);
				for (var j = 0; j < slices.length; j++) {
					var inters = s.intersect(slices[j]);
					env.shading.addRect(inters);
				}
			}
		}
	} else if (g.globals.shade)
		for (var j = 0; j < slices.length; j++)
			env.shading.addRect(slices[j]);
};

/* res_points.js */

ResContext.hieroPoints = {
A1:0xE000,
A2:0xE001,
A3:0xE002,
A4:0xE003,
A5:0xE004,
A5a:0xE005,
A6:0xE006,
A6a:0xE007,
A6b:0xE008,
A7:0xE009,
A8:0xE00A,
A9:0xE00B,
A10:0xE00C,
A11:0xE00D,
A12:0xE00E,
A13:0xE00F,
A14:0xE010,
A14a:0xE011,
A15:0xE012,
A16:0xE013,
A17:0xE014,
A17a:0xE015,
A18:0xE016,
A19:0xE017,
A20:0xE018,
A21:0xE019,
A22:0xE01A,
A23:0xE01B,
A24:0xE01C,
A25:0xE01D,
A26:0xE01E,
A27:0xE01F,
A28:0xE020,
A29:0xE021,
A30:0xE022,
A31:0xE023,
A32:0xE024,
A32a:0xE025,
A33:0xE026,
A34:0xE027,
A35:0xE028,
A36:0xE029,
A37:0xE02A,
A38:0xE02B,
A39:0xE02C,
A40:0xE02D,
A40a:0xE02E,
A41:0xE02F,
A42:0xE030,
A42a:0xE031,
A43:0xE032,
A43a:0xE033,
A44:0xE034,
A45:0xE035,
A45a:0xE036,
A46:0xE037,
A47:0xE038,
A48:0xE039,
A49:0xE03A,
A50:0xE03B,
A51:0xE03C,
A52:0xE03D,
A53:0xE03E,
A54:0xE03F,
A55:0xE040,
A56:0xE041,
A57:0xE042,
A58:0xE043,
A59:0xE044,
A60:0xE045,
A61:0xE046,
A62:0xE047,
A63:0xE048,
A64:0xE049,
A65:0xE04A,
A66:0xE04B,
A67:0xE04C,
A68:0xE04D,
A69:0xE04E,
A70:0xE04F,
B1:0xE050,
B2:0xE051,
B3:0xE052,
B4:0xE053,
B5:0xE054,
B5a:0xE055,
B6:0xE056,
B7:0xE057,
B8:0xE058,
B9:0xE059,
C1:0xE05A,
C2:0xE05B,
C2a:0xE05C,
C2b:0xE05D,
C2c:0xE05E,
C3:0xE05F,
C4:0xE060,
C5:0xE061,
C6:0xE062,
C7:0xE063,
C8:0xE064,
C9:0xE065,
C10:0xE066,
C10a:0xE067,
C11:0xE068,
C12:0xE069,
C13:0xE06A,
C14:0xE06B,
C15:0xE06C,
C16:0xE06D,
C17:0xE06E,
C18:0xE06F,
C19:0xE070,
C20:0xE071,
C21:0xE072,
C22:0xE073,
C23:0xE074,
C24:0xE075,
D1:0xE076,
D2:0xE077,
D3:0xE078,
D4:0xE079,
D5:0xE07A,
D6:0xE07B,
D7:0xE07C,
D8:0xE07D,
D8a:0xE07E,
D9:0xE07F,
D10:0xE080,
D11:0xE081,
D12:0xE082,
D13:0xE083,
D14:0xE084,
D15:0xE085,
D16:0xE086,
D17:0xE087,
D18:0xE088,
D19:0xE089,
D20:0xE08A,
D21:0xE08B,
D22:0xE08C,
D23:0xE08D,
D24:0xE08E,
D25:0xE08F,
D26:0xE090,
D27:0xE091,
D27a:0xE092,
D28:0xE093,
D29:0xE094,
D30:0xE095,
D31:0xE096,
D31a:0xE097,
D32:0xE098,
D33:0xE099,
D34:0xE09A,
D34a:0xE09B,
D35:0xE09C,
D36:0xE09D,
D37:0xE09E,
D38:0xE09F,
D39:0xE0A0,
D40:0xE0A1,
D41:0xE0A2,
D42:0xE0A3,
D43:0xE0A4,
D44:0xE0A5,
D45:0xE0A6,
D46:0xE0A7,
D46a:0xE0A8,
D47:0xE0A9,
D48:0xE0AA,
D48a:0xE0AB,
D49:0xE0AC,
D50:0xE0AD,
D50a:0xE0AE,
D50b:0xE0AF,
D50c:0xE0B0,
D50d:0xE0B1,
D50e:0xE0B2,
D50f:0xE0B3,
D50g:0xE0B4,
D50h:0xE0B5,
D50i:0xE0B6,
D51:0xE0B7,
D52:0xE0B8,
D52a:0xE0B9,
D53:0xE0BA,
D54:0xE0BB,
D54a:0xE0BC,
D55:0xE0BD,
D56:0xE0BE,
D57:0xE0BF,
D58:0xE0C0,
D59:0xE0C1,
D60:0xE0C2,
D61:0xE0C3,
D62:0xE0C4,
D63:0xE0C5,
D64:0xE0C6,
D65:0xE0C7,
D66:0xE0C8,
D67:0xE0C9,
D67a:0xE0CA,
D67b:0xE0CB,
D67c:0xE0CC,
D67d:0xE0CD,
D67e:0xE0CE,
D67f:0xE0CF,
D67g:0xE0D0,
D67h:0xE0D1,
E1:0xE0D2,
E2:0xE0D3,
E3:0xE0D4,
E4:0xE0D5,
E5:0xE0D6,
E6:0xE0D7,
E7:0xE0D8,
E8:0xE0D9,
E8a:0xE0DA,
E9:0xE0DB,
E9a:0xE0DC,
E10:0xE0DD,
E11:0xE0DE,
E12:0xE0DF,
E13:0xE0E0,
E14:0xE0E1,
E15:0xE0E2,
E16:0xE0E3,
E16a:0xE0E4,
E17:0xE0E5,
E17a:0xE0E6,
E18:0xE0E7,
E19:0xE0E8,
E20:0xE0E9,
E20a:0xE0EA,
E21:0xE0EB,
E22:0xE0EC,
E23:0xE0ED,
E24:0xE0EE,
E25:0xE0EF,
E26:0xE0F0,
E27:0xE0F1,
E28:0xE0F2,
E28a:0xE0F3,
E29:0xE0F4,
E30:0xE0F5,
E31:0xE0F6,
E32:0xE0F7,
E33:0xE0F8,
E34:0xE0F9,
E34a:0xE0FA,
E36:0xE0FB,
E37:0xE0FC,
E38:0xE0FD,
F1:0xE0FE,
F1a:0xE0FF,
F2:0xE100,
F3:0xE101,
F4:0xE102,
F5:0xE103,
F6:0xE104,
F7:0xE105,
F8:0xE106,
F9:0xE107,
F10:0xE108,
F11:0xE109,
F12:0xE10A,
F13:0xE10B,
F13a:0xE10C,
F14:0xE10D,
F15:0xE10E,
F16:0xE10F,
F17:0xE110,
F18:0xE111,
F19:0xE112,
F20:0xE113,
F21:0xE114,
F21a:0xE115,
F22:0xE116,
F23:0xE117,
F24:0xE118,
F25:0xE119,
F26:0xE11A,
F27:0xE11B,
F28:0xE11C,
F29:0xE11D,
F30:0xE11E,
F31:0xE11F,
F31a:0xE120,
F32:0xE121,
F33:0xE122,
F34:0xE123,
F35:0xE124,
F36:0xE125,
F37:0xE126,
F37a:0xE127,
F38:0xE128,
F38a:0xE129,
F39:0xE12A,
F40:0xE12B,
F41:0xE12C,
F42:0xE12D,
F43:0xE12E,
F44:0xE12F,
F45:0xE130,
F45a:0xE131,
F46:0xE132,
F46a:0xE133,
F47:0xE134,
F47a:0xE135,
F48:0xE136,
F49:0xE137,
F50:0xE138,
F51:0xE139,
F51a:0xE13A,
F51b:0xE13B,
F51c:0xE13C,
F52:0xE13D,
F53:0xE13E,
G1:0xE13F,
G2:0xE140,
G3:0xE141,
G4:0xE142,
G5:0xE143,
G6:0xE144,
G6a:0xE145,
G7:0xE146,
G7a:0xE147,
G7b:0xE148,
G8:0xE149,
G9:0xE14A,
G10:0xE14B,
G11:0xE14C,
G11a:0xE14D,
G12:0xE14E,
G13:0xE14F,
G14:0xE150,
G15:0xE151,
G16:0xE152,
G17:0xE153,
G18:0xE154,
G19:0xE155,
G20:0xE156,
G20a:0xE157,
G21:0xE158,
G22:0xE159,
G23:0xE15A,
G24:0xE15B,
G25:0xE15C,
G26:0xE15D,
G26a:0xE15E,
G27:0xE15F,
G28:0xE160,
G29:0xE161,
G30:0xE162,
G31:0xE163,
G32:0xE164,
G33:0xE165,
G34:0xE166,
G35:0xE167,
G36:0xE168,
G36a:0xE169,
G37:0xE16A,
G37a:0xE16B,
G38:0xE16C,
G39:0xE16D,
G40:0xE16E,
G41:0xE16F,
G42:0xE170,
G43:0xE171,
G43a:0xE172,
G44:0xE173,
G45:0xE174,
G45a:0xE175,
G46:0xE176,
G47:0xE177,
G48:0xE178,
G49:0xE179,
G50:0xE17A,
G51:0xE17B,
G52:0xE17C,
G53:0xE17D,
G54:0xE17E,
H1:0xE17F,
H2:0xE180,
H3:0xE181,
H4:0xE182,
H5:0xE183,
H6:0xE184,
H6a:0xE185,
H7:0xE186,
H8:0xE187,
I1:0xE188,
I2:0xE189,
I3:0xE18A,
I4:0xE18B,
I5:0xE18C,
I5a:0xE18D,
I6:0xE18E,
I7:0xE18F,
I8:0xE190,
I9:0xE191,
I9a:0xE192,
I10:0xE193,
I10a:0xE194,
I11:0xE195,
I11a:0xE196,
I12:0xE197,
I13:0xE198,
I14:0xE199,
I15:0xE19A,
K1:0xE19B,
K2:0xE19C,
K3:0xE19D,
K4:0xE19E,
K5:0xE19F,
K6:0xE1A0,
K7:0xE1A1,
K8:0xE1A2,
L1:0xE1A3,
L2:0xE1A4,
L2a:0xE1A5,
L3:0xE1A6,
L4:0xE1A7,
L5:0xE1A8,
L6:0xE1A9,
L6a:0xE1AA,
L7:0xE1AB,
L8:0xE1AC,
M1:0xE1AD,
M1a:0xE1AE,
M1b:0xE1AF,
M2:0xE1B0,
M3:0xE1B1,
M3a:0xE1B2,
M4:0xE1B3,
M5:0xE1B4,
M6:0xE1B5,
M7:0xE1B6,
M8:0xE1B7,
M9:0xE1B8,
M10:0xE1B9,
M10a:0xE1BA,
M11:0xE1BB,
M12:0xE1BC,
M12a:0xE1BD,
M12b:0xE1BE,
M12c:0xE1BF,
M12d:0xE1C0,
M12e:0xE1C1,
M12f:0xE1C2,
M12g:0xE1C3,
M12h:0xE1C4,
M13:0xE1C5,
M14:0xE1C6,
M15:0xE1C7,
M15a:0xE1C8,
M16:0xE1C9,
M16a:0xE1CA,
M17:0xE1CB,
M17a:0xE1CC,
M18:0xE1CD,
M19:0xE1CE,
M20:0xE1CF,
M21:0xE1D0,
M22:0xE1D1,
M22a:0xE1D2,
M23:0xE1D3,
M24:0xE1D4,
M24a:0xE1D5,
M25:0xE1D6,
M26:0xE1D7,
M27:0xE1D8,
M28:0xE1D9,
M28a:0xE1DA,
M29:0xE1DB,
M30:0xE1DC,
M31:0xE1DD,
M31a:0xE1DE,
M32:0xE1DF,
M33:0xE1E0,
M33a:0xE1E1,
M33b:0xE1E2,
M34:0xE1E3,
M35:0xE1E4,
M36:0xE1E5,
M37:0xE1E6,
M38:0xE1E7,
M39:0xE1E8,
M40:0xE1E9,
M40a:0xE1EA,
M41:0xE1EB,
M42:0xE1EC,
M43:0xE1ED,
M44:0xE1EE,
N1:0xE1EF,
N2:0xE1F0,
N3:0xE1F1,
N4:0xE1F2,
N5:0xE1F3,
N6:0xE1F4,
N7:0xE1F5,
N8:0xE1F6,
N9:0xE1F7,
N10:0xE1F8,
N11:0xE1F9,
N12:0xE1FA,
N13:0xE1FB,
N14:0xE1FC,
N15:0xE1FD,
N16:0xE1FE,
N17:0xE1FF,
N18:0xE200,
N18a:0xE201,
N18b:0xE202,
N19:0xE203,
N20:0xE204,
N21:0xE205,
N22:0xE206,
N23:0xE207,
N24:0xE208,
N25:0xE209,
N25a:0xE20A,
N26:0xE20B,
N27:0xE20C,
N28:0xE20D,
N29:0xE20E,
N30:0xE20F,
N31:0xE210,
N32:0xE211,
N33:0xE212,
N33a:0xE213,
N34:0xE214,
N34a:0xE215,
N35:0xE216,
N35a:0xE217,
N36:0xE218,
N37:0xE219,
N37a:0xE21A,
N38:0xE21B,
N39:0xE21C,
N40:0xE21D,
N41:0xE21E,
N42:0xE21F,
NL1:0xE220,
NL2:0xE221,
NL3:0xE222,
NL4:0xE223,
NL5:0xE224,
NL5a:0xE225,
NL6:0xE226,
NL7:0xE227,
NL8:0xE228,
NL9:0xE229,
NL10:0xE22A,
NL11:0xE22B,
NL12:0xE22C,
NL13:0xE22D,
NL14:0xE22E,
NL15:0xE22F,
NL16:0xE230,
NL17:0xE231,
NL17a:0xE232,
NL18:0xE233,
NL19:0xE234,
NL20:0xE235,
NU1:0xE236,
NU2:0xE237,
NU3:0xE238,
NU4:0xE239,
NU5:0xE23A,
NU6:0xE23B,
NU7:0xE23C,
NU8:0xE23D,
NU9:0xE23E,
NU10:0xE23F,
NU10a:0xE240,
NU11:0xE241,
NU11a:0xE242,
NU12:0xE243,
NU13:0xE244,
NU14:0xE245,
NU15:0xE246,
NU16:0xE247,
NU17:0xE248,
NU18:0xE249,
NU18a:0xE24A,
NU19:0xE24B,
NU20:0xE24C,
NU21:0xE24D,
NU22:0xE24E,
NU22a:0xE24F,
O1:0xE250,
O1a:0xE251,
O2:0xE252,
O3:0xE253,
O4:0xE254,
O5:0xE255,
O5a:0xE256,
O6:0xE257,
O6a:0xE258,
O6b:0xE259,
O6c:0xE25A,
O6d:0xE25B,
O6e:0xE25C,
O6f:0xE25D,
O7:0xE25E,
O8:0xE25F,
O9:0xE260,
O10:0xE261,
O10a:0xE262,
O10b:0xE263,
O10c:0xE264,
O11:0xE265,
O12:0xE266,
O13:0xE267,
O14:0xE268,
O15:0xE269,
O16:0xE26A,
O17:0xE26B,
O18:0xE26C,
O19:0xE26D,
O19a:0xE26E,
O20:0xE26F,
O20a:0xE270,
O21:0xE271,
O22:0xE272,
O23:0xE273,
O24:0xE274,
O24a:0xE275,
O25:0xE276,
O25a:0xE277,
O26:0xE278,
O27:0xE279,
O28:0xE27A,
O29:0xE27B,
O29a:0xE27C,
O30:0xE27D,
O30a:0xE27E,
O31:0xE27F,
O32:0xE280,
O33:0xE281,
O33a:0xE282,
O34:0xE283,
O35:0xE284,
O36:0xE285,
O36a:0xE286,
O36b:0xE287,
O36c:0xE288,
O36d:0xE289,
O37:0xE28A,
O38:0xE28B,
O39:0xE28C,
O40:0xE28D,
O41:0xE28E,
O42:0xE28F,
O43:0xE290,
O44:0xE291,
O45:0xE292,
O46:0xE293,
O47:0xE294,
O48:0xE295,
O49:0xE296,
O50:0xE297,
O50a:0xE298,
O50b:0xE299,
O51:0xE29A,
P1:0xE29B,
P1a:0xE29C,
P2:0xE29D,
P3:0xE29E,
P3a:0xE29F,
P4:0xE2A0,
P5:0xE2A1,
P6:0xE2A2,
P7:0xE2A3,
P8:0xE2A4,
P9:0xE2A5,
P10:0xE2A6,
P11:0xE2A7,
Q1:0xE2A8,
Q2:0xE2A9,
Q3:0xE2AA,
Q4:0xE2AB,
Q5:0xE2AC,
Q6:0xE2AD,
Q7:0xE2AE,
R1:0xE2AF,
R2:0xE2B0,
R2a:0xE2B1,
R3:0xE2B2,
R3a:0xE2B3,
R3b:0xE2B4,
R4:0xE2B5,
R5:0xE2B6,
R6:0xE2B7,
R7:0xE2B8,
R8:0xE2B9,
R9:0xE2BA,
R10:0xE2BB,
R10a:0xE2BC,
R11:0xE2BD,
R12:0xE2BE,
R13:0xE2BF,
R14:0xE2C0,
R15:0xE2C1,
R16:0xE2C2,
R16a:0xE2C3,
R17:0xE2C4,
R18:0xE2C5,
R19:0xE2C6,
R20:0xE2C7,
R21:0xE2C8,
R22:0xE2C9,
R23:0xE2CA,
R24:0xE2CB,
R25:0xE2CC,
R26:0xE2CD,
R27:0xE2CE,
R28:0xE2CF,
R29:0xE2D0,
S1:0xE2D1,
S2:0xE2D2,
S2a:0xE2D3,
S3:0xE2D4,
S4:0xE2D5,
S5:0xE2D6,
S6:0xE2D7,
S6a:0xE2D8,
S7:0xE2D9,
S8:0xE2DA,
S9:0xE2DB,
S10:0xE2DC,
S11:0xE2DD,
S12:0xE2DE,
S13:0xE2DF,
S14:0xE2E0,
S14a:0xE2E1,
S14b:0xE2E2,
S15:0xE2E3,
S16:0xE2E4,
S17:0xE2E5,
S17a:0xE2E6,
S18:0xE2E7,
S19:0xE2E8,
S20:0xE2E9,
S21:0xE2EA,
S22:0xE2EB,
S23:0xE2EC,
S24:0xE2ED,
S25:0xE2EE,
S26:0xE2EF,
S26a:0xE2F0,
S26b:0xE2F1,
S27:0xE2F2,
S28:0xE2F3,
S29:0xE2F4,
S30:0xE2F5,
S31:0xE2F6,
S32:0xE2F7,
S33:0xE2F8,
S34:0xE2F9,
S35:0xE2FA,
S35a:0xE2FB,
S36:0xE2FC,
S37:0xE2FD,
S38:0xE2FE,
S39:0xE2FF,
S40:0xE300,
S41:0xE301,
S42:0xE302,
S43:0xE303,
S44:0xE304,
S45:0xE305,
S46:0xE306,
T1:0xE307,
T2:0xE308,
T3:0xE309,
T3a:0xE30A,
T4:0xE30B,
T5:0xE30C,
T6:0xE30D,
T7:0xE30E,
T7a:0xE30F,
T8:0xE310,
T8a:0xE311,
T9:0xE312,
T9a:0xE313,
T10:0xE314,
T11:0xE315,
T11a:0xE316,
T12:0xE317,
T13:0xE318,
T14:0xE319,
T15:0xE31A,
T16:0xE31B,
T16a:0xE31C,
T17:0xE31D,
T18:0xE31E,
T19:0xE31F,
T20:0xE320,
T21:0xE321,
T22:0xE322,
T23:0xE323,
T24:0xE324,
T25:0xE325,
T26:0xE326,
T27:0xE327,
T28:0xE328,
T29:0xE329,
T30:0xE32A,
T31:0xE32B,
T32:0xE32C,
T32a:0xE32D,
T33:0xE32E,
T33a:0xE32F,
T34:0xE330,
T35:0xE331,
T36:0xE332,
U1:0xE333,
U2:0xE334,
U3:0xE335,
U4:0xE336,
U5:0xE337,
U6:0xE338,
U6a:0xE339,
U6b:0xE33A,
U7:0xE33B,
U8:0xE33C,
U9:0xE33D,
U10:0xE33E,
U11:0xE33F,
U12:0xE340,
U13:0xE341,
U14:0xE342,
U15:0xE343,
U16:0xE344,
U17:0xE345,
U18:0xE346,
U19:0xE347,
U20:0xE348,
U21:0xE349,
U22:0xE34A,
U23:0xE34B,
U23a:0xE34C,
U24:0xE34D,
U25:0xE34E,
U26:0xE34F,
U27:0xE350,
U28:0xE351,
U29:0xE352,
U29a:0xE353,
U30:0xE354,
U31:0xE355,
U32:0xE356,
U32a:0xE357,
U33:0xE358,
U34:0xE359,
U35:0xE35A,
U36:0xE35B,
U37:0xE35C,
U38:0xE35D,
U39:0xE35E,
U40:0xE35F,
U41:0xE360,
U42:0xE361,
V1:0xE362,
V1a:0xE363,
V1b:0xE364,
V1c:0xE365,
V1d:0xE366,
V1e:0xE367,
V1f:0xE368,
V1g:0xE369,
V1h:0xE36A,
V1i:0xE36B,
V2:0xE36C,
V2a:0xE36D,
V3:0xE36E,
V4:0xE36F,
V5:0xE370,
V6:0xE371,
V7:0xE372,
V7a:0xE373,
V7b:0xE374,
V8:0xE375,
V9:0xE376,
V10:0xE377,
V11:0xE378,
V11a:0xE379,
V11b:0xE37A,
V11c:0xE37B,
V12:0xE37C,
V12a:0xE37D,
V12b:0xE37E,
V13:0xE37F,
V14:0xE380,
V15:0xE381,
V16:0xE382,
V17:0xE383,
V18:0xE384,
V19:0xE385,
V20:0xE386,
V20a:0xE387,
V20b:0xE388,
V20c:0xE389,
V20d:0xE38A,
V20e:0xE38B,
V20f:0xE38C,
V20g:0xE38D,
V20h:0xE38E,
V20i:0xE38F,
V20j:0xE390,
V20k:0xE391,
V20l:0xE392,
V21:0xE393,
V22:0xE394,
V23:0xE395,
V23a:0xE396,
V24:0xE397,
V25:0xE398,
V26:0xE399,
V27:0xE39A,
V28:0xE39B,
V28a:0xE39C,
V29:0xE39D,
V29a:0xE39E,
V30:0xE39F,
V30a:0xE3A0,
V31:0xE3A1,
V31a:0xE3A2,
V32:0xE3A3,
V33:0xE3A4,
V33a:0xE3A5,
V34:0xE3A6,
V35:0xE3A7,
V36:0xE3A8,
V37:0xE3A9,
V37a:0xE3AA,
V38:0xE3AB,
V39:0xE3AC,
V40:0xE3AD,
V40a:0xE3AE,
W1:0xE3AF,
W2:0xE3B0,
W3:0xE3B1,
W3a:0xE3B2,
W4:0xE3B3,
W5:0xE3B4,
W6:0xE3B5,
W7:0xE3B6,
W8:0xE3B7,
W9:0xE3B8,
W9a:0xE3B9,
W10:0xE3BA,
W10a:0xE3BB,
W11:0xE3BC,
W12:0xE3BD,
W13:0xE3BE,
W14:0xE3BF,
W14a:0xE3C0,
W15:0xE3C1,
W16:0xE3C2,
W17:0xE3C3,
W17a:0xE3C4,
W18:0xE3C5,
W18a:0xE3C6,
W19:0xE3C7,
W20:0xE3C8,
W21:0xE3C9,
W22:0xE3CA,
W23:0xE3CB,
W24:0xE3CC,
W24a:0xE3CD,
W25:0xE3CE,
X1:0xE3CF,
X2:0xE3D0,
X3:0xE3D1,
X4:0xE3D2,
X4a:0xE3D3,
X4b:0xE3D4,
X5:0xE3D5,
X6:0xE3D6,
X6a:0xE3D7,
X7:0xE3D8,
X8:0xE3D9,
X8a:0xE3DA,
Y1:0xE3DB,
Y1a:0xE3DC,
Y2:0xE3DD,
Y3:0xE3DE,
Y4:0xE3DF,
Y5:0xE3E0,
Y6:0xE3E1,
Y7:0xE3E2,
Y8:0xE3E3,
Z1:0xE3E4,
Z2:0xE3E5,
Z2a:0xE3E6,
Z2b:0xE3E7,
Z2c:0xE3E8,
Z2d:0xE3E9,
Z3:0xE3EA,
Z3a:0xE3EB,
Z3b:0xE3EC,
Z4:0xE3ED,
Z4a:0xE3EE,
Z5:0xE3EF,
Z5a:0xE3F0,
Z6:0xE3F1,
Z7:0xE3F2,
Z8:0xE3F3,
Z9:0xE3F4,
Z10:0xE3F5,
Z11:0xE3F6,
Z12:0xE3F7,
Z13:0xE3F8,
Z14:0xE3F9,
Z15:0xE3FA,
Z15a:0xE3FB,
Z15b:0xE3FC,
Z15c:0xE3FD,
Z15d:0xE3FE,
Z15e:0xE3FF,
Z15f:0xE400,
Z15g:0xE401,
Z15h:0xE402,
Z15i:0xE403,
Z16:0xE404,
Z16a:0xE405,
Z16b:0xE406,
Z16c:0xE407,
Z16d:0xE408,
Z16e:0xE409,
Z16f:0xE40A,
Z16g:0xE40B,
Z16h:0xE40C,
Aa1:0xE40D,
Aa2:0xE40E,
Aa3:0xE40F,
Aa4:0xE410,
Aa5:0xE411,
Aa6:0xE412,
Aa7:0xE413,
Aa7a:0xE414,
Aa7b:0xE415,
Aa8:0xE416,
Aa9:0xE417,
Aa10:0xE418,
Aa11:0xE419,
Aa12:0xE41A,
Aa13:0xE41B,
Aa14:0xE41C,
Aa15:0xE41D,
Aa16:0xE41E,
Aa17:0xE41F,
Aa18:0xE420,
Aa19:0xE421,
Aa20:0xE422,
Aa21:0xE423,
Aa22:0xE424,
Aa23:0xE425,
Aa24:0xE426,
Aa25:0xE427,
Aa26:0xE428,
Aa27:0xE429,
Aa28:0xE42A,
Aa29:0xE42B,
Aa30:0xE42C,
Aa31:0xE42D,
Aa32:0xE42E};

ResContext.mnemonics = {
mSa:'A12',
xr:'A15',
Xrd:'A17',
sr:'A21',
mniw:'A33',
qiz:'A38',
iry:'A47',
Sps:'A50',
Spsi:'A51',
msi:'B3',
DHwty:'C3',
Xnmw:'C4',
inpw:'C6',
stX:'C7',
mnw:'C8',
mAat:'C10',
HH:'C11',
tp:'D1',
Hr:'D2',
Sny:'D3',
ir:'D4',
rmi:'D9',
wDAt:'D10',
fnD:'D19',
r:'D21',
rA:'D21',
spt:'D24',
spty:'D25',
mnD:'D27',
kA:'D28',
aHA:'D34',
a:'D36',
Dsr:'D45',
d:'D46',
Dba:'D50',
mt:'D52',
rd:'D56',
sbq:'D56',
gH:'D56',
gHs:'D56',
b:'D58',
ab:'D59',
wab:'D60',
sAH:'D61',
zzmt:'E6',
zAb:'E17',
mAi:'E22',
l:'E23',
rw:'E23',
Aby:'E24',
wn:'E34',
HAt:'F4',
SsA:'F5',
wsr:'F12',
wp:'F13',
db:'F16',
Hw:'F18',
bH:'F18',
ns:'F20',
idn:'F21',
msDr:'F21',
sDm:'F21',
DrD:'F21',
pH:'F22',
kfA:'F22',
xpS:'F23',
wHm:'F25',
Xn:'F26',
sti:'F29',
Sd:'F30',
ms:'F31',
X:'F32',
sd:'F33',
ib:'F34',
nfr:'F35',
zmA:'F36',
imAx:'F39',
Aw:'F40',
spr:'F42',
iwa:'F44',
isw:'F44',
pXr:'F46',
qAb:'F46',
A:'G1',
AA:'G2',
tyw:'G4',
mwt:'G14',
nbty:'G16',
m:'G17',
mm:'G18',
nH:'G21',
Db:'G22',
rxyt:'G23',
Ax:'G25',
dSr:'G27',
gm:'G28',
bA:'G29',
baHi:'G32',
aq:'G35',
wr:'G36',
gb:'G38',
zA:'G39',
pA:'G40',
xn:'G41',
wSA:'G42',
w:'G43',
ww:'G44',
mAw:'G46',
TA:'G47',
snD:'G54',
wSm:'H2',
pq:'H2',
pAq:'H3',
nr:'H4',
Sw:'H6',
aSA:'I1',
Styw:'I2',
mzH:'I3',
sbk:'I4',
sAq:'I5',
km:'I6',
Hfn:'I8',
f:'I9',
D:'I10',
DD:'I11',
in:'K1',
ad:'K3',
XA:'K4',
bz:'K5',
nSmt:'K6',
xpr:'L1',
bit:'L2',
srqt:'L7',
iAm:'M1',
Hn:'M2',
xt:'M3',
rnp:'M4',
tr:'M6',
SA:'M8',
zSn:'M9',
wdn:'M11',
xA:'M12',
wAD:'M13',
HA:'M16',
i:'M17',
ii:'M18',
sxt:'M20',
sm:'M21',
sw:'M23',
rsw:'M24',
Sma:'M26',
nDm:'M29',
bnr:'M30',
bdt:'M34',
Dr:'M36',
iz:'M40',
pt:'N1',
iAdt:'N4',
idt:'N4',
ra:'N5',
zw:'N5',
hrw:'N5',
Hnmmt:'N8',
pzD:'N9',
Abd:'N11',
iaH:'N11',
sbA:'N14',
dwA:'N14',
dwAt:'N15',
tA:'N16',
iw:'N18',
wDb:'N20',
spAt:'N24',
xAst:'N25',
Dw:'N26',
Axt:'N27',
xa:'N28',
q:'N29',
iAt:'N30',
n:'N35',
mw:'N35a',
S:'N37',
Sm:'N40',
id:'N41',
pr:'O1',
h:'O4',
Hwt:'O6',
aH:'O11',
wsxt:'O15',
kAr:'O18',
zH:'O22',
txn:'O25',
iwn:'O28',
aA:'O29',
zxnt:'O30',
z:'O34',
zb:'O35',
inb:'O36',
Szp:'O42',
ipt:'O45',
nxn:'O47',
niwt:'O49',
zp:'O50',
Snwt:'O51',
wHa:'P4',
nfw:'P5',
TAw:'P5',
aHa:'P6',
xrw:'P8',
st:'Q1',
wz:'Q2',
p:'Q3',
qrsw:'Q6',
xAwt:'R1',
xAt:'R1',
Htp:'R4',
kAp:'R5',
kp:'R5',
snTr:'R7',
nTr:'R8',
bd:'R9',
dd:'R11',
Dd:'R11',
imnt:'R14',
iAb:'R15',
wx:'R16',
xm:'R22',
HDt:'S1',
dSrt:'S3',
N:'S3',
sxmty:'S6',
xprS:'S7',
Atf:'S8',
Swty:'S9',
mDH:'S10',
wsx:'S11',
nbw:'S12',
tHn:'S15',
THn:'S15',
mnit:'S18',
sDAw:'S19',
xtm:'S20',
sT:'S22',
dmD:'S23',
Tz:'S24',
Sndyt:'S26',
mnxt:'S27',
s:'S29',
sf:'S30',
siA:'S32',
Tb:'S33',
anx:'S34',
Swt:'S35',
xw:'S37',
HqA:'S38',
awt:'S39',
wAs:'S40',
Dam:'S41',
abA:'S42',
xrp:'S42',
sxm:'S42',
md:'S43',
Ams:'S44',
nxxw:'S45',
HD:'T3',
HDD:'T6',
pd:'T9',
pD:'T10',
zin:'T11',
zwn:'T11',
sXr:'T11',
Ai:'T12',
Ar:'T12',
rwd:'T12',
rwD:'T12',
rs:'T13',
qmA:'T14',
wrrt:'T17',
Sms:'T18',
qs:'T19',
sn:'T22',
iH:'T24',
DbA:'T25',
Xr:'T28',
nmt:'T29',
sSm:'T31',
nm:'T34',
mA:'U1',
mr:'U6',
it:'U10',
HqAt:'U11',
hb:'U13',
Sna:'U13',
tm:'U15',
biA:'U16',
grg:'U17',
stp:'U21',
mnx:'U22',
Ab:'U23',
Hmt:'U24',
wbA:'U26',
DA:'U28',
rtH:'U31',
zmn:'U32',
ti:'U33',
xsf:'U34',
Hm:'U36',
mxAt:'U38',
'100':'V1',
sTA:'V2',
sTAw:'V3',
wA:'V4',
snT:'V5',
Ss:'V6',
Sn:'V7',
arq:'V12',
T:'V13',
iTi:'V15',
mDt:'V19',
XAr:'V19',
TmA:'V19',
'10':'V20',
mD:'V20',
mH:'V22',
wD:'V24',
aD:'V26',
H:'V28',
wAH:'V29',
sk:'V29',
nb:'V30',
k:'V31',
msn:'V32',
sSr:'V33',
idr:'V37',
bAs:'W2',
Hb:'W3',
Xnm:'W9',
iab:'W10',
nzt:'W11',
g:'W11',
Hz:'W14',
xnt:'W17',
mi:'W19',
Hnqt:'W22',
nw:'W24',
ini:'W25',
t:'X1',
rdi:'X8',
di:'X8',
mDAt:'Y1',
mnhd:'Y3',
zS:'Y3',
mn:'Y5',
ibA:'Y6',
zSSt:'Y8',
y:'Z4',
W:'Z7',
imi:'Z11',
x:'Aa1',
Hp:'Aa5',
qn:'Aa8',
mAa:'Aa11',
im:'Aa13',
gs:'Aa13',
M:'Aa13',
sA:'Aa17',
apr:'Aa20',
wDa:'Aa21',
nD:'Aa27',
qd:'Aa28',
Xkr:'Aa30'};
ResContext.unMnemonic =
function(code) {
	var key = ResContext.mnemonics[code];
	return key ? key : code;
};
ResContext.unBracket =
function(code) {
	if (code == "open")
		return "V11a";
	else if (code == "close")
		return "V11b";
	else
		return code;
};

ResContext.auxPoints = {
open:35,
close:36,
cartoucheopen:35,
cartouchesegment:37,
cartoucheclose:36,
ovalopen:35,
ovalsegment:37,
ovalclose:41,
serekhopen:38,
serekhsegment:37,
serekhclose:40,
inbopen:42,
inbsegment:44,
inbclose:43,
rectangleopen:38,
rectanglesegment:37,
rectangleclose:39,
Hwtopenoveropen:45,
Hwtopenoversegment:37,
Hwtopenoverclose:39,
Hwtopenunderopen:46,
Hwtopenundersegment:37,
Hwtopenunderclose:39,
Hwtcloseoveropen:38,
Hwtcloseoversegment:37,
Hwtcloseoverclose:47,
Hwtcloseunderopen:38,
Hwtcloseundersegment:37,
Hwtcloseunderclose:48,
hlr:49,
hrl:50,
vlr:51,
vrl:52};

ResContext.prototype.hieroPoints = ResContext.hieroPoints;
ResContext.prototype.mnemonics = ResContext.mnemonics;
ResContext.prototype.unMnemonic = ResContext.unMnemonic;
ResContext.prototype.unBracket = ResContext.unBracket;
ResContext.prototype.auxPoints = ResContext.auxPoints;

ResContext.tallSigns = [
"M40","Aa28","Aa29","P11","D16","T34","T35","U28",
"U29","U32","U33","S43","U36","T8","T8a","M13","M17",
"H6","H6a","M4","M12","S29","M29","M30","S37","R14",
"R15","R16","R17","P6","S40","R19","S41","F10",
"F11","F12","S38","S39","T14","T15","T13","Aa26",
"O30","Aa21","U39","F45","O44","Aa27","R8","R9",
"T7a","T3","T4","V24","V25","U23","S42",
"U34","S36","F28","U26","U27","U24","U25","Y8",
"F35","F36","U41","W19","P8","T22","T23","Z11",
"S44","Aa25","M44","V38","Aa31","Aa30","Aa20","V36",
"F31","M32","L7","V17","V18","S34","V39","Q7",
"T18","T19","T20","R21","R11","O28","O11","O36",
"Aa32","V28","V29"];
ResContext.broadSigns = [
"N1","N37","N38","N39","S32","N18","X4","X5",
"N17","N16","N20","Aa10","Aa11","Aa12","Aa13","Aa14",
"Aa15","N35","Aa8","Aa9","V26","V27","R24","W8",
"V32","Y1","Y2","R4","N11","N12","F42","D24",
"D25","D13","D15","F20","Z6","F33","T2","T7",
"F30","V22","V23","R5","R6","O34","V2","V3",
"S24","R22","R23","T11","O29","T1","T21","U20",
"U19","U21","D17","U31","T9","T9a","T10","F32",
"V13","V14","F46","F47","F48","F49","M11","U17",
"U18","U14","Aa7","F18","D51","U15","U16","Aa24",
"N31","O31","N36","D14","D21","D22","T30","T31",
"T33","D48","V30","V31","W3","S12","N30","O42",
"O43","V16"];
ResContext.narrowSigns = [
"Q3","O39","Z8","O47","N22","N21","N23","N29",
"X7","O45","O46","Y6","M35","X3","X2","X1",
"N28","Aa17","I6","W10","W10a","Aa4","R7","M39",
"M36","F43","F41","N34","U30","W11","W12","W13",
"T28","N41","N42","V37","M31","F34","W6","W7",
"W21","W20","V6","V33","V34","V7","V8","S20",
"V20","V19","Aa19","Aa2","Aa3","N32","F52","V35",
"H8","M41","F51","D11","K6","L6","F21","D26",
"N33","D12","S21","N5","N9","N10","Aa1","O50",
"O49","O48","X6","V9","S10","N6","N8","S11",
"N15","M42","F38","V1","Z7","Aa16","Z9","Z10"];

ResContext.categories = ["A","B","C","D","E","F","G","H","I",
"K","L","M","N","NL","NU","O","P","Q","R","S","T","U","V",
"W","X","Y","Z","Aa"];
ResContext.extraCategories = ["tall","broad","narrow"];
ResContext.categoriesAndExtra = ResContext.categories.concat(ResContext.extraCategories);
ResContext.catNameStructure = /^([A-I]|[K-Z]|(?:Aa)|(?:NL)|(?:NU))([1-9](?:[0-9][0-9]?)?)([a-z]?)$/;
ResContext.nonCatNameStructure = /^(("([^\t\n\r\f\b"\\]|(\\")|(\\\\))")|(0|([1-9]([0-9][0-9]?)?)))$/;
ResContext.mnemonicStructure = /^[a-zA-Z]+$/;
// Mapping from category to ordered list of names, after call of ResContext.makeCatToNames.
ResContext.catToNames = {};
ResContext.makeCatToNames =
function() {
	for (var name in ResContext.hieroPoints) {
		var parts = ResContext.catNameStructure.exec(name);
		var cat = parts[1];
		if (ResContext.catToNames[cat] === undefined)
			ResContext.catToNames[cat] = [];
		ResContext.catToNames[cat].push(name);
	}
	for (var i = 0; i < ResContext.categories.length; i++) {
		var cat = ResContext.categories[i];
		ResContext.catToNames[cat].sort(ResContext.compareSignNames);
	}
	ResContext.catToNames["tall"] = ResContext.tallSigns;
	ResContext.catToNames["broad"] = ResContext.broadSigns;
	ResContext.catToNames["narrow"] = ResContext.narrowSigns;
};
ResContext.compareSignNames =
function(name1, name2) {
	var parts1 = ResContext.catNameStructure.exec(name1);
	var parts2 = ResContext.catNameStructure.exec(name2);
	var cat1 = parts1[1];
	var cat2 = parts2[1];
	var num1 = parseInt(parts1[2]);
	var num2 = parseInt(parts2[2]);
	var suf1 = parts1[3];
	var suf2 = parts2[3];
	if (cat1 === cat2) {
		if (num1 < num2)
			return -1;
		else if (num1 > num2)
			return 1;
		else if (suf1 < suf2)
			return -1;
		else if (suf1 > suf2)
			return 1;
		else
			return 0;
	} else 
		return ResContext.categories.indexOf(cat1) - ResContext.categories.indexOf(cat2);
};

/* res_lite.js */

/////////////////////////////////////////////////////////////////////////////
// Data structure. See documentation of RESlite.

// Top constructor.
function ResLite(dir, size, groups) {
	this.dir = dir; // can be "hlr", "hrl", "vlr", "vrl"
	this.sizeMilEm = size;
	this.groups = groups;
}
// Constructor of groups.
function ResLiteGroups() {
	this.advanceMilEm = 1000;
	this.lengthMilEm = 1000;
	this.exprs = null;
	this.notes = null;
	this.shades = null;
	this.intershades = null;
	this.tl = null;
}
// Constructor of glyphs, followed by more expressions.
function ResLiteGlyph() {
	this.fileNumber = 0;
	this.glyphIndex = 0;
	this.mirror = false;
	this.rotate = 0;
	this.color = "white";
	this.xscaleMil = 1000;
	this.yscaleMil = 1000;
	this.xMilEm = 500;
	this.yMilEm = 500;
	this.xMinMil = 0;
	this.yMinMil = 0;
	this.widthMil = 1000;
	this.heightMil = 1000;
	this.tl = null;
}
// Constructor of pair, followed by more expressions.
function ResLitePair() {
	this.list1 = null;
	this.list2 = null;
	this.tl = null;
}
// Construction of notes.
function ResLiteNotes() {
	this.string = "";
	this.fileNumber = 0;
	this.color = "white";
	this.sizeMilEm = 1000;
	this.xMilEm = 500;
	this.yMilEm = 500;
	this.tl = null;
}
// Construction of shades.
function ResLiteShades() {
	this.xMilEm = 0;
	this.yMilEm = 0;
	this.widthMilEm = 0;
	this.heightMilEm = 0;
	this.tl = null;
}

ResLite.prototype.isH =
function() {
	return this.dir === "hlr" || this.dir === "hrl";
};
ResLite.prototype.isLR =
function() {
	return this.dir === "hlr" || this.dir === "vlr";
};

/////////////////////////////////////////////////////////////////////////////
// Parsing auxiliaries.

function ParseBuffer(string) {
	this.string = string;
	this.pos = 0;
	this.error = false;
}
ParseBuffer.prototype.isEmpty =
function() {
	return this.pos === this.string.length;
};
ParseBuffer.prototype.remainder =
function() {
	return this.string.substring(this.pos);
};
ParseBuffer.prototype.readToNonspace =
function() {
	while (!this.isEmpty() &&
			this.string.charAt(this.pos).replace(/^\s+|\s+$/gm,'').length === 0)
		this.pos++;
};
ParseBuffer.prototype.readToSpace =
function() {
	while (!this.isEmpty() &&
			this.string.charAt(this.pos).replace(/^\s+|\s+$/gm,'').length !== 0)
		this.pos++;
};
ParseBuffer.prototype.readToEnd = 
function() {
	while (!this.isEmpty() && this.string.charAt(this.pos) !== 'e')
		this.pos++;
	if (!this.isEmpty())
		this.pos++;
};
ParseBuffer.prototype.readChar =
function(c) {
	var oldPos = this.pos;
	this.readToSpace();
	if (this.pos === oldPos+1 && this.string.charAt(oldPos) === c) {
		this.readToNonspace();
		return true;
	} else {
		this.pos = oldPos;
		return false;
	}
};
ParseBuffer.prototype.readSingleChar =
function(c) {
	if (!this.isEmpty() && this.string.charAt(this.pos) === c) {
		this.pos++;
		return true;
	} else
		return false;
};
ParseBuffer.prototype.peekChar =
function(c) {
	return !this.isEmpty() && this.string.charAt(this.pos) === c;
}
ParseBuffer.prototype.readDirection =
function() {
	var dir = undefined;
	var oldPos = this.pos;
	this.readToSpace();
	if (this.pos !== oldPos+3) {
		this.pos = oldPos;
		return dir;
	} else if (this.string.indexOf("hlr", oldPos) === oldPos)
		dir = "hlr";
	else if (this.string.indexOf("hrl", oldPos) === oldPos)
		dir = "hrl";
	else if (this.string.indexOf("vlr", oldPos) === oldPos)
		dir = "vlr";
	else if (this.string.indexOf("vrl", oldPos) === oldPos)
		dir = "vrl";
	else {
		this.pos = oldPos;
		return dir;
	}
	this.readToNonspace();
	return dir;
};
ParseBuffer.prototype.readNum =
function() {
	var i = undefined;
	var oldPos = this.pos;
	this.readToSpace();
	if (this.pos <= oldPos)
		return i;
	if (this.string.substring(oldPos, this.pos).replace(/^\-?[0-9]*$/gm,'').length === 0)
		i = parseInt(this.string.substring(oldPos, this.pos));
	this.readToNonspace();
	return i;
};
ParseBuffer.prototype.readString =
function() {
	var end = this.readAcrossString();
	if (end >= this.pos + 3) {
		var sub = "";
		for (var i = this.pos+1; i < end-1; i++) {
			if (this.string.charAt(i) === '\\') {
				if (i+1 < end-1)
					sub += this.string.charAt(i+1);
				i++;
			} else
				sub += this.string.charAt(i);
		}
		this.pos = end;
		this.readToNonspace();
		return sub;
	} else
		return undefined;
};
ParseBuffer.prototype.readAcrossString =
function() {
	var newPos = this.pos;
	if (this.string.charAt(newPos) === '\"') {
		newPos++;
		while (newPos < this.string.length) {
			if (this.string.charAt(newPos) === '\"') {
				newPos++;
				if (newPos >= this.string.length ||
						this.string.charAt(newPos).replace(/^\s+|\s+$/gm,'').length === 0)
					return newPos;
				else
					return undefined;
			} else if (this.string.charAt(newPos) === '\\') {
				newPos++;
				if (this.string.charAt(newPos) === '\"' ||
						this.string.charAt(newPos) === '\\')
					newPos++;
				else
					return undefined;
			} else if (this.string.charAt(newPos) === ' ' ||
					this.string.charAt(newPos).replace(/^\s+|\s+$/gm,'').length !== 0) {
				newPos++;
			} else
				return undefined;
		}
		return undefined;
	} else
		return undefined;
};

/////////////////////////////////////////////////////////////////////////////
// Parsing.

// Parse string into structure.
// return: ResLite
ResLite.parse =
function(str) {
	var resLite = new ResLite("hlr", 1000, null);
	var buffer = new ParseBuffer(str);
	buffer.readToNonspace();
	if (buffer.isEmpty())
		return;
	if (!ResLite.parseChunk(resLite, buffer))
		buffer.readToEnd();
	var remainder = buffer.remainder();
	if (remainder.replace(/^\s+|\s+$/gm,'').length !== 0)
		console.log("RESlite trailing symbols:" + remainder);
	return resLite;
};

// Parse header, then groups, then 'e'.
// return: whether successful
ResLite.parseChunk =
function(resLite, buffer) {
	var oldPos = buffer.pos;
	var newDir;
	var newSize;
	if (!buffer.readChar("$") ||
			(newDir = buffer.readDirection()) === undefined ||
			(newSize = buffer.readNum()) === undefined) {
		buffer.pos = oldPos;
		console.log("RESlite ill-formed header");
		return false;
	}
	resLite.dir = newDir;
	resLite.sizeMilEm = newSize;
	resLite.groups = ResLite.parseGroups(buffer);
	if (!buffer.readSingleChar("e")) {
		console.log("RESlite missing end");
		return false;
	} else 
		return true;
};

// Parse zero or more groups. 
// return: pointer to list, possibly null
ResLite.parseGroups =
function(buffer) {
	var oldPos = buffer.pos;
	if (!buffer.readChar("g"))
		return null;
	var groups = new ResLiteGroups();
	var advance;
	var length;
	if ((advance = buffer.readNum()) === undefined ||
			(length = buffer.readNum()) === undefined) {
		buffer.pos = oldPos;
		console.log("RESlite ill-formed group header");
		return groups;
	}
	groups.advanceMilEm = advance;
	groups.lengthMilEm = length;
	groups.exprs = ResLite.parseExprs(buffer);
	groups.notes = ResLite.parseNotes(buffer);
	groups.shades = ResLite.parseShades(buffer);
	if (!buffer.readChar("i")) {
		buffer.pos = oldPos;
		console.log("RESlite missing i in group");
		return groups;
	}
	groups.intershades = ResLite.parseShades(buffer);
	groups.tl = ResLite.parseGroups(buffer);
	return groups;
};

// Parse zero or more expressions. 
// return: pointer to list, possibly null.
ResLite.parseExprs =
function(buffer) {
	if (buffer.peekChar("c")) {
		var exprs = ResLite.parseGlyph(buffer);
		exprs.tl = ResLite.parseExprs(buffer);
		return exprs;
	} else if (buffer.peekChar("(")) {
		var exprs = ResLite.parsePair(buffer);
		exprs.tl = ResLite.parseExprs(buffer);
		return exprs;
	} else
		return null;
};

// Parse glyph.
// return: ResLiteGlyph
ResLite.parseGlyph =
function(buffer) {
	var oldPos = buffer.pos;
	var glyph = new ResLiteGlyph();
	if (!buffer.readChar("c")) {
		console.log("RESlite missing c in glyph");
		return glyph;
	}
	var fileNumber;
	var glyphIndex;
	var mirror;
	var rotate;
	var colorCode;
	var xscale;
	var yscale;
	var x;
	var y;
	var xMin;
	var yMin;
	var width;
	var height;
	if ((fileNumber = buffer.readNum()) === undefined ||
			(glyphIndex = buffer.readNum()) === undefined ||
			(mirror = buffer.readNum()) === undefined ||
			(rotate = buffer.readNum()) === undefined ||
			(colorCode = buffer.readNum()) === undefined ||
			colorCode < 0 || colorCode >= 16 ||
			(xscale = buffer.readNum()) === undefined ||
			(yscale = buffer.readNum()) === undefined ||
			(x = buffer.readNum()) === undefined ||
			(y = buffer.readNum()) === undefined ||
			(xMin = buffer.readNum()) === undefined ||
			(yMin = buffer.readNum()) === undefined ||
			(width = buffer.readNum()) === undefined ||
			(height = buffer.readNum()) === undefined) {
		buffer.pos = oldPos;
		console.log("RESlite ill-formed glyph");
		return glyph;
	}
	glyph.fileNumber = fileNumber;
	glyph.glyphIndex = glyphIndex;
	glyph.mirror = (mirror !== 0);
	glyph.rotate = rotate;
	glyph.color = ResLite.numToColor(colorCode);
	glyph.xscaleMil = xscale;
	glyph.yscaleMil = yscale;
	glyph.xMilEm = x;
	glyph.yMilEm = y;
	glyph.xMinMil = xMin;
	glyph.yMinMil = yMin;
	glyph.widthMil = width;
	glyph.heightMil = height;
	return glyph;
};

// Parse pair.
// return: ResLitePair
ResLite.parsePair =
function(buffer) {
	var oldPos = buffer.pos;
	var pair = new ResLitePair();
	if (!buffer.readChar("(")) {
		console.log("RESlite missing ( in pair");
		return pair;
	}
	pair.list1 = ResLite.parseExprs(buffer);
	if (!buffer.readChar("o")) {
		buffer.pos = oldPos;
		console.log("RESlite missing o in pair");
		return pair;
	}
	pair.list2 = ResLite.parseExprs(buffer);
	if (!buffer.readChar(")")) {
		buffer.pos = oldPos;
		console.log("RESlite missing ) in pair");
		return pair;
	}
	return pair;
};

// Parse zero or more notes. 
// return: pointer to list, possibly null
ResLite.parseNotes =
function(buffer) {
	var oldPos = buffer.pos;
	if (!buffer.readChar("n"))
		return null;
	var notes = new ResLiteNotes();
	var string;
	var fileNumber;
	var colorCode;
	var size;
	var x;
	var y;
	if ((string = buffer.readString()) === undefined ||
			(fileNumber = buffer.readNum()) === undefined ||
			(colorCode = buffer.readNum()) === undefined ||
			colorCode < 0 || colorCode >= 16 ||
			(size = buffer.readNum()) === undefined ||
			(x = buffer.readNum()) === undefined ||
			(y = buffer.readNum()) === undefined) {
		buffer.pos = oldPos;
		console.log("RESlite ill-formed note");
		return notes;
	}
	notes.string = string;
	notes.fileNumber = fileNumber;
	notes.color = ResLite.numToColor(colorCode);
	notes.sizeMilEm = size;
	notes.xMilEm = x;
	notes.yMilEm = y;
	notes.tl = ResLite.parseNotes(buffer);
	return notes;
};

// Parse zero or more shades. 
// return: pointer to list, possibly null
ResLite.parseShades =
function(buffer) {
	var oldPos = buffer.pos;
	if (!buffer.readChar("s"))
		return null;
	var shades = new ResLiteShades();
	var x;
	var y;
	var width;
	var height;
	if ((x = buffer.readNum()) === undefined ||
			(y = buffer.readNum()) === undefined ||
			(width = buffer.readNum()) === undefined ||
			(height = buffer.readNum()) === undefined) {
		buffer.pos = oldPos;
		console.log("RESlite ill-formed shade");
		return shades;
	}
	shades.xMilEm = x;
	shades.yMilEm = y;
	shades.widthMilEm = width;
	shades.heightMilEm = height;
	shades.tl = ResLite.parseShades(buffer);
	return shades;
};

// Convert color number to name.
ResLite.numToColor =
function(num) {
	switch (num) {
		case 0: return "white";
		case 1: return "silver";
		case 2: return "gray";
		case 3: return "yellow";
		case 4: return "fuchsia";
		case 5: return "aqua";
		case 6: return "olive";
		case 7: return "purple";
		case 8: return "teal";
		case 9: return "red";
		case 10: return "lime";
		case 11: return "blue";
		case 12: return "maroon";
		case 13: return "green";
		case 14: return "navy";
		case 15: return "black";
		default: return "black";
	}
};

// Straightforward rendering.
ResLite.prototype.render =
function(canvas, size) {
	var context = new ResContext();
	context.emSizePx = size;
	var div = ResLiteDivision.make(this, context);
	div.render(canvas);
};

/////////////////////////////////////////////////////////////////////////////
// Formatting.

function ResLiteDivision() {
	this.original = null; // complete ResLite before dividing
	this.resContext = null; // ResContext
	this.initialNumber = 0; // that fit within limit
	this.initialSizeMilEm = 0; // size of initial prefix, in 1000 * EM
	this.padMilEm = 0; // padding between groups, in 1000 * EM
	this.remainder; // remaining ResLite that does not fit within limit.
}
ResLiteDivision.prototype.isH =
function() {
	return this.original.isH();
};
ResLiteDivision.prototype.isLR =
function() {
	return this.original.isLR() && this.resContext.dir === undefined ||
		this.resContext === "lr";
};
ResLiteDivision.prototype.getWidthMilEm = 
function() {
	var pad = this.initialNumber > 1 ? this.padMilEm * (this.initialNumber-1) : 0;
	return this.isH() ? this.initialSizeMilEm + pad : this.original.sizeMilEm;
};
ResLiteDivision.prototype.getHeightMilEm = 
function() {
	var pad = this.initialNumber > 1 ? this.padMilEm * (this.initialNumber-1) : 0;
	return this.isH() ? this.original.sizeMilEm : this.initialSizeMilEm + pad;
};
ResLiteDivision.prototype.getWidthPx = 
function() {
	return Math.round(this.resContext.milEmToPx(this.getWidthMilEm())); 
};
ResLiteDivision.prototype.getHeightPx =
function() {
	return Math.round(this.resContext.milEmToPx(this.getHeightMilEm())); 
};
// Process input until length limit is reached.
// Limit can be infinite (= no limit).
ResLiteDivision.makeTo =
function(resLite, lenPx, context) {
	var div = new ResLiteDivision();
	div.original = resLite;
	div.resContext = context;
	var lenMilEm = context.pxToMilEm(lenPx);
	ResLiteDivision.makeToMilEm(div, lenMilEm);
	if (context.paddingAllowed &&
			lenMilEm !== Number.MAX_VALUE &&
			div.initialNumber > 1) {
		var diff = lenMilEm - div.initialSizeMilEm;
		var maxDiff = 1000 * context.paddingFactor * context.opSepEm * (div.initialNumber-1);
		if (maxDiff >= diff)
			div.padMilEm = diff / (div.initialNumber-1);
	}
	return div;
};
ResLiteDivision.make =
function(resLite, resContext) {
	return ResLiteDivision.makeTo(resLite, Number.MAX_VALUE, resContext);
};
// Process until limit. Store remainder.
ResLiteDivision.makeToMilEm =
function(div, lenMilEm) {
	var groups = div.original.groups;
	div.initialNumber = 0;
	div.initialSizeMilEm = 0;
	var start = 0;
	var isFirst = true;
	while (groups !== null) {
		var advance = (isFirst ? 0 : groups.advanceMilEm);
		if (start + advance + groups.lengthMilEm <= lenMilEm) {
			start += advance;
			div.initialNumber++;
			div.initialSizeMilEm = start + groups.lengthMilEm;
			groups = groups.tl;
			isFirst = false;
		} else
			break;
	}
	div.remainder = new ResLite(div.original.dir, div.original.sizeMilEm, groups);
};

/////////////////////////////////////////////////////////////
// Rendering.

// Render with initial margin. If things were printed outside margin 
// (so if margin became bigger) do again.
ResLiteDivision.prototype.render = 
function(canvas) {
	this.env = new ResEnv(this.resContext);
	while (true) {
		this.env.totalWidthPx = this.getWidthPx() + this.env.leftMarginPx + this.env.rightMarginPx;
		this.env.totalHeightPx = this.getHeightPx() + this.env.topMarginPx + this.env.bottomMarginPx;
		canvas.width = this.env.totalWidthPx;
		canvas.height = this.env.totalHeightPx;
		this.ctx = canvas.getContext("2d");
		this.ctx.clearRect(0, 0, canvas.width, canvas.height);
		if (!this.isLR()) {
			this.ctx.translate(canvas.width, 0);
			this.ctx.scale(-1, 1);
		}
		var p = new ResPoint(this.env.leftMarginPx, this.env.topMarginPx);
		this.shading = new ResShading(this.resContext, !this.isLR());
		this.renderGroups(this.original.groups, this.initialNumber, p);
		if (this.env.marginsUnchanged()) {
			this.shading.compress();
			this.shading.print(this.ctx);
			break;
		} else
			this.env.updateMargins();
	}		
};
ResLiteDivision.prototype.renderGroups =
function(groups, n, p) {
	if (n <= 0 || groups === null) 
		return;
	var lenPx = this.resContext.milEmToPx(groups.lengthMilEm);
	var rect = this.makeRect(p, lenPx);
	this.renderExprs(groups.exprs, rect);
	this.renderNotes(groups.notes, rect);
	this.renderShades(groups.shades, rect);
	if (n > 1 && groups !== null) {
		this.renderShades(groups.intershades, rect);
		var advancePx = this.resContext.milEmToPx(groups.tl.advanceMilEm + this.padMilEm);
		var nextP = this.advancePoint(rect, advancePx);
		this.renderGroups(groups.tl, n-1, nextP);
	}
};
ResLiteDivision.prototype.renderExprs =
function(exprs, rect) {
	if (exprs === null)
		return;
	if (exprs instanceof ResLiteGlyph)
		this.renderGlyph(exprs, rect);
	else 
		this.renderPair(exprs, rect);
	this.renderExprs(exprs.tl, rect);
};
ResLiteDivision.prototype.renderPair =
function(pair, rect) {
	var extra = this.resContext.milEmToPx(2000);
	if (this.isH()) {
		var pre = Math.min(extra, rect.x);
		var post = Math.min(extra, this.env.totalWidthPx - (rect.x + rect.width));
		var w = Math.round(rect.width + pre + post);
		var h = Math.round(rect.height + this.env.topMarginPx + this.env.bottomMarginPx);
		var x = pre;
		var y = this.env.topMarginPx;
	} else {
		var pre = Math.min(extra, rect.y);
		var post = Math.min(extra, this.env.totalHeightPx - (rect.y + rect.height));
		var w = Math.round(rect.width + this.env.leftMarginPx + this.env.rightMarginPx);
		var h = Math.round(rect.height + pre + post);
		var x = this.env.leftMarginPx;
		var y = pre;
	}
	var subRect = new ResRectangle(x, y, rect.width, rect.height);
	var xRef = rect.x - x;
	var yRef = rect.y - y;
	var canvas1 = ResCanvas.make(w, h);
	var ctx1 = canvas1.getContext("2d");
	var canvas2 = ResCanvas.make(w, h);
	var ctx2 = canvas2.getContext("2d");
	var savedCtx = this.ctx;
	var savedTotalWidth = this.env.totalWidthPx;
	var savedTotalHeight = this.env.totalHeightPx;
	this.env.totalWidthPx = w;
	this.env.totalHeightPx = h;
	this.ctx = ctx1;
	this.renderExprs(pair.list1, subRect);
	this.ctx = ctx2;
	this.renderExprs(pair.list2, subRect);
	var external = ResCanvas.externalPixels(ctx2, w, h);
	ResCanvas.erasePixels(ctx1, w, h, external);
	this.ctx = savedCtx;
	this.env.totalWidthPx = savedTotalWidth;
	this.env.totalHeightPx = savedTotalHeight;
	this.ctx.drawImage(canvas1, xRef, yRef);
	this.ctx.drawImage(canvas2, xRef, yRef);
};
ResLiteDivision.prototype.renderGlyph =
function(glyph, rect) {
	var size = Math.round(this.resContext.milEmToPx(glyph.yscaleMil));
	var font = this.resContext.fonts[glyph.fileNumber-1];
	var sizedFont = "" + size + "px " + font;
	var str = String.fromCharCode(glyph.glyphIndex);
	this.ctx.save();
	this.ctx.font = sizedFont;
	this.ctx.fillStyle = glyph.color;
	this.ctx.textBaseline = "alphabetic";
	var x = rect.x + this.resContext.milEmToPx(glyph.xMilEm);
	var y = rect.y + this.resContext.milEmToPx(glyph.yMilEm);
	var gRect = ResCanvas.glyphRect(str, size, 1, font, 0, false);
	if (glyph.rotate === 0 && !glyph.mirror && glyph.xscaleMil === glyph.yscaleMil) {
		var printedRect = new ResRectangle(x - gRect.width/2, y - gRect.height/2, 
					gRect.width, gRect.height);
		var cutOut = this.cutOutRect(glyph, printedRect);
		if (cutOut === undefined) 
			this.env.ensureRect(printedRect);
		else {
			this.ctx.beginPath();
			this.ctx.rect(cutOut.x, cutOut.y, cutOut.width, cutOut.height);
			this.ctx.clip();
			this.env.ensureRect(cutOut);
		}
		this.ctx.fillText(str, x - gRect.x - gRect.width/2, y - gRect.y + gRect.height/2);
	} else {
		var rotRect = ResCanvas.glyphRect(str, size, 1, font, glyph.rotate, glyph.mirror);
		var l = rotRect.x;
		var r = gRect.width - l - rotRect.width;
		var b = -rotRect.y;
		var t = gRect.height - b - rotRect.height;
		var hDiff = (l-r) / 2;
		var vDiff = (t-b) / 2;
		var xDiff = -gRect.x - gRect.width/2;
		var yDiff = -gRect.y + gRect.height/2;
		var printedRect = new ResRectangle(x-hDiff - rotRect.width/2, y-vDiff - rotRect.height/2, 
						rotRect.width, rotRect.height);
		var cutOut = this.cutOutRect(glyph, printedRect);
		if (cutOut === undefined)
			this.env.ensureRect(printedRect);
		else {
			this.ctx.beginPath();
			this.ctx.rect(cutOut.x, cutOut.y, cutOut.width, cutOut.height);
			this.ctx.clip();
			this.env.ensureRect(cutOut);
		}
		this.ctx.translate(x-hDiff, y-vDiff);
		this.ctx.rotate(glyph.rotate*Math.PI/180);
		this.ctx.scale((glyph.mirror ? -1 : 1) * glyph.xscaleMil / glyph.yscaleMil, 1);
		this.ctx.fillText(str, xDiff, yDiff);
	}
	this.ctx.restore();
};
ResLiteDivision.prototype.renderNotes =
function(notes, rect) {
	if (notes !== null) {
		this.renderNote(notes, rect);
		this.renderNotes(notes.tl);
	}
};
ResLiteDivision.prototype.renderNote =
function(notes, rect) {
	var size = Math.round(this.resContext.milEmToPx(notes.sizeMilEm));
	var font = "" + size + "px " + this.resContext.fonts[notes.fileNumber-1];
	this.ctx.save();
	this.ctx.font = font;
	this.ctx.fillStyle = notes.color;
	this.ctx.textBaseline = "alphabetic";
	var gRect = ResCanvas.glyphRect(notes.string, size, 1, font, 0, false);
	var x = rect.x + this.resContext.milEmToPx(notes.xMilEm);
	var y = rect.y + this.resContext.milEmToPx(notes.yMilEm);
	var xDiff = -gRect.x - gRect.width/2;
	var yDiff = -gRect.y + gRect.height/2;
	this.ctx.translate(x, y);
	if (this.isLR())
		this.ctx.scale(1, 1);
	else
		this.ctx.scale(-1, 1);
	this.ctx.fillText(notes.string, xDiff, yDiff);
	this.ctx.restore();
	this.env.ensureRect(new ResRectangle(x - gRect.width/2, y - gRect.height/2, 
				gRect.width, gRect.height));
};
ResLiteDivision.prototype.renderShades =
function(shades, rect) {
	if (shades !== null) {
		this.renderShade(shades, rect);
		this.renderShades(shades.tl, rect);
	}
};
ResLiteDivision.prototype.renderShade =
function(shades, rect) {
	var x = rect.x + this.resContext.milEmToPx(shades.xMilEm);
	var y = rect.y + this.resContext.milEmToPx(shades.yMilEm);
	var w = this.resContext.milEmToPx(shades.widthMilEm);
	var h = this.resContext.milEmToPx(shades.heightMilEm);
	var shadeRect = new ResRectangle(x-w/2, y-h/2, w, h);
	this.shading.addRect(shadeRect);
};
ResLiteDivision.prototype.makeRect =
function(p, len) {
	if (this.original.dir === "hlr" || this.original.dir === "hrl")
		return new ResRectangle(p.x, p.y, len, this.getHeightPx());
	else
		return new ResRectangle(p.x, p.y, this.getWidthPx(), len);
};
ResLiteDivision.prototype.advancePoint =
function(rect, adv) {
	if (this.original.dir === "hlr" || this.original.dir === "hrl")
		return new ResPoint(rect.x + adv, rect.y);
	else
		return new ResPoint(rect.x, rect.y + adv);
};
ResLiteDivision.prototype.cutOutRect =
function(glyph, rect) {
	if (glyph.xMinMil === 0 && glyph.yMinMil === 0 && 
			glyph.widthMil === 1000 && glyph.heightMil === 1000)
		return undefined;
	var subX = rect.x + glyph.xMinMil * rect.width / 1000;
	var subY = rect.y + glyph.yMinMil * rect.height / 1000;
	var subWidth = glyph.widthMil * rect.width / 1000;
	var subHeight = glyph.heightMil * rect.height / 1000;
	return new ResRectangle(subX, subY, subWidth, subHeight);
};

/* res_struct.js */

// Global values.

function ResGlobals(direction, size) {
	this.direction = "hlr";
	this.sizeHeader = 1;
	this.size = 1;
	this.color = "black";
	this.shade = false;
	this.sep = 1;
	this.fit = false;
	this.mirror = false;
	if (direction != null)
		this.direction = direction;
	if (size != null) {
		this.sizeHeader = size;
		this.size = size;
	}
}
ResGlobals.prototype.clone =
function() {
	var copy = new ResGlobals(this.direction, this.size);
	copy.sizeHeader = this.sizeHeader;
	copy.color = this.color;
	copy.shade = this.shade;
	copy.sep = this.sep;
	copy.fit = this.fit;
	copy.mirror = this.mirror;
	return copy;
};
ResGlobals.prototype.update =
function(size) {
	if (size === this.size)
		return this;
	else {
		var copy = this.clone();
		copy.size = size;
		return copy;
	}
};
ResGlobals.prototype.isH =
function() {
	return ResGlobals.isH(this.direction);
};
ResGlobals.prototype.isV =
function() {
	return ResGlobals.isV(this.direction);
};
ResGlobals.prototype.isLR =
function() {
	return ResGlobals.isLR(this.direction);
};
ResGlobals.prototype.isRL =
function() {
	return ResGlobals.isRL(this.direction);
};
ResGlobals.properties = ['color','shade','sep','fit','mirror'];
ResGlobals.isH = 
function(d) {
	return d === "hlr" || d === "hrl";
};
ResGlobals.isV = 
function(d) {
	return d === "vlr" || d === "vrl";
};
ResGlobals.isLR = 
function(d) {
	return d === "hlr" || d === "vlr";
};
ResGlobals.isRL = 
function(d) {
	return d === "hrl" || d === "vrl";
};

// Data structure.

function ResFragment(args) {
	if (args.l) {
		var argList = args.l;
		var switchs = args.sw;
		var hiero = args.h;
		this.direction = null;
		this.size = null;
		for (var i = 0; i < argList.length; i++) {
			var arg = argList[i];
			if (arg.is("hlr") || arg.is("hrl") ||
					arg.is("vlr") || arg.is("vrl"))
				this.direction = arg.getLhs();
			else if (arg.hasLhs("size") && arg.hasRhsNonzeroReal())
				this.size = arg.getRhs();
		}
		this.switchs = switchs;
		this.hiero = hiero;
		this.propagateBack();
		this.propagate();
	} else {
		this.direction = args.direction;
		this.size = args.size;
		this.switchs = args.switchs;
		this.hiero = args.hiero;
		this.propagateBack();
		this.propagate();
	}
}
ResFragment.prototype.headerString =
function() {
	var args = [];
	if (this.direction !== null)
		args.push(this.direction);
	if (this.size !== null)
		args.push("size=" + ResArg.realStr(this.size));
	var s = ResArg.argsStr(args);
	return s;
};
ResFragment.prototype.toString =
function() {
	var s = this.headerString();
	s += this.switchs.toString();
	if (this.hiero !== null) 
		s += this.hiero.toString();
	return s;
};
ResFragment.prototype.propagateBack =
function() {
	if (this.hiero !== null) {
		var sw = this.hiero.propagateBack();
		this.switchs = this.switchs.join(sw);
	}
};
ResFragment.prototype.propagate =
function() {
	this.globals = new ResGlobals(this.direction, this.size);
	this.globals = this.switchs.update(this.globals);
	if (this.hiero !== null)
		this.globals = this.hiero.propagate(this.globals, this.globals.direction);
};
ResFragment.prototype.namedGlyphs =
function() {
	return this.hiero === null ? [] : this.hiero.namedGlyphs();
};

function ResHieroglyphic(args) {
	this.groups = [];
	this.ops = [];
	this.switches = [];
	if (args.g) {
		var group = args.g;
		this.groups.push(group);
	} else {
		this.groups = args.groups;
		this.ops = args.ops;
		this.switches = args.switches;
	}
}
ResHieroglyphic.prototype.toString =
function() {
	var s = this.groups[0].toString();
	for (var i = 0; i < this.ops.length; i++) 
		s += "-" + this.ops[i].toString(false) + this.switches[i].toString() +
				this.groups[i+1].toString();
	return s;
};
ResHieroglyphic.prototype.addGroup = 
function(group, argList, switchs) {
	this.groups.unshift(group);
	this.ops.unshift(new ResOp({l:argList}, false));
	this.switches.unshift(switchs);
	return this;
};
ResHieroglyphic.prototype.addGroupAt = 
function(group, i) {
	this.groups.splice(i, 0, group);
	this.ops.splice(Math.min(i, this.ops.length), 0, new ResOp(null));
	this.switches.splice(Math.min(i, this.switches.length), 0, new ResSwitch(null));
};
ResHieroglyphic.prototype.propagateBack =
function() {
	for (var i = 0; i < this.switches.length; i++) {
		var sw = this.groups[i+1].propagateBack(new ResSwitch(null));
		this.switches[i] = this.switches[i].join(sw);
	}
	return this.groups[0].propagateBack(new ResSwitch(null));
};
ResHieroglyphic.prototype.propagate =
function(globals, direction) {
	this.globals = globals;
	this.globalss = [];
	this.globalss.push(globals);
	globals = this.groups[0].propagate(globals);
	for (var i = 0; i < this.ops.length; i++) {
		this.ops[i].propagate(globals);
		globals = this.switches[i].update(globals);
		this.globalss.push(globals);
		globals = this.groups[i+1].propagate(globals);
	}
	this.direction = direction;
	return globals;
};
ResHieroglyphic.prototype.effectiveIsH =
function() {
	return ResGlobals.isH(this.direction);
};
ResHieroglyphic.prototype.effectiveIsV =
function() {
	return ResGlobals.isV(this.direction);
};
ResHieroglyphic.prototype.namedGlyphs =
function() {
	var l = [];
	for (var i = 0; i < this.groups.length; i++)
		l = l.concat(this.groups[i].namedGlyphs());
	return l;
};

function ResVertgroup(args) {
	if (args === null)
		this.setDefaults();
	else if (args.l) {
		var group1 = args.g1;
		var argList = args.l;
		var switchs = args.sw;
		var group2 = args.g2;
		this.setDefaults();
		this.groups.push(group1);
		this.ops.push(new ResOp({l:argList}, true));
		this.switches.push(switchs);
		this.groups.push(group2);
	} else {
		this.groups = args.groups;
		this.ops = args.ops;
		this.switches = args.switches;
	}
}
ResVertgroup.prototype.setDefaults =
function() {
	this.groups = [];
	this.ops = [];
	this.switches = [];
};
ResVertgroup.make =
function(groups, ops, switches) {
	var subgroups = [];
	for (var i = 0; i < groups.length; i++)
		subgroups.push(new ResVertsubgroup({b: groups[i]}));
	return new ResVertgroup({groups: subgroups, ops: ops, switches: switches});
};
ResVertgroup.prototype.toString =
function() {
	var s = this.groups[0].toString();
	for (var i = 0; i < this.ops.length; i++) 
		s += ":" + this.ops[i].toString(i === 0) + this.switches[i].toString() +
			this.groups[i+1].toString();
	return s;
};
ResVertgroup.prototype.addGroup =
function(argList, switchs, group) {
	this.ops.push(new ResOp({l:argList}, false));
	this.switches.push(switchs);
	this.groups.push(group);
	return this;
};
ResVertgroup.prototype.addGroupAt = 
function(group, i) {
	this.groups.splice(i, 0, new ResVertsubgroup({b: group}));
	this.ops.splice(Math.min(i, this.ops.length), 0, new ResOp(null));
	this.switches.splice(Math.min(i, this.switches.length), 0, new ResSwitch(null));
};
ResVertgroup.prototype.propagateBack =
function(sw) {
	for (var i = 1; i < this.groups.length; i++) {
		var swGroup = (i === this.groups.length - 1) ?
			this.groups[i].propagateBack(sw) :
				this.groups[i].propagateBack(new ResSwitch(null));
		this.switches[i-1] = this.switches[i-1].join(swGroup);
	}
	return this.groups[0].propagateBack(new ResSwitch(null));
};
ResVertgroup.prototype.propagate =
function(globals) {
	this.globals = globals;
	globals = this.groups[0].propagate(globals);
	for (var i = 0; i < this.ops.length; i++) {
		this.ops[i].propagate(globals);
		globals = this.switches[i].update(globals);
		globals = this.groups[i+1].propagate(globals);
	}
	return globals;
};
ResVertgroup.prototype.effectiveSize =
function() {
	return this.ops[0].size !== null ? this.ops[0].size : this.globals.size;
};
ResVertgroup.prototype.subGroups =
function() {
	var l = [];
	for (var i = 0; i < this.groups.length; i++)
		l.push(this.groups[i].group);
	return l;
};
ResVertgroup.prototype.nPaddable =
function() {
	var n = 0;
	for (var i = 0; i < this.ops.length; i++)
		if (!this.ops[i].fix)
			n++;
	return n;
};
ResVertgroup.prototype.namedGlyphs =
function() {
	var l = [];
	for (var i = 0; i < this.groups.length; i++)
		l = l.concat(this.groups[i].group.namedGlyphs());
	return l;
};

function ResVertsubgroup(args) {
	if (args.g) {
		this.switchs1 = args.sw1;
		this.group = args.g;
		this.switchs2 = args.sw2;
	} else if (args.b) {
		this.switchs1 = new ResSwitch(null);
		this.group = args.b;
		this.switchs2 = new ResSwitch(null);
	} else {
		this.switchs1 = args.switchs1;
		this.group = args.group;
		this.switchs2 = args.switchs2;
	}
};
ResVertsubgroup.prototype.toString =
function() {
	return this.switchs1.toString() + this.group.toString() + this.switchs2.toString();
};
ResVertsubgroup.prototype.propagateBack =
function(sw) {
	var swEnd = this.switchs2.join(sw);
	this.switchs2 = new ResSwitch(null);
	var swGroup = this.group.propagateBack(swEnd);
	var swStart = this.switchs1.join(swGroup);
	this.switchs1 = new ResSwitch(null);
	return swStart;
};
ResVertsubgroup.prototype.propagate =
function(globals) {
	globals = this.switchs1.update(globals);
	globals = this.group.propagate(globals);
	return this.switchs2.update(globals);
};

function ResHorgroup(args) {
	if (args === null)
		this.setDefaults();
	else if (args.l) {
		var group1 = args.g1;
		var argList = args.l;
		var switchs = args.sw;
		var group2 = args.g2;
		this.setDefaults();
		this.groups.push(group1);
		this.ops.push(new ResOp({l:argList}, true));
		this.switches.push(switchs);
		this.groups.push(group2);
	} else {
		this.groups = args.groups;
		this.ops = args.ops;
		this.switches = args.switches;
	}
}
ResHorgroup.prototype.setDefaults =
function() {
	this.groups = [];
	this.ops = [];
	this.switches = [];
};
ResHorgroup.make =
function(groups, ops, switches) {
	var subgroups = [];
	for (var i = 0; i < groups.length; i++)
		subgroups.push(new ResHorsubgroup({b: groups[i]}));
	return new ResHorgroup({groups: subgroups, ops: ops, switches: switches});
};
ResHorgroup.prototype.toString =
function() {
	var s = this.groups[0].toString();
	for (var i = 0; i < this.ops.length; i++) 
		s += "*" + this.ops[i].toString(i === 0) + this.switches[i].toString() +
			this.groups[i+1].toString();
	return s;
};
ResHorgroup.prototype.addGroup =
function(argList, switchs, group) {
	this.ops.push(new ResOp({l:argList}, false));
	this.switches.push(switchs);
	this.groups.push(group);
	return this;
};
ResHorgroup.prototype.addGroupAt = 
function(group, i) {
	this.groups.splice(i, 0, new ResHorsubgroup({b: group}));
	this.ops.splice(Math.min(i, this.ops.length), 0, new ResOp(null));
	this.switches.splice(Math.min(i, this.switches.length), 0, new ResSwitch(null));
};
ResHorgroup.prototype.propagateBack =
function(sw) {
	for (var i = 1; i < this.groups.length; i++) {
		var swGroup = (i === this.groups.length - 1) ?
			this.groups[i].propagateBack(sw) :
				this.groups[i].propagateBack(new ResSwitch(null));
		this.switches[i-1] = this.switches[i-1].join(swGroup);
	}
	return this.groups[0].propagateBack(new ResSwitch(null));
};
ResHorgroup.prototype.propagate =
function(globals) {
	this.globals = globals;
	globals = this.groups[0].propagate(globals);
	for (var i = 0; i < this.ops.length; i++) {
		this.ops[i].propagate(globals);
		globals = this.switches[i].update(globals);
		globals = this.groups[i+1].propagate(globals);
	}
	return globals;
};
ResHorgroup.prototype.effectiveSize =
function() {
	return this.ops[0].size !== null ? this.ops[0].size : this.globals.size;
};
ResHorgroup.prototype.subGroups =
function() {
	var l = [];
	for (var i = 0; i < this.groups.length; i++)
		l.push(this.groups[i].group);
	return l;
};
ResHorgroup.prototype.nPaddable =
function() {
	var n = 0;
	for (var i = 0; i < this.ops.length; i++)
		if (!this.ops[i].fix)
			n++;
	return n;
};
ResHorgroup.prototype.namedGlyphs =
function() {
	var l = [];
	for (var i = 0; i < this.groups.length; i++)
		l = l.concat(this.groups[i].group.namedGlyphs());
	return l;
};

function ResHorsubgroup(args) {
	if (args.g) { 
		this.switchs1 = args.sw1;
		this.group = args.g;
		this.switchs2 = args.sw2;
	} else if (args.b) {
		this.switchs1 = new ResSwitch(null);
		this.group = args.b;
		this.switchs2 = new ResSwitch(null);
	} else {
		this.switchs1 = args.switchs1;
		this.group = args.group;
		this.switchs2 = args.switchs2;
	}
};
ResHorsubgroup.prototype.toString =
function() {
	if (this.group instanceof ResVertgroup)
		return "(" + this.switchs1.toString() + this.group.toString() + ")" +
			this.switchs2.toString();
	else
		return this.switchs1.toString() + this.group.toString() + 
			this.switchs2.toString();
};
ResHorsubgroup.prototype.propagateBack =
function(sw) {
	var swEnd = this.switchs2.join(sw);
	this.switchs2 = new ResSwitch(null);
	var swGroup = this.group.propagateBack(swEnd);
	var swStart = this.switchs1.join(swGroup);
	this.switchs1 = new ResSwitch(null);
	return swStart;
};
ResHorsubgroup.prototype.propagate =
function(globals) {
	globals = this.switchs1.update(globals);
	globals = this.group.propagate(globals);
	return this.switchs2.update(globals);
};

function ResOp(args, isFirst) {
	if (args === null)
		this.setDefaults();
	else if (args.l) {
		var argList = args.l;
		this.sep = null;
		this.fit = null;
		this.fix = false;
		this.shade = null;
		this.shades = [];
		this.size = null;
		for (var i = 0; i < argList.length; i++) {
			var arg = argList[i];
			if (arg.hasLhs("sep") && arg.hasRhsReal())
				this.sep = arg.getRhs();
			else if (arg.is("fit"))
				this.fit = true;
			else if (arg.is("nofit"))
				this.fit = false;
			else if (arg.is("fix"))
				this.fix = true;
			else if (arg.is("shade"))
				this.shade = true;
			else if (arg.is("noshade"))
				this.shade = false;
			else if (arg.isPattern())
				this.shades.push(arg.getLhs());
			else if (isFirst) {
				if (arg.hasLhs("size") && 
						(arg.hasRhsReal() || arg.hasRhs("inf")))
					this.size = arg.getRhs();
			}
		}
	} else {
		this.sep = args.sep;
		this.fit = args.fit;
		this.fix = args.fix;
		this.shade = args.shade;
		this.shades = args.shades;
		this.size = args.size;
	}
}
ResOp.prototype.setDefaults =
function() {
	this.sep = null;
	this.fit = null;
	this.fix = false;
	this.shade = null;
	this.shades = [];
	this.size = null;
};
ResOp.prototype.propagate =
function(globals) {
	this.globals = globals;
};
ResOp.prototype.toString =
function(isFirst) {
	var args = [];
	if (this.sep !== null)
		args.push("sep=" + ResArg.realStr(this.sep));
	if (this.fit === true)
		args.push("fit");
	else if (this.fit === false)
		args.push("nofit");
	if (this.fix)
		args.push("fix");
	if (this.shade === true) 
		args.push("shade");
	if (this.shade === false) 
		args.push("noshade");
	for (var i = 0; i < this.shades.length; i++) 
		args.push(this.shades[i]);
	if (this.size === "inf") {
		if (isFirst)
			args.push("size=inf");
	} else if (this.size !== null)
		args.push("size=" + ResArg.realStr(this.size));
	return ResArg.argsStr(args);
};
ResOp.prototype.effectiveSep =
function() {
	return this.sep !== null ? this.sep : this.globals.sep;
};
ResOp.prototype.effectiveFit =
function() {
	return this.fit !== null ? this.fit : this.globals.fit;
};

function ResNamedglyph(args) {
	if (args === null) 
		this.setDefaults();
	else if (args.na) { 
		var name = args.na;
		var argList = args.l;
		var notes = args.no;
		var switchs = args.sw;
		this.name = name;
		this.mirror = null;
		this.rotate = 0;
		this.scale = 1;
		this.xscale = 1;
		this.yscale = 1;
		this.color = null;
		this.shade = null;
		this.shades = [];
		for (var i = 0; i < argList.length; i++) {
			var arg = argList[i];
			if (arg.is("mirror"))
				this.mirror = true;
			else if (arg.is("nomirror"))
				this.mirror = false;
			else if (arg.hasLhs("rotate") && arg.hasRhsNatnum())
				this.rotate = arg.getRhs() % 360;
			else if (arg.hasLhs("scale") && arg.hasRhsNonzeroReal())
				this.scale = arg.getRhs();
			else if (arg.hasLhs("xscale") && arg.hasRhsNonzeroReal())
				this.xscale = arg.getRhs();
			else if (arg.hasLhs("yscale") && arg.hasRhsNonzeroReal())
				this.yscale = arg.getRhs();
			else if (arg.isColor())
				this.color = arg.getLhs();
			else if (arg.is("shade"))
				this.shade = true;
			else if (arg.is("noshade"))
				this.shade = false;
			else if (arg.isPattern())
				this.shades.push(arg.getLhs());
		}
		this.notes = notes;
		this.switchs = switchs;
	} else {
		this.name = args.name;
		this.mirror = args.mirror;
		this.rotate = args.rotate;
		this.scale = args.scale;
		this.xscale = args.xscale;
		this.yscale = args.yscale;
		this.color = args.color;
		this.shade = args.shade;
		this.shades = args.shades;
		this.notes = args.notes;
		this.switchs = args.switchs;
	}
}
ResNamedglyph.prototype.setDefaults =
function() {
		this.name = '\"?\"';
		this.mirror = null;
		this.rotate = 0;
		this.scale = 1;
		this.xscale = 1;
		this.yscale = 1;
		this.color = null;
		this.shade = null;
		this.shades = [];
		this.notes = [];
		this.switchs = new ResSwitch(null);
};
ResNamedglyph.prototype.toString =
function() {
	var args = [];
	if (this.mirror === true)
		args.push("mirror");
	else if (this.mirror === false)
		args.push("nomirror");
	if (this.rotate !== 0)
		args.push("rotate=" + this.rotate);
	if (this.scale !== 1)
		args.push("scale=" + ResArg.realStr(this.scale));
	if (this.xscale !== 1)
		args.push("xscale=" + ResArg.realStr(this.xscale));
	if (this.yscale !== 1)
		args.push("yscale=" + ResArg.realStr(this.yscale));
	if (this.color !== null)
		args.push(this.color);
	if (this.shade === true)
		args.push("shade");
	else if (this.shade === false)
		args.push("noshade");
	for (var i = 0; i < this.shades.length; i++)
		args.push(this.shades[i]);
	var s = this.name + ResArg.argsStr(args);
	for (var i = 0; i < this.notes.length; i++)
			s += this.notes[i].toString();
	s += this.switchs.toString();
	return s;
};
ResNamedglyph.prototype.propagateBack =
function(sw) {
	this.switchs = this.switchs.join(sw);
	return new ResSwitch(null);
};
ResNamedglyph.prototype.propagate =
function(globals) {
	this.globals = globals;
	for (var i = 0; i < this.notes.length; i++)
		this.notes[i].propagate(globals);
	return this.switchs.update(globals);
};
ResNamedglyph.prototype.effectiveMirror =
function() {
	return this.mirror !== null ? this.mirror : this.globals.mirror;
};
ResNamedglyph.prototype.effectiveColor =
function() {
	return this.color !== null ? this.color : this.globals.color;
};
ResNamedglyph.prototype.namedGlyphs =
function() {
	return [this];
};

function ResEmptyglyph(args) {
	if (args === null) 
		this.setDefaults();
	else if (args.l) { 
		var argList = args.l;
		var note = args.n;
		var switchs = args.sw;
		this.width = 1;
		this.height = 1;
		this.shade = null;
		this.shades = [];
		this.firm = false;
		for (var i = 0; i < argList.length; i++) {
			var arg = argList[i];
			if (arg.hasLhs("width") && arg.hasRhsReal())
					this.width = arg.getRhs();
			else if (arg.hasLhs("height") && arg.hasRhsReal())
				this.height = arg.getRhs();
			else if (arg.is("shade"))
				this.shade = true;
			else if (arg.is("noshade"))
				this.shade = false;
			else if (arg.isPattern())
				this.shades.push(arg.getLhs());
			else if (arg.is("firm"))
				this.firm = true;
		}
		this.note = note;
		this.switchs = switchs;
	} else if (args.n) {
		var note = args.n;
		var switchs = args.sw;
		this.width = 0;
		this.height = 0;
		this.shade = null;
		this.shades = [];
		this.firm = false;
		this.note = note;
		this.switchs = switchs;
	} else {
		this.width = args.width;
		this.height = args.height;
		this.shade = args.shade;
		this.shades = args.shades;
		this.firm = args.film;
		this.note = args.note;
		this.switchs = args.switchs;
	}
}
ResEmptyglyph.prototype.setDefaults =
function() {
	this.width = 1;
	this.height = 1;
	this.shade = null;
	this.shades = [];
	this.firm = false;
	this.note = null;
	this.switchs = new ResSwitch(null);
};
ResEmptyglyph.pointArgs =
function() {
	return [new ResArg("width",0), new ResArg("height",0)];
};
ResEmptyglyph.prototype.toString =
function() {
	var args = [];
	var noPointArgs = false;
	if (this.width !== 1)
		args.push("width=" + ResArg.realStr(this.width));
	if (this.height !== 1)
		args.push("height=" + ResArg.realStr(this.height));
	if (this.shade === true) {
		args.push("shade");
		noPointArgs = true;
	}
	if (this.shade === false) {
		args.push("noshade");
		noPointArgs = true;
	}
	for (var i = 0; i < this.shades.length; i++) {
		args.push(this.shades[i]);
		noPointArgs = true;
	}
	if (this.firm) {
		args.push("firm");
		noPointArgs = true;
	}
	var s;
	if (this.width === 0 && this.height === 0 && !noPointArgs)
		s = ".";
	else
		s = "empty" + ResArg.argsStr(args);
	if (this.note !== null)
		s += this.note.toString();
	s += this.switchs.toString();
	return s;
};
ResEmptyglyph.prototype.propagateBack =
function(sw) {
	this.switchs = this.switchs.join(sw);
	return new ResSwitch(null);
};
ResEmptyglyph.prototype.propagate =
function(globals) {
	this.globals = globals;
	if (this.note !== null)
		this.note.propagate(globals);
	return this.switchs.update(globals);
};
ResEmptyglyph.prototype.namedGlyphs =
function() {
	return [];
};

function ResBox(args) {
	if (args === null) 
		this.setDefaults();
	else if (args.l) {
		var type = args.na;
		var argList = args.l;
		var switchs1 = args.sw1;
		var hiero = args.h;
		var notes = args.no;
		var switchs2 = args.sw2;
		this.type = type;
		this.direction = null;
		this.mirror = null;
		this.scale = 1;
		this.color = null;
		this.shade = null;
		this.shades = [];
		this.size = 1;
		this.opensep = null;
		this.closesep = null;
		this.undersep = null;
		this.oversep = null;
		for (var i = 0; i < argList.length; i++) {
			var arg = argList[i];
			if (arg.is("h") || arg.is("v"))
				this.direction = arg.getLhs();
			else if (arg.is("mirror"))
				this.mirror = true;
			else if (arg.is("nomirror"))
				this.mirror = false;
			else if (arg.hasLhs("scale") && arg.hasRhsNonzeroReal())
				this.scale = arg.getRhs();
			else if (arg.isColor())
				this.color = arg.getLhs();
			else if (arg.is("shade"))
				this.shade = true;
			else if (arg.is("noshade"))
				this.shade = false;
			else if (arg.isPattern())
				this.shades.push(arg.getLhs());
			else if (arg.hasLhs("size") && arg.hasRhsNonzeroReal())
				this.size = arg.getRhs();
			else if (arg.hasLhs("opensep") && arg.hasRhsReal())
				this.opensep = arg.getRhs();
			else if (arg.hasLhs("closesep") && arg.hasRhsReal())
				this.closesep = arg.getRhs();
			else if (arg.hasLhs("undersep") && arg.hasRhsReal())
				this.undersep = arg.getRhs();
			else if (arg.hasLhs("oversep") && arg.hasRhsReal())
				this.oversep = arg.getRhs();
		}
		this.switchs1 = switchs1;
		this.hiero = hiero;
		this.notes = notes;
		this.switchs2 = switchs2;
	} else {
		this.type = args.type;
		this.direction = args.direction;
		this.mirror = args.mirror;
		this.scale = args.scale;
		this.color = args.color;
		this.shade = args.shade;
		this.shades = args.shades;
		this.size = args.size;
		this.opensep = args.opensep;
		this.closesep = args.closesep;
		this.undersep = args.undersep;
		this.oversep = args.oversep;
		this.switchs1 = args.switchs1;
		this.hiero = args.hiero;
		this.notes = args.notes;
		this.switchs2 = args.switchs2;
	}
}
ResBox.prototype.setDefaults =
function() {
		this.type = 'cartouche';
		this.direction = null;
		this.mirror = null;
		this.scale = 1;
		this.color = null;
		this.shade = null;
		this.shades = [];
		this.size = 1;
		this.opensep = null;
		this.closesep = null;
		this.undersep = null;
		this.oversep = null;
		this.switchs1 = new ResSwitch(null);
		this.hiero = null;
		this.notes = [];
		this.switchs2 = new ResSwitch(null);
};
ResBox.prototype.toString =
function() {
	var args = [];
	if (this.direction === "h" || this.direction === "v")
		args.push(this.direction);
	if (this.mirror === true)
		args.push("mirror");
	else if (this.mirror === false)
		args.push("nomirror");
	if (this.scale !== 1)
		args.push("scale=" + ResArg.realStr(this.scale));
	if (this.color !== null)
		args.push(this.color);
	if (this.shade === true)
		args.push("shade");
	else if (this.shade === false)
		args.push("noshade");
	for (var i = 0; i < this.shades.length; i++)
		args.push(this.shades[i]);
	if (this.size !== 1)
		args.push("size=" + ResArg.realStr(this.size));
	if (this.opensep !== null)
		args.push("opensep=" + ResArg.realStr(this.opensep));
	if (this.closesep !== null)
		args.push("closesep=" + ResArg.realStr(this.closesep));
	if (this.undersep !== null)
		args.push("undersep=" + ResArg.realStr(this.undersep));
	if (this.oversep !== null)
		args.push("oversep=" + ResArg.realStr(this.oversep));
	var s = this.type + ResArg.argsStr(args) +
		"(" + this.switchs1.toString() + 
		(this.hiero === null ? "" : this.hiero.toString()) +
		")";
	for (var i = 0; i < this.notes.length; i++)
			s += this.notes[i].toString();
	s += this.switchs2.toString();
	return s;
};
ResBox.prototype.propagateBack =
function(sw) {
	this.switchs2 = this.switchs2.join(sw);
	if (this.hiero !== null) {
		var swHiero = this.hiero.propagateBack();
		this.switchs1 = this.switchs1.join(swHiero);
	}
	return new ResSwitch(null);
};
ResBox.prototype.propagate =
function(globals) {
	this.globals = globals;
	globals = this.switchs1.update(globals);
	if (this.hiero !== null) {
		var savedSize = globals.size;
		globals = globals.update(this.size);
		globals = this.hiero.propagate(globals, this.effectiveDir());
		globals = globals.update(savedSize);
	}
	for (var i = 0; i < this.notes.length; i++)
		this.notes[i].propagate(globals);
	return this.switchs2.update(globals);
};
ResBox.prototype.effectiveDir =
function() {
	if (this.direction === "h") {
		if (this.globals.direction === "vlr") 
			return "hlr";
		else if (this.globals.direction === "vrl") 
			return "hrl";
	} else if (this.direction === "v") {
		if (this.globals.direction === "hlr") 
			return "vlr";
		else if (this.globals.direction === "hrl") 
			return "vrl";
	} 
	return this.globals.direction;
};
ResBox.prototype.effectiveIsH =
function() {
	return ResGlobals.isH(this.effectiveDir());
};
ResBox.prototype.effectiveMirror =
function() {
	return this.mirror !== null ? this.mirror : this.globals.mirror;
};
ResBox.prototype.effectiveColor =
function() {
	return this.color !== null ? this.color : this.globals.color;
};
ResBox.prototype.effectiveOpensep =
function() {
	return this.opensep !== null ? this.opensep : this.globals.sep;
};
ResBox.prototype.effectiveClosesep =
function() {
	return this.closesep !== null ? this.closesep : this.globals.sep;
};
ResBox.prototype.effectiveUndersep =
function() {
	return this.undersep !== null ? this.undersep : this.globals.sep;
};
ResBox.prototype.effectiveOversep =
function() {
	return this.oversep !== null ? this.oversep : this.globals.sep;
};
ResBox.prototype.namedGlyphs =
function() {
	return this.hiero === null ? [] : this.hiero.namedGlyphs();
};

function ResStack(args) {
	if (args === null)
		this.setDefaults();
	else if (args.l) {
		var argList = args.l;
		var switchs1 = args.sw1;
		var group1 = args.g1;
		var switchs2 = args.sw2;
		var group2 = args.g2;
		var switchs3 = args.sw3;
		this.x = 0.5;
		this.y = 0.5;
		this.onunder = null;
		for (var i = 0; i < argList.length; i++) {
			var arg = argList[i];
			if (arg.hasLhs("x") && arg.hasRhsLowReal())
				this.x = arg.getRhs();
			else if (arg.hasLhs("y") && arg.hasRhsLowReal())
				this.y = arg.getRhs();
			else if (arg.is("on") || arg.is("under"))
				this.onunder = arg.getLhs();
		}
		this.switchs1 = switchs1;
		this.group1 = group1;
		this.switchs2 = switchs2;
		this.group2 = group2;
		this.switchs3 = switchs3;
	} else {
		this.x = args.x;
		this.y = args.y;
		this.onunder = args.onunder;
		this.switchs1 = args.switchs1;
		this.group1 = args.group1;
		this.switchs2 = args.switchs2;
		this.group2 = args.group2;
		this.switchs3 = args.switchs3;
	}
}
ResStack.prototype.setDefaults =
function() {
	this.x = 0.5;
	this.y = 0.5;
	this.onunder = null;
	this.switchs1 = new ResSwitch(null);
	this.group1 = null;
	this.switchs2 = new ResSwitch(null);
	this.group2 = null;
	this.switchs3 = new ResSwitch(null);
};
ResStack.prototype.toString =
function() {
	var args = [];
	if (this.x !== 0.5) 
		args.push("x=" + ResArg.realStr(this.x));
	if (this.y !== 0.5) 
		args.push("y=" + ResArg.realStr(this.y));
	if (this.onunder !== null) 
		args.push(this.onunder);
	return "stack" + ResArg.argsStr(args) + "(" + this.switchs1.toString() +
			this.group1.toString() + "," + this.switchs2.toString() +
			this.group2.toString() + ")" + this.switchs3.toString();
};
ResStack.prototype.propagateBack =
function(sw) {
	this.switchs3 = this.switchs3.join(sw);
	var swAfter = this.group2.propagateBack(new ResSwitch(null));
	var swBefore = this.switchs2.join(swAfter);
	this.switchs2 = new ResSwitch(null);
	var swStart = this.group1.propagateBack(swBefore);
	this.switchs1 = this.switchs1.join(swStart);
	return new ResSwitch(null);
};
ResStack.prototype.propagate =
function(globals) {
	this.globals = globals;
	globals = this.switchs1.update(globals);
	globals = this.group1.propagate(globals);
	globals = this.switchs2.update(globals);
	globals = this.group2.propagate(globals);
	return this.switchs3.update(globals);
};
ResStack.prototype.namedGlyphs =
function() {
	return this.group1.namedGlyphs().concat(this.group2.namedGlyphs());
};

function ResInsert(args) {
	if (args === null)
		this.setDefaults();
	else if (args.l) {
		var argList = args.l;
		var switchs1 = args.sw1;
		var group1 = args.g1;
		var switchs2 = args.sw2;
		var group2 = args.g2;
		var switchs3 = args.sw3;
		this.place = "";
		this.x = 0.5;
		this.y = 0.5;
		this.fix = false;
		this.sep = null;
		for (var i = 0; i < argList.length; i++) {
			var arg = argList[i];
			if (arg.is("t") || arg.is("b") || arg.is("s") || arg.is("e") ||
					arg.is("ts") || arg.is("te") || arg.is("bs") || arg.is("be"))
				this.place = arg.getLhs();
			else if (arg.hasLhs("x") && arg.hasRhsLowReal())
				this.x = arg.getRhs();
			else if (arg.hasLhs("y") && arg.hasRhsLowReal())
				this.y = arg.getRhs();
			else if (arg.is("fix"))
				this.fix = true;
			else if (arg.hasLhs("sep") && arg.hasRhsReal())
				this.sep = arg.getRhs();
		}
		this.switchs1 = switchs1;
		this.group1 = group1;
		this.switchs2 = switchs2;
		this.group2 = group2;
		this.switchs3 = switchs3;
	} else {
		this.place = args.place;
		this.x = args.x;
		this.y = args.y;
		this.fix = args.fix;
		this.sep = args.sep;
		this.switchs1 = args.switchs1;
		this.group1 = args.group1;
		this.switchs2 = args.switchs2;
		this.group2 = args.group2;
		this.switchs3 = args.switchs3;
	}
}
ResInsert.prototype.setDefaults =
function() {
	this.place = "";
	this.x = 0.5;
	this.y = 0.5;
	this.fix = false;
	this.sep = null;
	this.switchs1 = new ResSwitch(null);
	this.group1 = null;
	this.switchs2 = new ResSwitch(null);
	this.group2 = null;
	this.switchs3 = new ResSwitch(null);
};
ResInsert.prototype.toString =
function() {
	var args = [];
	if (this.place !== "") 
		args.push(this.place);
	if (this.x !== 0.5) 
		args.push("x=" + ResArg.realStr(this.x));
	if (this.y !== 0.5) 
		args.push("y=" + ResArg.realStr(this.y));
	if (this.fix)
		args.push("fix");
	if (this.sep !== null)
		args.push("sep=" + ResArg.realStr(this.sep));
	return "insert" + ResArg.argsStr(args) + "(" + this.switchs1.toString() +
			this.group1.toString() + "," + this.switchs2.toString() +
			this.group2.toString() + ")" + this.switchs3.toString();
};
ResInsert.prototype.propagateBack =
function(sw) {
	this.switchs3 = this.switchs3.join(sw);
	var swAfter = this.group2.propagateBack(new ResSwitch(null));
	var swBefore = this.switchs2.join(swAfter);
	this.switchs2 = new ResSwitch(null);
	var swStart = this.group1.propagateBack(swBefore);
	this.switchs1 = this.switchs1.join(swStart);
	return new ResSwitch(null);
};
ResInsert.prototype.propagate =
function(globals) {
	this.globals = globals;
	globals = this.switchs1.update(globals);
	globals = this.group1.propagate(globals);
	globals = this.switchs2.update(globals);
	globals = this.group2.propagate(globals);
	return this.switchs3.update(globals);
};
ResInsert.prototype.effectiveSep =
function() {
	return this.sep !== null ? this.sep : this.globals.sep;
};
ResInsert.prototype.namedGlyphs =
function() {
	return this.place === "s" || this.place === "t" ?
		this.group2.namedGlyphs().concat(this.group1.namedGlyphs()) :
		this.group1.namedGlyphs().concat(this.group2.namedGlyphs());
};

function ResModify(args) {
	if (args === null)
		this.setDefaults();
	else if (args.l) {
		var argList = args.l;
		var switchs1 = args.sw1;
		var group = args.g;
		var switchs2 = args.sw2;
		this.width = null;
		this.height = null;
		this.above = 0;
		this.below = 0;
		this.before = 0;
		this.after = 0;
		this.omit = false;
		this.shade = null;
		this.shades = [];
		for (var i = 0; i < argList.length; i++) {
			var arg = argList[i];
			if (arg.hasLhs("width") && arg.hasRhsNonzeroReal())
				this.width = arg.getRhs();
			else if (arg.hasLhs("height") && arg.hasRhsNonzeroReal())
				this.height = arg.getRhs();
			else if (arg.hasLhs("above") && arg.hasRhsReal())
				this.above = arg.getRhs();
			else if (arg.hasLhs("below") && arg.hasRhsReal())
				this.below = arg.getRhs();
			else if (arg.hasLhs("before") && arg.hasRhsReal())
				this.before = arg.getRhs();
			else if (arg.hasLhs("after") && arg.hasRhsReal())
				this.after = arg.getRhs();
			else if (arg.is("omit"))
				this.omit = true;
			else if (arg.is("shade"))
				this.shade = true;
			else if (arg.is("noshade"))
				this.shade = false;
			else if (arg.isPattern())
				this.shades.push(arg.getLhs());
		}
		this.switchs1 = switchs1;
		this.group = group;
		this.switchs2 = switchs2;
	} else {
		this.width = args.width;
		this.height = args.height;
		this.above = args.above;
		this.below = args.below;
		this.before = args.before;
		this.after = args.after;
		this.omit = args.omit;
		this.shade = args.shade;
		this.shades = args.shades;
		this.switchs1 = args.switchs1;
		this.group = args.group;
		this.switchs2 = args.switchs2;
	}
}
ResModify.prototype.setDefaults =
function() {
	this.width = null;
	this.height = null;
	this.above = 0;
	this.below = 0;
	this.before = 0;
	this.after = 0;
	this.omit = false;
	this.shade = null;
	this.shades = [];
	this.switchs1 = new ResSwitch(null);
	this.group = null; 
	this.switchs2 = new ResSwitch(null);
};
ResModify.prototype.toString =
function() {
	var args = [];
	if (this.width !== null) 
		args.push("width=" + ResArg.realStr(this.width));
	if (this.height !== null) 
		args.push("height=" + ResArg.realStr(this.height));
	if (this.above !== 0) 
		args.push("above=" + ResArg.realStr(this.above));
	if (this.below !== 0) 
		args.push("below=" + ResArg.realStr(this.below));
	if (this.before !== 0) 
		args.push("before=" + ResArg.realStr(this.before));
	if (this.after !== 0) 
		args.push("after=" + ResArg.realStr(this.after));
	if (this.omit)
		args.push("omit");
	if (this.shade === true)
		args.push("shade");
	else if (this.shade === false)
		args.push("noshade");
	for (var i = 0; i < this.shades.length; i++)
		args.push(this.shades[i]);
	return "modify" + ResArg.argsStr(args) + "(" + this.switchs1.toString() +
			this.group.toString() + ")" + this.switchs2.toString();
};
ResModify.prototype.propagateBack =
function(sw) {
	this.switchs2 = this.switchs2.join(sw);
	var swGroup = this.group.propagateBack(new ResSwitch(null));
	this.switchs1 = this.switchs1.join(swGroup);
	return new ResSwitch(null);
};
ResModify.prototype.propagate =
function(globals) {
	this.globals = globals;
	globals = this.switchs1.update(globals);
	globals = this.group.propagate(globals);
	return this.switchs2.update(globals);
};
ResModify.prototype.namedGlyphs =
function() {
	return this.group.namedGlyphs();
};

function ResNote(args) {
	if (args === null)
		this.setDefaults();
	else if (args.l) {
		var str = args.s;
		var argList = args.l;
		this.color = null;
		for (var i = 0; i < argList.length; i++) {
			var arg = argList[i];
			if (arg.isColor())
				this.color = arg.getLhs();
		}
		this.str = str;
	} else {
		this.color = args.color;
		this.str = args.str;
	}
}
ResNote.prototype.setDefaults =
function() {
	this.color = null;
	this.str = '"?"';
};
ResNote.prototype.toString =
function() {
	var args = [];
	if (this.color !== null)
		args.push(this.color);
	return "^" + this.str + ResArg.argsStr(args);
};
ResNote.prototype.displayString =
function() {
	var str = this.str.substring(1, this.str.length-1);
	str = str.replace(/\\(["\\])/g, "$1");
	return str;
};
ResNote.escapeString =
function(str) {
	str = str.replace(/\\/g, '\\\\');
	str = str.replace(/"/g, '\\"');
	return '\"' + str + '\"';
};
ResNote.prototype.propagate =
function(globals) {
	this.globals = globals;
};

function ResSwitch(args) {
	if (args === null)
		this.setDefaults();
	else if (args.l) {
		var argList = args.l;
		this.setDefaults();
		for (var i = 0; i < argList.length; i++) {
			var arg = argList[i];
			if (arg.isColor())
				this.color = arg.getLhs();
			else if (arg.is("shade"))
				this.shade = true;
			else if (arg.is("noshade"))
				this.shade = false;
			else if (arg.hasLhs("sep") && arg.hasRhsReal())
				this.sep = arg.getRhs();
			else if (arg.is("fit"))
				this.fit = true;
			else if (arg.is("nofit"))
				this.fit = false;
			else if (arg.is("mirror"))
				this.mirror = true;
			else if (arg.is("nomirror"))
				this.mirror = false;
		}
	} else {
		this.color = args.color;
		this.shade = args.shade;
		this.sep = args.sep;
		this.fit = args.fit;
		this.mirror = args.mirror;
	}
}
ResSwitch.prototype.setDefaults =
function() {
	this.color = null;
	this.shade = null;
	this.sep = null;
	this.fit = null;
	this.mirror = null;
};
ResSwitch.prototype.toString =
function() {
	var args = [];
	if (this.color !== null)
		args.push(this.color);
	if (this.shade === true)
		args.push("shade");
	else if (this.shade === false)
		args.push("noshade");
	if (this.sep !== null)
		args.push("sep=" + ResArg.realStr(this.sep));
	if (this.fit === true)
		args.push("fit");
	else if (this.fit === false)
		args.push("nofit");
	if (this.mirror === true)
		args.push("mirror");
	else if (this.mirror === false)
		args.push("nomirror");
	if (args.length > 0)
		return "!" + ResArg.argsStr(args);
	else
		return "";
};
ResSwitch.prototype.hasDefaultValues =
function() {
	return this.color === null &&
		this.shade === null &&
		this.sep === null &&
		this.fit === null &&
		this.mirror === null;
};
ResSwitch.prototype.join =
function(other) {
	var copy = new ResSwitch(null);
	for (var i = 0; i < ResGlobals.properties.length; i++) {
		var global = ResGlobals.properties[i];
		if (other[global] !== null)
			copy[global] = other[global];
		else
			copy[global] = this[global];
	}
	return copy;
};
ResSwitch.prototype.update =
function(globals) {
	var allNull = true;
	for (var i = 0; i < ResGlobals.properties.length; i++) {
		var global = ResGlobals.properties[i];
		if (this[global] !== null) {
			allNull = false;
			break;
		}
	}
	if (allNull)
		return globals;
	else {
		var copy = globals.clone();
		for (var i = 0; i < ResGlobals.properties.length; i++) {
			var global = ResGlobals.properties[i];
			if (this[global] !== null)
				copy[global] = this[global];
		}
		return copy;
	}
};

function ResArg(lhs, rhs) {
	this.lhs = lhs;
	this.rhs = rhs;
}
ResArg.prototype.getLhs =
function() {
	return this.lhs;
};
ResArg.prototype.getRhs =
function() {
	return this.rhs;
};
ResArg.prototype.is =
function(lhs) {
	return this.lhs === lhs && this.rhs === null;
};
ResArg.prototype.isColor =
function() {
	return this.is("black") || this.is("red") || this.is("green") || this.is("blue") || 
			this.is("white") || this.is("aqua") || this.is("fuchsia") || this.is("gray") || 
			this.is("lime") || this.is("maroon") || this.is("navy") || this.is("olive") || 
			this.is("purple") || this.is("silver") || this.is("teal") || this.is("yellow");
};
ResArg.prototype.isPattern =
function() {
	return this.rhs === null && this.lhs.search(/^[tbse]+$/) >= 0;
};
ResArg.prototype.hasLhs =
function(lhs) {
	return this.lhs === lhs;
};
ResArg.prototype.hasRhs =
function(rhs) {
	return this.rhs === rhs;
};
ResArg.prototype.hasRhsNatnum = 
function() {
	return typeof this.rhs === 'number' && this.rhs % 1 === 0;
};
ResArg.prototype.hasRhsReal =
function() {
	return typeof this.rhs === 'number';
};
ResArg.prototype.hasRhsNonzeroReal = 
function() {
	return typeof this.rhs === 'number' && this.rhs > 0;
};
ResArg.prototype.hasRhsLowReal = 
function() {
	return typeof this.rhs === 'number' && this.rhs <= 1;
};
ResArg.argsStr =
function(args) {
	if (args.length === 0)
		return "";
	else {
		var s = "[" + args[0];
		for (var i = 1; i < args.length; i++) 
			s += "," + args[i];
		s += "]";
		return s;
	}
};
ResArg.realStr =
function(val) {
	val -= Math.floor(val / 10) * 10;
	val = Math.floor(val * 100.0);
	var hundreds = Math.floor(val / 100);
	val -= hundreds * 100;
	var tens = Math.floor(val / 10);
	val -= tens * 10;
	var s = hundreds > 0 ? ("" + hundreds) : "0";
	if (tens > 0 || val > 0) {
		s += "." + tens;
		if (val > 0)
			s += val;
	}
	return s;
};

/* res_syntax.js */

/* parser generated by jison 0.4.18 */
/*
  Returns a Parser object of the following structure:

  Parser: {
    yy: {}
  }

  Parser.prototype: {
    yy: {},
    trace: function(),
    symbols_: {associative list: name ==> number},
    terminals_: {associative list: number ==> name},
    productions_: [...],
    performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$),
    table: [...],
    defaultActions: {...},
    parseError: function(str, hash),
    parse: function(input),

    lexer: {
        EOF: 1,
        parseError: function(str, hash),
        setInput: function(input),
        input: function(),
        unput: function(str),
        more: function(),
        less: function(n),
        pastInput: function(),
        upcomingInput: function(),
        showPosition: function(),
        test_match: function(regex_match_array, rule_index),
        next: function(),
        lex: function(),
        begin: function(condition),
        popState: function(),
        _currentRules: function(),
        topState: function(),
        pushState: function(condition),

        options: {
            ranges: boolean           (optional: true ==> token location info will include a .range[] member)
            flex: boolean             (optional: true ==> flex-like lexing behaviour where the rules are tested exhaustively to find the longest match)
            backtrack_lexer: boolean  (optional: true ==> lexer regexes are tested in order and for each matching regex the action code is invoked; the lexer terminates the scan when a token is returned by the action code)
        },

        performAction: function(yy, yy_, $avoiding_name_collisions, YY_START),
        rules: [...],
        conditions: {associative list: name ==> set},
    }
  }


  token location info (@$, _$, etc.): {
    first_line: n,
    last_line: n,
    first_column: n,
    last_column: n,
    range: [start_number, end_number]       (where the numbers are indexes into the input string, regular zero-based)
  }


  the parseError function receives a 'hash' object with these members for lexer and parser errors: {
    text:        (matched text)
    token:       (the produced terminal token, if any)
    line:        (yylineno)
  }
  while parser (grammar) errors will also provide these members, i.e. parser errors deliver a superset of attributes: {
    loc:         (yylloc)
    expected:    (string describing the set of expected tokens)
    recoverable: (boolean: TRUE when the parser has a error recovery rule available for this particular error)
  }
*/
var res_syntax = (function(){
var o=function(k,v,o,l){for(o=o||{},l=k.length;l--;o[k[l]]=v);return o},$V0=[8,21,36,38,39,41,42,47,48,54,55,56,57,60],$V1=[2,58],$V2=[8,21,36,38,39,41,42,47,55,56,57,60],$V3=[1,7],$V4=[8,21,36,38,39,41,42,55,56,57,60],$V5=[2,43],$V6=[1,10],$V7=[2,59],$V8=[8,21,36,38,39,41,42,47,54,55,56,57,60],$V9=[50,54,56,59,60],$Va=[2,5],$Vb=[1,27],$Vc=[1,32],$Vd=[1,33],$Ve=[1,34],$Vf=[1,35],$Vg=[1,36],$Vh=[1,37],$Vi=[1,38],$Vj=[1,40],$Vk=[1,39],$Vl=[2,46],$Vm=[1,44],$Vn=[1,47],$Vo=[1,52],$Vp=[1,54],$Vq=[1,53],$Vr=[2,6],$Vs=[2,7],$Vt=[8,13],$Vu=[2,9],$Vv=[2,10],$Vw=[2,14],$Vx=[1,58],$Vy=[2,11],$Vz=[2,16],$VA=[2,20],$VB=[8,13,20,24],$VC=[2,21],$VD=[2,22],$VE=[2,23],$VF=[2,24],$VG=[2,25],$VH=[2,26],$VI=[21,36,38,39,41,42,47,54,55,56,57,60],$VJ=[8,13,20,24,44,47,54],$VK=[1,65],$VL=[8,13,20,21,24,44,47,54],$VM=[21,54],$VN=[1,75],$VO=[8,13,20,24,44,47,48,54],$VP=[2,60],$VQ=[2,61],$VR=[2,66],$VS=[2,62],$VT=[2,44],$VU=[2,47],$VV=[2,49],$VW=[40,50,54],$VX=[1,84],$VY=[1,104],$VZ=[1,105],$V_=[1,106],$V$=[1,107],$V01=[1,108],$V11=[1,109],$V21=[1,110],$V31=[1,112],$V41=[1,111],$V51=[21,36,38,39,41,42,55,56,57,60],$V61=[1,116],$V71=[1,114],$V81=[8,13,20,24,47],$V91=[2,37],$Va1=[1,127],$Vb1=[1,125],$Vc1=[2,45],$Vd1=[2,48],$Ve1=[1,145],$Vf1=[1,147],$Vg1=[20,24],$Vh1=[20,24,44,47,54],$Vi1=[1,152],$Vj1=[20,21,24,44,47,54],$Vk1=[20,24,44,47,48,54],$Vl1=[2,42],$Vm1=[2,39],$Vn1=[1,167],$Vo1=[1,180],$Vp1=[2,38],$Vq1=[1,185],$Vr1=[54,56,59,60],$Vs1=[1,196],$Vt1=[1,199],$Vu1=[20,47,54],$Vv1=[24,47,54],$Vw1=[20,24,47],$Vx1=[1,221],$Vy1=[1,219],$Vz1=[21,22,36,38,39,41,42,47,54,55,56,57,60],$VA1=[2,32],$VB1=[8,13,20,24,47,54],$VC1=[1,242],$VD1=[8,13,20,24,47,48,54],$VE1=[2,63],$VF1=[2,64],$VG1=[2,8],$VH1=[8,13,20],$VI1=[2,13],$VJ1=[2,18],$VK1=[2,12],$VL1=[2,17],$VM1=[2,15],$VN1=[1,256],$VO1=[1,254],$VP1=[2,19],$VQ1=[1,261],$VR1=[1,259],$VS1=[1,267],$VT1=[1,280],$VU1=[2,27],$VV1=[2,40],$VW1=[2,28],$VX1=[1,306],$VY1=[1,307],$VZ1=[1,308],$V_1=[1,309],$V$1=[1,310],$V02=[1,311],$V12=[1,312],$V22=[1,314],$V32=[1,313],$V42=[21,22,36,38,39,41,42,55,56,57,60],$V52=[1,318],$V62=[1,316],$V72=[2,29],$V82=[2,30],$V92=[2,31],$Va2=[1,338],$Vb2=[1,339],$Vc2=[1,340],$Vd2=[1,341],$Ve2=[1,342],$Vf2=[1,343],$Vg2=[1,344],$Vh2=[1,346],$Vi2=[1,345],$Vj2=[1,362],$Vk2=[1,363],$Vl2=[1,364],$Vm2=[1,365],$Vn2=[1,366],$Vo2=[1,367],$Vp2=[1,368],$Vq2=[1,370],$Vr2=[1,369],$Vs2=[1,380],$Vt2=[1,388],$Vu2=[20,24,47,54],$Vv2=[1,407],$Vw2=[20,24,47,48,54],$Vx2=[13,22],$Vy2=[1,416],$Vz2=[13,20,22,24],$VA2=[13,20,22,24,44,47,54],$VB2=[1,421],$VC2=[13,20,21,22,24,44,47,54],$VD2=[13,20,22,24,44,47,48,54],$VE2=[1,436],$VF2=[2,41],$VG2=[1,441],$VH2=[20,24,40],$VI2=[20,24,40,44,47,54],$VJ2=[1,446],$VK2=[20,21,24,40,44,47,54],$VL2=[20,24,40,44,47,48,54],$VM2=[20,22,24],$VN2=[20,22,24,44,47,54],$VO2=[1,461],$VP2=[20,21,22,24,44,47,54],$VQ2=[20,22,24,44,47,48,54],$VR2=[20,22],$VS2=[13,20,22,24,47],$VT2=[1,506],$VU2=[1,504],$VV2=[20,24,40,47],$VW2=[1,528],$VX2=[1,526],$VY2=[20,22,24,47],$VZ2=[1,545],$V_2=[1,543],$V$2=[8,13,20,47,54],$V03=[1,562],$V13=[1,576],$V23=[1,589],$V33=[1,605],$V43=[1,618],$V53=[2,36],$V63=[1,629],$V73=[1,642],$V83=[1,652],$V93=[1,650],$Va3=[1,669],$Vb3=[1,672],$Vc3=[13,20,22,24,47,54],$Vd3=[1,691],$Ve3=[13,20,22,24,47,48,54],$Vf3=[1,700],$Vg3=[1,703],$Vh3=[20,24,40,47,54],$Vi3=[1,722],$Vj3=[20,24,40,47,48,54],$Vk3=[20,22,24,47,54],$Vl3=[1,743],$Vm3=[20,22,24,47,48,54],$Vn3=[1,753],$Vo3=[20,22,47,54],$Vp3=[2,33],$Vq3=[13,20,22],$Vr3=[20,40],$Vs3=[1,798],$Vt3=[1,802],$Vu3=[1,800],$Vv3=[1,810],$Vw3=[2,34],$Vx3=[1,820],$Vy3=[2,35],$Vz3=[13,20,22,47,54],$VA3=[20,40,47,54],$VB3=[1,890],$VC3=[1,888],$VD3=[1,897],$VE3=[1,895];
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"fragment":3,"whitespaces":4,"optional_header":5,"switches":6,"optional_hieroglyphic":7,"EOF":8,"header":9,"arg_bracket_list":10,"hieroglyphic":11,"top_group":12,"MINUS":13,"optional_arg_bracket_list":14,"ws":15,"vert_group":16,"hor_group":17,"basic_group":18,"vert_sub_group":19,"COLON":20,"OPEN":21,"CLOSE":22,"hor_sub_group":23,"ASTERISK":24,"named_glyph":25,"empty_glyph":26,"box":27,"stack":28,"insert":29,"modify":30,"glyph_name":31,"notes":32,"name":33,"nat_num":34,"short_string":35,"EMPTY":36,"optional_note":37,"PERIOD":38,"STACK":39,"COMMA":40,"INSERT":41,"MODIFY":42,"note":43,"CARET":44,"string":45,"switch":46,"EXCLAM":47,"SQ_OPEN":48,"arg_list":49,"SQ_CLOSE":50,"arg":51,"EQUALS":52,"real":53,"WHITESPACE":54,"GLYPH_NAME":55,"NAME":56,"SHORT_STRING":57,"LONG_STRING":58,"REAL":59,"NAT_NUM":60,"$accept":0,"$end":1},
terminals_: {2:"error",8:"EOF",13:"MINUS",20:"COLON",21:"OPEN",22:"CLOSE",24:"ASTERISK",36:"EMPTY",38:"PERIOD",39:"STACK",40:"COMMA",41:"INSERT",42:"MODIFY",44:"CARET",47:"EXCLAM",48:"SQ_OPEN",50:"SQ_CLOSE",52:"EQUALS",54:"WHITESPACE",55:"GLYPH_NAME",56:"NAME",57:"SHORT_STRING",58:"LONG_STRING",59:"REAL",60:"NAT_NUM"},
productions_: [0,[3,5],[5,0],[5,1],[9,2],[7,0],[7,1],[11,1],[11,5],[12,1],[12,1],[12,1],[16,5],[16,5],[19,1],[19,5],[19,1],[17,5],[17,5],[23,5],[23,1],[18,1],[18,1],[18,1],[18,1],[18,1],[18,1],[25,5],[25,5],[25,5],[25,5],[26,5],[26,4],[27,10],[28,11],[29,11],[30,8],[37,0],[37,1],[32,0],[32,2],[43,4],[15,2],[6,0],[6,2],[46,3],[14,0],[14,1],[10,4],[10,3],[49,2],[49,5],[51,3],[51,3],[51,3],[51,1],[51,1],[51,1],[4,0],[4,2],[31,1],[33,1],[35,1],[45,1],[45,1],[53,1],[34,1]],
performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate /* action[1] */, $$ /* vstack */, _$ /* lstack */) {
/* this == yyval */

var $0 = $$.length - 1;
switch (yystate) {
case 1:
return new ResFragment(
			{l:$$[$0-3],sw:$$[$0-2],h:$$[$0-1]});
break;
case 2: case 39: case 46: case 49:
this.$ = [];
break;
case 3: case 6: case 9: case 10: case 11: case 21: case 22: case 23: case 24: case 25: case 26: case 38: case 42: case 47:
this.$ = $$[$0];
break;
case 4: case 48:
this.$ = $$[$0-1];
break;
case 5: case 37:
this.$ = null;
break;
case 7:
this.$ = new ResHieroglyphic({g:$$[$0]});
break;
case 8:
this.$ = $$[$0].addGroup($$[$0-4],$$[$0-2],$$[$0-1]);
break;
case 12:
this.$ = new ResVertgroup(
			{g1:$$[$0-4],l:$$[$0-2],sw:$$[$0-1],g2:$$[$0]});
break;
case 13: case 18:
this.$ = $$[$0-4].addGroup($$[$0-2],$$[$0-1],$$[$0]);
break;
case 14:
this.$ = new ResVertsubgroup({sw1:new ResSwitch(null),g:$$[$0],sw2:new ResSwitch(null)});
break;
case 15:
this.$ = new ResVertsubgroup({sw1:$$[$0-3],g:$$[$0-2],sw2:$$[$0]});
break;
case 16:
this.$ = new ResVertsubgroup({b:$$[$0]});
break;
case 17:
this.$ = new ResHorgroup(
			{g1:$$[$0-4],l:$$[$0-2],sw:$$[$0-1],g2:$$[$0]});
break;
case 19:
this.$ = new ResHorsubgroup({sw1:$$[$0-3],g:$$[$0-2],sw2:$$[$0]});
break;
case 20:
this.$ = new ResHorsubgroup({b:$$[$0]});
break;
case 27: case 28: case 30:
this.$ = new ResNamedglyph(
			{na:$$[$0-4],l:$$[$0-3],no:$$[$0-1],sw:$$[$0]});
break;
case 29:
this.$ = new ResNamedglyph(
			{na:String($$[$0-4]),l:$$[$0-3],no:$$[$0-1],sw:$$[$0]});
break;
case 31:
this.$ = new ResEmptyglyph(
			{l:$$[$0-3],n:$$[$0-1],sw:$$[$0]});
break;
case 32:
this.$ = new ResEmptyglyph({l:ResEmptyglyph.pointArgs(),n:$$[$0-1],sw:$$[$0]});
break;
case 33:
this.$ = new ResBox({na:$$[$0-9],l:$$[$0-8],
			sw1:$$[$0-5],h:$$[$0-4],no:$$[$0-1],sw2:$$[$0]});
break;
case 34:
this.$ = new ResStack({l:$$[$0-9],sw1:$$[$0-6],
			g1:$$[$0-5],sw2:$$[$0-3],g2:$$[$0-2],sw3:$$[$0]});
break;
case 35:
this.$ = new ResInsert({l:$$[$0-9],sw1:$$[$0-6],
			g1:$$[$0-5],sw2:$$[$0-3],g2:$$[$0-2],sw3:$$[$0]});
break;
case 36:
this.$ = new ResModify({l:$$[$0-6],sw1:$$[$0-3],
			g:$$[$0-2],sw2:$$[$0]});
break;
case 40:
this.$ = [$$[$0-1]].concat($$[$0]);
break;
case 41:
this.$ = new ResNote({s:$$[$0-2],l:$$[$0-1]});
break;
case 43:
this.$ = new ResSwitch(null);
break;
case 44:
this.$ = $$[$0-1].join($$[$0]);
break;
case 45:
this.$ = new ResSwitch({l:$$[$0-1]});
break;
case 50:
this.$ = [$$[$0-1]];
break;
case 51:
this.$ = [$$[$0-4]].concat($$[$0]);
break;
case 52: case 53: case 54:
this.$ = new ResArg($$[$0-2],$$[$0]);
break;
case 55: case 56: case 57:
this.$ = new ResArg($$[$0],null);
break;
case 60: case 61: case 62: case 63: case 64:
this.$ = yytext;
break;
case 65:
this.$ = parseFloat(yytext);
break;
case 66:
this.$ = parseInt(yytext);
break;
}
},
table: [o($V0,$V1,{3:1,4:2}),{1:[3]},o($V2,[2,2],{5:3,9:5,10:6,48:$V3,54:[1,4]}),o($V4,$V5,{6:8,46:9,47:$V6}),o($V0,$V7),o($V2,[2,3]),o($V8,$V1,{4:11}),o($V9,$V1,{4:12}),{7:13,8:$Va,11:14,12:15,16:16,17:17,18:18,19:19,21:$Vb,23:20,25:21,26:22,27:23,28:24,29:25,30:26,31:28,33:29,34:30,35:31,36:$Vc,38:$Vd,39:$Ve,41:$Vf,42:$Vg,55:$Vh,56:$Vi,57:$Vj,60:$Vk},o($V4,$V5,{46:9,6:41,47:$V6}),o($V8,$Vl,{14:42,10:43,48:$V3}),o($V2,[2,4],{54:$Vm}),{33:49,34:50,49:45,50:[1,46],51:48,53:51,54:$Vn,56:$Vo,59:$Vp,60:$Vq},{8:[1,55]},{8:$Vr},{8:$Vs,13:[1,56]},o($Vt,$Vu,{20:[1,57]}),o($Vt,$Vv,{20:$Vw,24:$Vx}),o($Vt,$Vy,{20:$Vz,24:$VA}),{20:[1,59]},{24:[1,60]},o($VB,$VC),o($VB,$VD),o($VB,$VE),o($VB,$VF),o($VB,$VG),o($VB,$VH),o($VI,$V1,{15:61,4:62}),o($VJ,$Vl,{14:63,10:64,48:$VK}),o($VL,$Vl,{14:66,10:67,48:[1,68]}),o($VJ,$Vl,{10:64,14:69,48:$VK}),o($VJ,$Vl,{10:64,14:70,48:$VK}),o($VJ,$Vl,{10:64,14:71,48:$VK}),o($VJ,$V1,{4:72}),o($VM,$Vl,{14:73,10:74,48:$VN}),o($VM,$Vl,{10:74,14:76,48:$VN}),o($VM,$Vl,{10:74,14:77,48:$VN}),o($VO,$VP),o([8,13,20,21,24,44,47,48,54],$VQ),o($VO,$VR),o($VO,$VS),o($V4,$VT),o($V8,$V1,{4:78}),o($V8,$VU),o($V8,$V7),{50:[1,79]},o($V8,$VV),o($V9,$V7),o($VW,$V1,{4:80}),o($VW,[2,55],{52:[1,81]}),o($VW,[2,56]),o($VW,[2,57]),o([40,50,52,54],$VQ),o($VW,$VR),o($VW,[2,65]),{1:[2,1]},o($VI,$Vl,{14:82,10:83,48:$VX}),o($VI,$Vl,{10:83,14:85,48:$VX}),o($VI,$Vl,{10:83,14:86,48:$VX}),o($VI,$Vl,{10:83,14:87,48:$VX}),o($VI,$Vl,{10:83,14:88,48:$VX}),{16:90,17:89,18:93,19:92,21:$Vb,23:91,25:94,26:95,27:96,28:97,29:98,30:99,31:100,33:101,34:102,35:103,36:$VY,38:$VZ,39:$V_,41:$V$,42:$V01,55:$V11,56:$V21,57:$V31,60:$V41},o($V51,$V5,{6:113,46:115,47:$V61,54:$V71}),o($VJ,$V1,{4:117}),o($VJ,$VU),o($V9,$V1,{4:118}),o($VL,$V1,{4:119}),o($VL,$VU),o($V9,$V1,{4:120}),o($VJ,$V1,{4:121}),o($VJ,$V1,{4:122}),o($VJ,$V1,{4:123}),o($V81,$V91,{37:124,43:126,44:$Va1,54:$Vb1}),o($VM,$V1,{4:128}),o($VM,$VU),o($V9,$V1,{4:129}),o($VM,$V1,{4:130}),o($VM,$V1,{4:131}),o($V2,$Vc1,{54:$Vm}),o($V8,$Vd1),{40:[1,132],50:[2,50],54:[1,133]},{33:134,34:135,53:136,56:[1,137],59:$Vp,60:$Vq},o($VI,$V1,{4:62,15:138}),o($VI,$VU),o($V9,$V1,{4:139}),o($VI,$V1,{4:62,15:140}),o($VI,$V1,{4:62,15:141}),o($VI,$V1,{4:62,15:142}),o($VI,$V1,{4:62,15:143}),{20:$Vw,22:[1,144],24:$Ve1},{20:$Vf1,22:[1,146]},{24:[1,148]},{20:[1,149]},{20:$Vz,24:$VA},o($Vg1,$VC),o($Vg1,$VD),o($Vg1,$VE),o($Vg1,$VF),o($Vg1,$VG),o($Vg1,$VH),o($Vh1,$Vl,{14:150,10:151,48:$Vi1}),o($Vj1,$Vl,{14:153,10:154,48:[1,155]}),o($Vh1,$Vl,{10:151,14:156,48:$Vi1}),o($Vh1,$Vl,{10:151,14:157,48:$Vi1}),o($Vh1,$Vl,{10:151,14:158,48:$Vi1}),o($Vh1,$V1,{4:159}),o($VM,$Vl,{10:74,14:160,48:$VN}),o($VM,$Vl,{10:74,14:161,48:$VN}),o($VM,$Vl,{10:74,14:162,48:$VN}),o($Vk1,$VP),o([20,21,24,44,47,48,54],$VQ),o($Vk1,$VR),o($Vk1,$VS),o($V51,$Vl1),o($VI,$V7),o($V51,$V5,{46:115,6:163,47:$V61}),o($VI,$Vl,{10:83,14:164,48:$VX}),o($V81,$Vm1,{32:165,43:166,44:$Vn1,54:$Vb1}),{33:49,34:50,49:168,50:[1,169],51:48,53:51,54:$Vn,56:$Vo,59:$Vp,60:$Vq},o($V81,$Vm1,{43:166,32:170,21:[1,171],44:$Vn1,54:[1,172]}),{33:49,34:50,49:173,50:[1,174],51:48,53:51,54:$Vn,56:$Vo,59:$Vp,60:$Vq},o($V81,$Vm1,{43:166,32:175,44:$Vn1,54:$Vb1}),o($V81,$Vm1,{43:166,32:176,44:$Vn1,54:$Vb1}),o($V81,$V91,{43:126,37:177,44:$Va1,54:$Vb1}),o($VB,$V5,{6:178,46:179,47:$Vo1}),o($VJ,$V7),o($V81,$Vp1),{45:181,57:[1,183],58:[1,182]},{21:[1,184],54:$Vq1},{33:49,34:50,49:186,50:[1,187],51:48,53:51,54:$Vn,56:$Vo,59:$Vp,60:$Vq},{21:[1,188],54:$Vq1},{21:[1,189],54:$Vq1},o($Vr1,$V1,{4:190}),o($VW,$V7),o($VW,[2,52]),o($VW,[2,53]),o($VW,[2,54]),o($VW,$VQ),{11:191,12:15,16:16,17:17,18:18,19:19,21:$Vb,23:20,25:21,26:22,27:23,28:24,29:25,30:26,31:28,33:29,34:30,35:31,36:$Vc,38:$Vd,39:$Ve,41:$Vf,42:$Vg,55:$Vh,56:$Vi,57:$Vj,60:$Vk},{33:49,34:50,49:192,50:[1,193],51:48,53:51,54:$Vn,56:$Vo,59:$Vp,60:$Vq},{17:195,18:197,19:194,21:$Vs1,23:20,25:21,26:22,27:23,28:24,29:25,30:26,31:28,33:29,34:30,35:31,36:$Vc,38:$Vd,39:$Ve,41:$Vf,42:$Vg,55:$Vh,56:$Vi,57:$Vj,60:$Vk},{18:200,21:$Vt1,23:198,25:21,26:22,27:23,28:24,29:25,30:26,31:28,33:29,34:30,35:31,36:$Vc,38:$Vd,39:$Ve,41:$Vf,42:$Vg,55:$Vh,56:$Vi,57:$Vj,60:$Vk},{17:195,18:197,19:201,21:$Vs1,23:20,25:21,26:22,27:23,28:24,29:25,30:26,31:28,33:29,34:30,35:31,36:$Vc,38:$Vd,39:$Ve,41:$Vf,42:$Vg,55:$Vh,56:$Vi,57:$Vj,60:$Vk},{18:200,21:$Vt1,23:202,25:21,26:22,27:23,28:24,29:25,30:26,31:28,33:29,34:30,35:31,36:$Vc,38:$Vd,39:$Ve,41:$Vf,42:$Vg,55:$Vh,56:$Vi,57:$Vj,60:$Vk},o($Vu1,$V1,{15:203,4:204}),o($VI,$Vl,{10:83,14:205,48:$VX}),o($Vv1,$V1,{15:206,4:207}),o($VI,$Vl,{10:83,14:208,48:$VX}),o($VI,$Vl,{10:83,14:209,48:$VX}),o($VI,$Vl,{10:83,14:210,48:$VX}),o($Vh1,$V1,{4:211}),o($Vh1,$VU),o($V9,$V1,{4:212}),o($Vj1,$V1,{4:213}),o($Vj1,$VU),o($V9,$V1,{4:214}),o($Vh1,$V1,{4:215}),o($Vh1,$V1,{4:216}),o($Vh1,$V1,{4:217}),o($Vw1,$V91,{37:218,43:220,44:$Vx1,54:$Vy1}),o($VM,$V1,{4:222}),o($VM,$V1,{4:223}),o($VM,$V1,{4:224}),o($V51,$VT),o($VI,$V1,{4:225}),o($VB,$V5,{46:179,6:226,47:$Vo1}),o($V81,$Vm1,{43:166,32:227,44:$Vn1}),{45:228,57:[1,230],58:[1,229]},{50:[1,231]},o($VJ,$VV),o($VB,$V5,{46:179,6:232,47:$Vo1}),o($Vz1,$V1,{15:233,4:234}),o($VL,$V7),{50:[1,235]},o($VL,$VV),o($VB,$V5,{46:179,6:236,47:$Vo1}),o($VB,$V5,{46:179,6:237,47:$Vo1}),o($VB,$V5,{46:179,6:238,47:$Vo1}),o($VB,$VA1),o($VB,$V5,{46:179,6:239,47:$Vo1}),o($VB1,$Vl,{14:240,10:241,48:$VC1}),o($VB1,$Vl,{10:241,14:243,48:$VC1}),o($VD1,$VE1),o($VD1,$VF1),o($VI,$V1,{4:62,15:244}),o($VM,$V7),{50:[1,245]},o($VM,$VV),o($VI,$V1,{4:62,15:246}),o($VI,$V1,{4:62,15:247}),{33:49,34:50,49:248,51:48,53:51,54:[1,249],56:$Vo,59:$Vp,60:$Vq},{8:$VG1},{50:[1,250]},o($VI,$VV),o($VH1,$VI1),o($VH1,$Vw,{24:$Vx}),o($VI,$V1,{4:62,15:251}),o($VH1,$Vz,{24:$VA}),o($VB,$VJ1),o($VI,$V1,{4:62,15:252}),o($VB,$VA),o($VH1,$VK1),o($VB,$VL1),{20:$VM1},{6:253,20:$V5,46:255,47:$VN1,54:$VO1},o($VI,$V1,{4:62,15:257}),{24:$VP1},{6:258,24:$V5,46:260,47:$VQ1,54:$VR1},o($VI,$V1,{4:62,15:262}),o($VI,$V1,{4:62,15:263}),o($VI,$V1,{4:62,15:264}),o($Vw1,$Vm1,{32:265,43:266,44:$VS1,54:$Vy1}),{33:49,34:50,49:268,50:[1,269],51:48,53:51,54:$Vn,56:$Vo,59:$Vp,60:$Vq},o($Vw1,$Vm1,{43:266,32:270,21:[1,271],44:$VS1,54:[1,272]}),{33:49,34:50,49:273,50:[1,274],51:48,53:51,54:$Vn,56:$Vo,59:$Vp,60:$Vq},o($Vw1,$Vm1,{43:266,32:275,44:$VS1,54:$Vy1}),o($Vw1,$Vm1,{43:266,32:276,44:$VS1,54:$Vy1}),o($Vw1,$V91,{43:220,37:277,44:$Vx1,54:$Vy1}),o($Vg1,$V5,{6:278,46:279,47:$VT1}),o($Vh1,$V7),o($Vw1,$Vp1),{45:281,57:[1,283],58:[1,282]},{21:[1,284],54:$Vq1},{21:[1,285],54:$Vq1},{21:[1,286],54:$Vq1},o([21,36,38,39,41,42,47,55,56,57,60],$Vc1,{54:$V71}),o($VB,$VU1),o($V81,$VV1),o($VJ,$Vl,{10:64,14:287,48:$VK}),o($VO,$VE1),o($VO,$VF1),o($VJ,$Vd1),o($VB,$VW1),{7:288,11:289,12:290,16:291,17:292,18:293,19:294,21:$Vb,22:$Va,23:295,25:296,26:297,27:298,28:299,29:300,30:301,31:302,33:303,34:304,35:305,36:$VX1,38:$VY1,39:$VZ1,41:$V_1,42:$V$1,55:$V02,56:$V12,57:$V22,60:$V32},o($V42,$V5,{6:315,46:317,47:$V52,54:$V62}),o($VL,$Vd1),o($VB,$V72),o($VB,$V82),o($VB,$V92),o($VB,$VT),o($VB1,$V1,{4:319}),o($VB1,$VU),o($V9,$V1,{4:320}),o($VB1,$V1,{4:321}),{12:322,16:323,17:324,18:325,19:326,21:$Vb,23:327,25:328,26:329,27:330,28:331,29:332,30:333,31:334,33:335,34:336,35:337,36:$Va2,38:$Vb2,39:$Vc2,41:$Vd2,42:$Ve2,55:$Vf2,56:$Vg2,57:$Vh2,60:$Vi2},o($VM,$Vd1),{12:347,16:323,17:324,18:325,19:326,21:$Vb,23:327,25:328,26:329,27:330,28:331,29:332,30:333,31:334,33:335,34:336,35:337,36:$Va2,38:$Vb2,39:$Vc2,41:$Vd2,42:$Ve2,55:$Vf2,56:$Vg2,57:$Vh2,60:$Vi2},{12:348,16:349,17:350,18:351,19:92,21:$Vb,23:91,25:352,26:353,27:354,28:355,29:356,30:357,31:358,33:359,34:360,35:361,36:$Vj2,38:$Vk2,39:$Vl2,41:$Vm2,42:$Vn2,55:$Vo2,56:$Vp2,57:$Vq2,60:$Vr2},{50:[2,51]},o($Vr1,$V7),o($VI,$Vd1),{16:90,17:371,18:93,19:92,21:$Vb,23:91,25:94,26:95,27:96,28:97,29:98,30:99,31:100,33:101,34:102,35:103,36:$VY,38:$VZ,39:$V_,41:$V$,42:$V01,55:$V11,56:$V21,57:$V31,60:$V41},{16:372,17:373,18:93,19:92,21:$Vb,23:374,25:94,26:95,27:96,28:97,29:98,30:99,31:100,33:101,34:102,35:103,36:$VY,38:$VZ,39:$V_,41:$V$,42:$V01,55:$V11,56:$V21,57:$V31,60:$V41},{20:$Vl1},o($Vu1,$V7),{6:375,20:$V5,46:255,47:$VN1},o($Vu1,$Vl,{14:376,10:377,48:[1,378]}),{18:381,21:$Vs2,23:379,25:352,26:353,27:354,28:355,29:356,30:357,31:358,33:359,34:360,35:361,36:$Vj2,38:$Vk2,39:$Vl2,41:$Vm2,42:$Vn2,55:$Vo2,56:$Vp2,57:$Vq2,60:$Vr2},{24:$Vl1},o($Vv1,$V7),{6:382,24:$V5,46:260,47:$VQ1},o($Vv1,$Vl,{14:383,10:384,48:[1,385]}),{17:387,18:389,19:386,21:$Vt2,23:91,25:352,26:353,27:354,28:355,29:356,30:357,31:358,33:359,34:360,35:361,36:$Vj2,38:$Vk2,39:$Vl2,41:$Vm2,42:$Vn2,55:$Vo2,56:$Vp2,57:$Vq2,60:$Vr2},{18:381,21:$Vs2,23:390,25:352,26:353,27:354,28:355,29:356,30:357,31:358,33:359,34:360,35:361,36:$Vj2,38:$Vk2,39:$Vl2,41:$Vm2,42:$Vn2,55:$Vo2,56:$Vp2,57:$Vq2,60:$Vr2},{17:387,18:389,19:391,21:$Vt2,23:91,25:352,26:353,27:354,28:355,29:356,30:357,31:358,33:359,34:360,35:361,36:$Vj2,38:$Vk2,39:$Vl2,41:$Vm2,42:$Vn2,55:$Vo2,56:$Vp2,57:$Vq2,60:$Vr2},o($Vg1,$V5,{46:279,6:392,47:$VT1}),o($Vw1,$Vm1,{43:266,32:393,44:$VS1}),{45:394,57:[1,396],58:[1,395]},{50:[1,397]},o($Vh1,$VV),o($Vg1,$V5,{46:279,6:398,47:$VT1}),o($Vz1,$V1,{4:234,15:399}),o($Vj1,$V7),{50:[1,400]},o($Vj1,$VV),o($Vg1,$V5,{46:279,6:401,47:$VT1}),o($Vg1,$V5,{46:279,6:402,47:$VT1}),o($Vg1,$V5,{46:279,6:403,47:$VT1}),o($Vg1,$VA1),o($Vg1,$V5,{46:279,6:404,47:$VT1}),o($Vu2,$Vl,{14:405,10:406,48:$Vv2}),o($Vu2,$Vl,{10:406,14:408,48:$Vv2}),o($Vw2,$VE1),o($Vw2,$VF1),o($VI,$V1,{4:62,15:409}),o($VI,$V1,{4:62,15:410}),o($VI,$V1,{4:62,15:411}),o($VJ,$V1,{4:412}),{22:[1,413]},{22:$Vr},{13:[1,414],22:$Vs},o($Vx2,$Vu,{20:[1,415]}),o($Vx2,$Vv,{20:$Vw,24:$Vy2}),o($Vx2,$Vy,{20:$Vz,24:$VA}),{20:[1,417]},{24:[1,418]},o($Vz2,$VC),o($Vz2,$VD),o($Vz2,$VE),o($Vz2,$VF),o($Vz2,$VG),o($Vz2,$VH),o($VA2,$Vl,{14:419,10:420,48:$VB2}),o($VC2,$Vl,{14:422,10:423,48:[1,424]}),o($VA2,$Vl,{10:420,14:425,48:$VB2}),o($VA2,$Vl,{10:420,14:426,48:$VB2}),o($VA2,$Vl,{10:420,14:427,48:$VB2}),o($VA2,$V1,{4:428}),o($VM,$Vl,{10:74,14:429,48:$VN}),o($VM,$Vl,{10:74,14:430,48:$VN}),o($VM,$Vl,{10:74,14:431,48:$VN}),o($VD2,$VP),o([13,20,21,22,24,44,47,48,54],$VQ),o($VD2,$VR),o($VD2,$VS),o($V42,$Vl1),o($Vz1,$V7),o($V42,$V5,{46:317,6:432,47:$V52}),o($Vz1,$Vl,{14:433,10:434,48:[1,435]}),o($V81,$Vc1,{54:$VE2}),{33:49,34:50,49:437,50:[1,438],51:48,53:51,54:$Vn,56:$Vo,59:$Vp,60:$Vq},o($V81,$VF2,{54:$VE2}),{40:[1,439]},{20:[1,440],40:$Vu},{20:$Vw,24:$VG2,40:$Vv},{20:$Vz,24:$VA,40:$Vy},{20:[1,442]},{24:[1,443]},o($VH2,$VC),o($VH2,$VD),o($VH2,$VE),o($VH2,$VF),o($VH2,$VG),o($VH2,$VH),o($VI2,$Vl,{14:444,10:445,48:$VJ2}),o($VK2,$Vl,{14:447,10:448,48:[1,449]}),o($VI2,$Vl,{10:445,14:450,48:$VJ2}),o($VI2,$Vl,{10:445,14:451,48:$VJ2}),o($VI2,$Vl,{10:445,14:452,48:$VJ2}),o($VI2,$V1,{4:453}),o($VM,$Vl,{10:74,14:454,48:$VN}),o($VM,$Vl,{10:74,14:455,48:$VN}),o($VM,$Vl,{10:74,14:456,48:$VN}),o($VL2,$VP),o([20,21,24,40,44,47,48,54],$VQ),o($VL2,$VR),o($VL2,$VS),{40:[1,457]},{22:[1,458]},{20:$Vf1,22:$Vu},{20:$Vw,22:$Vv,24:$Ve1},{20:$Vz,22:$Vy,24:$VA},o($VM2,$VC),o($VM2,$VD),o($VM2,$VE),o($VM2,$VF),o($VM2,$VG),o($VM2,$VH),o($VN2,$Vl,{14:459,10:460,48:$VO2}),o($VP2,$Vl,{14:462,10:463,48:[1,464]}),o($VN2,$Vl,{10:460,14:465,48:$VO2}),o($VN2,$Vl,{10:460,14:466,48:$VO2}),o($VN2,$Vl,{10:460,14:467,48:$VO2}),o($VN2,$V1,{4:468}),o($VM,$Vl,{10:74,14:469,48:$VN}),o($VM,$Vl,{10:74,14:470,48:$VN}),o($VM,$Vl,{10:74,14:471,48:$VN}),o($VQ2,$VP),o([20,21,22,24,44,47,48,54],$VQ),o($VQ2,$VR),o($VQ2,$VS),{20:$Vw,22:[1,472],24:$Ve1},{20:$Vf1,22:[1,473]},{20:$Vw,24:[1,474]},{24:[1,475]},{20:$VT},o($Vu1,$V1,{4:476}),o($Vu1,$VU),o($V9,$V1,{4:477}),o($VM2,$VJ1),o($VI,$V1,{4:62,15:478}),o($VM2,$VA),{24:$VT},o($Vv1,$V1,{4:479}),o($Vv1,$VU),o($V9,$V1,{4:480}),o($VR2,$VI1),o($VR2,$Vw,{24:$Ve1}),o($VI,$V1,{4:62,15:481}),o($VR2,$Vz,{24:$VA}),o($VM2,$VL1),o($VR2,$VK1),o($Vg1,$VU1),o($Vw1,$VV1),o($Vh1,$Vl,{10:151,14:482,48:$Vi1}),o($Vk1,$VE1),o($Vk1,$VF1),o($Vh1,$Vd1),o($Vg1,$VW1),{7:483,11:289,12:290,16:291,17:292,18:293,19:294,21:$Vb,22:$Va,23:295,25:296,26:297,27:298,28:299,29:300,30:301,31:302,33:303,34:304,35:305,36:$VX1,38:$VY1,39:$VZ1,41:$V_1,42:$V$1,55:$V02,56:$V12,57:$V22,60:$V32},o($Vj1,$Vd1),o($Vg1,$V72),o($Vg1,$V82),o($Vg1,$V92),o($Vg1,$VT),o($Vu2,$V1,{4:484}),o($Vu2,$VU),o($V9,$V1,{4:485}),o($Vu2,$V1,{4:486}),{12:487,16:323,17:324,18:325,19:326,21:$Vb,23:327,25:328,26:329,27:330,28:331,29:332,30:333,31:334,33:335,34:336,35:337,36:$Va2,38:$Vb2,39:$Vc2,41:$Vd2,42:$Ve2,55:$Vf2,56:$Vg2,57:$Vh2,60:$Vi2},{12:488,16:323,17:324,18:325,19:326,21:$Vb,23:327,25:328,26:329,27:330,28:331,29:332,30:333,31:334,33:335,34:336,35:337,36:$Va2,38:$Vb2,39:$Vc2,41:$Vd2,42:$Ve2,55:$Vf2,56:$Vg2,57:$Vh2,60:$Vi2},{12:489,16:349,17:350,18:351,19:92,21:$Vb,23:91,25:352,26:353,27:354,28:355,29:356,30:357,31:358,33:359,34:360,35:361,36:$Vj2,38:$Vk2,39:$Vl2,41:$Vm2,42:$Vn2,55:$Vo2,56:$Vp2,57:$Vq2,60:$Vr2},o([8,13,20,24,44,47],$VF2,{54:$Vb1}),o($VJ,$V1,{4:490}),o($VI,$Vl,{10:83,14:491,48:$VX}),o($VI,$Vl,{10:83,14:492,48:$VX}),o($VI,$Vl,{10:83,14:493,48:$VX}),o($VI,$Vl,{10:83,14:494,48:$VX}),o($VI,$Vl,{10:83,14:495,48:$VX}),o($VA2,$V1,{4:496}),o($VA2,$VU),o($V9,$V1,{4:497}),o($VC2,$V1,{4:498}),o($VC2,$VU),o($V9,$V1,{4:499}),o($VA2,$V1,{4:500}),o($VA2,$V1,{4:501}),o($VA2,$V1,{4:502}),o($VS2,$V91,{37:503,43:505,44:$VT2,54:$VU2}),o($VM,$V1,{4:507}),o($VM,$V1,{4:508}),o($VM,$V1,{4:509}),o($V42,$VT),o($Vz1,$V1,{4:510}),o($Vz1,$VU),o($V9,$V1,{4:511}),o($VB1,$V7),{50:[1,512]},o($VB1,$VV),o($VI,$V1,{4:62,15:513}),o($VI,$Vl,{10:83,14:514,48:$VX}),o($VI,$Vl,{10:83,14:515,48:$VX}),o($VI,$Vl,{10:83,14:516,48:$VX}),o($VI,$Vl,{10:83,14:517,48:$VX}),o($VI2,$V1,{4:518}),o($VI2,$VU),o($V9,$V1,{4:519}),o($VK2,$V1,{4:520}),o($VK2,$VU),o($V9,$V1,{4:521}),o($VI2,$V1,{4:522}),o($VI2,$V1,{4:523}),o($VI2,$V1,{4:524}),o($VV2,$V91,{37:525,43:527,44:$VW2,54:$VX2}),o($VM,$V1,{4:529}),o($VM,$V1,{4:530}),o($VM,$V1,{4:531}),o($VI,$V1,{4:62,15:532}),o($VB1,$V1,{15:533,4:534}),o($VN2,$V1,{4:535}),o($VN2,$VU),o($V9,$V1,{4:536}),o($VP2,$V1,{4:537}),o($VP2,$VU),o($V9,$V1,{4:538}),o($VN2,$V1,{4:539}),o($VN2,$V1,{4:540}),o($VN2,$V1,{4:541}),o($VY2,$V91,{37:542,43:544,44:$VZ2,54:$V_2}),o($VM,$V1,{4:546}),o($VM,$V1,{4:547}),o($VM,$V1,{4:548}),o($V$2,$V1,{15:549,4:550}),o($VB1,$V1,{4:534,15:551}),o($VI,$Vl,{10:83,14:552,48:$VX}),o($VI,$Vl,{10:83,14:553,48:$VX}),o([20,47],$Vc1,{54:$VO1}),{33:49,34:50,49:554,50:[1,555],51:48,53:51,54:$Vn,56:$Vo,59:$Vp,60:$Vq},{16:556,17:373,18:93,19:92,21:$Vb,23:374,25:94,26:95,27:96,28:97,29:98,30:99,31:100,33:101,34:102,35:103,36:$VY,38:$VZ,39:$V_,41:$V$,42:$V01,55:$V11,56:$V21,57:$V31,60:$V41},o([24,47],$Vc1,{54:$VR1}),{33:49,34:50,49:557,50:[1,558],51:48,53:51,54:$Vn,56:$Vo,59:$Vp,60:$Vq},{16:90,17:559,18:93,19:92,21:$Vb,23:91,25:94,26:95,27:96,28:97,29:98,30:99,31:100,33:101,34:102,35:103,36:$VY,38:$VZ,39:$V_,41:$V$,42:$V01,55:$V11,56:$V21,57:$V31,60:$V41},o($Vh1,$V1,{4:560}),{22:[1,561]},o($Vw1,$Vc1,{54:$V03}),{33:49,34:50,49:563,50:[1,564],51:48,53:51,54:$Vn,56:$Vo,59:$Vp,60:$Vq},o($Vw1,$VF2,{54:$V03}),{40:[1,565]},{40:[1,566]},{22:[1,567]},o($V81,$Vm1,{43:166,32:568,44:$Vn1,54:$Vb1}),o($VI,$V1,{4:62,15:569}),o($VI,$V1,{4:62,15:570}),o($VI,$V1,{4:62,15:571}),o($VI,$V1,{4:62,15:572}),o($VI,$V1,{4:62,15:573}),o($VS2,$Vm1,{32:574,43:575,44:$V13,54:$VU2}),{33:49,34:50,49:577,50:[1,578],51:48,53:51,54:$Vn,56:$Vo,59:$Vp,60:$Vq},o($VS2,$Vm1,{43:575,32:579,21:[1,580],44:$V13,54:[1,581]}),{33:49,34:50,49:582,50:[1,583],51:48,53:51,54:$Vn,56:$Vo,59:$Vp,60:$Vq},o($VS2,$Vm1,{43:575,32:584,44:$V13,54:$VU2}),o($VS2,$Vm1,{43:575,32:585,44:$V13,54:$VU2}),o($VS2,$V91,{43:505,37:586,44:$VT2,54:$VU2}),o($Vz2,$V5,{6:587,46:588,47:$V23}),o($VA2,$V7),o($VS2,$Vp1),{45:590,57:[1,592],58:[1,591]},{21:[1,593],54:$Vq1},{21:[1,594],54:$Vq1},{21:[1,595],54:$Vq1},o([21,22,36,38,39,41,42,47,55,56,57,60],$Vc1,{54:$V62}),{33:49,34:50,49:596,50:[1,597],51:48,53:51,54:$Vn,56:$Vo,59:$Vp,60:$Vq},o($VB1,$Vd1),{12:598,16:349,17:350,18:351,19:92,21:$Vb,23:91,25:352,26:353,27:354,28:355,29:356,30:357,31:358,33:359,34:360,35:361,36:$Vj2,38:$Vk2,39:$Vl2,41:$Vm2,42:$Vn2,55:$Vo2,56:$Vp2,57:$Vq2,60:$Vr2},o($VI,$V1,{4:62,15:599}),o($VI,$V1,{4:62,15:600}),o($VI,$V1,{4:62,15:601}),o($VI,$V1,{4:62,15:602}),o($VV2,$Vm1,{32:603,43:604,44:$V33,54:$VX2}),{33:49,34:50,49:606,50:[1,607],51:48,53:51,54:$Vn,56:$Vo,59:$Vp,60:$Vq},o($VV2,$Vm1,{43:604,32:608,21:[1,609],44:$V33,54:[1,610]}),{33:49,34:50,49:611,50:[1,612],51:48,53:51,54:$Vn,56:$Vo,59:$Vp,60:$Vq},o($VV2,$Vm1,{43:604,32:613,44:$V33,54:$VX2}),o($VV2,$Vm1,{43:604,32:614,44:$V33,54:$VX2}),o($VV2,$V91,{43:527,37:615,44:$VW2,54:$VX2}),o($VH2,$V5,{6:616,46:617,47:$V43}),o($VI2,$V7),o($VV2,$Vp1),{45:619,57:[1,621],58:[1,620]},{21:[1,622],54:$Vq1},{21:[1,623],54:$Vq1},{21:[1,624],54:$Vq1},{12:625,16:349,17:350,18:351,19:92,21:$Vb,23:91,25:352,26:353,27:354,28:355,29:356,30:357,31:358,33:359,34:360,35:361,36:$Vj2,38:$Vk2,39:$Vl2,41:$Vm2,42:$Vn2,55:$Vo2,56:$Vp2,57:$Vq2,60:$Vr2},o($VB,$V53),o($VB,$V5,{46:179,6:626,47:$Vo1,54:$VE2}),o($VY2,$Vm1,{32:627,43:628,44:$V63,54:$V_2}),{33:49,34:50,49:630,50:[1,631],51:48,53:51,54:$Vn,56:$Vo,59:$Vp,60:$Vq},o($VY2,$Vm1,{43:628,32:632,21:[1,633],44:$V63,54:[1,634]}),{33:49,34:50,49:635,50:[1,636],51:48,53:51,54:$Vn,56:$Vo,59:$Vp,60:$Vq},o($VY2,$Vm1,{43:628,32:637,44:$V63,54:$V_2}),o($VY2,$Vm1,{43:628,32:638,44:$V63,54:$V_2}),o($VY2,$V91,{43:544,37:639,44:$VZ2,54:$V_2}),o($VM2,$V5,{6:640,46:641,47:$V73}),o($VN2,$V7),o($VY2,$Vp1),{45:643,57:[1,645],58:[1,644]},{21:[1,646],54:$Vq1},{21:[1,647],54:$Vq1},{21:[1,648],54:$Vq1},o($VH1,$VM1),o($VH1,$V5,{6:649,46:651,47:$V83,54:$V93}),o($VB,$VP1),o($VI,$V1,{4:62,15:653}),o($VI,$V1,{4:62,15:654}),{50:[1,655]},o($Vu1,$VV),{20:$Vf1,22:[1,656]},{50:[1,657]},o($Vv1,$VV),{20:$Vw,22:[1,658],24:$Ve1},o([20,24,44,47],$VF2,{54:$Vy1}),o($Vh1,$V1,{4:659}),o($Vu2,$V7),{50:[1,660]},o($Vu2,$VV),o($VI,$V1,{4:62,15:661}),o($VI,$V1,{4:62,15:662}),o($Vu2,$V1,{15:663,4:664}),o($VB,$V5,{46:179,6:665,47:$Vo1}),{11:666,12:290,16:291,17:292,18:293,19:294,21:$Vb,23:295,25:296,26:297,27:298,28:299,29:300,30:301,31:302,33:303,34:304,35:305,36:$VX1,38:$VY1,39:$VZ1,41:$V_1,42:$V$1,55:$V02,56:$V12,57:$V22,60:$V32},{17:668,18:670,19:667,21:$Va3,23:295,25:296,26:297,27:298,28:299,29:300,30:301,31:302,33:303,34:304,35:305,36:$VX1,38:$VY1,39:$VZ1,41:$V_1,42:$V$1,55:$V02,56:$V12,57:$V22,60:$V32},{18:673,21:$Vb3,23:671,25:296,26:297,27:298,28:299,29:300,30:301,31:302,33:303,34:304,35:305,36:$VX1,38:$VY1,39:$VZ1,41:$V_1,42:$V$1,55:$V02,56:$V12,57:$V22,60:$V32},{17:668,18:670,19:674,21:$Va3,23:295,25:296,26:297,27:298,28:299,29:300,30:301,31:302,33:303,34:304,35:305,36:$VX1,38:$VY1,39:$VZ1,41:$V_1,42:$V$1,55:$V02,56:$V12,57:$V22,60:$V32},{18:673,21:$Vb3,23:675,25:296,26:297,27:298,28:299,29:300,30:301,31:302,33:303,34:304,35:305,36:$VX1,38:$VY1,39:$VZ1,41:$V_1,42:$V$1,55:$V02,56:$V12,57:$V22,60:$V32},o($Vz2,$V5,{46:588,6:676,47:$V23}),o($VS2,$Vm1,{43:575,32:677,44:$V13}),{45:678,57:[1,680],58:[1,679]},{50:[1,681]},o($VA2,$VV),o($Vz2,$V5,{46:588,6:682,47:$V23}),o($Vz1,$V1,{4:234,15:683}),o($VC2,$V7),{50:[1,684]},o($VC2,$VV),o($Vz2,$V5,{46:588,6:685,47:$V23}),o($Vz2,$V5,{46:588,6:686,47:$V23}),o($Vz2,$V5,{46:588,6:687,47:$V23}),o($Vz2,$VA1),o($Vz2,$V5,{46:588,6:688,47:$V23}),o($Vc3,$Vl,{14:689,10:690,48:$Vd3}),o($Vc3,$Vl,{10:690,14:692,48:$Vd3}),o($Ve3,$VE1),o($Ve3,$VF1),o($VI,$V1,{4:62,15:693}),o($VI,$V1,{4:62,15:694}),o($VI,$V1,{4:62,15:695}),{50:[1,696]},o($Vz1,$VV),{22:[1,697]},{17:699,18:701,19:698,21:$Vf3,23:327,25:328,26:329,27:330,28:331,29:332,30:333,31:334,33:335,34:336,35:337,36:$Va2,38:$Vb2,39:$Vc2,41:$Vd2,42:$Ve2,55:$Vf2,56:$Vg2,57:$Vh2,60:$Vi2},{18:704,21:$Vg3,23:702,25:328,26:329,27:330,28:331,29:332,30:333,31:334,33:335,34:336,35:337,36:$Va2,38:$Vb2,39:$Vc2,41:$Vd2,42:$Ve2,55:$Vf2,56:$Vg2,57:$Vh2,60:$Vi2},{17:699,18:701,19:705,21:$Vf3,23:327,25:328,26:329,27:330,28:331,29:332,30:333,31:334,33:335,34:336,35:337,36:$Va2,38:$Vb2,39:$Vc2,41:$Vd2,42:$Ve2,55:$Vf2,56:$Vg2,57:$Vh2,60:$Vi2},{18:704,21:$Vg3,23:706,25:328,26:329,27:330,28:331,29:332,30:333,31:334,33:335,34:336,35:337,36:$Va2,38:$Vb2,39:$Vc2,41:$Vd2,42:$Ve2,55:$Vf2,56:$Vg2,57:$Vh2,60:$Vi2},o($VH2,$V5,{46:617,6:707,47:$V43}),o($VV2,$Vm1,{43:604,32:708,44:$V33}),{45:709,57:[1,711],58:[1,710]},{50:[1,712]},o($VI2,$VV),o($VH2,$V5,{46:617,6:713,47:$V43}),o($Vz1,$V1,{4:234,15:714}),o($VK2,$V7),{50:[1,715]},o($VK2,$VV),o($VH2,$V5,{46:617,6:716,47:$V43}),o($VH2,$V5,{46:617,6:717,47:$V43}),o($VH2,$V5,{46:617,6:718,47:$V43}),o($VH2,$VA1),o($VH2,$V5,{46:617,6:719,47:$V43}),o($Vh3,$Vl,{14:720,10:721,48:$Vi3}),o($Vh3,$Vl,{10:721,14:723,48:$Vi3}),o($Vj3,$VE1),o($Vj3,$VF1),o($VI,$V1,{4:62,15:724}),o($VI,$V1,{4:62,15:725}),o($VI,$V1,{4:62,15:726}),{22:[1,727]},o($VB,$Vl1),o($VM2,$V5,{46:641,6:728,47:$V73}),o($VY2,$Vm1,{43:628,32:729,44:$V63}),{45:730,57:[1,732],58:[1,731]},{50:[1,733]},o($VN2,$VV),o($VM2,$V5,{46:641,6:734,47:$V73}),o($Vz1,$V1,{4:234,15:735}),o($VP2,$V7),{50:[1,736]},o($VP2,$VV),o($VM2,$V5,{46:641,6:737,47:$V73}),o($VM2,$V5,{46:641,6:738,47:$V73}),o($VM2,$V5,{46:641,6:739,47:$V73}),o($VM2,$VA1),o($VM2,$V5,{46:641,6:740,47:$V73}),o($Vk3,$Vl,{14:741,10:742,48:$Vl3}),o($Vk3,$Vl,{10:742,14:744,48:$Vl3}),o($Vm3,$VE1),o($Vm3,$VF1),o($VI,$V1,{4:62,15:745}),o($VI,$V1,{4:62,15:746}),o($VI,$V1,{4:62,15:747}),o($VH1,$Vl1),o($V$2,$V7),o($VH1,$V5,{46:651,6:748,47:$V83}),o($V$2,$Vl,{14:749,10:750,48:[1,751]}),{18:754,21:$Vn3,23:752,25:94,26:95,27:96,28:97,29:98,30:99,31:100,33:101,34:102,35:103,36:$VY,38:$VZ,39:$V_,41:$V$,42:$V01,55:$V11,56:$V21,57:$V31,60:$V41},{18:754,21:$Vn3,23:755,25:94,26:95,27:96,28:97,29:98,30:99,31:100,33:101,34:102,35:103,36:$VY,38:$VZ,39:$V_,41:$V$,42:$V01,55:$V11,56:$V21,57:$V31,60:$V41},o($Vu1,$Vd1),o($Vk3,$V1,{15:756,4:757}),o($Vv1,$Vd1),o($Vo3,$V1,{15:758,4:759}),o($Vw1,$Vm1,{43:266,32:760,44:$VS1,54:$Vy1}),o($Vu2,$Vd1),{12:761,16:349,17:350,18:351,19:92,21:$Vb,23:91,25:352,26:353,27:354,28:355,29:356,30:357,31:358,33:359,34:360,35:361,36:$Vj2,38:$Vk2,39:$Vl2,41:$Vm2,42:$Vn2,55:$Vo2,56:$Vp2,57:$Vq2,60:$Vr2},{12:762,16:349,17:350,18:351,19:92,21:$Vb,23:91,25:352,26:353,27:354,28:355,29:356,30:357,31:358,33:359,34:360,35:361,36:$Vj2,38:$Vk2,39:$Vl2,41:$Vm2,42:$Vn2,55:$Vo2,56:$Vp2,57:$Vq2,60:$Vr2},o($Vg1,$V53),o($Vg1,$V5,{46:279,6:763,47:$VT1,54:$V03}),o($VB,$Vp3),{22:$VG1},o($Vq3,$VI1),o($Vq3,$Vw,{24:$Vy2}),o($VI,$V1,{4:62,15:764}),o($Vq3,$Vz,{24:$VA}),o($Vz2,$VJ1),o($VI,$V1,{4:62,15:765}),o($Vz2,$VA),o($Vq3,$VK1),o($Vz2,$VL1),o($Vz2,$VU1),o($VS2,$VV1),o($VA2,$Vl,{10:420,14:766,48:$VB2}),o($VD2,$VE1),o($VD2,$VF1),o($VA2,$Vd1),o($Vz2,$VW1),{7:767,11:289,12:290,16:291,17:292,18:293,19:294,21:$Vb,22:$Va,23:295,25:296,26:297,27:298,28:299,29:300,30:301,31:302,33:303,34:304,35:305,36:$VX1,38:$VY1,39:$VZ1,41:$V_1,42:$V$1,55:$V02,56:$V12,57:$V22,60:$V32},o($VC2,$Vd1),o($Vz2,$V72),o($Vz2,$V82),o($Vz2,$V92),o($Vz2,$VT),o($Vc3,$V1,{4:768}),o($Vc3,$VU),o($V9,$V1,{4:769}),o($Vc3,$V1,{4:770}),{12:771,16:323,17:324,18:325,19:326,21:$Vb,23:327,25:328,26:329,27:330,28:331,29:332,30:333,31:334,33:335,34:336,35:337,36:$Va2,38:$Vb2,39:$Vc2,41:$Vd2,42:$Ve2,55:$Vf2,56:$Vg2,57:$Vh2,60:$Vi2},{12:772,16:323,17:324,18:325,19:326,21:$Vb,23:327,25:328,26:329,27:330,28:331,29:332,30:333,31:334,33:335,34:336,35:337,36:$Va2,38:$Vb2,39:$Vc2,41:$Vd2,42:$Ve2,55:$Vf2,56:$Vg2,57:$Vh2,60:$Vi2},{12:773,16:349,17:350,18:351,19:92,21:$Vb,23:91,25:352,26:353,27:354,28:355,29:356,30:357,31:358,33:359,34:360,35:361,36:$Vj2,38:$Vk2,39:$Vl2,41:$Vm2,42:$Vn2,55:$Vo2,56:$Vp2,57:$Vq2,60:$Vr2},o($Vz1,$Vd1),o($VB1,$V1,{4:534,15:774}),o($Vr3,$VI1),o($Vr3,$Vw,{24:$VG2}),o($VI,$V1,{4:62,15:775}),o($Vr3,$Vz,{24:$VA}),o($VH2,$VJ1),o($VI,$V1,{4:62,15:776}),o($VH2,$VA),o($Vr3,$VK1),o($VH2,$VL1),o($VH2,$VU1),o($VV2,$VV1),o($VI2,$Vl,{10:445,14:777,48:$VJ2}),o($VL2,$VE1),o($VL2,$VF1),o($VI2,$Vd1),o($VH2,$VW1),{7:778,11:289,12:290,16:291,17:292,18:293,19:294,21:$Vb,22:$Va,23:295,25:296,26:297,27:298,28:299,29:300,30:301,31:302,33:303,34:304,35:305,36:$VX1,38:$VY1,39:$VZ1,41:$V_1,42:$V$1,55:$V02,56:$V12,57:$V22,60:$V32},o($VK2,$Vd1),o($VH2,$V72),o($VH2,$V82),o($VH2,$V92),o($VH2,$VT),o($Vh3,$V1,{4:779}),o($Vh3,$VU),o($V9,$V1,{4:780}),o($Vh3,$V1,{4:781}),{12:782,16:323,17:324,18:325,19:326,21:$Vb,23:327,25:328,26:329,27:330,28:331,29:332,30:333,31:334,33:335,34:336,35:337,36:$Va2,38:$Vb2,39:$Vc2,41:$Vd2,42:$Ve2,55:$Vf2,56:$Vg2,57:$Vh2,60:$Vi2},{12:783,16:323,17:324,18:325,19:326,21:$Vb,23:327,25:328,26:329,27:330,28:331,29:332,30:333,31:334,33:335,34:336,35:337,36:$Va2,38:$Vb2,39:$Vc2,41:$Vd2,42:$Ve2,55:$Vf2,56:$Vg2,57:$Vh2,60:$Vi2},{12:784,16:349,17:350,18:351,19:92,21:$Vb,23:91,25:352,26:353,27:354,28:355,29:356,30:357,31:358,33:359,34:360,35:361,36:$Vj2,38:$Vk2,39:$Vl2,41:$Vm2,42:$Vn2,55:$Vo2,56:$Vp2,57:$Vq2,60:$Vr2},o($VB1,$V1,{4:534,15:785}),o($VM2,$VU1),o($VY2,$VV1),o($VN2,$Vl,{10:460,14:786,48:$VO2}),o($VQ2,$VE1),o($VQ2,$VF1),o($VN2,$Vd1),o($VM2,$VW1),{7:787,11:289,12:290,16:291,17:292,18:293,19:294,21:$Vb,22:$Va,23:295,25:296,26:297,27:298,28:299,29:300,30:301,31:302,33:303,34:304,35:305,36:$VX1,38:$VY1,39:$VZ1,41:$V_1,42:$V$1,55:$V02,56:$V12,57:$V22,60:$V32},o($VP2,$Vd1),o($VM2,$V72),o($VM2,$V82),o($VM2,$V92),o($VM2,$VT),o($Vk3,$V1,{4:788}),o($Vk3,$VU),o($V9,$V1,{4:789}),o($Vk3,$V1,{4:790}),{12:791,16:323,17:324,18:325,19:326,21:$Vb,23:327,25:328,26:329,27:330,28:331,29:332,30:333,31:334,33:335,34:336,35:337,36:$Va2,38:$Vb2,39:$Vc2,41:$Vd2,42:$Ve2,55:$Vf2,56:$Vg2,57:$Vh2,60:$Vi2},{12:792,16:323,17:324,18:325,19:326,21:$Vb,23:327,25:328,26:329,27:330,28:331,29:332,30:333,31:334,33:335,34:336,35:337,36:$Va2,38:$Vb2,39:$Vc2,41:$Vd2,42:$Ve2,55:$Vf2,56:$Vg2,57:$Vh2,60:$Vi2},{12:793,16:349,17:350,18:351,19:92,21:$Vb,23:91,25:352,26:353,27:354,28:355,29:356,30:357,31:358,33:359,34:360,35:361,36:$Vj2,38:$Vk2,39:$Vl2,41:$Vm2,42:$Vn2,55:$Vo2,56:$Vp2,57:$Vq2,60:$Vr2},o($VH1,$VT),o($V$2,$V1,{4:794}),o($V$2,$VU),o($V9,$V1,{4:795}),o($Vg1,$VJ1),o($VI,$V1,{4:62,15:796}),o($Vg1,$VA),o($Vg1,$VL1),o($VM2,$VP1),o($VM2,$V5,{46:641,6:797,47:$V73,54:$Vs3}),o($VR2,$VM1),o($VR2,$V5,{6:799,46:801,47:$Vt3,54:$Vu3}),o($Vg1,$V5,{46:279,6:803,47:$VT1}),{22:[1,804]},{22:[1,805]},o($Vg1,$Vl1),{16:90,17:806,18:93,19:92,21:$Vb,23:91,25:94,26:95,27:96,28:97,29:98,30:99,31:100,33:101,34:102,35:103,36:$VY,38:$VZ,39:$V_,41:$V$,42:$V01,55:$V11,56:$V21,57:$V31,60:$V41},{16:807,17:373,18:93,19:92,21:$Vb,23:374,25:94,26:95,27:96,28:97,29:98,30:99,31:100,33:101,34:102,35:103,36:$VY,38:$VZ,39:$V_,41:$V$,42:$V01,55:$V11,56:$V21,57:$V31,60:$V41},o($VA2,$V1,{4:808}),{22:[1,809]},o($VS2,$Vc1,{54:$Vv3}),{33:49,34:50,49:811,50:[1,812],51:48,53:51,54:$Vn,56:$Vo,59:$Vp,60:$Vq},o($VS2,$VF2,{54:$Vv3}),{40:[1,813]},{40:[1,814]},{22:[1,815]},o($VB,$Vw3),{16:90,17:816,18:93,19:92,21:$Vb,23:91,25:94,26:95,27:96,28:97,29:98,30:99,31:100,33:101,34:102,35:103,36:$VY,38:$VZ,39:$V_,41:$V$,42:$V01,55:$V11,56:$V21,57:$V31,60:$V41},{16:817,17:373,18:93,19:92,21:$Vb,23:374,25:94,26:95,27:96,28:97,29:98,30:99,31:100,33:101,34:102,35:103,36:$VY,38:$VZ,39:$V_,41:$V$,42:$V01,55:$V11,56:$V21,57:$V31,60:$V41},o($VI2,$V1,{4:818}),{22:[1,819]},o($VV2,$Vc1,{54:$Vx3}),{33:49,34:50,49:821,50:[1,822],51:48,53:51,54:$Vn,56:$Vo,59:$Vp,60:$Vq},o($VV2,$VF2,{54:$Vx3}),{40:[1,823]},{40:[1,824]},{22:[1,825]},o($VB,$Vy3),o($VN2,$V1,{4:826}),{22:[1,827]},o($VY2,$Vc1,{54:$Vs3}),{33:49,34:50,49:828,50:[1,829],51:48,53:51,54:$Vn,56:$Vo,59:$Vp,60:$Vq},o($VY2,$VF2,{54:$Vs3}),{40:[1,830]},{40:[1,831]},{22:[1,832]},o([8,13,20,47],$Vc1,{54:$V93}),{33:49,34:50,49:833,50:[1,834],51:48,53:51,54:$Vn,56:$Vo,59:$Vp,60:$Vq},{16:835,17:373,18:93,19:92,21:$Vb,23:374,25:94,26:95,27:96,28:97,29:98,30:99,31:100,33:101,34:102,35:103,36:$VY,38:$VZ,39:$V_,41:$V$,42:$V01,55:$V11,56:$V21,57:$V31,60:$V41},o($VM2,$Vl1),o($Vk3,$V7),o($VR2,$Vl1),o($Vo3,$V7),o($VR2,$V5,{46:801,6:836,47:$Vt3}),o($Vo3,$Vl,{14:837,10:838,48:[1,839]}),o($Vg1,$Vp3),o($Vu2,$V1,{4:664,15:840}),o($Vu2,$V1,{4:664,15:841}),{20:$Vw,22:[1,842],24:$Ve1},{20:$Vf1,22:[1,843]},o([13,20,22,24,44,47],$VF2,{54:$VU2}),o($VA2,$V1,{4:844}),o($Vc3,$V7),{50:[1,845]},o($Vc3,$VV),o($VI,$V1,{4:62,15:846}),o($VI,$V1,{4:62,15:847}),o($Vc3,$V1,{15:848,4:849}),{20:$Vw,22:[1,850],24:$Ve1},{20:$Vf1,22:[1,851]},o([20,24,40,44,47],$VF2,{54:$VX2}),o($VI2,$V1,{4:852}),o($Vh3,$V7),{50:[1,853]},o($Vh3,$VV),o($VI,$V1,{4:62,15:854}),o($VI,$V1,{4:62,15:855}),o($Vh3,$V1,{15:856,4:857}),o([20,22,24,44,47],$VF2,{54:$V_2}),o($VN2,$V1,{4:858}),{50:[1,859]},o($Vk3,$VV),o($VI,$V1,{4:62,15:860}),o($VI,$V1,{4:62,15:861}),o($Vk3,$V1,{4:757,15:862}),{50:[1,863]},o($V$2,$VV),{20:$Vf1,22:[1,864]},o($VR2,$VT),o($Vo3,$V1,{4:865}),o($Vo3,$VU),o($V9,$V1,{4:866}),o($Vg1,$Vw3),o($Vg1,$Vy3),o($Vz3,$V1,{15:867,4:868}),o($Vc3,$V1,{4:849,15:869}),o($VS2,$Vm1,{43:575,32:870,44:$V13,54:$VU2}),o($Vc3,$Vd1),{12:871,16:349,17:350,18:351,19:92,21:$Vb,23:91,25:352,26:353,27:354,28:355,29:356,30:357,31:358,33:359,34:360,35:361,36:$Vj2,38:$Vk2,39:$Vl2,41:$Vm2,42:$Vn2,55:$Vo2,56:$Vp2,57:$Vq2,60:$Vr2},{12:872,16:349,17:350,18:351,19:92,21:$Vb,23:91,25:352,26:353,27:354,28:355,29:356,30:357,31:358,33:359,34:360,35:361,36:$Vj2,38:$Vk2,39:$Vl2,41:$Vm2,42:$Vn2,55:$Vo2,56:$Vp2,57:$Vq2,60:$Vr2},o($Vz2,$V53),o($Vz2,$V5,{46:588,6:873,47:$V23,54:$Vv3}),o($VA3,$V1,{15:874,4:875}),o($Vh3,$V1,{4:857,15:876}),o($VV2,$Vm1,{43:604,32:877,44:$V33,54:$VX2}),o($Vh3,$Vd1),{12:878,16:349,17:350,18:351,19:92,21:$Vb,23:91,25:352,26:353,27:354,28:355,29:356,30:357,31:358,33:359,34:360,35:361,36:$Vj2,38:$Vk2,39:$Vl2,41:$Vm2,42:$Vn2,55:$Vo2,56:$Vp2,57:$Vq2,60:$Vr2},{12:879,16:349,17:350,18:351,19:92,21:$Vb,23:91,25:352,26:353,27:354,28:355,29:356,30:357,31:358,33:359,34:360,35:361,36:$Vj2,38:$Vk2,39:$Vl2,41:$Vm2,42:$Vn2,55:$Vo2,56:$Vp2,57:$Vq2,60:$Vr2},o($VH2,$V53),o($VH2,$V5,{46:617,6:880,47:$V43,54:$Vx3}),o($VY2,$Vm1,{43:628,32:881,44:$V63,54:$V_2}),o($Vk3,$Vd1),{12:882,16:349,17:350,18:351,19:92,21:$Vb,23:91,25:352,26:353,27:354,28:355,29:356,30:357,31:358,33:359,34:360,35:361,36:$Vj2,38:$Vk2,39:$Vl2,41:$Vm2,42:$Vn2,55:$Vo2,56:$Vp2,57:$Vq2,60:$Vr2},{12:883,16:349,17:350,18:351,19:92,21:$Vb,23:91,25:352,26:353,27:354,28:355,29:356,30:357,31:358,33:359,34:360,35:361,36:$Vj2,38:$Vk2,39:$Vl2,41:$Vm2,42:$Vn2,55:$Vo2,56:$Vp2,57:$Vq2,60:$Vr2},o($VM2,$V53),o($V$2,$Vd1),o($Vu2,$V1,{4:664,15:884}),o([20,22,47],$Vc1,{54:$Vu3}),{33:49,34:50,49:885,50:[1,886],51:48,53:51,54:$Vn,56:$Vo,59:$Vp,60:$Vq},o($Vq3,$VM1),o($Vq3,$V5,{6:887,46:889,47:$VB3,54:$VC3}),o($Vz2,$VP1),o($Vz2,$V5,{46:588,6:891,47:$V23}),{22:[1,892]},{22:[1,893]},o($Vz2,$Vl1),o($Vr3,$VM1),o($Vr3,$V5,{6:894,46:896,47:$VD3,54:$VE3}),o($VH2,$VP1),o($VH2,$V5,{46:617,6:898,47:$V43}),{22:[1,899]},{22:[1,900]},o($VH2,$Vl1),o($VM2,$V5,{46:641,6:901,47:$V73}),{22:[1,902]},{22:[1,903]},o($Vg1,$VP1),{50:[1,904]},o($Vo3,$VV),o($Vq3,$Vl1),o($Vz3,$V7),o($Vq3,$V5,{46:889,6:905,47:$VB3}),o($Vz3,$Vl,{14:906,10:907,48:[1,908]}),o($Vz2,$Vp3),o($Vc3,$V1,{4:849,15:909}),o($Vc3,$V1,{4:849,15:910}),o($Vr3,$Vl1),o($VA3,$V7),o($Vr3,$V5,{46:896,6:911,47:$VD3}),o($VA3,$Vl,{14:912,10:913,48:[1,914]}),o($VH2,$Vp3),o($Vh3,$V1,{4:857,15:915}),o($Vh3,$V1,{4:857,15:916}),o($VM2,$Vp3),o($Vk3,$V1,{4:757,15:917}),o($Vk3,$V1,{4:757,15:918}),o($Vo3,$Vd1),o($Vq3,$VT),o($Vz3,$V1,{4:919}),o($Vz3,$VU),o($V9,$V1,{4:920}),o($Vz2,$Vw3),o($Vz2,$Vy3),o($Vr3,$VT),o($VA3,$V1,{4:921}),o($VA3,$VU),o($V9,$V1,{4:922}),o($VH2,$Vw3),o($VH2,$Vy3),o($VM2,$Vw3),o($VM2,$Vy3),o([13,20,22,47],$Vc1,{54:$VC3}),{33:49,34:50,49:923,50:[1,924],51:48,53:51,54:$Vn,56:$Vo,59:$Vp,60:$Vq},o([20,40,47],$Vc1,{54:$VE3}),{33:49,34:50,49:925,50:[1,926],51:48,53:51,54:$Vn,56:$Vo,59:$Vp,60:$Vq},{50:[1,927]},o($Vz3,$VV),{50:[1,928]},o($VA3,$VV),o($Vz3,$Vd1),o($VA3,$Vd1)],
defaultActions: {14:[2,6],55:[2,1],191:[2,8],203:[2,15],206:[2,19],248:[2,51],253:[2,42],258:[2,42],289:[2,6],375:[2,44],382:[2,44],666:[2,8]},
parseError: function parseError(str, hash) {
    if (hash.recoverable) {
        this.trace(str);
    } else {
        var error = new Error(str);
        error.hash = hash;
        throw error;
    }
},
parse: function parse(input) {
    var self = this, stack = [0], tstack = [], vstack = [null], lstack = [], table = this.table, yytext = '', yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
    var args = lstack.slice.call(arguments, 1);
    var lexer = Object.create(this.lexer);
    var sharedState = { yy: {} };
    for (var k in this.yy) {
        if (Object.prototype.hasOwnProperty.call(this.yy, k)) {
            sharedState.yy[k] = this.yy[k];
        }
    }
    lexer.setInput(input, sharedState.yy);
    sharedState.yy.lexer = lexer;
    sharedState.yy.parser = this;
    if (typeof lexer.yylloc == 'undefined') {
        lexer.yylloc = {};
    }
    var yyloc = lexer.yylloc;
    lstack.push(yyloc);
    var ranges = lexer.options && lexer.options.ranges;
    if (typeof sharedState.yy.parseError === 'function') {
        this.parseError = sharedState.yy.parseError;
    } else {
        this.parseError = Object.getPrototypeOf(this).parseError;
    }
    function popStack(n) {
        stack.length = stack.length - 2 * n;
        vstack.length = vstack.length - n;
        lstack.length = lstack.length - n;
    }
    _token_stack:
        var lex = function () {
            var token;
            token = lexer.lex() || EOF;
            if (typeof token !== 'number') {
                token = self.symbols_[token] || token;
            }
            return token;
        };
    var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
    while (true) {
        state = stack[stack.length - 1];
        if (this.defaultActions[state]) {
            action = this.defaultActions[state];
        } else {
            if (symbol === null || typeof symbol == 'undefined') {
                symbol = lex();
            }
            action = table[state] && table[state][symbol];
        }
                    if (typeof action === 'undefined' || !action.length || !action[0]) {
                var errStr = '';
                expected = [];
                for (p in table[state]) {
                    if (this.terminals_[p] && p > TERROR) {
                        expected.push('\'' + this.terminals_[p] + '\'');
                    }
                }
                if (lexer.showPosition) {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ':\n' + lexer.showPosition() + '\nExpecting ' + expected.join(', ') + ', got \'' + (this.terminals_[symbol] || symbol) + '\'';
                } else {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ': Unexpected ' + (symbol == EOF ? 'end of input' : '\'' + (this.terminals_[symbol] || symbol) + '\'');
                }
                this.parseError(errStr, {
                    text: lexer.match,
                    token: this.terminals_[symbol] || symbol,
                    line: lexer.yylineno,
                    loc: yyloc,
                    expected: expected
                });
            }
        if (action[0] instanceof Array && action.length > 1) {
            throw new Error('Parse Error: multiple actions possible at state: ' + state + ', token: ' + symbol);
        }
        switch (action[0]) {
        case 1:
            stack.push(symbol);
            vstack.push(lexer.yytext);
            lstack.push(lexer.yylloc);
            stack.push(action[1]);
            symbol = null;
            if (!preErrorSymbol) {
                yyleng = lexer.yyleng;
                yytext = lexer.yytext;
                yylineno = lexer.yylineno;
                yyloc = lexer.yylloc;
                if (recovering > 0) {
                    recovering--;
                }
            } else {
                symbol = preErrorSymbol;
                preErrorSymbol = null;
            }
            break;
        case 2:
            len = this.productions_[action[1]][1];
            yyval.$ = vstack[vstack.length - len];
            yyval._$ = {
                first_line: lstack[lstack.length - (len || 1)].first_line,
                last_line: lstack[lstack.length - 1].last_line,
                first_column: lstack[lstack.length - (len || 1)].first_column,
                last_column: lstack[lstack.length - 1].last_column
            };
            if (ranges) {
                yyval._$.range = [
                    lstack[lstack.length - (len || 1)].range[0],
                    lstack[lstack.length - 1].range[1]
                ];
            }
            r = this.performAction.apply(yyval, [
                yytext,
                yyleng,
                yylineno,
                sharedState.yy,
                action[1],
                vstack,
                lstack
            ].concat(args));
            if (typeof r !== 'undefined') {
                return r;
            }
            if (len) {
                stack = stack.slice(0, -1 * len * 2);
                vstack = vstack.slice(0, -1 * len);
                lstack = lstack.slice(0, -1 * len);
            }
            stack.push(this.productions_[action[1]][0]);
            vstack.push(yyval.$);
            lstack.push(yyval._$);
            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
            stack.push(newState);
            break;
        case 3:
            return true;
        }
    }
    return true;
}};
/* generated by jison-lex 0.3.4 */
var lexer = (function(){
var lexer = ({

EOF:1,

parseError:function parseError(str, hash) {
        if (this.yy.parser) {
            this.yy.parser.parseError(str, hash);
        } else {
            throw new Error(str);
        }
    },

// resets the lexer, sets new input
setInput:function (input, yy) {
        this.yy = yy || this.yy || {};
        this._input = input;
        this._more = this._backtrack = this.done = false;
        this.yylineno = this.yyleng = 0;
        this.yytext = this.matched = this.match = '';
        this.conditionStack = ['INITIAL'];
        this.yylloc = {
            first_line: 1,
            first_column: 0,
            last_line: 1,
            last_column: 0
        };
        if (this.options.ranges) {
            this.yylloc.range = [0,0];
        }
        this.offset = 0;
        return this;
    },

// consumes and returns one char from the input
input:function () {
        var ch = this._input[0];
        this.yytext += ch;
        this.yyleng++;
        this.offset++;
        this.match += ch;
        this.matched += ch;
        var lines = ch.match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno++;
            this.yylloc.last_line++;
        } else {
            this.yylloc.last_column++;
        }
        if (this.options.ranges) {
            this.yylloc.range[1]++;
        }

        this._input = this._input.slice(1);
        return ch;
    },

// unshifts one char (or a string) into the input
unput:function (ch) {
        var len = ch.length;
        var lines = ch.split(/(?:\r\n?|\n)/g);

        this._input = ch + this._input;
        this.yytext = this.yytext.substr(0, this.yytext.length - len);
        //this.yyleng -= len;
        this.offset -= len;
        var oldLines = this.match.split(/(?:\r\n?|\n)/g);
        this.match = this.match.substr(0, this.match.length - 1);
        this.matched = this.matched.substr(0, this.matched.length - 1);

        if (lines.length - 1) {
            this.yylineno -= lines.length - 1;
        }
        var r = this.yylloc.range;

        this.yylloc = {
            first_line: this.yylloc.first_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.first_column,
            last_column: lines ?
                (lines.length === oldLines.length ? this.yylloc.first_column : 0)
                 + oldLines[oldLines.length - lines.length].length - lines[0].length :
              this.yylloc.first_column - len
        };

        if (this.options.ranges) {
            this.yylloc.range = [r[0], r[0] + this.yyleng - len];
        }
        this.yyleng = this.yytext.length;
        return this;
    },

// When called from action, caches matched text and appends it on next action
more:function () {
        this._more = true;
        return this;
    },

// When called from action, signals the lexer that this rule fails to match the input, so the next matching rule (regex) should be tested instead.
reject:function () {
        if (this.options.backtrack_lexer) {
            this._backtrack = true;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });

        }
        return this;
    },

// retain first n characters of the match
less:function (n) {
        this.unput(this.match.slice(n));
    },

// displays already matched input, i.e. for error messages
pastInput:function () {
        var past = this.matched.substr(0, this.matched.length - this.match.length);
        return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
    },

// displays upcoming input, i.e. for error messages
upcomingInput:function () {
        var next = this.match;
        if (next.length < 20) {
            next += this._input.substr(0, 20-next.length);
        }
        return (next.substr(0,20) + (next.length > 20 ? '...' : '')).replace(/\n/g, "");
    },

// displays the character position where the lexing error occurred, i.e. for error messages
showPosition:function () {
        var pre = this.pastInput();
        var c = new Array(pre.length + 1).join("-");
        return pre + this.upcomingInput() + "\n" + c + "^";
    },

// test the lexed token: return FALSE when not a match, otherwise return token
test_match:function (match, indexed_rule) {
        var token,
            lines,
            backup;

        if (this.options.backtrack_lexer) {
            // save context
            backup = {
                yylineno: this.yylineno,
                yylloc: {
                    first_line: this.yylloc.first_line,
                    last_line: this.last_line,
                    first_column: this.yylloc.first_column,
                    last_column: this.yylloc.last_column
                },
                yytext: this.yytext,
                match: this.match,
                matches: this.matches,
                matched: this.matched,
                yyleng: this.yyleng,
                offset: this.offset,
                _more: this._more,
                _input: this._input,
                yy: this.yy,
                conditionStack: this.conditionStack.slice(0),
                done: this.done
            };
            if (this.options.ranges) {
                backup.yylloc.range = this.yylloc.range.slice(0);
            }
        }

        lines = match[0].match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno += lines.length;
        }
        this.yylloc = {
            first_line: this.yylloc.last_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.last_column,
            last_column: lines ?
                         lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length :
                         this.yylloc.last_column + match[0].length
        };
        this.yytext += match[0];
        this.match += match[0];
        this.matches = match;
        this.yyleng = this.yytext.length;
        if (this.options.ranges) {
            this.yylloc.range = [this.offset, this.offset += this.yyleng];
        }
        this._more = false;
        this._backtrack = false;
        this._input = this._input.slice(match[0].length);
        this.matched += match[0];
        token = this.performAction.call(this, this.yy, this, indexed_rule, this.conditionStack[this.conditionStack.length - 1]);
        if (this.done && this._input) {
            this.done = false;
        }
        if (token) {
            return token;
        } else if (this._backtrack) {
            // recover context
            for (var k in backup) {
                this[k] = backup[k];
            }
            return false; // rule action called reject() implying the next rule should be tested instead.
        }
        return false;
    },

// return next match in input
next:function () {
        if (this.done) {
            return this.EOF;
        }
        if (!this._input) {
            this.done = true;
        }

        var token,
            match,
            tempMatch,
            index;
        if (!this._more) {
            this.yytext = '';
            this.match = '';
        }
        var rules = this._currentRules();
        for (var i = 0; i < rules.length; i++) {
            tempMatch = this._input.match(this.rules[rules[i]]);
            if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                match = tempMatch;
                index = i;
                if (this.options.backtrack_lexer) {
                    token = this.test_match(tempMatch, rules[i]);
                    if (token !== false) {
                        return token;
                    } else if (this._backtrack) {
                        match = false;
                        continue; // rule action called reject() implying a rule MISmatch.
                    } else {
                        // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
                        return false;
                    }
                } else if (!this.options.flex) {
                    break;
                }
            }
        }
        if (match) {
            token = this.test_match(match, rules[index]);
            if (token !== false) {
                return token;
            }
            // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
            return false;
        }
        if (this._input === "") {
            return this.EOF;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. Unrecognized text.\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });
        }
    },

// return next match that has a token
lex:function lex() {
        var r = this.next();
        if (r) {
            return r;
        } else {
            return this.lex();
        }
    },

// activates a new lexer condition state (pushes the new lexer condition state onto the condition stack)
begin:function begin(condition) {
        this.conditionStack.push(condition);
    },

// pop the previously active lexer condition state off the condition stack
popState:function popState() {
        var n = this.conditionStack.length - 1;
        if (n > 0) {
            return this.conditionStack.pop();
        } else {
            return this.conditionStack[0];
        }
    },

// produce the lexer rule set which is active for the currently active lexer condition state
_currentRules:function _currentRules() {
        if (this.conditionStack.length && this.conditionStack[this.conditionStack.length - 1]) {
            return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
        } else {
            return this.conditions["INITIAL"].rules;
        }
    },

// return the currently active lexer condition state; when an index argument is provided it produces the N-th previous condition state, if available
topState:function topState(n) {
        n = this.conditionStack.length - 1 - Math.abs(n || 0);
        if (n >= 0) {
            return this.conditionStack[n];
        } else {
            return "INITIAL";
        }
    },

// alias for begin(condition)
pushState:function pushState(condition) {
        this.begin(condition);
    },

// return the number of states currently on the stack
stateStackSize:function stateStackSize() {
        return this.conditionStack.length;
    },
options: {},
performAction: function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {
var YYSTATE=YY_START;
switch($avoiding_name_collisions) {
case 0:return 36
break;
case 1:return 39
break;
case 2:return 41
break;
case 3:return 42
break;
case 4:return 55
break;
case 5:return 56
break;
case 6:return 57
break;
case 7:return 58
break;
case 8:return 59
break;
case 9:return 60
break;
case 10:return 13
break;
case 11:return 20
break;
case 12:return 21
break;
case 13:return 22
break;
case 14:return 24
break;
case 15:return 38
break;
case 16:return 40
break;
case 17:return 44
break;
case 18:return 47
break;
case 19:return 48
break;
case 20:return 50
break;
case 21:return 52
break;
case 22:return 54
break;
case 23:return 8;
break;
}
},
rules: [/^(?:empty\b)/,/^(?:stack\b)/,/^(?:insert\b)/,/^(?:modify\b)/,/^(?:([A-I]|[K-Z]|(Aa)|(NL)|(NU))([1-9]([0-9][0-9]?)?)[a-z]?)/,/^(?:[a-zA-Z]+)/,/^(?:"([^\t\n\r\f\b\"\\]|(\\")|(\\\\))")/,/^(?:"([^\t\n\r\f\b\"\\]|(\\")|(\\\\)){2,}")/,/^(?:[0-9]?\.[0-9][0-9]?)/,/^(?:(0|([1-9]([0-9][0-9]?)?)))/,/^(?:-)/,/^(?::)/,/^(?:\()/,/^(?:\))/,/^(?:\*)/,/^(?:\.)/,/^(?:,)/,/^(?:\^)/,/^(?:!)/,/^(?:\[)/,/^(?:\])/,/^(?:=)/,/^(?:[ \t\n\r\f])/,/^(?:$)/],
conditions: {"INITIAL":{"rules":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23],"inclusive":true}}
});
return lexer;
})();
parser.lexer = lexer;
function Parser () {
  this.yy = {};
}
Parser.prototype = parser;parser.Parser = Parser;
return new Parser;
})();


if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
exports.parser = res_syntax;
exports.Parser = res_syntax.Parser;
exports.parse = function () { return res_syntax.parse.apply(res_syntax, arguments); };
exports.main = function commonjsMain(args) {
    if (!args[1]) {
        console.log('Usage: '+args[0]+' FILE');
        process.exit(1);
    }
    var source = require('fs').readFileSync(require('path').normalize(args[1]), "utf8");
    return exports.parser.parse(source);
};
if (typeof module !== 'undefined' && require.main === module) {
  exports.main(process.argv.slice(1));
}
}
/* res_format.js */

// Formatting.

ResFragment.prototype.format =
function(context) {
	this.resContext = context;
	this.scaleDown(context);
};
ResFragment.prototype.widthEm =
function() {
	if (this.globals.isH()) 
		return this.hiero === null ? 0 : this.hiero.widthEm();
	else
		return this.globals.size;
};
ResFragment.prototype.heightEm =
function() {
	if (this.globals.isV())
		return this.hiero === null ? 0 : this.hiero.heightEm();
	else
		return this.globals.size;
};
ResFragment.prototype.widthPx =
function() {
	return this.resContext.emSizePx * this.widthEm();
};
ResFragment.prototype.heightPx =
function() {
	return this.resContext.emSizePx * this.heightEm();
};
ResFragment.prototype.scaleDown =
function(context) {
	if (this.hiero !== null) {
		this.hiero.resetScaling(context);
		this.hiero.scaleDown(1);
	}
};

ResHieroglyphic.prototype.resetScaling =
function(context) {
	this.resContext = context;
	this.dynScale = 1;
	for (var i = 0; i < this.groups.length; i++)
		this.groups[i].resetScaling(context);
	for (var i = 0; i < this.ops.length; i++)
		this.ops[i].resetScaling(context);
};
ResHieroglyphic.prototype.widthEm =
function() {
	if (this.effectiveIsH()) {
		var w = 0;
		for (var i = 0; i < this.groups.length; i++)
			w += this.groups[i].widthEm();
		for (var i = 0; i < this.ops.length; i++)
			w += this.ops[i].sizeEm();
		return w;
	} else
		return this.dynScale * this.globals.size;
};
ResHieroglyphic.prototype.heightEm =
function() {
	if (this.effectiveIsV()) {
		var h = 0;
		for (var i = 0; i < this.groups.length; i++)
			h += this.groups[i].heightEm();
		for (var i = 0; i < this.ops.length; i++)
			h += this.ops[i].sizeEm();
		return h;
	} else
		return this.dynScale * this.globals.size;
};
ResHieroglyphic.prototype.widthPx =
function() {
	return this.resContext.emSizePx * this.widthEm();
};
ResHieroglyphic.prototype.heightPx =
function() {
	return this.resContext.emSizePx * this.heightEm();
};
ResHieroglyphic.prototype.widthFromToPx =
function(i, j) {
	if (this.effectiveIsH()) {
		var w = 0;
		for (var k = i; k <= j; k++)
			w += this.groups[k].widthPx();
		for (var k = i; k < j; k++)
			w += this.ops[k].sizePx();
		return w;
	} else
		return this.widthPx();
};
ResHieroglyphic.prototype.heightFromToPx =
function(i, j) {
	if (this.effectiveIsV()) {
		var h = 0;
		for (var k = i; k <= j; k++)
			h += this.groups[k].heightPx();
		for (var k = i; k < j; k++)
			h += this.ops[k].sizePx();
		return h;
	} else
		return this.heightPx();
};
ResHieroglyphic.prototype.scaleDown =
function(f) {
	this.dynScale *= f;
	for (var i = 0; i < this.groups.length; i++)
		this.scaleDownGroup(this.groups[i], f);
	for (var i = 0; i < this.ops.length; i++) {
		var prev = this.groups[i];
		var op = this.ops[i];
		var next = this.groups[i+1];
		op.scaleDown(f);
		var sideScale1 = this.effectiveIsH() ? 
				prev.sideScaledRight() : prev.sideScaledBottom()
		var sideScale2 = this.effectiveIsH() ?
				next.sideScaledLeft() : next.sideScaledTop()
		var sideScale = Math.max(sideScale1, sideScale2);
		if (this.dynScale > 0)
			op.dynSideScale = sideScale / this.dynScale;
		else
			op.dynSideScale = sideScale;
	}
	for (var i = 0; i < this.ops.length; i++) {
		var op = this.ops[i];
		if (op.effectiveFit())
			op.fitSizeEm = this.fitAroundPx(i) / this.resContext.emSizePx;
	}
};
ResHieroglyphic.prototype.scaleDownGroup =
function(group, f) {
	group.scaleDown(f);
	var targetSize = this.dynScale * this.globals.size;
	for (var i = 0; i < this.resContext.iterateLimit; i++) {
		var size = this.effectiveIsH() ? group.heightEm() : group.widthEm();
		if (size < this.resContext.scaleLimitEm || size <= targetSize)
			break;
		f = targetSize / size;
		group.scaleDown(f);
	}
};

ResVertgroup.prototype.resetScaling =
function(context) {
	this.resContext = context;
	this.dynScale = 1;
	for (var i = 0; i < this.groups.length; i++)
		this.groups[i].group.resetScaling(context);
	for (var i = 0; i < this.ops.length; i++)
		this.ops[i].resetScaling(context);
};
ResVertgroup.prototype.widthEm =
function() {
	var w = 0;
	for (var i = 0; i < this.groups.length; i++)
		w = Math.max(w, this.groups[i].group.widthEm());
	return w;
};
ResVertgroup.prototype.heightEm =
function() {
	var h = 0;
	for (var i = 0; i < this.groups.length; i++)
		h += this.groups[i].group.heightEm();
	for (var i = 0; i < this.ops.length; i++)
		h += this.ops[i].sizeEm();
	return h;
};
ResVertgroup.prototype.widthPx =
function() {
	return this.resContext.emSizePx * this.widthEm();
};
ResVertgroup.prototype.heightPx =
function() {
	return this.resContext.emSizePx * this.heightEm();
};
ResVertgroup.prototype.widthFromToPx =
function(i, j) {
	return this.widthPx();
};
ResVertgroup.prototype.heightFromToPx =
function(i, j) {
	var h = 0;
	for (var k = i; k <= j; k++)
		h += this.groups[k].group.heightPx();
	for (var k = i; k < j; k++)
		h += this.ops[k].sizePx();
	return h;
};
ResVertgroup.prototype.sideScaledLeft =
function() {
	var scaled = 0;
	for (var i = 0; i < this.groups.length; i++)
		scaled = Math.max(scaled, this.groups[i].group.sideScaledLeft());
	return scaled;
};
ResVertgroup.prototype.sideScaledRight =
function() {
	var scaled = 0;
	for (var i = 0; i < this.groups.length; i++)
		scaled = Math.max(scaled, this.groups[i].group.sideScaledRight());
	return scaled;
};
ResVertgroup.prototype.sideScaledTop =
function() {
	return this.groups[0].group.sideScaledTop();
};
ResVertgroup.prototype.sideScaledBottom =
function() {
	return this.groups[this.groups.length-1].group.sideScaledBottom();
};
ResVertgroup.prototype.scaleDown =
function(f) {
	this.dynScale *= f;
	for (var i = 0; i < this.groups.length; i++)
		this.scaleDownGroup(this.groups[i].group, f);
	for (var i = 0; i < this.ops.length; i++) {
		var prev = this.groups[i].group;
		var op = this.ops[i];
		var next = this.groups[i+1].group;
		op.scaleDown(f);
		var sideScale1 = prev.sideScaledBottom();
		var sideScale2 = next.sideScaledTop();
		var sideScale = Math.max(sideScale1, sideScale2);
		if (this.dynScale > 0)
			op.dynSideScale = sideScale / this.dynScale;
		else
			op.dynSideScale = sideScale;
	}
	for (var i = 0; i < this.ops.length; i++) {
		var op = this.ops[i];
		if (op.effectiveFit())
			op.fitSizeEm = this.fitAroundPx(i) / this.resContext.emSizePx;
	}
};
ResVertgroup.prototype.scaleDownGroup =
function(group, f) {
	group.scaleDown(f);
	var unit = this.globals.size;
	if (this.ops[0].size === "inf") {
		unit = Number.MAX_VALUE;
		return;
	} else if (this.ops[0].size !== null) 
		unit = this.ops[0].size;
	var targetWidth = this.dynScale * unit;
	for (var i = 0; i < this.resContext.iterateLimit; i++) {
		var width = group.widthEm();
		if (width < this.resContext.scaleLimitEm || width <= targetWidth)
			break;
		f = targetWidth / width;
		group.scaleDown(f);
	}
};

ResHorgroup.prototype.resetScaling =
function(context) {
	this.resContext = context;
	this.dynScale = 1;
	for (var i = 0; i < this.groups.length; i++)
		this.groups[i].group.resetScaling(context);
	for (var i = 0; i < this.ops.length; i++)
		this.ops[i].resetScaling(context);
};
ResHorgroup.prototype.widthEm =
function() {
	var w = 0;
	for (var i = 0; i < this.groups.length; i++)
		w += this.groups[i].group.widthEm();
	for (var i = 0; i < this.ops.length; i++)
		w += this.ops[i].sizeEm();
	return w;
};
ResHorgroup.prototype.heightEm =
function() {
	var h = 0;
	for (var i = 0; i < this.groups.length; i++)
		h = Math.max(h, this.groups[i].group.heightEm());
	return h;
};
ResHorgroup.prototype.widthPx =
function() {
	return this.resContext.emSizePx * this.widthEm();
};
ResHorgroup.prototype.heightPx =
function() {
	return this.resContext.emSizePx * this.heightEm();
};
ResHorgroup.prototype.widthFromToPx =
function(i, j) {
	var w = 0;
	for (var k = i; k <= j; k++)
		w += this.groups[k].group.widthPx();
	for (var k = i; k < j; k++)
		w += this.ops[k].sizePx();
	return w;
};
ResHorgroup.prototype.heightFromToPx =
function(i, j) {
	return this.heightPx();
};
ResHorgroup.prototype.sideScaledLeft =
function() {
	return this.groups[0].group.sideScaledLeft();
};
ResHorgroup.prototype.sideScaledRight =
function() {
	return this.groups[this.groups.length-1].group.sideScaledRight();
};
ResHorgroup.prototype.sideScaledTop =
function() {
	var scaled = 0;
	for (var i = 0; i < this.groups.length; i++)
		scaled = Math.max(scaled, this.groups[i].group.sideScaledTop());
	return scaled;
};
ResHorgroup.prototype.sideScaledBottom =
function() {
	var scaled = 0;
	for (var i = 0; i < this.groups.length; i++)
		scaled = Math.max(scaled, this.groups[i].group.sideScaledBottom());
	return scaled;
};
ResHorgroup.prototype.scaleDown =
function(f) {
	this.dynScale *= f;
	for (var i = 0; i < this.groups.length; i++)
		this.scaleDownGroup(this.groups[i].group, f);
	for (var i = 0; i < this.ops.length; i++) {
		var prev = this.groups[i].group;
		var op = this.ops[i];
		var next = this.groups[i+1].group;
		op.scaleDown(f);
		var sideScale1 = prev.sideScaledRight();
		var sideScale2 = next.sideScaledLeft();
		var sideScale = Math.max(sideScale1, sideScale2);
		if (this.dynScale > 0)
			op.dynSideScale = sideScale / this.dynScale;
		else
			op.dynSideScale = sideScale;
	}
	for (var i = 0; i < this.ops.length; i++) {
		var op = this.ops[i];
		if (op.effectiveFit())
			op.fitSizeEm = this.fitAroundPx(i) / this.resContext.emSizePx;
	}
};
ResHorgroup.prototype.scaleDownGroup =
function(group, f) {
	group.scaleDown(f);
	var unit = this.globals.size;
	if (this.ops[0].size === "inf") {
		unit = Number.MAX_VALUE;
		return;
	} else if (this.ops[0].size !== null)
		unit = this.ops[0].size;
	var targetHeight = this.dynScale * unit;
	for (var i = 0; i < this.resContext.iterateLimit; i++) {
		var height = group.heightEm();
		if (height < this.resContext.scaleLimitEm || height <= targetHeight)
			break;
		f = targetHeight / height;
		group.scaleDown(f);
	}
};

ResOp.prototype.resetScaling =
function(context) {
	this.resContext = context;
	this.dynScale = 1;
	this.dynSideScale = 1;
	this.dynSize = 0;
	this.fitSizeEm = null;
};
ResOp.prototype.noFitSizeEm =
function() {
	return this.dynSideScale * this.dynScale * this.effectiveSep() * this.resContext.opSepEm;
};
ResOp.prototype.sizeEm =
function() {
	return this.fitSizeEm !== null ? this.fitSizeEm : this.noFitSizeEm();
};
ResOp.prototype.noFitSizePx =
function() {
	return this.resContext.emSizePx * this.noFitSizeEm();
};
ResOp.prototype.sizePx =
function() {
	return this.resContext.emSizePx * this.sizeEm();
};
ResOp.prototype.scaleDown =
function(f) {
	this.dynScale *= f;
};

ResNamedglyph.prototype.resetScaling =
function(context) {
	this.resContext = context;
	var key = context.unMnemonic(this.name);
	key = context.hieroPoints[key];
	if (key) {
		this.font = "Hieroglyphic";
		this.charName = String.fromCharCode(key);
	} else if (this.name === "open" || this.name === "close") {
		key = context.auxPoints[this.name];
		if (key) {
			this.font = "HieroglyphicAux";
			this.charName = String.fromCharCode(key);
		}
	} else if (this.name === "\"\\\"\"") {
		this.font = "HieroglyphicPlain";
		this.charName = "\"";
	} else if (this.name === "\"\\\\\"") {
		this.font = "HieroglyphicPlain";
		this.charName = "\\";
	} else if (this.name.match(/^"."$/)) {
		this.font = "HieroglyphicPlain";
		this.charName = this.name.charAt(1);
	} else {
		this.font = "HieroglyphicPlain"
		this.charName = '?';
	}
	if (this.font === "HieroglyphicPlain")
		this.dynScale = this.plainCorrection();
	else
		this.dynScale = 1;
	this.scaleDown(1);
};
ResNamedglyph.prototype.widthEm =
function() {
	return this.dynWidthEm;
};
ResNamedglyph.prototype.heightEm =
function() {
	return this.dynHeightEm;
};
ResNamedglyph.prototype.widthPx =
function() {
	return this.resContext.emSizePx * this.widthEm();
};
ResNamedglyph.prototype.heightPx =
function() {
	return this.resContext.emSizePx * this.heightEm();
};
ResNamedglyph.prototype.sideScaledLeft =
function() {
	return this.dynScale;
};
ResNamedglyph.prototype.sideScaledRight =
function() {
	return this.dynScale;
};
ResNamedglyph.prototype.sideScaledTop =
function() {
	return this.dynScale;
};
ResNamedglyph.prototype.sideScaledBottom =
function() {
	return this.dynScale;
};
ResNamedglyph.prototype.scaleDown =
function(f) {
	this.dynScale *= f;
	this.testRect = this.testPrint();
	this.dynWidthEm = this.testRect.width / this.resContext.emSizePx;
	this.dynHeightEm = this.testRect.height / this.resContext.emSizePx;
};

ResEmptyglyph.prototype.resetScaling =
function(context) {
	this.resContext = context;
	this.dynScale = 1;
};
ResEmptyglyph.prototype.widthEm =
function() {
	return this.dynScale * this.width;
};
ResEmptyglyph.prototype.heightEm =
function() {
	return this.dynScale * this.height;
};
ResEmptyglyph.prototype.widthPx =
function() {
	return this.resContext.emSizePx * this.widthEm();
};
ResEmptyglyph.prototype.heightPx =
function() {
	return this.resContext.emSizePx * this.heightEm();
};
ResEmptyglyph.prototype.sideScaledLeft =
function() {
	return this.dynScale;
};
ResEmptyglyph.prototype.sideScaledRight =
function() {
	return this.dynScale;
};
ResEmptyglyph.prototype.sideScaledTop =
function() {
	return this.dynScale;
};
ResEmptyglyph.prototype.sideScaledBottom =
function() {
	return this.dynScale;
};
ResEmptyglyph.prototype.scaleDown =
function(f) {
	this.dynScale *= f;
};

ResBox.prototype.resetScaling =
function(context) {
	this.resContext = context;
	this.dynScale = 1;
	if (this.hiero !== null) 
		this.hiero.resetScaling(context);
	var type = context.auxPoints[this.type + 'open'] ? this.type : 'cartouche';
	this.charOpenName = String.fromCharCode(context.auxPoints[type + 'open']);
	this.charCloseName = String.fromCharCode(context.auxPoints[type + 'close']);
	this.charSegmentName = String.fromCharCode(context.auxPoints[type + 'segment']);
	this.scaleDown(1);
};
ResBox.prototype.openChar =
function() {
	return !this.effectiveIsH() || !this.effectiveMirror() ? 
		this.charOpenName : this.charCloseName;
};
ResBox.prototype.closeChar =
function() {
	return !this.effectiveIsH() || !this.effectiveMirror() ? 
		this.charCloseName : this.charOpenName;
};
ResBox.prototype.segmentRotate =
function() {
	return this.effectiveIsH() ? 0 : this.effectiveMirror() ? 270 : 90;
};
ResBox.prototype.openCloseRotate =
function() {
	return this.effectiveIsH() ? 0 : this.effectiveMirror() ? 270 : 90;
};
ResBox.prototype.mapSep =
function(d, x) {
	var s = this.resContext.boxSepEm;
	if (x <= 1)
		return x * s;
	else {
		var a = (d/2 - s) / 9;
		var b = (10 * s - d/2) / 9;
		return a * x + b
	}
};
ResBox.prototype.widthEm =
function() {
	if (this.effectiveIsH())
		return this.openSizeEm + this.closeSizeEm + 
			Math.max(0, (this.hiero === null ? 0 : this.hiero.widthEm()) +
						this.openFitSizeEm + this.closeFitSizeEm);
	else
		return this.dynSegmentSizeEm
};
ResBox.prototype.heightEm =
function() {
	if (this.effectiveIsH())
		return this.dynSegmentSizeEm
	else
		return this.openSizeEm + this.closeSizeEm + 
			Math.max(0, (this.hiero === null ? 0 : this.hiero.heightEm()) +
						this.openFitSizeEm + this.closeFitSizeEm);
};
ResBox.prototype.overSizeEm =
function() {
	return this.mapSep(this.innerSizeEm, this.effectiveOversep());
};
ResBox.prototype.underSizeEm =
function() {
	return this.mapSep(this.innerSizeEm, this.effectiveUndersep());
};
ResBox.prototype.openSepEm =
function() {
	return this.dynScale * this.resContext.boxSepEm * this.effectiveOpensep();
};
ResBox.prototype.closeSepEm =
function() {
	return this.dynScale * this.resContext.boxSepEm * this.effectiveClosesep();
};
ResBox.prototype.openDistEm =
function() {
	return this.openSizeEm + this.openFitSizeEm;
};
ResBox.prototype.closeDistEm =
function() {
	return this.closeSizeEm + this.closeFitSizeEm;
};
ResBox.prototype.overDistEm =
function() {
	return this.overThicknessEm + this.overSizeEm();
};
ResBox.prototype.underDistEm =
function() {
	return this.underThicknessEm + this.underSizeEm();
};
ResBox.prototype.widthPx =
function() {
	return this.resContext.emSizePx * this.widthEm();
};
ResBox.prototype.heightPx =
function() {
	return this.resContext.emSizePx * this.heightEm();
};
ResBox.prototype.innerSizePx =
function() {
	return this.resContext.emSizePx * this.innerSizeEm;
};
ResBox.prototype.overSizePx =
function() {
	return this.resContext.emSizePx * this.overSizeEm();
};
ResBox.prototype.underSizePx =
function() {
	return this.resContext.emSizePx * this.underSizeEm();
};
ResBox.prototype.openSepPx =
function() {
	return this.resContext.emSizePx * this.openSepEm();
};
ResBox.prototype.closeSepPx =
function() {
	return this.resContext.emSizePx * this.closeSepEm();
};
ResBox.prototype.openSizePx =
function() {
	return this.resContext.emSizePx * this.openSizeEm;
};
ResBox.prototype.closeSizePx =
function() {
	return this.resContext.emSizePx * this.closeSizeEm;
};
ResBox.prototype.openDistPx =
function() {
	return this.resContext.emSizePx * this.openDistEm();
};
ResBox.prototype.closeDistPx =
function() {
	return this.resContext.emSizePx * this.closeDistEm();
};
ResBox.prototype.overDistPx =
function() {
	return this.resContext.emSizePx * this.overDistEm();
};
ResBox.prototype.underDistPx =
function() {
	return this.resContext.emSizePx * this.underDistEm();
};
ResBox.prototype.sideScaledLeft =
function() {
	return this.dynScale;
};
ResBox.prototype.sideScaledRight =
function() {
	return this.dynScale;
};
ResBox.prototype.sideScaledTop =
function() {
	return this.dynScale;
};
ResBox.prototype.sideScaledBottom =
function() {
	return this.dynScale;
};
ResBox.prototype.scaleDown =
function(f) {
	this.dynScale *= f;
	this.testRectOpen = this.testPrintOpen();
	this.testRectClose = this.testPrintClose();
	this.testRectSegment = this.testPrintSegment();
	if (this.effectiveIsH()) {
		this.openSizeEm = this.testRectOpen.width / this.resContext.emSizePx;
		this.closeSizeEm = this.testRectClose.width / this.resContext.emSizePx;
		this.dynSegmentSizeEm = this.testRectSegment.height / this.resContext.emSizePx;
	} else {
		this.openSizeEm = this.testRectOpen.height / this.resContext.emSizePx;
		this.closeSizeEm = this.testRectClose.height / this.resContext.emSizePx;
		this.dynSegmentSizeEm = this.testRectSegment.width / this.resContext.emSizePx;
	}
	this.overThicknessEm = this.testRectSegment.over / this.resContext.emSizePx;
	this.underThicknessEm = this.testRectSegment.under / this.resContext.emSizePx;
	this.innerSizeEm = this.dynSegmentSizeEm - 
				this.overThicknessEm - this.underThicknessEm;
	if (this.hiero !== null) {
		var targetSize = this.innerSizeEm - this.overSizeEm() - this.underSizeEm();
		this.hiero.scaleDown(f);
		for (var i = 0; i < this.resContext.iterateLimit; i++) {
			var size = this.effectiveIsH() ? this.hiero.heightEm() : this.hiero.widthEm();
			if (size < this.resContext.scaleLimitEm || size <= targetSize)
				break;
			this.hiero.scaleDown(targetSize / size);
		}
		if (this.effectiveIsH()) {
			this.openFitSizeEm = this.fitLeftPx() / this.resContext.emSizePx;
			this.closeFitSizeEm = this.fitRightPx() / this.resContext.emSizePx;
		} else {
			this.openFitSizeEm = this.fitTopPx() / this.resContext.emSizePx;
			this.closeFitSizeEm = this.fitBottomPx() / this.resContext.emSizePx;
		}
	} else {
		this.openFitSizeEm = 0;
		this.closeFitSizeEm = 0;
	}
};

ResStack.prototype.resetScaling =
function(context) {
	this.resContext = context;
	this.group1.resetScaling(context);
	this.group2.resetScaling(context);
};
ResStack.prototype.widthEm =
function() {
	var w1 = this.group1.widthEm();
	var w2 = this.group2.widthEm();
	var min1 = 0;
	var max1 = w1;
	var x = this.x * w1;
	var min2 = x - w2/2;
	var max2 = x + w2/2;
	var min = Math.min(min1, min2);
	var max = Math.max(max1, max2);
	return max - min;
};
ResStack.prototype.heightEm =
function() {
	var h1 = this.group1.heightEm();
	var h2 = this.group2.heightEm();
	var min1 = 0;
	var max1 = h1;
	var y = this.y * h1;
	var min2 = y - h2/2;
	var max2 = y + h2/2;
	var min = Math.min(min1, min2);
	var max = Math.max(max1, max2);
	return max - min;
};
ResStack.prototype.widthPx =
function() {
	return this.resContext.emSizePx * this.widthEm();
};
ResStack.prototype.heightPx =
function() {
	return this.resContext.emSizePx * this.heightEm();
};
ResStack.prototype.sideScaledLeft =
function() {
	return Math.max(this.group1.sideScaledLeft(), this.group2.sideScaledLeft());
};
ResStack.prototype.sideScaledRight =
function() {
	return Math.max(this.group1.sideScaledRight(), this.group2.sideScaledRight());
};
ResStack.prototype.sideScaledTop =
function() {
	return Math.max(this.group1.sideScaledTop(), this.group2.sideScaledTop());
};
ResStack.prototype.sideScaledBottom =
function() {
	return Math.max(this.group1.sideScaledBottom(), this.group2.sideScaledBottom());
};
ResStack.prototype.scaleDown =
function(f) {
	this.group1.scaleDown(f);
	this.group2.scaleDown(f);
};

ResInsert.prototype.resetScaling =
function(context) {
	this.resContext = context;
	this.group1.resetScaling(context);
	this.group2.resetScaling(context);
	this.scaleDown(1);
};
ResInsert.prototype.widthEm =
function() {
	return this.group1.widthEm();
};
ResInsert.prototype.heightEm =
function() {
	return this.group1.heightEm();
};
ResInsert.prototype.widthPx =
function() {
	return this.resContext.emSizePx * this.widthEm();
};
ResInsert.prototype.heightPx =
function() {
	return this.resContext.emSizePx * this.heightEm();
};
ResInsert.prototype.sideScaledLeft =
function() {
	return Math.max(this.group1.sideScaledLeft(), this.group2.sideScaledLeft());
};
ResInsert.prototype.sideScaledRight =
function() {
	return Math.max(this.group1.sideScaledRight(), this.group2.sideScaledRight());
};
ResInsert.prototype.sideScaledTop =
function() {
	return Math.max(this.group1.sideScaledTop(), this.group2.sideScaledTop());
};
ResInsert.prototype.sideScaledBottom =
function() {
	return Math.max(this.group1.sideScaledBottom(), this.group2.sideScaledBottom());
};
ResInsert.prototype.internSideScale =
function() {
	if (this.place === "t")
		return Math.max(this.group2.sideScaledBottom(),
				this.group2.sideScaledLeft(),
				this.group2.sideScaledRight());
	else if (this.place === "b")
		return Math.max(this.group2.sideScaledTop(),
				this.group2.sideScaledLeft(),
				this.group2.sideScaledRight());
	else if (this.place === "s")
		return Math.max(this.group2.sideScaledTop(),
				this.group2.sideScaledBottom(),
				this.group2.sideScaledRight());
	else if (this.place === "e")
		return Math.max(this.group2.sideScaledTop(),
				this.group2.sideScaledBottom(),
				this.group2.sideScaledLeft());
	else if (this.place === "ts")
		return Math.max(this.group2.sideScaledBottom(),
				this.group2.sideScaledRight());
	else if (this.place === "te")
		return Math.max(this.group2.sideScaledBottom(),
				this.group2.sideScaledLeft());
	else if (this.place === "bs")
		return Math.max(this.group2.sideScaledTop(),
				this.group2.sideScaledRight());
	else if (this.place === "be")
		return Math.max(this.group2.sideScaledTop(),
				this.group2.sideScaledLeft());
	else 
		return Math.max(this.group2.sideScaledTop(),
				this.group2.sideScaledBottom(),
				this.group2.sideScaledLeft(),
				this.group2.sideScaledRight());
};
ResInsert.prototype.sepEm =
function() {
	return this.internSideScale() * this.effectiveSep() * this.resContext.opSepEm;
};
ResInsert.prototype.sepPx =
function() {
	return this.resContext.emSizePx * this.sepEm();
};
ResInsert.prototype.scaleDown =
function(f) {
	this.group1.scaleDown(f);
	this.group2.scaleDown((f+1)/2);
	var w1 = this.group1.widthPx();
	var h1 = this.group1.heightPx();
	for (var i = 0; i < this.resContext.iterateLimit; i++) {
		var w2 = this.group2.widthPx();
		var h2 = this.group2.heightPx();
		if ((w2 < this.resContext.scaleLimitEm || w2 <= w1) &&
				(h2 < this.resContext.scaleLimitEm || h2 <= h1))
			break;
		var f2 = Math.min(w1/w2,h1/h2);
		this.group2.scaleDown(f2);
	}
	var fitResults = this.fitSecond();
	this.dynX = fitResults.x;
	this.dynY = fitResults.y;
	this.group2.scaleDown(fitResults.scale);
};

ResModify.prototype.resetScaling =
function(context) {
	this.resContext = context;
	this.dynScale = 1;
	this.group.resetScaling(context);
};
ResModify.prototype.widthEm =
function() {
	var share = 1 / (this.before + 1 + this.after);
	var w = this.group.widthEm();
	if (this.width !== null) 
		w = this.dynScale * this.width;
	return share * w;
};
ResModify.prototype.heightEm =
function() {
	var share = 1 / (this.above + 1 + this.below);
	var h = this.group.heightEm();
	if (this.height !== null) 
		h = this.dynScale * this.height;
	return share * h;
};
ResModify.prototype.widthPx =
function() {
	return this.resContext.emSizePx * this.widthEm();
};
ResModify.prototype.heightPx =
function() {
	return this.resContext.emSizePx * this.heightEm();
};
ResModify.prototype.sideScaledLeft =
function() {
	return this.group.sideScaledLeft();
};
ResModify.prototype.sideScaledRight =
function() {
	return this.group.sideScaledRight();
};
ResModify.prototype.sideScaledTop =
function() {
	return this.group.sideScaledTop();
};
ResModify.prototype.sideScaledBottom =
function() {
	return this.group.sideScaledBottom();
};
ResModify.prototype.scaleDown =
function(f) {
	this.dynScale *= f;
	this.group.scaleDown(f);
	var targetW = this.width === null ? Number.MAX_VALUE :
			this.dynScale * this.width;
	var targetH = this.height === null ? Number.MAX_VALUE :
			this.dynScale * this.height;
	for (var i = 0; i < this.resContext.iterateLimit; i++) {
		var w = this.group.widthEm();
		var h = this.group.heightEm();
		if ((w < this.resContext.scaleLimitEm || w <= targetW) &&
				(h < this.resContext.scaleLimitEm || h <= targetH))
			break;
		var fW = (w < this.resContext.scaleLimitEm || w <= targetW) ?
				Number.MAX_VALUE : targetW / w;
		var fH = (h < this.resContext.scaleLimitEm || h <= targetH) ?
				Number.MAX_VALUE : targetH / h;
		this.group.scaleDown(Math.min(fW, fH));
	}
};

/* res_render.js */

// Rendering.

// Render with initial margin. If things were printed outside margin
// (so if margin became bigger) do again.
// The 'env' object is the environment of printing; it contains
// the rectangle, the margin, the canvas context, etc.
// return: list of rectangle, one for each top-level group, plus separation in
// between, plus some space at the beginning.
ResFragment.prototype.render =
function(canvas, size) {
	var context = new ResContext();
	context.emSizePx = size;
	this.format(context);

	var env = new ResEnv(context); 
	env.mirror = this.globals.isRL();
	while (true) {
		var w = Math.round(this.widthPx());
		var h = Math.round(this.heightPx());
		env.totalWidthPx = w + env.leftMarginPx + env.rightMarginPx;
		env.totalHeightPx = h + env.topMarginPx + env.bottomMarginPx;
		env.isH = this.globals.isH();
		canvas.width = env.totalWidthPx;
		canvas.height = env.totalHeightPx;
		env.ctx = canvas.getContext("2d");
		env.ctx.clearRect(0, 0, canvas.width, canvas.height);
		if (env.mirror) {
			env.ctx.save();
			env.ctx.translate(canvas.width, 0);
			env.ctx.scale(-1, 1);
		}
		var rect = new ResRectangle(env.leftMarginPx, env.topMarginPx, w, h);
		env.shading = new ResShading(context, env.mirror); 
		var groupRects = env.isH ? [new ResRectangle(0, 0, env.leftMarginPx, h)] :
									[new ResRectangle(0, 0, w, env.topMarginPx)];
		if (this.hiero !== null) {
			var hieroRects = this.hiero.render(env, rect, rect, null, false);
			groupRects = groupRects.concat(hieroRects);
		}
		env.shading.compress();
		env.shading.print(env.ctx);
		if (this.hiero !== null)
			this.hiero.renderNotes(env);
		if (env.marginsUnchanged()) {
			break;
		} else
			env.updateMargins();
	}
	if (env.mirror) {
		env.ctx.restore();
		var rev = [];
		for (var i = 0; i < groupRects.length; i++)
			rev.push(groupRects[i].mirror(env.totalWidthPx));
		return rev;
	} else
		return groupRects;
};

ResHieroglyphic.prototype.render =
function(env, rect, shadeRect, clip, fitting) {
	var groupRects = [];
	for (var i = 0; i < this.groups.length; i++) {
		var group = this.groups[i];
		if (this.effectiveIsH()) {
			var w = group.widthPx();
			var groupRect = rect.chopStartH(rect.x + w);
			var groupShadeRect = shadeRect.chopStartH(rect.x + w);
			group.render(env, groupRect, groupShadeRect, clip, fitting);
			groupRects.push(groupRect);
			shadeRect = shadeRect.chopEndH(rect.x + w);
			rect = rect.chopEndH(rect.x + w);
		} else {
			var h = group.heightPx();
			var groupRect = rect.chopStartV(rect.y + h);
			var groupShadeRect = shadeRect.chopStartV(rect.y + h);
			group.render(env, groupRect, groupShadeRect, clip, fitting);
			groupRects.push(groupRect);
			shadeRect = shadeRect.chopEndV(rect.y + h);
			rect = rect.chopEndV(rect.y + h);
		}
		if (i < this.ops.length) {
			var op = this.ops[i];
			var size = op.sizePx();
			if (this.effectiveIsH()) {
				var opRect = shadeRect.chopStartH(rect.x + size);
				op.render(env, opRect, fitting);
				groupRects.push(opRect);
				shadeRect = shadeRect.chopEndH(rect.x + size);
				rect = rect.chopEndH(rect.x + size);
			} else {
				var opRect = shadeRect.chopStartV(rect.y + size);
				op.render(env, opRect, fitting);
				groupRects.push(opRect);
				shadeRect = shadeRect.chopEndV(rect.y + size);
				rect = rect.chopEndV(rect.y + size);
			}
		}
	}
	return groupRects;
};
ResHieroglyphic.prototype.renderFromTo =
function(env, rect, i, j) {
	for (var k = i; k <= j; k++) {
		var group = this.groups[k];
		if (this.effectiveIsH()) {
			var w = group.widthPx();
			var groupRect = rect.chopStartH(rect.x + w);
			group.render(env, groupRect, groupRect, null, true);
			rect = rect.chopEndH(rect.x + w);
		} else {
			var h = group.heightPx();
			var groupRect = rect.chopStartV(rect.y + h);
			group.render(env, groupRect, groupRect, null, true);
			rect = rect.chopEndV(rect.y + h);
		}
		if (k < j) {
			var op = this.ops[k];
			var size = op.sizePx();
			if (this.effectiveIsH()) {
				rect = rect.chopEndH(rect.x + size);
			} else {
				rect = rect.chopEndV(rect.y + size);
			}
		}
	}
};
ResHieroglyphic.prototype.fitAroundPx =
function(i) {
	var j;
	for (j = i; j > 0; j--)
		if (!this.ops[j-1].effectiveFit())
			break;
	var sep = Math.round(this.ops[i].noFitSizePx());
	if (this.effectiveIsH()) {
		var wBefore = Math.round(this.widthFromToPx(j, i));
		var wLast = Math.round(this.widthFromToPx(i, i));
		var wAfter = Math.round(this.widthFromToPx(i+1, i+1));
		var h = Math.round(this.heightPx());
		var sepMax = Math.min(wLast, wAfter);
		var rectBefore = new ResRectangle(0, 0, wBefore, h);
		var rectAfter = new ResRectangle(0, 0, wAfter, h);
	} else {
		var w = Math.round(this.widthPx());
		var hBefore = Math.round(this.heightFromToPx(j, i));
		var hLast = Math.round(this.heightFromToPx(i, i));
		var hAfter = Math.round(this.heightFromToPx(i+1, i+1));
		var sepMax = Math.min(hLast, hAfter);
		var rectBefore = new ResRectangle(0, 0, w, hBefore);
		var rectAfter = new ResRectangle(0, 0, w, hAfter);
	}
	var canvasBefore = ResCanvas.make(rectBefore.width, rectBefore.height);
	var envBefore = new ResEnv(this.resContext);
	envBefore.ctx = canvasBefore.getContext("2d");
	envBefore.mirror = this.globals.isRL();
	envBefore.totalWidthPx = rectBefore.width;
	envBefore.totalHeightPx = rectBefore.height;
	envBefore.isH = this.effectiveIsH();
	this.renderFromTo(envBefore, rectBefore, j, i);
	var canvasAfter = ResCanvas.make(rectAfter.width, rectAfter.height);
	var envAfter = new ResEnv(this.resContext);
	envAfter.ctx = canvasAfter.getContext("2d");
	envAfter.mirror = this.globals.isRL();
	envAfter.totalWidthPx = rectAfter.width;
	envAfter.totalHeightPx = rectAfter.height;
	envAfter.isH = this.effectiveIsH();
	this.renderFromTo(envAfter, rectAfter, i+1, i+1);
	if (this.effectiveIsH())
		return ResCanvas.fitHor(envBefore.ctx, envAfter.ctx, wBefore, wAfter, h, sep, sepMax);
	else
		return ResCanvas.fitVert(envBefore.ctx, envAfter.ctx, w, hBefore, hAfter, sep, sepMax);
};
ResHieroglyphic.prototype.renderNotes =
function(env) {
	for (var i = 0; i < this.groups.length; i++) 
		this.groups[i].renderNotes(env);
};

ResVertgroup.prototype.render =
function(env, rect, shadeRect, clip, fitting) {
	var w = this.widthPx();
	var h = this.heightPx();
	var horSurplus = rect.width - w;
	var vertSurplus = rect.height - h;
	var leftSurplus = horSurplus / 2;
	var nPad = this.nPaddable();
	if (nPad < 1) {
		var topSurplus = vertSurplus / 2;
		rect = new ResRectangle(rect.x + leftSurplus, rect.y + topSurplus, w, h);
		vertSurplus = 0;
	} else
		rect = new ResRectangle(rect.x + leftSurplus, rect.y, w, rect.h);
	for (var i = 0; i < this.groups.length; i++) {
		var group = this.groups[i].group;
		var groupH = group.heightPx();
		var groupRect = rect.chopStartV(rect.y + groupH);
		var groupShadeRect = 
			(i == this.groups.length - 1) ? shadeRect :
				shadeRect.chopStartV(rect.y + groupH);
		group.render(env, groupRect, groupShadeRect, clip, fitting);
		shadeRect = shadeRect.chopEndV(rect.y + groupH);
		rect = rect.chopEndV(rect.y + groupH);
		if (i < this.ops.length) {
			var op = this.ops[i];
			var size = op.sizePx();
			if (!op.fix) {
				var extra = vertSurplus / nPad;
				vertSurplus -= extra;
				nPad--;
				size += extra;
			}
			var opRect = shadeRect.chopStartV(rect.y + size);
			op.render(env, opRect, fitting);
			shadeRect = shadeRect.chopEndV(rect.y + size);
			rect = rect.chopEndV(rect.y + size);
		}
	}
};
ResVertgroup.prototype.renderFromTo =
function(env, rect, i, j) {
	for (var k = i; k <= j; k++) {
		var group = this.groups[k].group;
		var h = group.heightPx();
		var groupRect = rect.chopStartV(rect.y + h);
		group.render(env, groupRect, groupRect, null, true);
		rect = rect.chopEndV(rect.y + h);
		if (k < j) {
			var op = this.ops[k];
			var size = op.sizePx();
			rect = rect.chopEndV(rect.y + size);
		}
	}
};
ResVertgroup.prototype.fitAroundPx =
function(i) {
	var j;
	for (j = i; j > 0; j--)
		if (!this.ops[j-1].effectiveFit())
			break;
	var sep = Math.round(this.ops[i].noFitSizePx());
	var w = Math.round(this.widthPx());
	var hBefore = Math.round(this.heightFromToPx(j, i));
	var hLast = Math.round(this.heightFromToPx(i, i));
	var hAfter = Math.round(this.heightFromToPx(i+1, i+1));
	var sepMax = Math.min(hLast, hAfter);
	var rectBefore = new ResRectangle(0, 0, w, hBefore);
	var rectAfter = new ResRectangle(0, 0, w, hAfter);
	var canvasBefore = ResCanvas.make(rectBefore.width, rectBefore.height);
	var envBefore = new ResEnv(this.resContext);
	envBefore.ctx = canvasBefore.getContext("2d");
	envBefore.mirror = this.globals.isRL();
	envBefore.totalWidthPx = rectBefore.width;
	envBefore.totalHeightPx = rectBefore.height;
	envBefore.isH = this.globals.isH();
	this.renderFromTo(envBefore, rectBefore, j, i);
	var canvasAfter = ResCanvas.make(rectAfter.width, rectAfter.height);
	var envAfter = new ResEnv(this.resContext);
	envAfter.ctx = canvasAfter.getContext("2d");
	envAfter.mirror = this.globals.isRL();
	envAfter.totalWidthPx = rectAfter.width;
	envAfter.totalHeightPx = rectAfter.height;
	envAfter.isH = this.globals.isH();
	this.renderFromTo(envAfter, rectAfter, i+1, i+1);
	return ResCanvas.fitVert(envBefore.ctx, envAfter.ctx, w, hBefore, hAfter, sep, sepMax);
};
ResVertgroup.prototype.renderNotes =
function(env) {
	for (var i = 0; i < this.groups.length; i++) 
		this.groups[i].group.renderNotes(env);
};

ResHorgroup.prototype.render =
function(env, rect, shadeRect, clip, fitting) {
	var w = this.widthPx();
	var h = this.heightPx();
	var horSurplus = rect.width - w;
	var vertSurplus = rect.height - h;
	var topSurplus = vertSurplus / 2;
	var nPad = this.nPaddable();
	if (nPad < 1) {
		var leftSurplus = horSurplus / 2;
		rect = new ResRectangle(rect.x + leftSurplus, rect.y + topSurplus, w, h);
		horSurplus = 0;
	} else
		rect = new ResRectangle(rect.x, rect.y + topSurplus, rect.width, h);
	for (var i = 0; i < this.groups.length; i++) {
		var group = this.groups[i].group;
		var groupW = group.widthPx();
		var groupRect = rect.chopStartH(rect.x + groupW);
		var groupShadeRect = 
			(i == this.groups.length - 1) ? shadeRect :
				shadeRect.chopStartH(rect.x + groupW);
		group.render(env, groupRect, groupShadeRect, clip, fitting);
		shadeRect = shadeRect.chopEndH(rect.x + groupW);
		rect = rect.chopEndH(rect.x + groupW);
		if (i < this.ops.length) {
			var op = this.ops[i];
			var size = op.sizePx();
			if (!op.fix) {
				var extra = horSurplus / nPad;
				horSurplus -= extra;
				nPad--;
				size += extra;
			}
			var opRect = shadeRect.chopStartH(rect.x + size);
			op.render(env, opRect, fitting);
			shadeRect = shadeRect.chopEndH(rect.x + size);
			rect = rect.chopEndH(rect.x + size);
		}
	}
};
ResHorgroup.prototype.renderFromTo =
function(env, rect, i, j) {
	for (var k = i; k <= j; k++) {
		var group = this.groups[k].group;
		var w = group.widthPx();
		var groupRect = rect.chopStartH(rect.x + w);
		group.render(env, groupRect, groupRect, null, true);
		rect = rect.chopEndH(rect.x + w);
		if (k < j) {
			var op = this.ops[k];
			var size = op.sizePx();
			rect = rect.chopEndH(rect.x + size);
		}
	}
};
ResHorgroup.prototype.fitAroundPx =
function(i) {
	var j;
	for (j = i; j > 0; j--)
		if (!this.ops[j-1].effectiveFit())
			break;
	var sep = Math.round(this.ops[i].noFitSizePx());
	var wBefore = Math.round(this.widthFromToPx(j, i));
	var wLast = Math.round(this.widthFromToPx(i, i));
	var wAfter = Math.round(this.widthFromToPx(i+1, i+1));
	var h = Math.round(this.heightPx());
	var sepMax = Math.min(wLast, wAfter);
	var rectBefore = new ResRectangle(0, 0, wBefore, h);
	var rectAfter = new ResRectangle(0, 0, wAfter, h);
	var canvasBefore = ResCanvas.make(rectBefore.width, rectBefore.height);
	var envBefore = new ResEnv(this.resContext);
	envBefore.ctx = canvasBefore.getContext("2d");
	envBefore.mirror = this.globals.isRL();
	envBefore.totalWidthPx = rectBefore.width;
	envBefore.totalHeightPx = rectBefore.height;
	envBefore.isH = this.globals.isH();
	this.renderFromTo(envBefore, rectBefore, j, i);
	var canvasAfter = ResCanvas.make(rectAfter.width, rectAfter.height);
	var envAfter = new ResEnv(this.resContext);
	envAfter.ctx = canvasAfter.getContext("2d");
	envAfter.mirror = this.globals.isRL();
	envAfter.totalWidthPx = rectAfter.width;
	envAfter.totalHeightPx = rectAfter.height;
	envAfter.isH = this.globals.isH();
	this.renderFromTo(envAfter, rectAfter, i+1, i+1);
	return ResCanvas.fitHor(envBefore.ctx, envAfter.ctx, wBefore, wAfter, h, sep, sepMax);
};
ResHorgroup.prototype.renderNotes =
function(env) {
	for (var i = 0; i < this.groups.length; i++) 
		this.groups[i].group.renderNotes(env);
};

ResOp.prototype.render =
function(env, shadeRect, fitting) {
	if (!fitting)
		ResShading.shadeBasicgroup(env, this, shadeRect);
};

ResNamedglyph.prototype.render =
function(env, rect, shadeRect, clip, fitting) {
	var color = fitting ? "black" : this.effectiveColor();
	var centRect = rect.center(new ResRectangle(0, 0, this.testRect.width, this.testRect.height));
	var mirror = this.effectiveMirror();
	var size = this.resContext.emSizePx * this.dynScale * this.scale * this.yscale;
	var xScale = this.xscale / this.yscale;
	var x = centRect.x;
	var y = centRect.y;
	if (clip !== null) {
		env.ctx.save();
		env.ctx.beginPath();
		env.ctx.rect(clip.x, clip.y, clip.width, clip.height);
		env.ctx.clip();
	}
	ResCanvas.printGlyph(env.ctx, x, y, this.testRect, this.charName, 
				size, xScale, this.font, color, this.rotate, mirror);
	if (clip !== null)
		env.ctx.restore();
	if (!fitting) {
		env.ensureRect(clip !== null ? clip : centRect);
		ResShading.shadeBasicgroup(env, this, shadeRect);
	}
	this.noteRect = centRect;
};
ResNamedglyph.prototype.testPrint =
function() {
	if (this.font === undefined)
		return new ResRectangle(0, 0, 1, 1);
	var mirror = this.effectiveMirror();
	var ySize = this.resContext.emSizePx * this.dynScale * this.scale * this.yscale;
	var xScale = this.xscale / this.yscale;
	return ResCanvas.glyphRect(this.charName, ySize, xScale, this.font, this.rotate, mirror);
};
ResNamedglyph.prototype.plainCorrection =
function() {
	if (ResNamedglyph.plainCorrectionFactor === undefined) {
		var size = this.resContext.emSizePx;
		var rect = ResCanvas.glyphRect("[", size, 1, "HieroglyphicPlain", 0, false);
		ResNamedglyph.plainCorrectionFactor = size / rect.height;
	}
	return ResNamedglyph.plainCorrectionFactor;
};
ResNamedglyph.prototype.renderNotes =
function(env) {
	for (var i = 0; i < this.notes.length; i++)
		this.notes[i].render(env, this.noteRect);
};

ResEmptyglyph.prototype.render =
function(env, rect, shadeRect, clip, fitting) {
	if (!fitting)
		ResShading.shadeBasicgroup(env, this, shadeRect);
	if (fitting && this.firm) {
		env.ctx.fillStyle = "black";
		if (rect.width > 0 && rect.height > 0)
			env.ctx.rect(rect.x, rect.y, rect.width, rect.height);
		else
			env.ctx.rect(rect.x-1, rect.y-1, rect.width+2, rect.height+2);
		env.ctx.stroke();
	}
	this.noteRect = new ResRectangle(rect.x + rect.width/2, rect.y + rect.height/2, 1, 1);
};
ResEmptyglyph.prototype.renderNotes =
function(env) {
	if (this.note !== null)
		this.note.render(env, this.noteRect);
};

ResBox.prototype.render =
function(env, rect, shadeRect, clip, fitting) {
	var color = fitting ? "black" : this.effectiveColor();
	var size = this.resContext.emSizePx * this.dynScale * this.scale;
	var font = "HieroglyphicAux";
	var rot = this.openCloseRotate();
	var mirror = this.effectiveMirror();
	var segmentRot = this.segmentRotate();
	var overlap = this.resContext.boxOverlapPx;
	var clipMargin = 3;
	var w = this.widthPx();
	var h = this.heightPx();
	var centRect = rect.center(new ResRectangle(0, 0, w, h));
	var x = centRect.x;
	var y = centRect.y;
	if (clip !== null) {
		env.ctx.save();
		env.ctx.beginPath();
		env.ctx.rect(clip.x, clip.y, clip.width, clip.height);
		env.ctx.clip();
	}
	ResCanvas.printGlyph(env.ctx, x, y, this.testRectOpen, 
				this.openChar(), size, 1, font, color, rot, mirror);
	if (this.effectiveIsH()) {
		ResCanvas.printGlyph(env.ctx, x+w-this.testRectClose.width, y, this.testRectClose, 
				this.closeChar(), size, 1, font, color, rot, mirror);
		var incr = Math.max(1, this.testRectSegment.width - overlap);
		var segX;
		var segY = y;
		for (segX = x + this.testRectOpen.width - overlap;
				segX + this.testRectSegment.width < x+w-this.testRectClose.width+overlap;
				segX += incr)
			ResCanvas.printGlyph(env.ctx, segX, y, this.testRectSegment, 
					this.charSegmentName, size, 1, font, color, segmentRot, mirror);
	} else {
		ResCanvas.printGlyph(env.ctx, x, y+h-this.testRectClose.height, this.testRectClose, 
			this.closeChar(), size, 1, font, color, rot, mirror);
		var incr = Math.max(1, this.testRectSegment.height - overlap);
		var segX = x;
		var segY;
		for (segY = y + this.testRectOpen.height - overlap;
				segY + this.testRectSegment.height < y+h-this.testRectClose.height+overlap;
				segY += incr)
			ResCanvas.printGlyph(env.ctx, x, segY, this.testRectSegment, 
					this.charSegmentName, size, 1, font, color, segmentRot, mirror);
	}
	if (clip !== null)
		env.ctx.restore();
	if (this.effectiveIsH()) {
		var lastRect = new ResRectangle(segX, y-clipMargin, 
				x+w-this.testRectClose.width+overlap-segX, h + 2*clipMargin);
	} else {
		var lastRect = new ResRectangle(x - clipMargin, segY,
				w + 2*clipMargin, y+h-this.testRectClose.height+overlap-segY);
	}
	if (clip !== null) 
		lastRect = lastRect.intersect(clip);
	env.ctx.save();
	env.ctx.beginPath();
	env.ctx.rect(lastRect.x, lastRect.y, lastRect.width, lastRect.height);
	env.ctx.clip();
	ResCanvas.printGlyph(env.ctx, segX, segY, this.testRectSegment, 
			this.charSegmentName, size, 1, font, color, segmentRot, mirror);
	env.ctx.restore();
	if (this.hiero !== null) {
		var targetSize = this.innerSizePx() - this.overSizePx() - this.underSizePx();
		if (this.effectiveIsH()) {
			var topSurplus = (targetSize - this.hiero.heightPx()) / 2;
			var hieroX = x + this.openDistPx();
			var hieroY = y + this.overDistPx() + topSurplus;
			var hieroRect = new ResRectangle(hieroX, hieroY, this.hiero.widthPx(), this.hiero.heightPx());
			this.hiero.render(env, hieroRect, hieroRect, clip, fitting);
		} else {
			var leftSurplus = (targetSize - this.hiero.widthPx()) / 2;
			var hieroX = x + this.underDistPx() + leftSurplus;
			var hieroY = y + this.openDistPx();
			var hieroRect = new ResRectangle(hieroX, hieroY, this.hiero.widthPx(), this.hiero.heightPx());
			this.hiero.render(env, hieroRect, hieroRect, clip, fitting);
		}
	} else
		var hieroRect = null;
	if (!fitting) {
		env.ensureRect(clip !== null ? clip : centRect);
		if (hieroRect !== null)
			ResShading.shadeBox(env, this, shadeRect, hieroRect); 
		else
			ResShading.shadeBasicgroup(env, this, shadeRect); 
	}
	this.noteRect = centRect;
};
ResBox.prototype.testPrintOpen =
function() {
	return this.testPrint(this.openChar(), this.openCloseRotate(), 
			this.effectiveMirror());
};
ResBox.prototype.testPrintClose =
function() {
	return this.testPrint(this.closeChar(), this.openCloseRotate(), 
			this.effectiveMirror());
};
ResBox.prototype.testPrintSegment =
function() {
	var rect = this.testPrint(this.charSegmentName, this.segmentRotate(), 
				this.effectiveMirror());
	var canvas = ResCanvas.make(rect.width, rect.height);
	var ctx = canvas.getContext("2d");
	var size = this.resContext.emSizePx * this.dynScale * this.scale;
	ResCanvas.printGlyph(ctx, 0, 0, rect, this.charSegmentName,
				size, 1, "HieroglyphicAux", "black", 
				this.segmentRotate(), this.effectiveMirror());
	if (this.effectiveIsH()) {
		var intern = ResCanvas.internalHor(ctx, rect.width, rect.height);
		rect.over = intern.over;
		rect.under = intern.under;
	} else {
		var intern = ResCanvas.internalVert(ctx, rect.width, rect.height);
		rect.over = this.effectiveMirror() ? intern.under : intern.over;
		rect.under = this.effectiveMirror() ? intern.over : intern.under;
	}
	return rect;
};
// name: character name of open or close or segment.
ResBox.prototype.testPrint =
function(name, rotate, mirror) {
	var size = this.resContext.emSizePx * this.dynScale * this.scale;
	return ResCanvas.glyphRect(name, size, 1, "HieroglyphicAux", rotate, mirror);
};
ResBox.prototype.fitLeftPx =
function() {
	var size = this.resContext.emSizePx * this.dynScale * this.scale;
	var sep = Math.round(this.openSepPx());
	var rot = this.openCloseRotate();
	var mirror = this.effectiveMirror();
	var canvasBefore = ResCanvas.make(this.openSizePx(), this.heightPx());
	var envBefore = new ResEnv(this.resContext);
	envBefore.ctx = canvasBefore.getContext("2d");
	envBefore.mirror = false;
	envBefore.totalWidthPx = this.openSizePx();
	envBefore.totalHeightPx = this.heightPx();
	envBefore.isH = true;
	ResCanvas.printGlyph(envBefore.ctx, 0, 0, this.testRectOpen,
				this.openChar(), size, 1, "HieroglyphicAux", "black", rot, mirror);

	var targetSize = this.innerSizePx() - this.overSizePx() - this.underSizePx();
	var topSurplus = (targetSize - this.hiero.heightPx()) / 2;
	var y = this.overDistPx() + topSurplus;
	var lastGroup = Math.min(2, this.hiero.groups.length-1);
	var wAfter = this.hiero.widthFromToPx(0, lastGroup);
	var hAfter = this.hiero.heightFromToPx(0, lastGroup);
	var canvasAfter = ResCanvas.make(wAfter, this.heightPx());
	var envAfter = new ResEnv(this.resContext);
	envAfter.ctx = canvasAfter.getContext("2d");
	envAfter.mirror = false;
	envAfter.totalWidthPx = wAfter;
	envAfter.totalHeightPx = this.heightPx();
	envAfter.isH = true;
	var rectAfter = new ResRectangle(0, y, wAfter, hAfter);
	this.hiero.renderFromTo(envAfter, rectAfter, 0, lastGroup);

	return ResCanvas.fitHor(envBefore.ctx, envAfter.ctx, 
				canvasBefore.width, canvasAfter.width, canvasBefore.height,
				sep, canvasBefore.width);
};
ResBox.prototype.fitRightPx =
function() {
	var size = this.resContext.emSizePx * this.dynScale * this.scale;
	var sep = Math.round(this.closeSepPx());
	var rot = this.openCloseRotate();
	var mirror = this.effectiveMirror();
	var canvasAfter = ResCanvas.make(this.closeSizePx(), this.heightPx());
	var envAfter = new ResEnv(this.resContext);
	envAfter.ctx = canvasAfter.getContext("2d");
	envAfter.mirror = false;
	envAfter.totalWidthPx = this.closeSizePx();
	envAfter.totalHeightPx = this.heightPx();
	envAfter.isH = true;
	ResCanvas.printGlyph(envAfter.ctx, 0, 0, this.testRectClose,
				this.closeChar(), size, 1, "HieroglyphicAux", "black", rot, mirror);

	var targetSize = this.innerSizePx() - this.overSizePx() - this.underSizePx();
	var topSurplus = (targetSize - this.hiero.heightPx()) / 2;
	var y = this.overDistPx() + topSurplus;
	var firstGroup = Math.max(0, this.hiero.groups.length-3);
	var lastGroup = this.hiero.groups.length-1;
	var wBefore = this.hiero.widthFromToPx(firstGroup, lastGroup);
	var hBefore = this.hiero.heightFromToPx(firstGroup, lastGroup);
	var canvasBefore = ResCanvas.make(wBefore, this.heightPx());
	var envBefore = new ResEnv(this.resContext);
	envBefore.ctx = canvasBefore.getContext("2d");
	envBefore.mirror = false;
	envBefore.totalWidthPx = wBefore;
	envBefore.totalHeightPx = this.heightPx();
	envBefore.isH = true;
	var rectBefore = new ResRectangle(0, y, wBefore, hBefore);
	this.hiero.renderFromTo(envBefore, rectBefore, firstGroup, lastGroup);

	return ResCanvas.fitHor(envBefore.ctx, envAfter.ctx, 
				canvasBefore.width, canvasAfter.width, canvasBefore.height,
				sep, canvasAfter.width);
};
ResBox.prototype.fitTopPx =
function() {
	var size = this.resContext.emSizePx * this.dynScale * this.scale;
	var sep = Math.round(this.openSepPx());
	var rot = this.openCloseRotate();
	var mirror = this.effectiveMirror();
	var canvasBefore = ResCanvas.make(this.widthPx(), this.openSizePx());
	var envBefore = new ResEnv(this.resContext);
	envBefore.ctx = canvasBefore.getContext("2d");
	envBefore.mirror = false;
	envBefore.totalWidthPx = this.widthPx();
	envBefore.totalHeightPx = this.openSizePx();
	envBefore.isH = true;
	ResCanvas.printGlyph(envBefore.ctx, 0, 0, this.testRectOpen,
				this.openChar(), size, 1, "HieroglyphicAux", "black", rot, mirror);

	var targetSize = this.innerSizePx() - this.overSizePx() - this.underSizePx();
	var leftSurplus = (targetSize - this.hiero.widthPx()) / 2;
	var x = this.underDistPx() + leftSurplus;
	var lastGroup = Math.min(2, this.hiero.groups.length-1);
	var wAfter = this.hiero.widthFromToPx(0, lastGroup);
	var hAfter = this.hiero.heightFromToPx(0, lastGroup);
	var canvasAfter = ResCanvas.make(this.widthPx(), hAfter);
	var envAfter = new ResEnv(this.resContext);
	envAfter.ctx = canvasAfter.getContext("2d");
	envAfter.mirror = false;
	envAfter.totalWidthPx = this.widthPx();
	envAfter.totalHeightPx = hAfter;
	envAfter.isH = true;
	var rectAfter = new ResRectangle(x, 0, wAfter, hAfter);
	this.hiero.renderFromTo(envAfter, rectAfter, 0, lastGroup);

	return ResCanvas.fitVert(envBefore.ctx, envAfter.ctx, 
				canvasBefore.width, canvasBefore.height, canvasAfter.height,
				sep, canvasBefore.height);
};
ResBox.prototype.fitBottomPx =
function() {
	var size = this.resContext.emSizePx * this.dynScale * this.scale;
	var sep = Math.round(this.closeSepPx());
	var rot = this.openCloseRotate();
	var mirror = this.effectiveMirror();
	var canvasAfter = ResCanvas.make(this.widthPx(), this.closeSizePx());
	var envAfter = new ResEnv(this.resContext);
	envAfter.ctx = canvasAfter.getContext("2d");
	envAfter.mirror = false;
	envAfter.totalWidthPx = this.widthPx();
	envAfter.totalHeightPx = this.closeSizePx();
	envAfter.isH = true;
	ResCanvas.printGlyph(envAfter.ctx, 0, 0, this.testRectClose,
				this.closeChar(), size, 1, "HieroglyphicAux", "black", rot, mirror);

	var targetSize = this.innerSizePx() - this.overSizePx() - this.underSizePx();
	var leftSurplus = (targetSize - this.hiero.widthPx()) / 2;
	var x = this.underDistPx() + leftSurplus;
	var firstGroup = Math.max(0, this.hiero.groups.length-3);
	var lastGroup = this.hiero.groups.length-1;
	var wBefore = this.hiero.widthFromToPx(firstGroup, lastGroup);
	var hBefore = this.hiero.heightFromToPx(firstGroup, lastGroup);
	var canvasBefore = ResCanvas.make(this.widthPx(), hBefore);
	var envBefore = new ResEnv(this.resContext);
	envBefore.ctx = canvasBefore.getContext("2d");
	envBefore.mirror = false;
	envBefore.totalWidthPx = this.widthPx();
	envBefore.totalHeightPx = hBefore;
	envBefore.isH = true;
	var rectBefore = new ResRectangle(x, 0, wBefore, hBefore);
	this.hiero.renderFromTo(envBefore, rectBefore, firstGroup, lastGroup);

	return ResCanvas.fitVert(envBefore.ctx, envAfter.ctx, 
				canvasBefore.width, canvasBefore.height, canvasBefore.height,
				sep, canvasAfter.height);
};
ResBox.prototype.renderNotes =
function(env) {
	for (var i = 0; i < this.notes.length; i++)
		this.notes[i].render(env, this.noteRect);
	if (this.hiero !== null) 
		this.hiero.renderNotes(env);
};

ResStack.prototype.render =
function(env, rect, shadeRect, clip, fitting) {
	var box = new ResRectangle(0, 0, this.widthPx(), this.heightPx());
	rect = rect.center(box);
	var w1 = this.group1.widthPx();
	var w2 = this.group2.widthPx();
	var h1 = this.group1.heightPx();
	var h2 = this.group2.heightPx();
	var x = this.x * w1;
	var y = this.y * h1;
	var xMin2 = x - w2 / 2;
	var yMin2 = y - h2 / 2;
	var x0 = Math.min(0, xMin2);
	var y0 = Math.min(0, yMin2);
	var x1 = -x0;
	var y1 = -y0;
	var x2 = xMin2 - x0;
	var y2 = yMin2 - y0;
	var rect1 = new ResRectangle(rect.x + x1, rect.y + y1, w1, h1);
	var rect2 = new ResRectangle(rect.x + x2, rect.y + y2, w2, h2);
	if (this.onunder === "on" || this.onunder === "under") {
		var extra = this.resContext.milEmToPx(2000);
		if (env.isH) {
			var pre = Math.min(extra, rect.x);
			var post = Math.min(extra, env.totalWidthPx - (rect.x + rect.width));
			var w = Math.round(rect.width + pre + post);
			var h = Math.round(env.totalHeightPx);
			var x = pre;
			var y = rect.y;
		} else {
			var pre = Math.min(extra, rect.y);
			var post = Math.min(extra, env.totalHeightPx - (rect.y + rect.height));
			var w = Math.round(env.totalWidthPx);
			var h = Math.round(rect.height + pre + post);
			var x = rect.x
			var y = pre;
		}
		var xRef = rect.x - x;
		var yRef = rect.y - y;
		var canvas1 = ResCanvas.make(w, h);
		var ctx1 = canvas1.getContext("2d");
		ctx1.translate(-xRef, -yRef);
		var canvas2 = ResCanvas.make(w, h);
		var ctx2 = canvas2.getContext("2d");
		ctx2.translate(-xRef, -yRef);
		var savedCtx = env.ctx;
		env.ctx = ctx1;
		this.group1.render(env, rect1, shadeRect, clip, fitting);
		env.ctx = ctx2;
		this.group2.render(env, rect2, rect2, clip, fitting);
		if (this.onunder === "on") {
			var external = ResCanvas.externalPixels(ctx2, w, h);
			ResCanvas.erasePixels(ctx1, w, h, external);
		} else {
			var external = ResCanvas.externalPixels(ctx1, w, h);
			ResCanvas.erasePixels(ctx2, w, h, external);
		}
		env.ctx = savedCtx;
		env.ctx.drawImage(canvas1, xRef, yRef);
		env.ctx.drawImage(canvas2, xRef, yRef);
	} else {
		this.group1.render(env, rect1, shadeRect, clip, fitting);
		this.group2.render(env, rect2, rect2, clip, fitting);
	}
};
ResStack.prototype.renderNotes =
function(env) {
	this.group1.renderNotes(env);
	this.group2.renderNotes(env);
};

ResInsert.prototype.fitSecond =
function() {
	var w1 = Math.round(this.group1.widthPx());
	var h1 = Math.round(this.group1.heightPx());
	var canvas1 = ResCanvas.make(w1, h1);
	var env1 = new ResEnv(this.resContext);
	env1.ctx = canvas1.getContext("2d");
	env1.mirror = false;
	env1.totalWidthPx = w1;
	env1.totalHeightPx = h1;
	env1.isH = true;
	var rect1 = new ResRectangle(0, 0, w1, h1);
	this.group1.render(env1, rect1, rect1, null, true);
	var w2 = Math.round(this.group2.widthPx());
	var h2 = Math.round(this.group2.heightPx());
	var canvas2 = ResCanvas.make(w2, h2);
	var env2 = new ResEnv(this.resContext);
	env2.ctx = canvas2.getContext("2d");
	env2.mirror = false;
	env2.totalWidthPx = w2;
	env2.totalHeightPx = h2;
	env2.isH = true;
	var rect2 = new ResRectangle(0, 0, w2, h2);
	this.group2.render(env2, rect2, rect2, null, true);
	if (this.fix ||
		this.place === "ts" ||
		this.place === "te" ||
		this.place === "bs" ||
		this.place === "be")
		return this.insertFix(env1.ctx, canvas2, rect1, rect2, this.x, this.y, this.resContext.scaleInit);
	else 
		return this.insertFloat(env1.ctx, canvas2, rect1, rect2);
};
ResInsert.prototype.insertFix =
function(ctx1, canvas2, rect1, rect2, fixX, fixY, scale) {
	var canvas = ResCanvas.make(rect1.width, rect1.height);
	var ctx = canvas.getContext("2d");
	var x = 0;
	var y = 0;
	var scaleMax = 1;
	for (var step = this.resContext.scaleStep; 
			step >= this.resContext.scaleStepMin; 
			step *= this.resContext.scaleStepFactor) {
		for (var newScale = scale*(1+step); newScale <= scaleMax; newScale *= 1+step) {
			var w = Math.round(rect2.width * newScale);
			var h = Math.round(rect2.height * newScale);
			if (this.place === "ts" || this.place === "bs" || this.place === "s")
				x = 0;
			else if (this.place === "te" || this.place === "be" || this.place === "e")
				x = rect1.width - w;
			else
				x = fixX * rect1.width - w/2;
			if (this.place === "ts" || this.place === "te" || this.place === "t")
				y = 0;
			else if (this.place === "bs" || this.place === "be" || this.place === "b")
				y = rect1.height - h;
			else
				y = fixY * rect1.height - h/2;
			if (x < 0 || x+w > rect1.width || y < 0 || y+h > rect1.height) {
				scaleMax = newScale;
				break;
			}
			ctx.clearRect(0, 0, rect1.width, rect1.height);
			ResCanvas.drawWithAura(ctx, canvas2, x, y, w, h, this.sepPx());
			if (ResCanvas.disjoint(ctx1, ctx, rect1.width, rect1.height)) 
				scale = newScale;
			else {
				scaleMax = newScale;
				break;
			} 
		}
	}
	return {x: x, y: y, scale: scale};
};
ResInsert.prototype.insertFloat =
function(ctx1, canvas2, rect1, rect2) {
	var fixX = this.x;
	var fixY = this.y;
	var bestParams = this.insertFix(ctx1, canvas2, rect1, rect2, fixX, fixY, this.resContext.scaleInit);
	var xMove = rect2.width/rect1.width/2;
	var yMove = rect2.height/rect1.height/2;
	while (xMove > this.resContext.moveStepMin && yMove > this.resContext.moveStepMin) {
		var changed = true;
		while (changed) {
			changed = false;
			if (this.place === "t" || this.place === "b" || this.place === "") {
				var leftParams = this.insertFix(ctx1, canvas2, rect1, rect2, fixX - xMove, fixY, bestParams.scale);
				if (leftParams.scale > bestParams.scale) {
					fixX -= xMove;
					bestParams = leftParams;
					changed = true;
				}
				var rightParams = this.insertFix(ctx1, canvas2, rect1, rect2, fixX + xMove, fixY, bestParams.scale);
				if (rightParams.scale > bestParams.scale) {
					fixX += xMove;
					bestParams = rightParams;
					changed = true;
				}
			}
			if (this.place === "s" || this.place === "e" || this.place === "") {
				var upParams = this.insertFix(ctx1, canvas2, rect1, rect2, fixX, fixY - yMove, bestParams.scale);
				if (upParams.scale > bestParams.scale) {
					fixY -= yMove;
					bestParams = upParams;
					changed = true;
				}
				var downParams = this.insertFix(ctx1, canvas2, rect1, rect2, fixX, fixY + yMove, bestParams.scale);
				if (downParams.scale > bestParams.scale) {
					fixY += yMove;
					bestParams = downParams;
					changed = true;
				}
			}
		}
		xMove *= this.resContext.moveStepFactor;
		yMove *= this.resContext.moveStepFactor;
	}
	return bestParams;
};
ResInsert.prototype.render =
function(env, rect, shadeRect, clip, fitting) {
	var box = new ResRectangle(0, 0, this.widthPx(), this.heightPx());
	rect = rect.center(box);
	this.group1.render(env, rect, shadeRect, clip, fitting);
	var w2 = this.group2.widthPx();
	var h2 = this.group2.heightPx();
	var rect2 = new ResRectangle(rect.x + this.dynX, rect.y + this.dynY, w2, h2);
	this.group2.render(env, rect2, rect2, clip, fitting);
};
ResInsert.prototype.renderNotes =
function(env) {
	this.group1.renderNotes(env);
	this.group2.renderNotes(env);
};

ResModify.prototype.render =
function(env, rect, shadeRect, clip, fitting) {
	var box = new ResRectangle(0, 0, this.widthPx(), this.heightPx());
	rect = rect.center(box);
	var beforeShare = this.before / (this.before + 1 + this.after);
	var afterShare = this.after / (this.before + 1 + this.after);
	var aboveShare = this.above / (this.above + 1 + this.below);
	var belowShare = this.below / (this.above + 1 + this.below);
	var w = this.width === null ? this.group.widthPx() :
				this.resContext.emSizePx * this.dynScale * this.width;
	var h = this.height === null ? this.group.heightPx() :
				this.resContext.emSizePx * this.dynScale * this.height;
	var beforePart = beforeShare * w;
	var afterPart = afterShare * w;
	var abovePart = aboveShare * h;
	var belowPart = belowShare * h;
	if (this.omit && (beforePart > 0 || afterPart > 0 ||
				abovePart > 0 || belowPart > 0)) {
		if (clip === null)
			clip = rect;
		else
			clip = clip.intersect(rect);
	}
	rect = new ResRectangle(rect.x - beforePart, rect.y - abovePart, w, h);
	this.group.render(env, rect, shadeRect, clip, fitting);
	if (!fitting)
		ResShading.shadeBasicgroup(env, this, shadeRect); 
};
ResModify.prototype.renderNotes =
function(env) {
	this.group.renderNotes(env);
};

ResNote.prototype.render =
function(env, rect) {
	var str = this.displayString();
	var size = env.resContext.noteSizePx;
	var mirror = env.mirror;
	var color = this.color !== null ? this.color : env.resContext.noteColor;
	var margin = env.resContext.noteMargin;
	var testRect = ResCanvas.glyphRect(str, size, 1, "HieroglyphicPlain", 0, mirror);
	var fullWidth = testRect.width + 2*margin;
	var fullHeight = testRect.height + 2*margin;
	while (true) {
		var topRect = new ResRectangle(rect.x, rect.y-fullHeight/2,
				Math.max(fullWidth, rect.width), fullHeight);
		var bottomRect = new ResRectangle(rect.x, rect.y+rect.height-fullHeight/2,
				Math.max(fullWidth, rect.width), fullHeight);
		var leftRect = new ResRectangle(rect.x-fullWidth/2, rect.y,
				fullWidth, Math.max(fullHeight, rect.height));
		var rightRect = new ResRectangle(rect.x+rect.width-fullWidth/2, rect.y,
				fullWidth, Math.max(fullHeight, rect.height));
		if (env.isH) 
			var p = this.findFreeRectHor(env, topRect, fullWidth) || 
					this.findFreeRectHor(env, bottomRect, fullWidth) || 
					this.findFreeRectVert(env, leftRect, fullHeight) || 
					this.findFreeRectVert(env, rightRect, fullHeight);
		else
			var p = this.findFreeRectVert(env, leftRect, fullHeight) || 
					this.findFreeRectVert(env, rightRect, fullHeight)  || 
					this.findFreeRectHor(env, topRect, fullWidth) || 
					this.findFreeRectHor(env, bottomRect, fullWidth);
		if (p) {
			ResCanvas.printGlyph(env.ctx, p.x+margin, p.y+margin, testRect, str, size, 1, 
				"HieroglyphicPlain", color, 0, mirror);
			env.ensureRect(new ResRectangle(p.x+margin, p.y+margin, testRect.width, testRect.height));
			break;
		}
		rect = new ResRectangle(rect.x - testRect.width/2, rect.y - testRect.height/2, 
						rect.width + testRect.width, rect.height + testRect.height);
	}
};
ResNote.prototype.findFreeRectHor =
function(env, rect, width) {
	if (env.mirror)
		rect = rect.mirror(env.totalWidthPx);
	var x = Math.round(rect.x);
	var y = Math.round(rect.y);
	var halfX = Math.round(rect.x + rect.width/2 - width/2);
	var halfWidth = Math.round(rect.width/2 + width/2);
	var height = Math.round(rect.height);
	var left = new ResRectangle(x, y, halfWidth, height);
	var right = new ResRectangle(halfX, y, halfWidth, height);
	var pos = ResCanvas.findFreeRectRightLeft(env.ctx, env.totalWidthPx, env.totalHeightPx, left, width) ||
			ResCanvas.findFreeRectLeftRight(env.ctx, env.totalWidthPx, env.totalHeightPx, right, width);
	if (pos && env.mirror)
		pos = new ResPoint(env.totalWidthPx - pos.x - width, pos.y);
	return pos;
};
ResNote.prototype.findFreeRectVert =
function(env, rect, height) {
	if (env.mirror)
		rect = rect.mirror(env.totalWidthPx);
	var x = Math.round(rect.x);
	var y = Math.round(rect.y);
	var halfY = Math.round(rect.y + rect.height/2 - height/2);
	var halfHeight = Math.round(rect.height/2 + height/2);
	var width = Math.round(rect.width);
	var top = new ResRectangle(x, y, width, halfHeight);
	var bottom = new ResRectangle(x, halfY, width, halfHeight);
	var pos = ResCanvas.findFreeRectBottomTop(env.ctx, env.totalWidthPx, env.totalHeightPx, top, height) ||
			ResCanvas.findFreeRectTopBottom(env.ctx, env.totalWidthPx, env.totalHeightPx, bottom, height);
	if (pos && env.mirror)
		pos = new ResPoint(env.totalWidthPx - pos.x - width, pos.y);
	return pos;
};

/* res_web.js */

/////////////////////////////////////////////////////////////////////////////
// RES in web pages.

// Make canvas for all hieroglyphic.
function ResWeb() {
	var canvass = document.getElementsByTagName("canvas");
	for (var i = 0; i < canvass.length; i++) {
		var canvas = canvass[i];
		if (canvas.className.match(/\bres\b/)) 
			ResWeb.makeSometime(canvas);
	}
}
// Make canvas for hieroglyphic in element.
ResWeb.makeIn =
function(elem) {
	var canvass = elem.getElementsByTagName("canvas");
	for (var i = 0; i < canvass.length; i++) {
		var canvas = canvass[i];
		if (canvas.className.match(/\bres\b/))
			ResWeb.make(canvas);
	}
};

// Root function for web page.
ResWeb.init =
function() {
	ResWeb();
	ResWeb.mapSigns();
	ResWeb.mapTrans();
};

// Make canvas, as soon as possible.
ResWeb.makeSometime =
function(canvas) {
	ResWeb.waitForFonts(function(){ ResWeb.make(canvas); }, 0);
};
// Make canvas now.
ResWeb.make =
function(canvas) {
	var text = canvas.firstChild;
	var code = canvas.firstChild !== null ? canvas.firstChild.nodeValue : "";
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
				var frag = res_syntax.parse(code);
			} catch(err) {
				var frag = res_syntax.parse("\"?\"");
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
		console.log("seem unable to load fonts: " + ResWeb.fontsLoaded());
		alert("seem unable to load fonts; perhaps try again later?");
	} else {
		setTimeout(function(){ ResWeb.waitForFonts(f, c+1); }, 1000);
	}
};

/////////////////////////////////////////////////////////////////////////////
// Individual signs and transliteration.

ResWeb.mapSignsIn =
function(elem) {
	var spans = elem.getElementsByTagName("span");
	for (var i = 0; i < spans.length; i++) {
		var span = spans[i];
		if (span.classList.contains("res_sign")) {
			var code = span.firstChild.nodeValue;
			var key = ResContext.unMnemonic(code);
			key = ResContext.hieroPoints[key];
			if (key) 
				span.innerHTML = String.fromCharCode(key);
		}
	}
};
ResWeb.mapSigns =
function() {
	ResWeb.mapSignsIn(document);
};

ResWeb.mapTransIn =
function(elem) {
	var spans = elem.getElementsByTagName("span");
	for (var i = 0; i < spans.length; i++) {
		var span = spans[i];
		if (span.classList.contains("egytransl")) {
			var trans = span.firstChild.nodeValue;
			var uni = "";
			for (var j = 0; j < trans.length; j++) {
				if (trans[j] === "^" && j < trans.length-1) {
					j++;
					uni += ResWeb.transUnicode(trans[j], true);
				} else
					uni += ResWeb.transUnicode(trans[j], false);
			}
			span.innerHTML = uni;
		}
	}
};
ResWeb.mapTrans =
function() {
	ResWeb.mapTransIn(document);
};
ResWeb.transUnicode =
function(c, upper) {
	switch (c) {
		case 'A': return upper ? "\uA722" : "\uA723";
		case 'j': return upper ? "J" : "j";
		case 'i': return upper ? "I\u0313" : "i\u0313";
		case 'y': return upper ? "Y" : "y";
		case 'a': return upper ? "\uA724" : "\uA725";
		case 'w': return upper ? "W" : "w";
		case 'b': return upper ? "B" : "b";
		case 'p': return upper ? "P" : "p";
		case 'f': return upper ? "F" : "f";
		case 'm': return upper ? "M" : "m";
		case 'n': return upper ? "N" : "n";
		case 'r': return upper ? "R" : "r";
		case 'l': return upper ? "L" : "l";
		case 'h': return upper ? "H" : "h";
		case 'H': return upper ? "\u1E24" : "\u1E25";
		case 'x': return upper ? "\u1E2A" : "\u1E2B";
		case 'X': return upper ? "H\u0331" : "\u1E96";
		case 'z': return upper ? "Z" : "z";
		case 's': return upper ? "S" : "s";
		case 'S': return upper ? "\u0160" : "\u0161";
		case 'q': return upper ? "Q" : "q";
		case 'K': return upper ? "\u1E32" : "\u1E33";
		case 'k': return upper ? "K" : "k";
		case 'g': return upper ? "G" : "g";
		case 't': return upper ? "T" : "t";
		case 'T': return upper ? "\u1E6E" : "\u1E6F";
		case 'd': return upper ? "D" : "d";
		case 'D': return upper ? "\u1E0E" : "\u1E0F";
		default: return c;
	}
};
