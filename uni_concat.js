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

/* uni_aux.js */

/////////////////////////////////////////////////////////////////////////////
// Characters.

function Uni() {
}

Uni.vertCode = 0x13430;
Uni.horCode = 0x13431;
Uni.stCode = 0x13432;
Uni.sbCode = 0x13433;
Uni.etCode = 0x13434;
Uni.ebCode = 0x13435;
Uni.overlayCode = 0x13436;
Uni.beginCode = 0x13437;
Uni.endCode = 0x13438;
Uni.openCode = 0x13379;
Uni.closeCode = 0x1337A;

Uni.bmp = 0xE000;
Uni.smp = 0x13000;

Uni.intToHex =
function(v) {
	return "&#x" + v.toString(16) + ";";
};
Uni.intsToHex =
function(l) {
	var s = "";
	for (var i = 0; i < l.length; i++)
		s += Uni.intToHex(l[i]);
	return s;
};

Uni.intsToSMP =
function(l) {
	var s = "";
	for (var i = 0; i < l.length; i++)
		s += String.fromCodePoint(l[i]);
	return s;
};

Uni.intBMPtoSMP =
function(i) {
	return i - Uni.bmp + Uni.smp;
};

Uni.replaceDec =
function(match, s) {
    return String.fromCharCode(parseInt(s) - Uni.smp + Uni.bmp);
};
Uni.replaceHex =
function(match, s) {
    return String.fromCharCode(parseInt(s, 16) - Uni.smp + Uni.bmp);
};
Uni.digitsToBMP =
function(s) {
    s = s.replace(/\s/g, "");
    s = s.replace(/&#x([a-f0-9]+);/g, Uni.replaceHex);
    s = s.replace(/&#([0-9]+);/g, Uni.replaceDec);
    return s;
};

Uni.SMPtoBMP =
function(s) {
    var uni = "";
    for (let c of s) {
        var p = c.codePointAt(0);
        if (Uni.smp <= p)
            uni += String.fromCharCode(p - Uni.smp + Uni.bmp);
        else
            uni += c;
    }
    return uni;
};

/////////////////////////////////////////////////////////////////////////////
// Distinguished classes of characters for insertion.

Uni.lowerStartTopCorner = [
"A16","A29","A36","C4","F5","G3","G6a","G7","G7a","G7b","G8",
"G16","G32","G40","U1","U2"];
Uni.raiseStartBottomCorner = [
"A17","A24","A25","A26","A27","A28","A30","A33","A59","A66","A68",
"D54a","D57","D59",
"E1","E2","E3","E6","E7","E8","E10","E11","E13","E14","E17",
"E17a","E20","E22","E28","E29","E30","E31","E32","E33","E38",
"F8","F22","F26",
"G1","G2","G4","G5","G6","G9","G14","G15","G17","G18","G19",
"G20","G20a","G21","G22","G23","G25","G26a","G27","G28","G29",
"G30","G31","G33","G34","G35","G36","G36a","G37","G37a","G38",
"G39","G41","G42","G43","G44","G45","G45a",
"H2","I7","M3a","O35","T11a","T32","U13","U17","V7b","W25"];

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

/* uni_struct.js */

ResContext.hieroReversePoints = {};
for (var code in ResContext.hieroPoints)
	ResContext.hieroReversePoints[ResContext.hieroPoints[code]] = code;

function UniFragment() {
}

UniFragment.makeFragment =
function(g) {
	if (g === null) {
		var sw = new ResSwitch(null);
		return new ResFragment({l:[],sw:sw,h:null});
	} else if (g instanceof ResHieroglyphic) {
		var sw = new ResSwitch(null);
		return new ResFragment({l:[],sw:sw,h:g});
	} else {
		var g1 = new ResHieroglyphic({g:g});
		var sw = new ResSwitch(null);
		return new ResFragment({l:[],sw:sw,h:g1});
	}
};

UniFragment.addGroup =
function(g1, g2) {
	if (g2 instanceof ResHieroglyphic) {
		var sw = new ResSwitch(null);
		g2.addGroup(g1, [], sw);
		return g2;
	} else {
		var g = new ResHieroglyphic({g:g2});
		var sw = new ResSwitch(null);
		g.addGroup(g1, [], sw);
		return g;
	}
};

UniFragment.makeVerticalGroup =
function(gs) {
	var g1 = new ResVertsubgroup({b:gs[0]});
	var g2 = new ResVertsubgroup({b:gs[1]});
	var sw = new ResSwitch(null);
	var g = new ResVertgroup({g1:g1,l:[],sw:sw,g2:g2}); 
	for (var i = 2; i < gs.length; i++) {
		var gSub = new ResVertsubgroup({b:gs[i]});
		var swSub = new ResSwitch(null);
		g.addGroup([], swSub, gSub);
	}
	return g;
};

UniFragment.makeHorizontalGroup =
function(gs) {
	var g1 = new ResHorsubgroup({b:gs[0]});
	var g2 = new ResHorsubgroup({b:gs[1]});
	var sw = new ResSwitch(null);
	var g = new ResHorgroup({g1:g1,l:[],sw:sw,g2:g2}); 
	for (var i = 2; i < gs.length; i++) {
		var gSub = new ResHorsubgroup({b:gs[i]});
		var swSub = new ResSwitch(null);
		g.addGroup([], swSub, gSub);
	}
	return g;
};

UniFragment.makeInsertionGroup =
function(g, ins) {
	var iST = ins[0];
	var iSB = ins[1];
	var iET = ins[2];
	var iEB = ins[3];
	var group = g;
	if (iST) {
		var sw1 = new ResSwitch(null);
		var sw2 = new ResSwitch(null);
		var sw3 = new ResSwitch(null);
		var arg = new ResArg("ts",null);
		group = new ResInsert({l:[arg],sw1:sw1,g1:group,sw2:sw2,g2:iST,sw3:sw3});
	}
	if (iSB) {
		var sw1 = new ResSwitch(null);
		var sw2 = new ResSwitch(null);
		var sw3 = new ResSwitch(null);
		var arg = new ResArg("bs",null);
		group = new ResInsert({l:[arg],sw1:sw1,g1:group,sw2:sw2,g2:iSB,sw3:sw3});
	}
	if (iET) {
		var sw1 = new ResSwitch(null);
		var sw2 = new ResSwitch(null);
		var sw3 = new ResSwitch(null);
		var arg = new ResArg("te",null);
		group = new ResInsert({l:[arg],sw1:sw1,g1:group,sw2:sw2,g2:iET,sw3:sw3});
	}
	if (iEB) {
		var sw1 = new ResSwitch(null);
		var sw2 = new ResSwitch(null);
		var sw3 = new ResSwitch(null);
		var arg = new ResArg("be",null);
		group = new ResInsert({l:[arg],sw1:sw1,g1:group,sw2:sw2,g2:iEB,sw3:sw3});
	}
	return group;
};

UniFragment.makeCoreGroup =
function(g1, g2) {
	var sw1 = new ResSwitch(null);
	var sw2 = new ResSwitch(null);
	var sw3 = new ResSwitch(null);
	return new ResStack({l:[],sw1:sw1,g1:g1,sw2:sw2,g2:g2,sw3:sw3});
};

UniFragment.addHorizontalGroup =
function(g1, g2) {
	if (!UniFragment.isVerticalSubgroup(g2))
		throw new Error("Wrong vertical subgroup");
	if (g1 instanceof ResVertgroup) {
		var gsub2 = new ResVertsubgroup({b:g2});
		var sw = new ResSwitch(null);
		g1.addGroup([], sw, gsub2);
		return g1;
	} else {
		var gsub1 = new ResVertsubgroup({b:g1});
		var gsub2 = new ResVertsubgroup({b:g2});
		var sw = new ResSwitch(null);
		return new ResVertgroup({g1:gsub1,l:[],sw:sw,g2:gsub2});
	}
};

UniFragment.addBasicGroup =
function(g1, g2) {
	if (!UniFragment.isHorizontalSubgroup(g2))
		throw new Error("Wrong horizontal subgroup");
	if (g1 instanceof ResHorgroup) {
		var gsub2 = new ResHorsubgroup({b:g2});
		var sw = new ResSwitch(null);
		g1.addGroup([], sw, gsub2);
		return g1;
	} else {
		var gsub1 = new ResHorsubgroup({b:g1});
		var gsub2 = new ResHorsubgroup({b:g2});
		var sw = new ResSwitch(null);
		return new ResHorgroup({g1:gsub1,l:[],sw:sw,g2:gsub2});
	} 
};

UniFragment.makeBasicGroup =
function(g, iST, iSB, iET, iEB) {
	if ((iST || iSB || iET || iEB) && !UniFragment.isCoreGroup(g))
		throw new Error("Wrong core group");
	var group = g;
	if (iST) {
		var sw1 = new ResSwitch(null);
		var sw2 = new ResSwitch(null);
		var sw3 = new ResSwitch(null);
		var arg = new ResArg("ts",null);
		group = new ResInsert({l:[arg],sw1:sw1,g1:group,sw2:sw2,g2:iST,sw3:sw3});
	}
	if (iSB) {
		var sw1 = new ResSwitch(null);
		var sw2 = new ResSwitch(null);
		var sw3 = new ResSwitch(null);
		var arg = new ResArg("bs",null);
		group = new ResInsert({l:[arg],sw1:sw1,g1:group,sw2:sw2,g2:iSB,sw3:sw3});
	}
	if (iET) {
		var sw1 = new ResSwitch(null);
		var sw2 = new ResSwitch(null);
		var sw3 = new ResSwitch(null);
		var arg = new ResArg("te",null);
		group = new ResInsert({l:[arg],sw1:sw1,g1:group,sw2:sw2,g2:iET,sw3:sw3});
	}
	if (iEB) {
		var sw1 = new ResSwitch(null);
		var sw2 = new ResSwitch(null);
		var sw3 = new ResSwitch(null);
		var arg = new ResArg("be",null);
		group = new ResInsert({l:[arg],sw1:sw1,g1:group,sw2:sw2,g2:iEB,sw3:sw3});
	}
	return group;
};

UniFragment.makeStack =
function(g1, g2) {
	if (!UniFragment.isFlatHorizontalGroup(g1))
		throw new Error("Wrong first argument of stack");
	if (!UniFragment.isFlatVerticalGroup(g2))
		throw new Error("Wrong second argument of stack");
	UniFragment.makeTightGroup(g1);
	UniFragment.makeTightGroup(g2);
	var sw1 = new ResSwitch(null);
	var sw2 = new ResSwitch(null);
	var sw3 = new ResSwitch(null);
	return new ResStack({l:[],sw1:sw1,g1:g1,sw2:sw2,g2:g2,sw3:sw3});
};

UniFragment.makeSign =
function(text) {
	var code = text.codePointAt(0);
	var name = ResContext.hieroReversePoints[code];
	var sw = new ResSwitch(null);
	return new ResNamedglyph({na:name,l:[],no:[],sw:sw});
};

UniFragment.isVerticalSubgroup =
function(g) {
	return UniFragment.isBasicGroup(g) || g instanceof ResHorgroup;
};

UniFragment.isHorizontalSubgroup =
function(g) {
	return UniFragment.isBasicGroup(g) || g instanceof ResVertgroup;
};

UniFragment.isBasicGroup =
function(g) {
	return UniFragment.isCoreGroup(g) || g instanceof ResInsert;
};

UniFragment.isCoreGroup =
function(g) {
	return g instanceof ResNamedglyph || g instanceof ResStack;
};

UniFragment.isFlatHorizontalGroup =
function(g) { 
	if (g instanceof ResNamedglyph)
		return true;
	else if (!(g instanceof ResHorgroup))
		return false;
	else {
		for (var i = 0; i < g.groups.length; i++)
			if (!(g.groups[i].group instanceof ResNamedglyph))
				return false;
		return true;
	}
};

UniFragment.isFlatVerticalGroup =
function(g) { 
	if (g instanceof ResNamedglyph)
		return true;
	else if (!(g instanceof ResVertgroup))
		return false;
	else {
		for (var i = 0; i < g.groups.length; i++)
			if (!(g.groups[i].group instanceof ResNamedglyph))
				return false;
		return true;
	}
};

UniFragment.isBetweenFlatGroups =
function(op) {
	var parent = op.editParent;
	if (parent instanceof ResFragment) {
		var i = parent.hiero.ops.indexOf(op);
		var group1 = parent.hiero.groups[i];
		var group2 = parent.hiero.groups[i+1];
		return UniFragment.isFlatHorizontalGroup(group1) && 
				UniFragment.isFlatVerticalGroup(group2);
	} else {
		var i = parent.ops.indexOf(op);
		var group1 = parent.groups[i].group;
		var group2 = parent.groups[i+1].group;
		return UniFragment.isFlatHorizontalGroup(group1) &&
				UniFragment.isFlatVerticalGroup(group2);
	}
};

UniFragment.isAfterInsertable =
function(op) {
	var parent = op.editParent;
	if (parent instanceof ResFragment) {
		var i = parent.hiero.ops.indexOf(op);
		var group = parent.hiero.groups[i];
		return ResTree.objInClasses(group, [ResInsert, ResNamedglyph, ResStack]);
	} else {
		var i = parent.ops.indexOf(op);
		var group = parent.groups[i].group;
		return ResTree.objInClasses(group, [ResInsert, ResNamedglyph, ResStack]);
	}
};

UniFragment.makeTightGroup =
function(g) {
	if (g instanceof ResHorgroup || g instanceof ResVertgroup)
		for (var i = 0; i < g.ops.length; i++)
			g.ops[i].sep = 0;
};

UniFragment.isSign =
function(g) {
	return g instanceof ResNamedglyph;
};

ResFragment.prototype.toUni =
function() {
	if (this.hiero !== null)
		return this.hiero.toUni();
	else
		return [];
};
ResFragment.prototype.finetuneUni =
function() {
	var sw = new ResSwitch(null);
	var args = this.direction ?
		[new ResArg(this.direction,null)] : [];
	if (this.hiero !== null) {
		var g1 = this.hiero.finetuneUni();
		return new ResFragment({l:args,sw:sw,h:g1});
	} else {
		return new ResFragment({l:args,sw:sw,h:null});
	}
};
ResHieroglyphic.prototype.toUni =
function() {
	var s = this.groups[0].toUni();
	for (var i = 0; i < this.ops.length; i++)
		s = s.concat(this.groups[i+1].toUni());
	return s;
};
ResHieroglyphic.prototype.finetuneUni =
function() {
	var g = this.groups[this.groups.length-1].finetuneUni();
	var h = new ResHieroglyphic({g:g});
	for (var i = this.groups.length-2; i >= 0; i--) {
		gSub = this.groups[i].finetuneUni();
		swSub = new ResSwitch(null);
		h.addGroup(gSub, [], swSub);
	}
	return h;
};
ResVertgroup.prototype.toUni =
function() {
	var s = this.groups[0].toUni();
	for (var i = 0; i < this.ops.length; i++)
		s = s.concat([Uni.vertCode], this.groups[i+1].toUni());
	return s;
};
ResVertgroup.prototype.finetuneUni =
function() {
	var g1 = this.groups[0].finetuneUni();
	var g2 = this.groups[1].finetuneUni();
	var sw = new ResSwitch(null);
	var g = new ResVertgroup({g1:g1,l:[],sw:sw,g2:g2});
	for (var i = 2; i < this.groups.length; i++) {
		var gSub = this.groups[i].finetuneUni();
		var swSub = new ResSwitch(null);
		g.addGroup([], swSub, gSub);
	}
	return g;
};
ResVertgroup.prototype.finetuneUniStacked =
function() {
	var g1 = this.groups[0].finetuneUni();
	var g2 = this.groups[1].finetuneUni();
	var sw = new ResSwitch(null);
	var nosep = new ResArg("sep",0);
	var g = new ResVertgroup({g1:g1,l:[nosep],sw:sw,g2:g2});
	for (var i = 2; i < this.groups.length; i++) {
		var gSub = this.groups[i].finetuneUni();
		var swSub = new ResSwitch(null);
		var nosepSub = new ResArg("sep",0);
		g.addGroup([nosepSub], swSub, gSub);
	}
	return g;
};
ResVertsubgroup.prototype.toUni =
function() {
	return this.group.toUni();
};
ResVertsubgroup.prototype.finetuneUni =
function() {
	return new ResVertsubgroup({b:this.group.finetuneUni()});
};
ResHorgroup.prototype.toUni =
function() {
	var s = this.groups[0].toUni();
	for (var i = 0; i < this.ops.length; i++)
		s = s.concat([Uni.horCode], this.groups[i+1].toUni());
	return s;
};
ResHorgroup.prototype.finetuneUni =
function() {
	var g1 = this.groups[0].finetuneUni();
	var g2 = this.groups[1].finetuneUni();
	var sw = new ResSwitch(null);
	var g = new ResHorgroup({g1:g1,l:[],sw:sw,g2:g2});
	for (var i = 2; i < this.groups.length; i++) {
		var gSub = this.groups[i].finetuneUni();
		var swSub = new ResSwitch(null);
		g.addGroup([], swSub, gSub);
	}
	return g;
};
ResHorgroup.prototype.finetuneUniStacked =
function() {
	var g1 = this.groups[0].finetuneUni();
	var g2 = this.groups[1].finetuneUni();
	var sw = new ResSwitch(null);
	var nosep = new ResArg("sep",0);
	var g = new ResHorgroup({g1:g1,l:[nosep],sw:sw,g2:g2});
	for (var i = 2; i < this.groups.length; i++) {
		var gSub = this.groups[i].finetuneUni();
		var swSub = new ResSwitch(null);
		var nosepSub = new ResArg("sep",0);
		g.addGroup([nosepSub], swSub, gSub);
	}
	return g;
};
ResHorsubgroup.prototype.toUni =
function() {
	if (this.group instanceof ResVertgroup)
		return [Uni.beginCode].concat(this.group.toUni(), [Uni.endCode]);
	else
		return this.group.toUni();
};
ResHorsubgroup.prototype.finetuneUni =
function() {
	return new ResHorsubgroup({b:this.group.finetuneUni()});
};
ResNamedglyph.prototype.toUniTuple =
function() {
	var context = new ResContext();
	var safeName = this.name === "\"?\"" ? "Z9" : this.name;
	var key = context.unBracket(context.unMnemonic(safeName));
	key = context.hieroPoints[key];
	key = key ? key : context.hieroPoints["Z9"];
	key = Uni.intBMPtoSMP(key);
	return [[key], [], [], [], []];
};
ResNamedglyph.prototype.toUni =
function() {
	return ResStack.joinTuple(this.toUniTuple());
};
ResNamedglyph.prototype.finetuneUni =
function() {
	var sw = new ResSwitch(null);
	return new ResNamedglyph({na:this.name,l:[],no:[],sw:sw});
};
ResEmptyglyph.prototype.toUniTuple =
function() {
	throw new Error("Cannot translate empty");
};
ResEmptyglyph.prototype.toUni =
function() {
	throw new Error("Cannot translate empty");
};
ResBox.prototype.toUniTuple =
function() {
	return [[Uni.openCode].concat(this.hiero ? this.hiero.toUni() : [], [Uni.closeCode]),
				[], [], [], []];
};
ResBox.prototype.toUni =
function() {
	return ResStack.joinTuple(this.toUniTuple());
};
ResStack.prototype.toUniTuple =
function() {
	var arg1 = this.group1 instanceof ResNamedglyph ?
		this.group1.toUni() :
		[Uni.beginCode].concat(this.group1.toUni(), [Uni.endCode]);
	var arg2 = this.group2 instanceof ResNamedglyph ?
		this.group2.toUni() :
		[Uni.beginCode].concat(this.group2.toUni(), [Uni.endCode]);
	return [arg1.concat([Uni.overlayCode], arg2), [], [], [], []];
};
ResStack.prototype.toUni =
function() {
	return ResStack.joinTuple(this.toUniTuple());
};
ResStack.prototype.finetuneUni =
function() {
	var sw1 = new ResSwitch(null);
	if (this.group1 instanceof ResHorgroup)
		var g1 = this.group1.finetuneUniStacked();
	else
		var g1 = this.group1.finetuneUni();
	var sw2 = new ResSwitch(null);
	if (this.group2 instanceof ResVertgroup)
		var g2 = this.group2.finetuneUniStacked();
	else
		var g2 = this.group2.finetuneUni();
	var sw3 = new ResSwitch(null);
	return new ResStack({l:[],sw1:sw1,g1:g1,sw2:sw2,g2:g2,sw3:sw3});
};
ResInsert.prototype.toUniTuple =
function() {
	var arg1 = this.group1.toUniTuple();
	var arg2 = this.group2 instanceof ResNamedglyph || this.group2 instanceof ResStack ?
		this.group2.toUni() :
		[Uni.beginCode].concat(this.group2.toUni(), [Uni.endCode]);
	if (this.place === "ts")
		return [arg1[0], arg2, arg1[2], arg1[3], arg1[4]]; 
	else if (this.place === "bs")
		return [arg1[0], arg1[1], arg2, arg1[3], arg1[4]]; 
	else if (this.place === "te")
		return [arg1[0], arg1[1], arg1[2], arg2, arg1[4]]; 
	else 
		return [arg1[0], arg1[1], arg1[2], arg1[3], arg2]; 
};
ResInsert.prototype.toUni =
function() {
	return ResStack.joinTuple(this.toUniTuple());
};
ResInsert.prototype.finetuneUni =
function() {
	var sw1 = new ResSwitch(null);
	var g1 = this.group1.finetuneUni();
	var sw2 = new ResSwitch(null);
	var g2 = this.group2.finetuneUni();
	var sw3 = new ResSwitch(null);
	var place = this.place;
	var name = ResInsert.mainName(this);
	var args = [];
	args.push(new ResArg("sep",0.2));
	if (place === "ts" && Uni.lowerStartTopCorner.indexOf(name) >= 0) {
		place = "s";
		args.push(new ResArg("y", 0.2));
	}
	if (place === "bs" && Uni.raiseStartBottomCorner.indexOf(name) >= 0) {
		place = "s";
		args.push(new ResArg("y", 0.8));
	}
	args.push(new ResArg(place, null));
	return new ResInsert({l:args,sw1:sw1,g1:g1,sw2:sw2,g2:g2,sw3:sw3});
};
ResModify.prototype.toUniTuple =
function() {
	return this.group.toUniTuple();
};
ResModify.prototype.toUni =
function() {
	return ResStack.joinTuple(this.toUniTuple());
};
ResStack.joinTuple =
function(t) {
	var s = t[0];
	if (t[1].length > 0)
		s = s.concat([Uni.stCode], t[1]);
	if (t[2].length > 0)
		s = s.concat([Uni.sbCode], t[2]);
	if (t[3].length > 0)
		s = s.concat([Uni.etCode], t[3]);
	if (t[4].length > 0)
		s = s.concat([Uni.ebCode], t[4]);
	return s;
};

ResInsert.mainName =
function(g) {
	if (g instanceof ResNamedglyph) {
		return ResContext.unMnemonic(g.name);
	} else if (g instanceof ResInsert) {
		return ResInsert.mainName(g.group1);
	} else
		return "None";
};

/* uni_syntax.js */

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
var uni_syntax = (function(){
var o=function(k,v,o,l){for(o=o||{},l=k.length;l--;o[k[l]]=v);return o},$V0=[1,16],$V1=[1,13],$V2=[4,15,42],$V3=[2,18],$V4=[2,19],$V5=[2,37],$V6=[2,20],$V7=[1,22],$V8=[1,23],$V9=[1,24],$Va=[1,25],$Vb=[1,26],$Vc=[2,61],$Vd=[1,28],$Ve=[4,13,15,22,42],$Vf=[2,38],$Vg=[2,39],$Vh=[2,64],$Vi=[2,36],$Vj=[1,36],$Vk=[4,13,15,42],$Vl=[2,22],$Vm=[2,41],$Vn=[1,61],$Vo=[1,63],$Vp=[1,70],$Vq=[1,72],$Vr=[1,79],$Vs=[1,81],$Vt=[2,21],$Vu=[2,40],$Vv=[1,92],$Vw=[1,96],$Vx=[1,97],$Vy=[1,98],$Vz=[1,99],$VA=[1,100],$VB=[1,102],$VC=[13,22],$VD=[2,25],$VE=[2,26],$VF=[4,13,15,22,37,38,42],$VG=[2,48],$VH=[4,13,15,22,36,37,38,42],$VI=[2,54],$VJ=[2,55],$VK=[2,56],$VL=[2,57],$VM=[2,58],$VN=[4,13,15,22,38,42],$VO=[2,50],$VP=[1,116],$VQ=[2,52],$VR=[1,123],$VS=[2,47],$VT=[4,13,15,22,31,36,37,38,42],$VU=[2,59],$VV=[2,62],$VW=[2,63],$VX=[1,135],$VY=[2,12],$VZ=[1,143],$V_=[1,149],$V$=[1,165],$V01=[1,167],$V11=[1,174],$V21=[1,176],$V31=[1,183],$V41=[1,185],$V51=[2,23],$V61=[2,24],$V71=[1,193],$V81=[1,197],$V91=[1,199],$Va1=[1,202],$Vb1=[1,203],$Vc1=[1,204],$Vd1=[1,205],$Ve1=[1,206],$Vf1=[1,216],$Vg1=[1,218],$Vh1=[1,221],$Vi1=[2,46],$Vj1=[1,230],$Vk1=[1,232],$Vl1=[1,235],$Vm1=[1,243],$Vn1=[1,246],$Vo1=[1,254],$Vp1=[13,17],$Vq1=[1,259],$Vr1=[13,17,22],$Vs1=[13,22,37,38],$Vt1=[13,22,36,37,38],$Vu1=[13,22,38],$Vv1=[1,276],$Vw1=[1,283],$Vx1=[13,22,31,36,37,38],$Vy1=[2,49],$Vz1=[2,27],$VA1=[1,301],$VB1=[2,28],$VC1=[1,319],$VD1=[1,321],$VE1=[1,328],$VF1=[1,330],$VG1=[1,337],$VH1=[1,339],$VI1=[2,45],$VJ1=[2,51],$VK1=[2,53],$VL1=[2,15],$VM1=[1,363],$VN1=[2,13],$VO1=[2,14],$VP1=[2,35],$VQ1=[1,372],$VR1=[1,376],$VS1=[1,378],$VT1=[1,381],$VU1=[1,391],$VV1=[1,393],$VW1=[1,396],$VX1=[1,405],$VY1=[1,407],$VZ1=[1,410],$V_1=[1,418],$V$1=[1,421],$V02=[1,429],$V12=[2,44],$V22=[2,43],$V32=[13,17,22,37,38],$V42=[13,17,22,36,37,38],$V52=[13,17,22,38],$V62=[1,448],$V72=[1,455],$V82=[2,42],$V92=[1,466],$Va2=[1,475],$Vb2=[1,484],$Vc2=[1,491],$Vd2=[13,17,22,31,36,37,38],$Ve2=[2,29],$Vf2=[2,31],$Vg2=[2,30],$Vh2=[2,32],$Vi2=[1,528],$Vj2=[1,532],$Vk2=[1,534],$Vl2=[1,537],$Vm2=[1,547],$Vn2=[1,549],$Vo2=[1,552],$Vp2=[1,561],$Vq2=[1,563],$Vr2=[1,566],$Vs2=[1,574],$Vt2=[1,577],$Vu2=[2,16],$Vv2=[2,17],$Vw2=[1,589],$Vx2=[1,600],$Vy2=[1,609],$Vz2=[1,618],$VA2=[1,625],$VB2=[1,680],$VC2=[1,689],$VD2=[1,698],$VE2=[1,705];
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"fragment":3,"EOF":4,"groups":5,"group":6,"vertical_group":7,"horizontal_group":8,"basic_group":9,"sign":10,"vert_subgroup":11,"rest_vert_group":12,"VERT":13,"br_vertical_group":14,"BEGIN":15,"rest_br_vert_group":16,"END":17,"br_flat_vertical_group":18,"rest_br_flat_vert_group":19,"hor_subgroup":20,"rest_hor_group":21,"HOR":22,"br_horizontal_group":23,"rest_br_hor_group":24,"br_flat_horizontal_group":25,"rest_br_flat_hor_group":26,"core_group":27,"insertion_group":28,"insertion":29,"br_insertion_group":30,"ST":31,"in_subgroup":32,"opt_sb_insertion":33,"opt_et_insertion":34,"opt_eb_insertion":35,"SB":36,"ET":37,"EB":38,"flat_horizontal_group":39,"OVERLAY":40,"flat_vertical_group":41,"SIGN":42,"$accept":0,"$end":1},
terminals_: {2:"error",4:"EOF",13:"VERT",15:"BEGIN",17:"END",22:"HOR",31:"ST",36:"SB",37:"ET",38:"EB",40:"OVERLAY",42:"SIGN"},
productions_: [0,[3,1],[3,2],[5,1],[5,2],[6,1],[6,1],[6,1],[6,1],[7,2],[12,3],[12,2],[14,3],[16,3],[16,3],[18,3],[19,3],[19,3],[11,1],[11,1],[11,1],[8,2],[8,2],[21,3],[21,3],[21,2],[21,2],[23,3],[23,3],[24,3],[24,3],[24,3],[24,3],[25,3],[26,3],[26,3],[20,1],[20,1],[9,1],[9,1],[28,2],[28,2],[30,4],[30,4],[29,5],[29,4],[29,3],[29,2],[33,0],[33,2],[34,0],[34,2],[35,0],[35,2],[32,1],[32,1],[32,1],[32,1],[32,1],[27,3],[39,1],[39,1],[41,1],[41,1],[10,1]],
performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate /* action[1] */, $$ /* vstack */, _$ /* lstack */) {
/* this == yyval */

var $0 = $$.length - 1;
switch (yystate) {
case 1:
return UniFragment.makeFragment(null);
break;
case 2:
return UniFragment.makeFragment($$[$0-1]);
break;
case 3: case 5: case 6: case 7: case 8: case 18: case 19: case 20: case 36: case 37: case 38: case 39: case 49: case 51: case 53: case 54: case 55: case 56: case 57: case 58: case 60: case 61: case 62: case 63:
this.$ = $$[$0];
break;
case 4:
this.$ = UniFragment.addGroup($$[$0-1], $$[$0]);
break;
case 9: case 12: case 15:
this.$ = UniFragment.makeVerticalGroup([$$[$0-1]].concat($$[$0]));
break;
case 10: case 13: case 16: case 23: case 24: case 29: case 30: case 34:
this.$ = [$$[$0-1]].concat($$[$0]);
break;
case 11: case 25: case 26:
this.$ = [$$[$0]];
break;
case 14: case 17: case 31: case 32: case 35:
this.$ = [$$[$0-1]];
break;
case 21: case 22: case 27: case 28: case 33:
this.$ = UniFragment.makeHorizontalGroup([$$[$0-1]].concat($$[$0]));
break;
case 40: case 41:
this.$ = UniFragment.makeInsertionGroup($$[$0-1], $$[$0]);
break;
case 42: case 43:
this.$ = UniFragment.makeInsertionGroup($$[$0-2], $$[$0-1]);
break;
case 44:
this.$ = [$$[$0-3], $$[$0-2], $$[$0-1], $$[$0]];
break;
case 45:
this.$ = [null, $$[$0-2], $$[$0-1], $$[$0]];
break;
case 46:
this.$ = [null, null, $$[$0-1], $$[$0]];
break;
case 47:
this.$ = [null, null, null, $$[$0]];
break;
case 48: case 50: case 52:
this.$ = null;
break;
case 59:
this.$ = UniFragment.makeCoreGroup($$[$0-2], $$[$0]);
break;
case 64:
this.$ = UniFragment.makeSign(yytext);
break;
}
},
table: [{3:1,4:[1,2],5:3,6:4,7:5,8:6,9:7,10:8,11:9,14:14,15:$V0,20:10,25:17,27:11,28:12,39:15,42:$V1},{1:[3]},{1:[2,1]},{4:[1,18]},{4:[2,3],5:19,6:4,7:5,8:6,9:7,10:8,11:9,14:14,15:$V0,20:10,25:17,27:11,28:12,39:15,42:$V1},o($V2,[2,5]),o($V2,[2,6],{13:$V3}),o($V2,[2,7],{13:$V4,22:$V5}),o($V2,[2,8],{21:20,29:21,13:$V6,22:$V7,31:$V8,36:$V9,37:$Va,38:$Vb,40:$Vc}),{12:27,13:$Vd},{21:29,22:$V7},o($Ve,$Vf,{29:30,31:$V8,36:$V9,37:$Va,38:$Vb}),o($Ve,$Vg),o([4,13,15,22,31,36,37,38,40,42],$Vh),{22:$Vi},{40:[1,31]},{8:34,9:35,10:33,11:32,14:14,15:$V0,20:37,25:17,27:38,28:39,39:40,42:$Vj},{40:[2,60]},{1:[2,2]},{4:[2,4]},o($Vk,$Vl),o($Ve,$Vm),{9:44,10:42,14:43,15:[1,45],20:41,25:17,27:11,28:12,39:15,42:$V1},{10:51,14:47,15:[1,52],23:48,25:17,27:50,30:49,32:46,39:53,42:[1,54]},{10:60,14:56,15:$Vn,23:57,25:17,27:59,30:58,32:55,39:62,42:$Vo},{10:69,14:65,15:$Vp,23:66,25:17,27:68,30:67,32:64,39:71,42:$Vq},{10:78,14:74,15:$Vr,23:75,25:17,27:77,30:76,32:73,39:80,42:$Vs},o($V2,[2,9]),{8:83,9:84,10:85,11:82,14:14,15:$V0,20:10,25:17,27:11,28:12,39:15,42:$V1},o($Vk,$Vt),o($Ve,$Vu),{10:88,15:[1,89],18:87,41:86,42:[1,90]},{13:$Vv,16:91},{13:$V6,21:94,22:$Vw,26:93,29:95,31:$Vx,36:$Vy,37:$Vz,38:$VA,40:$Vc},{13:$V3},{13:$V4,22:$V5},o([13,22,31,36,37,38,40],$Vh),{21:101,22:$VB},o($VC,$Vf,{29:103,31:$Vx,36:$Vy,37:$Vz,38:$VA}),o($VC,$Vg),{40:[1,104]},o($Vk,$VD,{21:105,22:$V7}),o($Vk,$VE,{29:21,21:106,22:$V7,31:$V8,36:$V9,37:$Va,38:$Vb,40:$Vc}),o($Ve,$Vi),o($Ve,$V5),{8:34,9:35,10:33,11:107,14:14,15:$V0,20:37,25:17,27:38,28:39,39:40,42:$Vj},o($VF,$VG,{33:108,36:[1,109]}),o($VH,$VI),o($VH,$VJ),o($VH,$VK),o($VH,$VL),o($VH,$VM,{40:$Vc}),{8:34,9:35,10:112,11:110,14:14,15:$V0,20:111,25:17,27:113,28:39,39:40,42:$Vj},{40:[1,114]},o([4,13,15,22,36,37,38,40,42],$Vh),o($VN,$VO,{34:115,37:$VP}),o($VF,$VI),o($VF,$VJ),o($VF,$VK),o($VF,$VL),o($VF,$VM,{40:$Vc}),{8:34,9:35,10:119,11:117,14:14,15:$V0,20:118,25:17,27:120,28:39,39:40,42:$Vj},{40:[1,121]},o([4,13,15,22,37,38,40,42],$Vh),o($Ve,$VQ,{35:122,38:$VR}),o($VN,$VI),o($VN,$VJ),o($VN,$VK),o($VN,$VL),o($VN,$VM,{40:$Vc}),{8:34,9:35,10:126,11:124,14:14,15:$V0,20:125,25:17,27:127,28:39,39:40,42:$Vj},{40:[1,128]},o([4,13,15,22,38,40,42],$Vh),o($Ve,$VS),o($Ve,$VI),o($Ve,$VJ),o($Ve,$VK),o($Ve,$VL),o($Ve,$VM,{40:$Vc}),{8:34,9:35,10:130,11:107,14:14,15:$V0,20:129,25:17,27:131,28:39,39:40,42:$Vj},{40:[1,132]},o([4,13,15,22,40,42],$Vh),o($V2,[2,11],{12:133,13:$Vd}),o($Vk,$V3),o($Vk,$V4,{22:$V5}),o($Vk,$V6,{21:20,29:21,22:$V7,31:$V8,36:$V9,37:$Va,38:$Vb,40:$Vc}),o($VT,$VU),o($VT,$VV),o($VT,$VW),{10:134,42:$VX},o($VT,$Vh),{22:$VY},{8:137,9:138,10:139,11:136,14:14,15:$V0,20:140,25:17,27:141,28:142,39:144,42:$VZ},{40:[2,33]},{13:$Vl},o($VC,$Vm),{9:148,10:145,14:147,15:$V_,20:146,25:17,27:38,28:39,39:40,42:$VZ},{10:155,14:151,15:[1,156],23:152,25:17,27:154,30:153,32:150,39:157,42:[1,158]},{10:164,14:160,15:$V$,23:161,25:17,27:163,30:162,32:159,39:166,42:$V01},{10:173,14:169,15:$V11,23:170,25:17,27:172,30:171,32:168,39:175,42:$V21},{10:182,14:178,15:$V31,23:179,25:17,27:181,30:180,32:177,39:184,42:$V41},{13:$Vt},{9:148,10:186,14:147,15:$V_,20:146,25:17,27:38,28:39,39:40,42:$Vj},o($VC,$Vu),{10:189,15:[1,190],18:188,41:187,42:[1,191]},o($Vk,$V51),o($Vk,$V61),{13:$V71,16:192},o($VN,$VO,{34:194,37:$VP}),{10:60,14:56,15:$Vn,23:57,25:17,27:59,30:58,32:195,39:62,42:$Vo},{13:$V81,16:196},{21:101,22:$V91,24:198},{13:$V6,21:94,22:$Va1,24:200,26:93,29:201,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($VC,$Vf,{29:207,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1}),{10:210,15:[1,211],18:209,41:208,42:[1,212]},o($Ve,$VQ,{35:213,38:$VR}),{10:69,14:65,15:$Vp,23:66,25:17,27:68,30:67,32:214,39:71,42:$Vq},{13:$Vf1,16:215},{21:101,22:$Vg1,24:217},{13:$V6,21:94,22:$Vh1,24:219,26:93,29:220,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($VC,$Vf,{29:222,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1}),{10:225,15:[1,226],18:224,41:223,42:[1,227]},o($Ve,$Vi1),{10:78,14:74,15:$Vr,23:75,25:17,27:77,30:76,32:228,39:80,42:$Vs},{13:$Vj1,16:229},{21:101,22:$Vk1,24:231},{13:$V6,21:94,22:$Vl1,24:233,26:93,29:234,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($VC,$Vf,{29:236,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1}),{10:239,15:[1,240],18:238,41:237,42:[1,241]},{21:101,22:$Vm1,24:242},{13:$V6,21:94,22:$Vn1,24:244,26:93,29:245,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($VC,$Vf,{29:247,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1}),{10:250,15:[1,251],18:249,41:248,42:[1,252]},o($V2,[2,10]),{13:$Vo1,19:253},{13:$Vh},{13:$Vv,16:255,17:[1,256]},o($Vp1,$V3),o($Vp1,$V4,{22:$V5}),o($Vp1,$V6,{21:257,29:258,22:$Vq1,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc}),{21:260,22:$Vq1},o($Vr1,$Vf,{29:261,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1}),o($Vr1,$Vg),o([13,17,22,31,36,37,38,40],$Vh),{40:[1,262]},{13:$VE,17:[1,264],21:265,22:$Vw,26:263,29:95,31:$Vx,36:$Vy,37:$Vz,38:$VA,40:$Vc},{13:$VD,21:266,22:$VB},o($VC,$Vi),o($VC,$V5),{8:34,9:35,10:33,11:267,14:14,15:$V0,20:37,25:17,27:38,28:39,39:40,42:$Vj},o($Vs1,$VG,{33:268,36:[1,269]}),o($Vt1,$VI),o($Vt1,$VJ),o($Vt1,$VK),o($Vt1,$VL),o($Vt1,$VM,{40:$Vc}),{8:34,9:35,10:272,11:270,14:14,15:$V0,20:271,25:17,27:273,28:39,39:40,42:$Vj},{40:[1,274]},o([13,22,36,37,38,40],$Vh),o($Vu1,$VO,{34:275,37:$Vv1}),o($Vs1,$VI),o($Vs1,$VJ),o($Vs1,$VK),o($Vs1,$VL),o($Vs1,$VM,{40:$Vc}),{8:34,9:35,10:279,11:277,14:14,15:$V0,20:278,25:17,27:280,28:39,39:40,42:$Vj},{40:[1,281]},o([13,22,37,38,40],$Vh),o($VC,$VQ,{35:282,38:$Vw1}),o($Vu1,$VI),o($Vu1,$VJ),o($Vu1,$VK),o($Vu1,$VL),o($Vu1,$VM,{40:$Vc}),{8:34,9:35,10:286,11:284,14:14,15:$V0,20:285,25:17,27:287,28:39,39:40,42:$Vj},{40:[1,288]},o([13,22,38,40],$Vh),o($VC,$VS),o($VC,$VI),o($VC,$VJ),o($VC,$VK),o($VC,$VL),o($VC,$VM,{40:$Vc}),{8:34,9:35,10:290,11:267,14:14,15:$V0,20:289,25:17,27:291,28:39,39:40,42:$Vj},{40:[1,292]},o([13,22,40],$Vh),{13:$VE,21:265,22:$VB,29:95,31:$Vx,36:$Vy,37:$Vz,38:$VA,40:$Vc},o($Vx1,$VU),o($Vx1,$VV),o($Vx1,$VW),{10:293,42:$VX},o($Vx1,$Vh),o($Ve,$VY),{8:137,9:138,10:139,11:294,14:14,15:$V0,20:140,25:17,27:141,28:142,39:144,42:$VZ},o($Ve,$VQ,{35:295,38:$VR}),o($VF,$Vy1),o($VH,$VY),{8:137,9:138,10:139,11:296,14:14,15:$V0,20:140,25:17,27:141,28:142,39:144,42:$VZ},o($VH,$Vz1),{9:300,10:298,14:299,15:$VA1,20:297,25:17,27:141,28:142,39:144,42:$VZ},o($VH,$VB1),o($VC,$Vm,{17:[1,302]}),{9:300,10:303,14:299,15:$VA1,20:297,25:17,27:141,28:142,39:144,42:$VZ},{10:309,14:305,15:[1,310],23:306,25:17,27:308,30:307,32:304,39:311,42:[1,312]},{10:318,14:314,15:$VC1,23:315,25:17,27:317,30:316,32:313,39:320,42:$VD1},{10:327,14:323,15:$VE1,23:324,25:17,27:326,30:325,32:322,39:329,42:$VF1},{10:336,14:332,15:$VG1,23:333,25:17,27:335,30:334,32:331,39:338,42:$VH1},o($VC,$Vu,{17:[1,340]}),o($VH,$VU),o($VH,$VV),o($VH,$VW),{10:341,42:$VX},o($VH,$Vh),o($Ve,$VI1),o($VN,$VJ1),o($VF,$VY),{8:137,9:138,10:139,11:342,14:14,15:$V0,20:140,25:17,27:141,28:142,39:144,42:$VZ},o($VF,$Vz1),{9:300,10:344,14:299,15:$VA1,20:343,25:17,27:141,28:142,39:144,42:$VZ},o($VF,$VB1),o($VC,$Vm,{17:[1,345]}),{9:300,10:346,14:299,15:$VA1,20:343,25:17,27:141,28:142,39:144,42:$VZ},o($VC,$Vu,{17:[1,347]}),o($VF,$VU),o($VF,$VV),o($VF,$VW),{10:348,42:$VX},o($VF,$Vh),o($Ve,$VK1),o($VN,$VY),{8:137,9:138,10:139,11:349,14:14,15:$V0,20:140,25:17,27:141,28:142,39:144,42:$VZ},o($VN,$Vz1),{9:300,10:351,14:299,15:$VA1,20:350,25:17,27:141,28:142,39:144,42:$VZ},o($VN,$VB1),o($VC,$Vm,{17:[1,352]}),{9:300,10:353,14:299,15:$VA1,20:350,25:17,27:141,28:142,39:144,42:$VZ},o($VC,$Vu,{17:[1,354]}),o($VN,$VU),o($VN,$VV),o($VN,$VW),{10:355,42:$VX},o($VN,$Vh),o($Ve,$Vz1),{9:300,10:357,14:299,15:$VA1,20:356,25:17,27:141,28:142,39:144,42:$VZ},o($Ve,$VB1),o($VC,$Vm,{17:[1,358]}),{9:300,10:359,14:299,15:$VA1,20:356,25:17,27:141,28:142,39:144,42:$VZ},o($VC,$Vu,{17:[1,360]}),o($Ve,$VU),o($Ve,$VV),o($Ve,$VW),{10:361,42:$VX},o($Ve,$Vh),o($VT,$VL1),{10:362,42:$VM1},{22:$VN1},{22:$VO1},o($Vp1,$Vl),o($Vr1,$Vm),{9:300,10:365,14:299,15:$VA1,20:364,25:17,27:141,28:142,39:144,42:$VZ},o($Vp1,$Vt),o($Vr1,$Vu),{10:368,15:[1,369],18:367,41:366,42:[1,370]},{40:[2,34]},{40:$VP1},{13:$V61},{13:$V51},{13:$VQ1,16:371},o($Vu1,$VO,{34:373,37:$Vv1}),{10:164,14:160,15:$V$,23:161,25:17,27:163,30:162,32:374,39:166,42:$V01},{13:$VR1,16:375},{21:101,22:$VS1,24:377},{13:$V6,21:94,22:$VT1,24:379,26:93,29:380,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($VC,$Vf,{29:382,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1}),{10:385,15:[1,386],18:384,41:383,42:[1,387]},o($VC,$VQ,{35:388,38:$Vw1}),{10:173,14:169,15:$V11,23:170,25:17,27:172,30:171,32:389,39:175,42:$V21},{13:$VU1,16:390},{21:101,22:$VV1,24:392},{13:$V6,21:94,22:$VW1,24:394,26:93,29:395,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($VC,$Vf,{29:397,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1}),{10:400,15:[1,401],18:399,41:398,42:[1,402]},o($VC,$Vi1),{10:182,14:178,15:$V31,23:179,25:17,27:181,30:180,32:403,39:184,42:$V41},{13:$VX1,16:404},{21:101,22:$VY1,24:406},{13:$V6,21:94,22:$VZ1,24:408,26:93,29:409,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($VC,$Vf,{29:411,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1}),{10:414,15:[1,415],18:413,41:412,42:[1,416]},{21:101,22:$V_1,24:417},{13:$V6,21:94,22:$V$1,24:419,26:93,29:420,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($VC,$Vf,{29:422,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1}),{10:425,15:[1,426],18:424,41:423,42:[1,427]},{13:$V02,19:428},{13:$V71,16:430,17:[1,431]},o($Ve,$V12),{13:$V81,16:432,17:[1,433]},{13:$VD,17:[1,435],21:266,22:$V91,24:434},{13:$VE,17:[1,437],21:265,22:$V91,24:436,29:258,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($Vr1,$Vi),o($Vr1,$V5),{8:34,9:35,10:33,11:438,14:14,15:$V0,20:37,25:17,27:38,28:39,39:40,42:$Vj},o($VH,$V22),{13:$VE,17:[1,439],21:265,22:$Va1,24:436,26:263,29:258,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($V32,$VG,{33:440,36:[1,441]}),o($V42,$VI),o($V42,$VJ),o($V42,$VK),o($V42,$VL),o($V42,$VM,{40:$Vc}),{8:34,9:35,10:444,11:442,14:14,15:$V0,20:443,25:17,27:445,28:39,39:40,42:$Vj},{40:[1,446]},o([13,17,22,36,37,38,40],$Vh),o($V52,$VO,{34:447,37:$V62}),o($V32,$VI),o($V32,$VJ),o($V32,$VK),o($V32,$VL),o($V32,$VM,{40:$Vc}),{8:34,9:35,10:451,11:449,14:14,15:$V0,20:450,25:17,27:452,28:39,39:40,42:$Vj},{40:[1,453]},o([13,17,22,37,38,40],$Vh),o($Vr1,$VQ,{35:454,38:$V72}),o($V52,$VI),o($V52,$VJ),o($V52,$VK),o($V52,$VL),o($V52,$VM,{40:$Vc}),{8:34,9:35,10:458,11:456,14:14,15:$V0,20:457,25:17,27:459,28:39,39:40,42:$Vj},{40:[1,460]},o([13,17,22,38,40],$Vh),o($Vr1,$VS),o($Vr1,$VI),o($Vr1,$VJ),o($Vr1,$VK),o($Vr1,$VL),o($Vr1,$VM,{40:$Vc}),{8:34,9:35,10:462,11:438,14:14,15:$V0,20:461,25:17,27:463,28:39,39:40,42:$Vj},{40:[1,464]},o([13,17,22,40],$Vh),o($VH,$V82),{13:$V92,19:465},{13:$Vf1,16:467,17:[1,468]},{13:$VD,17:[1,470],21:266,22:$Vg1,24:469},{13:$VE,17:[1,472],21:265,22:$Vg1,24:471,29:258,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($VF,$V22),{13:$VE,17:[1,473],21:265,22:$Vh1,24:471,26:263,29:258,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($VF,$V82),{13:$Va2,19:474},{13:$Vj1,16:476,17:[1,477]},{13:$VD,17:[1,479],21:266,22:$Vk1,24:478},{13:$VE,17:[1,481],21:265,22:$Vk1,24:480,29:258,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($VN,$V22),{13:$VE,17:[1,482],21:265,22:$Vl1,24:480,26:263,29:258,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($VN,$V82),{13:$Vb2,19:483},{13:$VD,17:[1,486],21:266,22:$Vm1,24:485},{13:$VE,17:[1,488],21:265,22:$Vm1,24:487,29:258,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($Ve,$V22),{13:$VE,17:[1,489],21:265,22:$Vn1,24:487,26:263,29:258,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($Ve,$V82),{13:$Vc2,19:490},{13:$Vo1,17:[1,493],19:492},o($Vp1,$Vh),o($Vp1,$VD,{21:494,22:$Vq1}),o($Vp1,$VE,{29:258,21:495,22:$Vq1,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc}),o($Vd2,$VU),o($Vd2,$VV),o($Vd2,$VW),{10:496,42:$VX},o($Vd2,$Vh),o($VC,$VY),{8:137,9:138,10:139,11:497,14:14,15:$V0,20:140,25:17,27:141,28:142,39:144,42:$VZ},o($VC,$VQ,{35:498,38:$Vw1}),o($Vs1,$Vy1),o($Vt1,$VY),{8:137,9:138,10:139,11:499,14:14,15:$V0,20:140,25:17,27:141,28:142,39:144,42:$VZ},o($Vt1,$Vz1),{9:300,10:501,14:299,15:$VA1,20:500,25:17,27:141,28:142,39:144,42:$VZ},o($Vt1,$VB1),o($VC,$Vm,{17:[1,502]}),{9:300,10:503,14:299,15:$VA1,20:500,25:17,27:141,28:142,39:144,42:$VZ},o($VC,$Vu,{17:[1,504]}),o($Vt1,$VU),o($Vt1,$VV),o($Vt1,$VW),{10:505,42:$VX},o($Vt1,$Vh),o($VC,$VI1),o($Vu1,$VJ1),o($Vs1,$VY),{8:137,9:138,10:139,11:506,14:14,15:$V0,20:140,25:17,27:141,28:142,39:144,42:$VZ},o($Vs1,$Vz1),{9:300,10:508,14:299,15:$VA1,20:507,25:17,27:141,28:142,39:144,42:$VZ},o($Vs1,$VB1),o($VC,$Vm,{17:[1,509]}),{9:300,10:510,14:299,15:$VA1,20:507,25:17,27:141,28:142,39:144,42:$VZ},o($VC,$Vu,{17:[1,511]}),o($Vs1,$VU),o($Vs1,$VV),o($Vs1,$VW),{10:512,42:$VX},o($Vs1,$Vh),o($VC,$VK1),o($Vu1,$VY),{8:137,9:138,10:139,11:513,14:14,15:$V0,20:140,25:17,27:141,28:142,39:144,42:$VZ},o($Vu1,$Vz1),{9:300,10:515,14:299,15:$VA1,20:514,25:17,27:141,28:142,39:144,42:$VZ},o($Vu1,$VB1),o($VC,$Vm,{17:[1,516]}),{9:300,10:517,14:299,15:$VA1,20:514,25:17,27:141,28:142,39:144,42:$VZ},o($VC,$Vu,{17:[1,518]}),o($Vu1,$VU),o($Vu1,$VV),o($Vu1,$VW),{10:519,42:$VX},o($Vu1,$Vh),o($VC,$Vz1),{9:300,10:521,14:299,15:$VA1,20:520,25:17,27:141,28:142,39:144,42:$VZ},o($VC,$VB1),o($VC,$Vm,{17:[1,522]}),{9:300,10:523,14:299,15:$VA1,20:520,25:17,27:141,28:142,39:144,42:$VZ},o($VC,$Vu,{17:[1,524]}),o($VC,$VU),o($VC,$VV),o($VC,$VW),{10:525,42:$VX},o($VC,$Vh),o($Vx1,$VL1),{10:526,42:$VM1},o($Ve,$VN1),o($Ve,$VO1),o($VH,$VN1),o($VH,$VO1),o($VH,$Ve2),o($VH,$Vf2),o($VH,$Vg2),o($VH,$Vh2),{13:$Vi2,16:527},o($VH,$Vh2,{40:$VP1}),o($V52,$VO,{34:529,37:$V62}),{10:318,14:314,15:$VC1,23:315,25:17,27:317,30:316,32:530,39:320,42:$VD1},{13:$Vj2,16:531},{21:101,22:$Vk2,24:533},{13:$V6,21:94,22:$Vl2,24:535,26:93,29:536,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($VC,$Vf,{29:538,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1}),{10:541,15:[1,542],18:540,41:539,42:[1,543]},o($Vr1,$VQ,{35:544,38:$V72}),{10:327,14:323,15:$VE1,23:324,25:17,27:326,30:325,32:545,39:329,42:$VF1},{13:$Vm2,16:546},{21:101,22:$Vn2,24:548},{13:$V6,21:94,22:$Vo2,24:550,26:93,29:551,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($VC,$Vf,{29:553,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1}),{10:556,15:[1,557],18:555,41:554,42:[1,558]},o($Vr1,$Vi1),{10:336,14:332,15:$VG1,23:333,25:17,27:335,30:334,32:559,39:338,42:$VH1},{13:$Vp2,16:560},{21:101,22:$Vq2,24:562},{13:$V6,21:94,22:$Vr2,24:564,26:93,29:565,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($VC,$Vf,{29:567,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1}),{10:570,15:[1,571],18:569,41:568,42:[1,572]},{21:101,22:$Vs2,24:573},{13:$V6,21:94,22:$Vt2,24:575,26:93,29:576,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($VC,$Vf,{29:578,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1}),{10:581,15:[1,582],18:580,41:579,42:[1,583]},o($VH,$VL1),{10:584,42:$VM1},o($VF,$VN1),o($VF,$VO1),o($VF,$Ve2),o($VF,$Vf2),o($VF,$Vg2),o($VF,$Vh2),o($VF,$Vh2,{40:$VP1}),o($VF,$VL1),{10:585,42:$VM1},o($VN,$VN1),o($VN,$VO1),o($VN,$Ve2),o($VN,$Vf2),o($VN,$Vg2),o($VN,$Vh2),o($VN,$Vh2,{40:$VP1}),o($VN,$VL1),{10:586,42:$VM1},o($Ve,$Ve2),o($Ve,$Vf2),o($Ve,$Vg2),o($Ve,$Vh2),o($Ve,$Vh2,{40:$VP1}),o($Ve,$VL1),{10:587,42:$VM1},o($VT,$Vu2),o($VT,$Vv2),o($Vp1,$V51),o($Vp1,$V61),{13:$Vw2,19:588},{13:$VQ1,16:590,17:[1,591]},o($VC,$V12),{13:$VR1,16:592,17:[1,593]},{13:$VD,17:[1,595],21:266,22:$VS1,24:594},{13:$VE,17:[1,597],21:265,22:$VS1,24:596,29:258,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($Vt1,$V22),{13:$VE,17:[1,598],21:265,22:$VT1,24:596,26:263,29:258,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($Vt1,$V82),{13:$Vx2,19:599},{13:$VU1,16:601,17:[1,602]},{13:$VD,17:[1,604],21:266,22:$VV1,24:603},{13:$VE,17:[1,606],21:265,22:$VV1,24:605,29:258,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($Vs1,$V22),{13:$VE,17:[1,607],21:265,22:$VW1,24:605,26:263,29:258,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($Vs1,$V82),{13:$Vy2,19:608},{13:$VX1,16:610,17:[1,611]},{13:$VD,17:[1,613],21:266,22:$VY1,24:612},{13:$VE,17:[1,615],21:265,22:$VY1,24:614,29:258,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($Vu1,$V22),{13:$VE,17:[1,616],21:265,22:$VZ1,24:614,26:263,29:258,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($Vu1,$V82),{13:$Vz2,19:617},{13:$VD,17:[1,620],21:266,22:$V_1,24:619},{13:$VE,17:[1,622],21:265,22:$V_1,24:621,29:258,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($VC,$V22),{13:$VE,17:[1,623],21:265,22:$V$1,24:621,26:263,29:258,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($VC,$V82),{13:$VA2,19:624},{13:$V02,17:[1,627],19:626},o($Vr1,$VY),{8:137,9:138,10:139,11:628,14:14,15:$V0,20:140,25:17,27:141,28:142,39:144,42:$VZ},o($Vr1,$VQ,{35:629,38:$V72}),o($V32,$Vy1),o($V42,$VY),{8:137,9:138,10:139,11:630,14:14,15:$V0,20:140,25:17,27:141,28:142,39:144,42:$VZ},o($V42,$Vz1),{9:300,10:632,14:299,15:$VA1,20:631,25:17,27:141,28:142,39:144,42:$VZ},o($V42,$VB1),o($VC,$Vm,{17:[1,633]}),{9:300,10:634,14:299,15:$VA1,20:631,25:17,27:141,28:142,39:144,42:$VZ},o($VC,$Vu,{17:[1,635]}),o($V42,$VU),o($V42,$VV),o($V42,$VW),{10:636,42:$VX},o($V42,$Vh),o($Vr1,$VI1),o($V52,$VJ1),o($V32,$VY),{8:137,9:138,10:139,11:637,14:14,15:$V0,20:140,25:17,27:141,28:142,39:144,42:$VZ},o($V32,$Vz1),{9:300,10:639,14:299,15:$VA1,20:638,25:17,27:141,28:142,39:144,42:$VZ},o($V32,$VB1),o($VC,$Vm,{17:[1,640]}),{9:300,10:641,14:299,15:$VA1,20:638,25:17,27:141,28:142,39:144,42:$VZ},o($VC,$Vu,{17:[1,642]}),o($V32,$VU),o($V32,$VV),o($V32,$VW),{10:643,42:$VX},o($V32,$Vh),o($Vr1,$VK1),o($V52,$VY),{8:137,9:138,10:139,11:644,14:14,15:$V0,20:140,25:17,27:141,28:142,39:144,42:$VZ},o($V52,$Vz1),{9:300,10:646,14:299,15:$VA1,20:645,25:17,27:141,28:142,39:144,42:$VZ},o($V52,$VB1),o($VC,$Vm,{17:[1,647]}),{9:300,10:648,14:299,15:$VA1,20:645,25:17,27:141,28:142,39:144,42:$VZ},o($VC,$Vu,{17:[1,649]}),o($V52,$VU),o($V52,$VV),o($V52,$VW),{10:650,42:$VX},o($V52,$Vh),o($Vr1,$Vz1),{9:300,10:652,14:299,15:$VA1,20:651,25:17,27:141,28:142,39:144,42:$VZ},o($Vr1,$VB1),o($VC,$Vm,{17:[1,653]}),{9:300,10:654,14:299,15:$VA1,20:651,25:17,27:141,28:142,39:144,42:$VZ},o($VC,$Vu,{17:[1,655]}),o($Vr1,$VU),o($Vr1,$VV),o($Vr1,$VW),{10:656,42:$VX},o($Vr1,$Vh),{13:$V92,17:[1,658],19:657},{13:$Va2,17:[1,660],19:659},{13:$Vb2,17:[1,662],19:661},{13:$Vc2,17:[1,664],19:663},o($Vd2,$VL1),{10:665,42:$VM1},o($VC,$VN1),o($VC,$VO1),o($Vt1,$VN1),o($Vt1,$VO1),o($Vt1,$Ve2),o($Vt1,$Vf2),o($Vt1,$Vg2),o($Vt1,$Vh2),o($Vt1,$Vh2,{40:$VP1}),o($Vt1,$VL1),{10:666,42:$VM1},o($Vs1,$VN1),o($Vs1,$VO1),o($Vs1,$Ve2),o($Vs1,$Vf2),o($Vs1,$Vg2),o($Vs1,$Vh2),o($Vs1,$Vh2,{40:$VP1}),o($Vs1,$VL1),{10:667,42:$VM1},o($Vu1,$VN1),o($Vu1,$VO1),o($Vu1,$Ve2),o($Vu1,$Vf2),o($Vu1,$Vg2),o($Vu1,$Vh2),o($Vu1,$Vh2,{40:$VP1}),o($Vu1,$VL1),{10:668,42:$VM1},o($VC,$Ve2),o($VC,$Vf2),o($VC,$Vg2),o($VC,$Vh2),o($VC,$Vh2,{40:$VP1}),o($VC,$VL1),{10:669,42:$VM1},o($Vx1,$Vu2),o($Vx1,$Vv2),{13:$Vi2,16:670,17:[1,671]},o($Vr1,$V12),{13:$Vj2,16:672,17:[1,673]},{13:$VD,17:[1,675],21:266,22:$Vk2,24:674},{13:$VE,17:[1,677],21:265,22:$Vk2,24:676,29:258,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($V42,$V22),{13:$VE,17:[1,678],21:265,22:$Vl2,24:676,26:263,29:258,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($V42,$V82),{13:$VB2,19:679},{13:$Vm2,16:681,17:[1,682]},{13:$VD,17:[1,684],21:266,22:$Vn2,24:683},{13:$VE,17:[1,686],21:265,22:$Vn2,24:685,29:258,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($V32,$V22),{13:$VE,17:[1,687],21:265,22:$Vo2,24:685,26:263,29:258,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($V32,$V82),{13:$VC2,19:688},{13:$Vp2,16:690,17:[1,691]},{13:$VD,17:[1,693],21:266,22:$Vq2,24:692},{13:$VE,17:[1,695],21:265,22:$Vq2,24:694,29:258,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($V52,$V22),{13:$VE,17:[1,696],21:265,22:$Vr2,24:694,26:263,29:258,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($V52,$V82),{13:$VD2,19:697},{13:$VD,17:[1,700],21:266,22:$Vs2,24:699},{13:$VE,17:[1,702],21:265,22:$Vs2,24:701,29:258,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($Vr1,$V22),{13:$VE,17:[1,703],21:265,22:$Vt2,24:701,26:263,29:258,31:$Vb1,36:$Vc1,37:$Vd1,38:$Ve1,40:$Vc},o($Vr1,$V82),{13:$VE2,19:704},o($VH,$Vu2),o($VH,$Vv2),o($VF,$Vu2),o($VF,$Vv2),o($VN,$Vu2),o($VN,$Vv2),o($Ve,$Vu2),o($Ve,$Vv2),{13:$Vw2,17:[1,707],19:706},{13:$Vx2,17:[1,709],19:708},{13:$Vy2,17:[1,711],19:710},{13:$Vz2,17:[1,713],19:712},{13:$VA2,17:[1,715],19:714},o($Vr1,$VN1),o($Vr1,$VO1),o($V42,$VN1),o($V42,$VO1),o($V42,$Ve2),o($V42,$Vf2),o($V42,$Vg2),o($V42,$Vh2),o($V42,$Vh2,{40:$VP1}),o($V42,$VL1),{10:716,42:$VM1},o($V32,$VN1),o($V32,$VO1),o($V32,$Ve2),o($V32,$Vf2),o($V32,$Vg2),o($V32,$Vh2),o($V32,$Vh2,{40:$VP1}),o($V32,$VL1),{10:717,42:$VM1},o($V52,$VN1),o($V52,$VO1),o($V52,$Ve2),o($V52,$Vf2),o($V52,$Vg2),o($V52,$Vh2),o($V52,$Vh2,{40:$VP1}),o($V52,$VL1),{10:718,42:$VM1},o($Vr1,$Ve2),o($Vr1,$Vf2),o($Vr1,$Vg2),o($Vr1,$Vh2),o($Vr1,$Vh2,{40:$VP1}),o($Vr1,$VL1),{10:719,42:$VM1},o($Vd2,$Vu2),o($Vd2,$Vv2),o($Vt1,$Vu2),o($Vt1,$Vv2),o($Vs1,$Vu2),o($Vs1,$Vv2),o($Vu1,$Vu2),o($Vu1,$Vv2),o($VC,$Vu2),o($VC,$Vv2),{13:$VB2,17:[1,721],19:720},{13:$VC2,17:[1,723],19:722},{13:$VD2,17:[1,725],19:724},{13:$VE2,17:[1,727],19:726},o($V42,$Vu2),o($V42,$Vv2),o($V32,$Vu2),o($V32,$Vv2),o($V52,$Vu2),o($V52,$Vv2),o($Vr1,$Vu2),o($Vr1,$Vv2)],
defaultActions: {2:[2,1],14:[2,36],17:[2,60],18:[2,2],19:[2,4],34:[2,18],91:[2,12],93:[2,33],94:[2,22],101:[2,21],135:[2,64],255:[2,13],256:[2,14],263:[2,34],264:[2,35],265:[2,24],266:[2,23]},
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
case 0:return 42
break;
case 1:return 13
break;
case 2:return 22
break;
case 3:return 31
break;
case 4:return 36
break;
case 5:return 37
break;
case 6:return 38
break;
case 7:return 40
break;
case 8:return 15
break;
case 9:return 17
break;
case 10:return 4;
break;
}
},
rules: [/^(?:[\uE000-\uE42E])/,/^(?:\uE430)/,/^(?:\uE431)/,/^(?:\uE432)/,/^(?:\uE433)/,/^(?:\uE434)/,/^(?:\uE435)/,/^(?:\uE436)/,/^(?:\uE437)/,/^(?:\uE438)/,/^(?:$)/],
conditions: {"INITIAL":{"rules":[0,1,2,3,4,5,6,7,8,9,10],"inclusive":true}}
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
exports.parser = uni_syntax;
exports.Parser = uni_syntax.Parser;
exports.parse = function () { return uni_syntax.parse.apply(uni_syntax, arguments); };
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

/* uni_web.js */

/////////////////////////////////////////////////////////////////////////////
// RES in web pages.

// Make canvas for all hieroglyphic.
function UniWeb() {
	var canvass = document.getElementsByTagName("canvas");
	for (var i = 0; i < canvass.length; i++) {
		var canvas = canvass[i];
		if (canvas.classList.contains("res_uni")) 
			UniWeb.makeSometime(canvas);
	}
}
// Make canvas for hieroglyphic in element.
UniWeb.makeIn =
function(elem) {
	var canvass = elem.getElementsByTagName("canvas");
	for (var i = 0; i < canvass.length; i++) {
		var canvas = canvass[i];
		if (canvas.classList.contains("res_uni"))
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
		if (span.classList.contains("res_sign")) {
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
