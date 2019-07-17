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
