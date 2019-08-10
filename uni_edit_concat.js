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

/* res_tree.js */

// HTML tree for fragment.

function ResTree(frag, parent, fontSize) {
	frag.makeTree(fontSize);
	ResTree.embedTree(frag, parent);
}
ResTree.remakeTreeUpwardsFrom =
function(frag, parent, elem) {
	frag.remakeTreeUpwardsFrom(elem);
	ResTree.embedTree(frag, parent);
};
ResTree.embedTree =
function(frag, parent) {
	while (parent.firstChild)
		parent.removeChild(parent.firstChild);
	var children = frag.editChildren;
	if (frag.globals.isRL())
		children = ResTree.reverse(children);
	var ul = document.createElement('ul');
	for (var i = 0; i < children.length; i++)
		ul.appendChild(children[i].editNode);
	parent.appendChild(ul);
};

ResTree.parseRes =
function(res) {
	return res_syntax.parse(res);
};

ResTree.makeNode = 
function(elem, label, res) {
	var children = elem.editChildren;
	var root = elem.editRoot;
	if (root.globals.isRL())
		children = ResTree.reverse(children);
	var li = document.createElement('li');
	var a = document.createElement('a');
	var id = "" + (++root.editLabelSize);
	a.id = id;
	a.addEventListener('click', function() { ResEdit.handleNodeClick(id); });
	root.editLabelToElem[id] = elem;
	if (label !== null) {
		var div = document.createElement('div');
		div.className = 'common_edit_node_label';
		var labelText = document.createTextNode(label);
		div.appendChild(labelText);
		a.appendChild(div);
	} else if (res !== null) {
		res = root.headerString() + res;
		var div = document.createElement('div');
		div.className = 'common_edit_node_label';
		var canvas = document.createElement('canvas');
		try {
			var frag = ResTree.parseRes(res);
		} catch(err) {
			var frag = res_syntax.parse('\"?\"');
		}
		frag.render(canvas, root.editTreeSize);
		div.appendChild(canvas);
		a.appendChild(div);
	}
	li.appendChild(a);
	if (children.length > 0) {
		var ul = document.createElement('ul');
		for (var i = 0; i < children.length; i++)
			ul.appendChild(children[i].editNode);
		li.appendChild(ul);
	}
	return {li: li, div: div, canvas: canvas};
};
ResTree.redrawNodeCanvas =
function(elem, res) {
	var canvas = elem.editCanvas;
	var root = elem.editRoot;
	res = root.headerString() + res;
	try {
		var frag = ResTree.parseRes(res);
	} catch(err) {
		var frag = res_syntax.parse('\"?\"');
	}
	frag.render(canvas, root.editTreeSize);
};
ResTree.redrawNodeLabel =
function(div, label) {
	div.innerHTML = label;
};
ResTree.reverse =
function(l) {
	var rev = [];
	for (var i = l.length-1; i >= 0; i--) 
		rev.push(l[i]);
	return rev;
};
ResTree.makeFocus =
function(elem, isFoc) {
	var node = elem.editNode;
	if (!node)
		return;
	for (var i = 0; i < node.children.length; i++) {
		var child = node.children[i];
		if (child.tagName.toLowerCase() === 'a') {
			child.className = isFoc ? 'common_edit_focus' : "";
			if (isFoc) {
				var container = ResEdit.getElem('tree_panel');
				var containerRect = container.getBoundingClientRect();
				var rect = child.getBoundingClientRect();
				var containerMiddle = containerRect.left + containerRect.width/2;
				var rectMiddle = rect.left + rect.width/2;
				container.scrollLeft += rectMiddle - containerMiddle;
			}
		}
	}
};

// Building tree for GUI editing.

ResFragment.prototype.makeTree =
function(fontSize) {
	this.editRoot = this;
	this.editTreeSize = fontSize;
	this.editFocus = null;
	this.releaseFocus();
	this.setupEditing();
	this.editLabelToElem = {};
	this.editLabelSize = 0;
	this.connectTree();
	this.makeNodes();
};
ResFragment.prototype.connectTree =
function() {
	this.switchs.connectTree(this, this, this);
	if (this.hiero !== null)
		this.hiero.connectTree(this, this);
	this.editChildren = this.getChildren();
};
ResFragment.prototype.makeNodes =
function() {
	this.switchs.makeNode();
	if (this.hiero !== null)
		this.hiero.makeNodes();
};
ResFragment.prototype.releaseFocus =
function() {
	if (this.editFocus !== null)
		ResTree.makeFocus(this.editFocus, false);
	this.editFocus = null;
	ResEdit.disableStructureButtons();
	ResEdit.disableParams();
};
ResFragment.prototype.remakeTreeUpwardsFrom =
function(elem) {
	while (elem && elem.makeNode) {
		elem.makeNode();
		elem = elem.structureParent || elem.editParent;
	}
};
ResFragment.prototype.redrawNodesUpwards =
function() {
	this.redrawNodesUpwardsFrom(this.editFocus);
};
ResFragment.prototype.redrawNodesUpwardsFrom =
function(elem) {
	while (elem && elem.redrawNode) {
		elem.redrawNode();
		elem = elem.editParent;
	}
};
ResFragment.prototype.getChildren =
function() {
	var children = [];
	if (this.switchs.toShow())
		children.push(this.switchs);
	if (this.hiero !== null) {
		var hChilds = this.hiero.getChildren();
		for (var i = 0; i < hChilds.length; i++)
			children.push(hChilds[i]);
	}
	return children;
};
ResFragment.prototype.setEditFocusToId =
function(id) {
	var elem = this.editLabelToElem[id];
	this.setEditFocusToElem(elem);
};
ResFragment.prototype.setEditFocusToElem =
function(elem) {
	this.prepareFocusToElem(elem);
	this.finalizeFocus();
};
ResFragment.prototype.prepareFocusToElem =
function(elem) {
	this.releaseFocus();
	this.editFocus = elem;
};
ResFragment.prototype.finalizeFocus =
function() {
	if (this.editFocus !== null) {
		ResTree.makeFocus(this.editFocus, true);
		this.editFocus.setupEditing();
	} else
		this.setupEditing();
};
ResFragment.prototype.moveStart =
function() {
	if (this.editChildren.length > 0)
		this.setEditFocusToElem(this.editChildren[0]);
};
ResFragment.prototype.moveEnd =
function() {
	if (this.editChildren.length > 0)
		this.setEditFocusToElem(this.editChildren[this.editChildren.length-1]);
};
ResFragment.prototype.moveUp =
function() {
	if (this.editFocus !== null && this.editFocus.editParent !== null &&
			this.editFocus.editParent !== this)
		this.setEditFocusToElem(this.editFocus.editParent);
};
ResFragment.prototype.moveDown =
function() {
	if (this.editFocus === null)
		return;
	var children = this.editFocus.editChildren;
	if (children.length > 0)
		this.setEditFocusToElem(children[0]);
};
ResFragment.prototype.moveRight =
function() {
	if (this.editFocus !== null) {
		var parent = this.editFocus.editParent;
		if (parent === null)
			return;
		var children = parent.editChildren;
		for (var i = 0; i < children.length; i++)
			if (children[i] === this.editFocus && i < children.length - 1) {
				this.setEditFocusToElem(children[i+1]);
				break;
			}
	} else
		this.moveStart();
};
ResFragment.prototype.moveLeft =
function() {
	if (this.editFocus !== null) {
		var parent = this.editFocus.editParent;
		if (parent === null)
			return;
		var children = parent.editChildren;
		for (var i = 0; i < children.length; i++) 
			if (children[i] === this.editFocus) {
				if (i > 0) 
					this.setEditFocusToElem(children[i-1]);
				else if (parent === this) 
					this.setEditFocusToElem(null);
				break;
			}
	} 
};
ResFragment.prototype.getFocusAddress =
function() {
	var address = [];
	var elem = this.editFocus;
	if (elem !== null)
		while (elem !== this) {
			var parent = elem.editParent;
			var children = ResTree.cleanElements(parent.editChildren, this.editFocus);
			for (var i = 0; i < children.length; i++) 
				if (children[i] === elem) {
					address.unshift(i);
					break;
				}
			elem = parent;
		}
	return address;
};
ResFragment.prototype.setFocusAddress =
function(address) {
	if (address.length === 0)
		return;
	var elem = this;
	var lastValidElem = null;
	for (var i = 0; i < address.length; i++) {
		var children = elem.editChildren;
		if (address[i] < children.length) 
			elem = children[address[i]];
		else if (children.length > 0) {
			elem = children[children.length-1];
			break;
		} else 
			break;
	}
	if (elem !== null && elem !== this)
		this.setEditFocusToElem(elem);
};
ResFragment.prototype.getFocusTopAddress =
function() {
	var address = this.getFocusAddress();
	if (address.length === 0)
		return 0;
	else {
		var top = address[0];
		var topElems = this.editChildren;
		var address = 0;
		for (var i = 0; i < Math.min(top+1, topElems.length); i++)
			if (!(topElems[i] instanceof ResSwitch))
				address++;
		return address;
	}
};
ResFragment.prototype.setFocusTopElement =
function(address) {
	if (address === 0 || this.hiero === null)
		this.setEditFocusToElem(null);
	else {
		var j = 1;
		for (var i = 0; i < this.hiero.groups.length; i++) {
			if (j++ === address)
				this.setEditFocusToElem(this.hiero.groups[i])
			if (j++ === address)
				this.setEditFocusToElem(this.hiero.ops[i])
		}
		if (j++ === address)
			this.setEditFocusToElem(this.hiero.ops[this.hiero.ops.length-1])
	}
};
ResFragment.prototype.setupEditing =
function() {
	ResEdit.enableStructureButtons(['empty', 'dot', 'named', 'excl']);
	ResEdit.setParamType('');
};

ResHieroglyphic.prototype.connectTree =
function(root, parent) {
	for (var i = 0; i < this.groups.length; i++) 
		this.groups[i].connectTree(root, parent);
	for (var i = 0; i < this.ops.length; i++) 
		this.ops[i].connectTree(root, parent);
	for (var i = 0; i < this.switches.length; i++) 
		this.switches[i].connectTree(root, parent, parent);
};
ResHieroglyphic.prototype.makeNodes =
function() {
	for (var i = 0; i < this.groups.length; i++) 
		this.groups[i].makeNodes();
	for (var i = 0; i < this.ops.length; i++) 
		this.ops[i].makeNodes();
	for (var i = 0; i < this.switches.length; i++) 
		this.switches[i].makeNodes();
};
ResHieroglyphic.prototype.getChildren =
function() {
	var children = [];
	for (var i = 0; i < this.ops.length; i++) {
		var group = this.groups[i];
		children.push(group);
		if (group.editSibling !== null)
			children.push(group.editSibling);
		children.push(this.ops[i]);
		if (this.switches[i].toShow())
			children.push(this.switches[i]);
	}
	var group = this.groups[this.groups.length-1];
	children.push(group);
	if (group.editSibling !== null)
		children.push(group.editSibling);
	return children;
};

ResVertgroup.prototype.connectTree =
function(root, parent) {
	this.editRoot = root;
	this.editParent = parent;
	for (var i = 0; i < this.groups.length; i++) 
		this.groups[i].group.connectTree(root, this);
	for (var i = 0; i < this.ops.length; i++) 
		this.ops[i].connectTree(root, this);
	for (var i = 0; i < this.switches.length; i++) 
		this.switches[i].connectTree(root, this, this);
	this.editChildren = this.getChildren();
	this.editSibling = null;
};
ResVertgroup.prototype.makeNodes =
function() {
	for (var i = 0; i < this.groups.length; i++) 
		this.groups[i].group.makeNodes();
	for (var i = 0; i < this.ops.length; i++) 
		this.ops[i].makeNodes();
	for (var i = 0; i < this.switches.length; i++) 
		this.switches[i].makeNodes();
	this.makeNode();
};
ResVertgroup.prototype.makeNode =
function() {
	var node = ResTree.makeNode(this, null, this.toString());
	this.editNode = node.li;
	this.editCanvas = node.canvas;
};
ResVertgroup.prototype.redrawNode =
function() {
	ResTree.redrawNodeCanvas(this, this.toString());
};
ResVertgroup.prototype.getChildren =
function() {
	var children = [];
	for (var i = 0; i < this.ops.length; i++) {
		var group = this.groups[i].group;
		children.push(group);
		if (group.editSibling !== null)
			children.push(group.editSibling);
		children.push(this.ops[i]);
		if (this.switches[i].toShow())
			children.push(this.switches[i]);
	}
	var group = this.groups[this.groups.length-1].group;
	children.push(group);
	if (group.editSibling !== null)
		children.push(group.editSibling);
	return children;
};
ResVertgroup.prototype.setupEditing =
function() {
	ResEdit.enableStructureButtons(['star', 'plus', 'colon', 'semicolon', 'hyphen',
		'box', 'stack', 'insert', 'modify']);
	if (ResTree.objInClasses(this.editParent, [ResFragment, ResBox, ResHorgroup, ResVertgroup]))
		ResEdit.enableStructureButtons(['delete']);
	ResEdit.setParamType('vertical');
	ResEdit.enableParams(['size_inf']);
	ResEdit.setRealValueWithInf('size_inf_param', this.ops[0].size);
};

ResHorgroup.prototype.connectTree =
function(root, parent) {
	this.editRoot = root;
	this.editParent = parent;
	for (var i = 0; i < this.groups.length; i++) 
		this.groups[i].group.connectTree(root, this);
	for (var i = 0; i < this.ops.length; i++) 
		this.ops[i].connectTree(root, this);
	for (var i = 0; i < this.switches.length; i++) 
		this.switches[i].connectTree(root, this, this);
	this.editChildren = this.getChildren();
	this.editSibling = null;
};
ResHorgroup.prototype.makeNodes =
function() {
	for (var i = 0; i < this.groups.length; i++) 
		this.groups[i].group.makeNodes();
	for (var i = 0; i < this.ops.length; i++) 
		this.ops[i].makeNodes();
	for (var i = 0; i < this.switches.length; i++) 
		this.switches[i].makeNodes();
	this.makeNode();
};
ResHorgroup.prototype.makeNode =
function() {
	var node = ResTree.makeNode(this, null, this.toString());
	this.editNode = node.li;
	this.editCanvas = node.canvas;
};
ResHorgroup.prototype.redrawNode =
function() {
	ResTree.redrawNodeCanvas(this, this.toString());
};
ResHorgroup.prototype.getChildren =
function() {
	var children = [];
	for (var i = 0; i < this.ops.length; i++) {
		var group = this.groups[i].group;
		children.push(group);
		if (group.editSibling !== null)
			children.push(group.editSibling);
		children.push(this.ops[i]);
		if (this.switches[i].toShow())
			children.push(this.switches[i]);
	}
	var group = this.groups[this.groups.length-1].group;
	children.push(group);
	if (group.editSibling !== null)
		children.push(group.editSibling);
	return children;
};
ResHorgroup.prototype.setupEditing =
function() {
	ResEdit.enableStructureButtons(['star', 'plus', 'colon', 'semicolon', 'hyphen',
		'box', 'stack', 'insert', 'modify']);
	if (ResTree.objInClasses(this.editParent, [ResFragment, ResBox, ResHorgroup, ResVertgroup]))
		ResEdit.enableStructureButtons(['delete']);
	ResEdit.setParamType('horizontal');
	ResEdit.enableParams(['size_inf']);
	ResEdit.setRealValueWithInf('size_inf_param', this.ops[0].size);
};

ResOp.prototype.connectTree =
function(root, parent) {
	this.editRoot = root;
	this.editParent = parent;
	this.editChildren = this.getChildren();
};
ResOp.prototype.makeNodes =
function() {
	this.makeNode();
};
ResOp.prototype.makeNode =
function() {
	var node = ResTree.makeNode(this, this.treeString(), null);
	this.editNode = node.li;
};
ResOp.prototype.redrawNode =
function() {
};
ResOp.prototype.getChildren =
function() {
	return [];
};
ResOp.prototype.treeString =
function() {
	if (this.editParent instanceof ResVertgroup)
		return ':';
	else if (this.editParent instanceof ResHorgroup)
		return '*';
	else
		return '-';
	this.editChildren = [];
};
ResOp.prototype.setupEditing =
function() {
	ResEdit.enableStructureButtons(['star', 'colon', 'hyphen', 'stack', 'insert', 'excl']);
	ResEdit.setParamType('operator');
	ResEdit.enableParams(['sep', 'fit', 'fix', 'shade']);
	ResEdit.enableParamChunk('shades');
	ResEdit.setRealValue('sep_param', this.sep, null, 1);
	ResEdit.setRadio('fit_param', this.fit);
	ResEdit.setCheck('fix_param', this.fix);
	ResEdit.setRadio('shade_param', this.shade);
	ResEdit.setShades(this.shades);
};

ResNamedglyph.prototype.connectTree =
function(root, parent) {
	this.editRoot = root;
	this.editParent = parent;
	for (var i = 0; i < this.notes.length; i++)
		this.notes[i].connectTree(root, this);
	this.switchs.connectTree(root, this, parent);
	this.editChildren = this.getChildren();
	this.editSibling = this.switchs.toShow() ? this.switchs : null;
};
ResNamedglyph.prototype.makeNodes =
function() {
	for (var i = 0; i < this.notes.length; i++)
		this.notes[i].makeNodes();
	this.switchs.makeNodes();
	this.makeNode();
};
ResNamedglyph.prototype.makeNode =
function() {
	var node = ResTree.makeNode(this, null, this.toString());
	this.editNode = node.li;
	this.editCanvas = node.canvas;
};
ResNamedglyph.prototype.redrawNode =
function() {
	ResTree.redrawNodeCanvas(this, this.toString());
};
ResNamedglyph.prototype.getChildren =
function() {
	var children = [];
	for (var i = 0; i < this.notes.length; i++)
		children.push(this.notes[i]);
	return children;
};
ResNamedglyph.prototype.setupEditing =
function() {
	ResEdit.enableStructureButtons(['empty', 'dot', 'star', 'plus', 'colon', 'semicolon', 'hyphen',
		'box', 'stack', 'insert', 'modify', 'excl', 'caret', 'delete']);
	var named = this.editRoot.namedGlyphs();
	var i = named.indexOf(this);
	if (i < named.length-1)
		ResEdit.enableStructureButtons(['swap']);
	ResEdit.setParamType('named glyph');
	ResEdit.enableParams(['name', 'mirror', 'rotate', 'scale', 'xscale',
		'yscale', 'color', 'shade']);
	ResEdit.enableParamChunk('shades');
	ResEdit.setValue('name_param', this.name === '\"?\"' ? "" : this.name);
	ResEdit.setValue('rotate_param', this.rotate);
	ResEdit.setRealValue('scale_param', this.scale, 1, 1);
	ResEdit.setRealValue('xscale_param', this.xscale, 1, 1);
	ResEdit.setRealValue('yscale_param', this.yscale, 1, 1);
	ResEdit.setSelectedWithCheck('color_param', this.color, 'red');
	ResEdit.setRadio('mirror_param', this.mirror);
	ResEdit.setRadio('shade_param', this.shade);
	ResEdit.setShades(this.shades);
};

ResEmptyglyph.prototype.connectTree =
function(root, parent) {
	this.editRoot = root;
	this.editParent = parent;
	if (this.note !== null)
		this.note.connectTree(root, this);
	this.switchs.connectTree(root, this, parent);
	this.editChildren = this.getChildren();
	this.editSibling = this.switchs.toShow() ? this.switchs : null;
};
ResEmptyglyph.prototype.makeNodes =
function() {
	if (this.note !== null)
		this.note.makeNodes();
	this.switchs.makeNodes();
	this.makeNode();
};
ResEmptyglyph.prototype.makeNode =
function() {
	var node = ResTree.makeNode(this, null, this.toString());
	this.editNode = node.li;
	this.editCanvas = node.canvas;
};
ResEmptyglyph.prototype.redrawNode =
function() {
	ResTree.redrawNodeCanvas(this, this.toString());
};
ResEmptyglyph.prototype.getChildren =
function() {
	var children = [];
	if (this.note !== null)
		children.push(this.note);
	return children;
};
ResEmptyglyph.prototype.setupEditing =
function() {
	ResEdit.enableStructureButtons(['named', 'star', 'plus', 'colon', 'semicolon', 'hyphen',
		'box', 'stack', 'insert', 'modify', 'excl', 'caret', 'delete']);
	ResEdit.setParamType('empty glyph');
	ResEdit.enableParams(['width', 'height', 'shade', 'firm']);
	ResEdit.enableParamChunk('shades');
	ResEdit.setRealValue('width_param', this.width, 1, 1);
	ResEdit.setRealValue('height_param', this.height, 1, 1);
	ResEdit.setCheck('firm_param', this.firm);
	ResEdit.setRadio('shade_param', this.shade);
	ResEdit.setShades(this.shades);
};

ResBox.prototype.connectTree =
function(root, parent) {
	this.editRoot = root;
	this.editParent = parent;
	this.switchs1.connectTree(root, this, this);
	if (this.hiero !== null)
		this.hiero.connectTree(root, this);
	for (var i = 0; i < this.notes.length; i++)
		this.notes[i].connectTree(root, this);
	this.switchs2.connectTree(root, this, parent);
	this.editChildren = this.getChildren();
	this.editSibling = this.switchs2.toShow() ? this.switchs2 : null;
};
ResBox.prototype.makeNodes =
function() {
	this.switchs1.makeNodes();
	if (this.hiero !== null)
		this.hiero.makeNodes();
	for (var i = 0; i < this.notes.length; i++)
		this.notes[i].makeNodes();
	this.switchs2.makeNodes();
	this.makeNode();
};
ResBox.prototype.makeNode =
function() {
	var node = ResTree.makeNode(this, null, this.toString());
	this.editNode = node.li;
	this.editCanvas = node.canvas;
};
ResBox.prototype.redrawNode =
function() {
	ResTree.redrawNodeCanvas(this, this.toString());
};
ResBox.prototype.getChildren =
function() {
	var children = [];
	if (this.switchs1.toShow())
		children.push(this.switchs1);
	if (this.hiero !== null) {
		var hChilds = this.hiero.getChildren();
		for (var i = 0; i < hChilds.length; i++)
			children.push(hChilds[i]);
	}
	for (var i = 0; i < this.notes.length; i++)
		children.push(this.notes[i]);
	return children;
};
ResBox.prototype.setupEditing =
function() {
	ResEdit.enableStructureButtons(['empty', 'dot', 'named', 
		'star', 'plus', 'colon', 'semicolon', 'hyphen',
		'box', 'stack', 'insert', 'modify', 'front', 'back', 'caret', 'delete']);
	ResEdit.setParamType('box');
	ResEdit.enableParams(['type', 'direction', 'mirror', 'scale', 'color',
		'shade', 'size', 'opensep', 'closesep','undersep','oversep']);
	ResEdit.enableParamChunk('shades');
	ResEdit.setSelected('type_param', this.type, 'cartouche');
	ResEdit.setRadio('direction_param', this.direction);
	ResEdit.setRealValue('scale_param', this.scale, 1, 1);
	ResEdit.setRealValue('size_param', this.size, 1, 1);
	ResEdit.setSelectedWithCheck('color_param', this.color, 'red');
	ResEdit.setRadio('mirror_param', this.mirror);
	ResEdit.setRealValue('opensep_param', this.opensep, null, 1);
	ResEdit.setRealValue('closesep_param', this.closesep, null, 1);
	ResEdit.setRealValue('undersep_param', this.undersep, null, 1);
	ResEdit.setRealValue('oversep_param', this.oversep, null, 1);
	ResEdit.setRadio('shade_param', this.shade);
	ResEdit.setShades(this.shades);
};

ResStack.prototype.connectTree =
function(root, parent) {
	this.editRoot = root;
	this.editParent = parent;
	this.switchs1.connectTree(root, this, this);
	this.group1.connectTree(root, this);
	this.group2.connectTree(root, this);
	this.switchs3.connectTree(root, this, parent);
	this.editChildren = this.getChildren();
	this.editSibling = this.switchs3.toShow() ? this.switchs3 : null;
};
ResStack.prototype.makeNodes =
function() {
	this.switchs1.makeNodes();
	this.group1.makeNodes();
	this.group2.makeNodes();
	this.switchs3.makeNodes();
	this.makeNode();
};
ResStack.prototype.makeNode =
function() {
	var node = ResTree.makeNode(this, null, this.toString());
	this.editNode = node.li;
	this.editCanvas = node.canvas;
};
ResStack.prototype.redrawNode =
function() {
	ResTree.redrawNodeCanvas(this, this.toString());
};
ResStack.prototype.getChildren =
function() {
	var children = [];
	if (this.switchs1.toShow())
		children.push(this.switchs1);
	children.push(this.group1);
	var sibling1 = this.group1.editSibling;
	if (sibling1 !== null)
		children.push(sibling1);
	children.push(this.group2);
	var sibling2 = this.group2.editSibling;
	if (sibling2 !== null)
		children.push(sibling2);
	return children;
};
ResStack.prototype.setupEditing =
function() {
	ResEdit.enableStructureButtons(['star', 'plus', 'colon', 'semicolon', 'hyphen',
		'box', 'stack', 'insert', 'modify', 'front', 'back', 'delete']);
	ResEdit.setParamType('stack');
	ResEdit.enableParams(['x', 'y', 'cover']);
	ResEdit.setRealValue('x_param', this.x, 0.5, 0.5);
	ResEdit.setRealValue('y_param', this.y, 0.5, 0.5);
	ResEdit.setRadio('cover_param', this.onunder);
};

ResInsert.prototype.connectTree =
function(root, parent) {
	this.editRoot = root;
	this.editParent = parent;
	this.switchs1.connectTree(root, this, this);
	this.group1.connectTree(root, this);
	this.group2.connectTree(root, this);
	this.switchs3.connectTree(root, this, parent);
	this.editChildren = this.getChildren();
	this.editSibling = this.switchs3.toShow() ? this.switchs3 : null;
};
ResInsert.prototype.makeNodes =
function() {
	this.switchs1.makeNodes();
	this.group1.makeNodes();
	this.group2.makeNodes();
	this.switchs3.makeNodes();
	this.makeNode();
};
ResInsert.prototype.makeNode =
function() {
	var node = ResTree.makeNode(this, null, this.toString());
	this.editNode = node.li;
	this.editCanvas = node.canvas;
};
ResInsert.prototype.redrawNode =
function() {
	ResTree.redrawNodeCanvas(this, this.toString());
};
ResInsert.prototype.getChildren =
function() {
	var children = [];
	if (this.switchs1.toShow())
		children.push(this.switchs1);
	children.push(this.group1);
	var sibling1 = this.group1.editSibling;
	if (sibling1 !== null)
		children.push(sibling1);
	children.push(this.group2);
	var sibling2 = this.group2.editSibling;
	if (sibling2 !== null)
		children.push(sibling2);
	return children;
};
ResInsert.prototype.setupEditing =
function() {
	ResEdit.enableStructureButtons(['star', 'plus', 'colon', 'semicolon', 'hyphen',
		'box', 'stack', 'insert', 'modify', 'front', 'back', 'delete']);
	ResEdit.setParamType('insert');
	ResEdit.enableParams(['x', 'y', 'fix', 'sep']);
	ResEdit.enableParamChunk('place');
	ResEdit.setRealValue('x_param', this.x, 0.5, 0.5);
	ResEdit.setRealValue('y_param', this.y, 0.5, 0.5);
	ResEdit.setRealValue('sep_param', this.sep, null, 1);
	ResEdit.setCheck('fix_param', this.fix);
	ResEdit.setRadio('place_param', this.place);
};

ResModify.prototype.connectTree =
function(root, parent) {
	this.editRoot = root;
	this.editParent = parent;
	this.switchs1.connectTree(root, this, this);
	this.group.connectTree(root, this);
	this.switchs2.connectTree(root, this, parent);
	this.editChildren = this.getChildren();
	this.editSibling = this.switchs2.toShow() ? this.switchs2 : null;
};
ResModify.prototype.makeNodes =
function() {
	this.switchs1.makeNodes();
	this.group.makeNodes();
	this.switchs2.makeNodes();
	this.makeNode();
};
ResModify.prototype.makeNode =
function() {
	var node = ResTree.makeNode(this, null, this.toString());
	this.editNode = node.li;
	this.editCanvas = node.canvas;
};
ResModify.prototype.redrawNode =
function() {
	ResTree.redrawNodeCanvas(this, this.toString());
};
ResModify.prototype.getChildren =
function() {
	var children = [];
	if (this.switchs1.toShow())
		children.push(this.switchs1);
	children.push(this.group);
	var sibling = this.group.editSibling;
	if (sibling !== null)
		children.push(sibling);
	return children;
};
ResModify.prototype.setupEditing =
function() {
	ResEdit.enableStructureButtons(['star', 'plus', 'colon', 'semicolon', 'hyphen',
		'box', 'stack', 'insert', 'modify', 'front', 'back', 'delete']);
	ResEdit.setParamType('modify');
	ResEdit.enableParams(['width', 'height', 'above', 'below', 'before', 'after', 
		'omit', 'shade']);
	ResEdit.enableParamChunk('shades');
	ResEdit.setRealValue('width_param', this.width, null, 1);
	ResEdit.setRealValue('height_param', this.height, null, 1);
	ResEdit.setRealValue('above_param', this.above, 0, 0);
	ResEdit.setRealValue('below_param', this.below, 0, 0);
	ResEdit.setRealValue('before_param', this.before, 0, 0);
	ResEdit.setRealValue('after_param', this.after, 0, 0);
	ResEdit.setCheck('omit_param', this.omit);
	ResEdit.setRadio('shade_param', this.shade);
	ResEdit.setShades(this.shades);
};

ResNote.prototype.connectTree =
function(root, parent) {
	this.editRoot = root;
	this.editParent = parent;
	this.editChildren = this.getChildren();
};
ResNote.prototype.makeNodes =
function() {
	this.makeNode();
};
ResNote.prototype.makeNode =
function() {
	var node = ResTree.makeNode(this, this.displayString(), null);
	this.editNode = node.li;
	this.editDiv = node.div;
};
ResNote.prototype.redrawNode =
function() {
	ResTree.redrawNodeLabel(this.editDiv, this.displayString());
};
ResNote.prototype.getChildren =
function() {
	return [];
};
ResNote.prototype.setupEditing =
function() {
	if (this.editParent instanceof ResNamedglyph || this.editParent instanceof ResBox)
		ResEdit.enableStructureButtons(['caret']);
	var str = this.displayString();
	ResEdit.enableStructureButtons(['hyphen', 'delete']);
	ResEdit.setParamType('note');
	ResEdit.enableParams(['string', 'color']);
	ResEdit.setValue('string_param', str === '?' ? '' : str);
	ResEdit.setSelectedWithCheck('color_param', this.color, 'red');
};

ResSwitch.prototype.connectTree =
function(root, structureParent, editParent) {
	this.editRoot = root;
	this.structureParent = structureParent;
	this.editParent = editParent;
	this.editChildren = this.getChildren();
};
ResSwitch.prototype.makeNodes =
function(root, structureParent, editParent) {
	this.makeNode();
};
ResSwitch.prototype.makeNode =
function() {
	var node = ResTree.makeNode(this, '!', null);
	this.editNode = node.li;
};
ResSwitch.prototype.redrawNode =
function() {
};
ResSwitch.prototype.getChildren =
function() {
	return [];
};
// To be shown if focus or not default values.
ResSwitch.prototype.toShow =
function() {
	return !this.hasDefaultValues() || this.editRoot.editFocus === this;
};
ResSwitch.prototype.setupEditing =
function() {
	if (this.editParent instanceof ResHorgroup)
		ResEdit.enableStructureButtons(['star']);
	if (this.editParent instanceof ResVertgroup)
		ResEdit.enableStructureButtons(['colon']);
	ResEdit.enableStructureButtons(['hyphen', 'delete']);
	ResEdit.setParamType('switch');
	ResEdit.enableParams(['color', 'shade', 'sep', 'fit', 'mirror']);
	ResEdit.setRealValue('sep_param', this.sep, null, 1);
	ResEdit.setSelectedWithCheck('color_param', this.color, 'red');
	ResEdit.setRadio('mirror_param', this.mirror);
	ResEdit.setRadio('fit_param', this.fit);
	ResEdit.setRadio('shade_param', this.shade);
};

/////////////////////////////////////////////////////////////
// Auxiliary for editing.

// From elements, omit those that are default ResSwitch without focus.
ResTree.cleanElements =
function(elems, focus) {
	var cleans = [];
	for (var i = 0; i < elems.length; i++) {
		var elem = elems[i];
		if (elem instanceof ResSwitch && elem !== focus && elem.hasDefaultValues())
			continue;
		cleans.push(elem);
	}
	return cleans;
};

ResTree.objInClasses =
function(obj, classes) {
	for (var i = 0; i < classes.length; i++) {
		var cl = classes[i];
		if (cl === null && obj === null)
			return true;
		else if (cl !== null && obj instanceof cl)
			return true;
	}
	return false;
};

// Get switch right to operator.
ResTree.getRightSiblingSwitch =
function(elem) {
	return ResTree.switchFromParent(elem, ResTree.opIndex(elem));
};

// Get switch of index relative to parent.
ResTree.switchFromParent = 
function(elem, i) {
	var parent = elem.editParent;
	if (ResTree.objInClasses(parent, [ResFragment, ResBox]))
		return parent.hiero.switches[i];
	else
		return parent.switches[i];
};

// Get index of operator relative to parent.
ResTree.opIndex =
function(elem) {
	var parent = elem.editParent;
	if (ResTree.objInClasses(parent, [ResFragment, ResBox]))
		return parent.hiero.ops.indexOf(elem);
	else
		return parent.ops.indexOf(elem);
};

// Below parent (ResFragment or ResBox), at index, insert new group.
ResTree.insertAt =
function(parent, i, group) {
	if (parent.hiero === null)
		parent.hiero = new ResHieroglyphic({g: group});
	else 
		parent.hiero.addGroupAt(group, i);
};

ResTree.appendNamedHiero =
function(group) {
	while (!ResTree.objInClasses(group.editParent, [ResFragment, ResBox]))
		group = group.editParent;
	var i = group.editParent.hiero.groups.indexOf(group);
	var named = new ResNamedglyph(null);
	group.editParent.hiero.addGroupAt(named, i+1);
	return named;
};
ResTree.appendNamedBehindOpHiero =
function(op) {
	if (ResTree.objInClasses(op.editParent, [ResHorgroup, ResVertgroup]))
		return ResTree.appendNamedHiero(op.editParent);
	else {
		var i = op.editParent.hiero.ops.indexOf(op);
		var named = new ResNamedglyph(null);
		op.editParent.hiero.addGroupAt(named, i+1);
		return named;
	}
};
ResTree.appendNamedBehindSwitchHiero =
function(sw) {
	if (ResTree.objInClasses(sw.structureParent, [ResFragment, ResBox])) {
		var i = sw.structureParent.hiero.switches.indexOf(sw);
		var named = new ResNamedglyph(null);
		sw.editParent.hiero.addGroupAt(named, i+1);
		return named;
	} 
	return ResTree.appendNamedHiero(sw.structureParent);
};

ResTree.appendNamedBehindOp =
function(op) {
	var i = op.editParent.ops.indexOf(op);
	var named = new ResNamedglyph(null);
	op.editParent.addGroupAt(named, i+1);
	return named;
};
ResTree.appendNamedHorAfterSwitch =
function(sw) {
	if (sw.structureParent instanceof ResHorgroup) {
		var i = sw.editParent.switches.indexOf(sw);
		var named = new ResNamedglyph(null);
		sw.editParent.addGroupAt(named, i+1);
		return named;
	} else 
		return ResTree.appendNamedHor(sw.structureParent);
};
ResTree.appendNamedVertAfterSwitch =
function(sw) {
	if (sw.structureParent instanceof ResVertgroup) {
		var i = sw.editParent.switches.indexOf(sw);
		var named = new ResNamedglyph(null);
		sw.editParent.addGroupAt(named, i+1);
		return named;
	} else
		return ResTree.appendNamedVert(sw.structureParent);
};

ResTree.appendNamedHor =
function(group) {
	var named = new ResNamedglyph(null);
	var hor = ResHorgroup.make([group, named], 
		[new ResOp(null)], [new ResSwitch(null)]);
	ResTree.replaceGroup(group, hor);
	return named;
};
ResTree.appendNamedVert =
function(group) {
	var named = new ResNamedglyph(null);
	var hor = ResVertgroup.make([group, named], 
		[new ResOp(null)], [new ResSwitch(null)]);
	ResTree.replaceGroup(group, hor);
	return named;
};
ResTree.prependNamedHor =
function(group) {
	var named = new ResNamedglyph(null);
	var hor = ResHorgroup.make([named, group], 
		[new ResOp(null)], [new ResSwitch(null)]);
	ResTree.replaceGroup(group, hor);
	return named;
};
ResTree.prependNamedVert =
function(group) {
	var named = new ResNamedglyph(null);
	var hor = ResVertgroup.make([named, group], 
		[new ResOp(null)], [new ResSwitch(null)]);
	ResTree.replaceGroup(group, hor);
	return named;
};

ResTree.joinGroupsIntoInsert =
function(op) {
	var insert = new ResInsert(null);
	ResTree.joinGroupsIntoBinaryFunction(op, insert);
	return insert;
};
ResTree.joinGroupsIntoStack =
function(op) {
	var stack = new ResStack(null);
	ResTree.joinGroupsIntoBinaryFunction(op, stack);
	return stack;
};
ResTree.joinGroupsIntoBinaryFunction =
function(op, fun) {
	var parent = op.editParent
	if (ResTree.objInClasses(parent, [ResFragment, ResBox])) {
		var i = parent.hiero.ops.indexOf(op);
		var group1 = parent.hiero.groups[i];
		var sw = parent.hiero.switches[i];
		var group2 = parent.hiero.groups[i+1];
		fun.group1 = group1;
		fun.group2 = group2;
		fun.switchs2 = sw;
		ResTree.removeGroup(group1);
		ResTree.replaceGroup(group2, fun);
	} else if (parent.groups.length === 2) {
		var group1 = parent.groups[0].group;
		var sw = parent.switches[0];
		var group2 = parent.groups[1].group;
		fun.group1 = group1;
		fun.group2 = group2;
		fun.switchs2 = sw;
		ResTree.replaceGroup(parent, fun);
	} else {
		var i = parent.ops.indexOf(op);
		var group1 = parent.groups[i].group;
		var sw = parent.switches[i];
		var group2 = parent.groups[i+1].group;
		fun.group1 = group1;
		fun.group2 = group2;
		ResTree.removeGroup(group1);
		ResTree.replaceGroup(group2, fun);
	}
};

ResTree.joinGroupsIntoHor =
function(op) {
	var constructor = function(group1, sw, group2) {
		return ResHorgroup.make([group1, group2], [op], [sw]);
	};
	return ResTree.joinGroupsIntoGroup(op, constructor);
};
ResTree.joinGroupsIntoVert =
function(op) {
	var constructor = function(group1, sw, group2) {
		return ResVertgroup.make([group1, group2], [op], [sw]);
	};
	return ResTree.joinGroupsIntoGroup(op, constructor);
};
ResTree.joinGroupsIntoGroup =
function(op, groupConstructor) {
	var parent = op.editParent
	if (ResTree.objInClasses(parent, [ResFragment, ResBox])) {
		var i = parent.hiero.ops.indexOf(op);
		var group1 = parent.hiero.groups[i];
		var sw = parent.hiero.switches[i];
		var group2 = parent.hiero.groups[i+1];
		var group = groupConstructor(group1, sw, group2);
		ResTree.removeGroup(group1);
		ResTree.replaceGroup(group2, group);
		return group;
	} else if (parent.groups.length === 2) {
		var group1 = parent.groups[0].group;
		var sw = parent.switches[0];
		var group2 = parent.groups[1].group;
		var group = groupConstructor(group1, sw, group2);
		return ResTree.replaceGroup(parent, group);
	} else {
		var i = parent.ops.indexOf(op);
		var group1 = parent.groups[i].group;
		var sw = parent.switches[i];
		var group2 = parent.groups[i+1].group;
		var group = groupConstructor(group1, sw, group2);
		ResTree.removeGroup(group1);
		ResTree.replaceGroup(group2, group);
		return group;
	}
};

// Delete node.
ResTree.removeNode =
function(elem) {
	if (ResTree.objInClasses(elem, [ResEmptyglyph, ResNamedglyph]))
		return ResTree.removeGroup(elem);
	else if (ResTree.objInClasses(elem, [ResHorgroup, ResVertgroup]))
		return ResTree.replaceGroups(elem, elem.subGroups(), elem.ops, elem.switches);
	else if (ResTree.objInClasses(elem, [ResInsert, ResStack]))
		return ResTree.replaceGroups(elem, 
			[elem.group1, elem.group2], [new ResOp(null)], [new ResSwitch(null)]);
	else if (elem instanceof ResBox) {
		var hiero = elem.hiero;
		if (hiero === null)
			return ResTree.removeGroup(elem);
		else
			return ResTree.replaceGroups(elem, hiero.groups, hiero.ops, hiero.switches);
	} else if (elem instanceof ResModify) 
		return ResTree.replaceGroup(elem, elem.group);
};

ResTree.placeInBox =
function(group) {
	var box = new ResBox(null);
	var hiero = new ResHieroglyphic({g: group});
	box.hiero = hiero; 
	ResTree.replaceGroup(group, box);
	return box;
};

ResTree.placeInStack =
function(group) {
	var stack = new ResStack(null);
	return ResTree.placeInBinaryFunction(group, stack);
};
ResTree.placeInInsert =
function(group) {
	var insert = new ResInsert(null);
	return ResTree.placeInBinaryFunction(group, insert);
};
ResTree.placeInBinaryFunction =
function(group, fun) {
	var named = new ResNamedglyph(null);
	fun.group1 = group;
	fun.group2 = named;
	ResTree.replaceGroup(group, fun);
	return named;
};

ResTree.placeInModify =
function(group) {
	var modify = new ResModify(null);
	modify.group = group;
	ResTree.replaceGroup(group, modify);
	return modify;
};

ResTree.replaceGroup =
function(fromGroup, toGroup) {
	var parent = fromGroup.editParent;
	if (ResTree.objInClasses(parent, [ResFragment, ResBox])) {
		var i = parent.hiero.groups.indexOf(fromGroup);
		parent.hiero.groups[i] = toGroup;
	} else if (parent instanceof ResHorgroup) {
		var i = parent.subGroups().indexOf(fromGroup);
		if (toGroup instanceof ResHorgroup) {
			parent.groups = parent.groups.slice(0,i).concat(toGroup.groups).
							concat(parent.groups.slice(i+1));
			parent.ops = parent.ops.slice(0,i).concat(toGroup.ops).
							concat(parent.ops.slice(i));
			parent.switches = parent.switches.slice(0,i).concat(toGroup.switches).
							concat(parent.switches.slice(i));
			return parent.groups[i].group;
		} else 
			parent.groups[i].group = toGroup;
	} else if (parent instanceof ResVertgroup) {
		var i = parent.subGroups().indexOf(fromGroup);
		if (toGroup instanceof ResVertgroup) {
			parent.groups = parent.groups.slice(0,i).concat(toGroup.groups).
							concat(parent.groups.slice(i+1));
			parent.ops = parent.ops.slice(0,i).concat(toGroup.ops).
							concat(parent.ops.slice(i));
			parent.switches = parent.switches.slice(0,i).concat(toGroup.switches).
							concat(parent.switches.slice(i));
			return parent.groups[i].group;
		} else 
			parent.groups[i].group = toGroup;
	} else if (ResTree.objInClasses(parent, [ResInsert, ResStack])) {
		if (fromGroup === parent.group1)
			parent.group1 = toGroup;
		else
			parent.group2 = toGroup;
	} else if (parent instanceof ResModify) 
		parent.group = toGroup;
	return toGroup;
};

ResTree.replaceGroups =
function(fromGroup, groups, ops, switches) {
	var parent = fromGroup.editParent;
	if (ResTree.objInClasses(parent, [ResFragment, ResBox])) {
		var i = parent.hiero.groups.indexOf(fromGroup);
		parent.hiero.groups[i] = groups[0];
		for (var j = 1; j < groups.length; j++) {
			parent.hiero.ops.splice(i+j-1, 0, ops[j-1]);
			parent.hiero.switches.splice(i+j-1, 0, switches[j-1]);
			parent.hiero.groups.splice(i+j, 0, groups[j]);
		}
		return parent.hiero.groups[i+groups.length-1];
	} else if (parent instanceof ResHorgroup) {
		var i = parent.subGroups().indexOf(fromGroup);
		parent.groups.splice(i, 1);
		for (var j = 0; j < groups.length; j++) {
			var group = groups[j];
			if (group instanceof ResHorgroup) {
				parent.groups = parent.groups.slice(0,i).concat(group.groups).
								concat(parent.groups.slice(i));
				parent.ops = parent.ops.slice(0,i).concat(group.ops).
								concat(parent.ops.slice(i));
				parent.switches = parent.switches.slice(0,i).concat(group.switches).
								concat(parent.switches.slice(i));
				i += group.groups.length - 1;
			} else {
				var subgroup = new ResHorsubgroup({b: group});
				parent.groups.splice(i, 0, subgroup);
			}
			if (j < groups.length-1) {
				parent.ops.splice(i, 0, ops[j]);
				parent.switches.splice(i, 0, switches[j]);
			}
			i += 1;
		}
		return parent.groups[i-1].group;
	} else if (parent instanceof ResVertgroup) {
		var i = parent.subGroups().indexOf(fromGroup);
		parent.groups.splice(i, 1);
		for (var j = 0; j < groups.length; j++) {
			var group = groups[j];
			if (group instanceof ResVertgroup) {
				parent.groups = parent.groups.slice(0,i).concat(group.groups).
								concat(parent.groups.slice(i));
				parent.ops = parent.ops.slice(0,i).concat(group.ops).
								concat(parent.ops.slice(i));
				parent.switches = parent.switches.slice(0,i).concat(group.switches).
								concat(parent.switches.slice(i));
				i += group.groups.length - 1;
			} else {
				var subgroup = new ResVertsubgroup({b: group});
				parent.groups.splice(i, 0, subgroup);
			}
			if (j < groups.length-1) {
				parent.ops.splice(i, 0, ops[j]);
				parent.switches.splice(i, 0, switches[j]);
			}
			i += 1;
		}
		return parent.groups[i-1].group;
	} else if (ResTree.objInClasses(parent, [ResInsert, ResStack])) {
		var hor = ResHorgroup.make(groups, ops, switches)
		if (fromGroup === parent.group1) 
			parent.group1 = hor;
		else
			parent.group2 = hor;
		return hor;
	} else if (parent instanceof ResModify) {
		var hor = ResHorgroup.make(groups, ops, switches)
		parent.group = hor;
		return hor;
	}
};

ResTree.removeGroup =
function(group) {
	var parent = group.editParent;
	if (ResTree.objInClasses(parent, [ResFragment, ResBox])) {
		if (parent.hiero.groups.length === 1)
			parent.hiero = null;
		else {
			var i = parent.hiero.groups.indexOf(group);
			parent.hiero.groups.splice(i,1);
			parent.hiero.ops.splice(Math.min(i, parent.hiero.ops.length-1), 1);
			parent.hiero.switches.splice(Math.min(i, parent.hiero.switches.length-1),1);
		}
		if (parent.hiero !== null && parent.hiero.groups.length > 0)
			return parent.hiero.groups[Math.min(i, parent.hiero.groups.length-1)];
		else if (parent instanceof ResBox)
			return parent;
		else 
			return null;
	} else if (parent instanceof ResHorgroup) {
		var i = parent.subGroups().indexOf(group);
		if (parent.groups.length === 2) {
			var other = 1-i;
			return ResTree.replaceGroup(parent, parent.groups[other].group);
		} else {
			parent.groups.splice(i,1);
			parent.ops.splice(Math.min(i, parent.ops.length-1), 1);
			parent.switches.splice(Math.min(i, parent.switches.length-1),1);
			return parent.groups[Math.min(i, parent.groups.length-1)].group;
		}
	} else if (parent instanceof ResVertgroup) {
		var i = parent.subGroups().indexOf(group);
		if (parent.groups.length === 2) {
			var other = 1-i;
			return ResTree.replaceGroup(parent, parent.groups[other].group);
		} else {
			parent.groups.splice(i,1);
			parent.ops.splice(Math.min(i, parent.ops.length-1), 1);
			parent.switches.splice(Math.min(i, parent.switches.length-1),1);
			return parent.groups[Math.min(i, parent.groups.length-1)].group;
		}
	} else if (ResTree.objInClasses(parent, [ResInsert, ResStack])) {
		if (parent.group1 === group)
			return ResTree.replaceGroup(parent, parent.group2);
		else
			return ResTree.replaceGroup(parent, parent.group1);
	} else if (parent instanceof ResModify) 
		return ResTree.removeGroup(parent);
};

// Add note at beginning of ResBox or ResNamedglyph.
ResTree.addNoteAtStart =
function(elem) {
	var note = new ResNote(null);
	elem.notes.unshift(note);
	return note;
};
// Add note for ResEmpty. 
ResTree.addNoteIn =
function(empty) {
	var note = new ResNote(null);
	empty.note = note;
	return note;
};
// Append note after present.
ResTree.appendNote =
function(oldNote) {
	var parent = oldNote.editParent;
	var i = parent.notes.indexOf(oldNote);
	var note = new ResNote(null);
	parent.notes.splice(i+1, 0, note);
	return note;
};
// Remove note from parent, and return parent.
ResTree.removeNote =
function(oldNote) {
	var parent = oldNote.editParent;
	if (parent instanceof ResEmptyglyph)
		parent.note = null;
	else {
		var i = parent.notes.indexOf(oldNote);
		parent.notes.splice(i, 1);
	}
	return parent;
};

/* uni_tree.js */

/* Everything here overrides the definitions from res_tree.js */

ResTree.parseRes =
function(res) {
	return res_syntax.parse(res).finetuneUni();
};

ResFragment.prototype.connectTree =
function() {
	if (this.hiero !== null)
		this.hiero.connectTree(this, this);
	this.editChildren = this.getChildren();
};

ResFragment.prototype.getChildren =
function() {
	var children = [];
	if (this.hiero !== null) {
		var hChilds = this.hiero.getChildren();
		for (var i = 0; i < hChilds.length; i++)
			children.push(hChilds[i]);
	}
	return children;
};

ResFragment.prototype.setupEditing =
function() {
	ResEdit.enableStructureButtons(['named']);
	ResEdit.setParamType('');
};

ResVertgroup.prototype.setupEditing =
function() {
	var par = this.editParent;
	ResEdit.enableStructureButtons(['colon', 'semicolon', 'hyphen']);
	if (!(par instanceof ResInsert && this === par.group1) &&
			!ResEdit.shouldBeFlatVertgroup(this))
		ResEdit.enableStructureButtons(['star', 'plus']);
	if (ResTree.objInClasses(par, [ResFragment, ResHorgroup, ResVertgroup]))
		ResEdit.enableStructureButtons(['delete']);
	ResEdit.setParamType('vertical');
	ResEdit.enableParams([]);
};

ResHorgroup.prototype.setupEditing =
function() {
	var par = this.editParent;
	ResEdit.enableStructureButtons(['star', 'plus', 'hyphen']);
	if (!(par instanceof ResInsert && this === par.group1) &&
			!ResEdit.shouldBeFlatHorgroup(this))
		ResEdit.enableStructureButtons(['colon', 'semicolon']);
	if (UniFragment.isFlatHorizontalGroup(this) &&
			!ResEdit.shouldBeFlatGroup(this))
		ResEdit.enableStructureButtons(['stack']);
	if (ResTree.objInClasses(par, [ResFragment, ResHorgroup, ResVertgroup]))
		ResEdit.enableStructureButtons(['delete']);
	ResEdit.setParamType('horizontal');
	ResEdit.enableParams([]);
};

ResOp.prototype.setupEditing =
function() {
	var par = this.editParent;
	ResEdit.enableStructureButtons(['hyphen']);
	if (par instanceof ResHorgroup)
		ResEdit.enableStructureButtons(['star']);
	else if (!ResEdit.shouldBeFlatVertgroup(par))
		ResEdit.enableStructureButtons(['star']);
	if (par instanceof ResVertgroup)
		ResEdit.enableStructureButtons(['colon']);
	else if (!ResEdit.shouldBeFlatHorgroup(par))
		ResEdit.enableStructureButtons(['colon']);
	if (UniFragment.isBetweenFlatGroups(this) &&
			!ResEdit.shouldBeFlatGroup(par))
		ResEdit.enableStructureButtons(['stack']);
	if (UniFragment.isAfterInsertable(this) &&
			!ResEdit.shouldBeFlatGroup(par))
		ResEdit.enableStructureButtons(['insert']);
	ResEdit.setParamType('operator');
	ResEdit.enableParams([]);
};

ResNamedglyph.prototype.setupEditing =
function() {
	var par = this.editParent;
	ResEdit.enableStructureButtons(['hyphen']);
	if (!(par instanceof ResInsert && this === par.group1)
			&& !ResEdit.shouldBeFlatVertgroup(this))
		ResEdit.enableStructureButtons(['star', 'plus']);
	if (!(par instanceof ResInsert && this === par.group1)
			&& !ResEdit.shouldBeFlatHorgroup(this))
		ResEdit.enableStructureButtons(['colon', 'semicolon']);
	if (UniFragment.isFlatHorizontalGroup(this) &&
			!ResEdit.shouldBeFlatGroup(this))
		ResEdit.enableStructureButtons(['stack']);
	if (!ResEdit.shouldBeFlatGroup(this))
		ResEdit.enableStructureButtons(['insert']);
	if (ResTree.objInClasses(par, [ResFragment, ResHorgroup, ResVertgroup]))
		ResEdit.enableStructureButtons(['delete']);
	var named = par.namedGlyphs();
	var i = named.indexOf(this);
	if (i < named.length-1)
		ResEdit.enableStructureButtons(['swap']);
	ResEdit.setParamType('named glyph');
	ResEdit.enableParams(['name']);
	ResEdit.setValue('name_param', this.name === '\"?\"' ? "" : this.name);
};

ResStack.prototype.setupEditing =
function() {
	var par = this.editParent;
	ResEdit.enableStructureButtons(['hyphen']);
	if (!(par instanceof ResInsert && this === par.group1) &&
			!ResEdit.shouldBeFlatVertgroup(this))
		ResEdit.enableStructureButtons(['star', 'plus']);
	if (!(par instanceof ResInsert && this === par.group1) &&
			!ResEdit.shouldBeFlatHorgroup(this))
		ResEdit.enableStructureButtons(['colon', 'semicolon']);
	if (!ResEdit.shouldBeFlatGroup(this))
		ResEdit.enableStructureButtons(['insert']);
	if (this.group1 instanceof ResNamedglyph)
		ResEdit.enableStructureButtons(['delete']);
	ResEdit.setParamType('overlay');
};

ResInsert.prototype.setupEditing =
function() {
	var par = this.editParent;
	ResEdit.enableStructureButtons(['hyphen']);
	if (!(par instanceof ResInsert && this === par.group1) &&
			!ResEdit.shouldBeFlatVertgroup(this))
		ResEdit.enableStructureButtons(['star', 'plus']);
	if (!(par instanceof ResInsert && this === par.group1) &&
			!ResEdit.shouldBeFlatHorgroup(this))
		ResEdit.enableStructureButtons(['colon', 'semicolon']);
	if (!ResEdit.shouldBeFlatGroup(this))
		ResEdit.enableStructureButtons(['insert']);
	if (this.group1 instanceof ResNamedglyph)
		ResEdit.enableStructureButtons(['delete']);
	ResEdit.setParamType('insert');
	ResEdit.enableParams([]);
	ResEdit.enableParamChunk('place');
	ResEdit.setRadio('place_param', this.place);
};

ResSwitch.prototype.makeNode =
function() {
};

ResSwitch.prototype.setupEditing =
function() {
};

/////////////////////////////////////////////////////////////
// Auxiliary for editing.

ResTree.joinGroupsIntoInsert =
function(op) {
	var insert = new ResInsert(null);
	insert.place = "te";
	ResTree.joinGroupsIntoBinaryFunction(op, insert);
	return insert;
};

ResTree.removeNode =
function(elem) {
	if (ResTree.objInClasses(elem, [ResNamedglyph]))
		return ResTree.removeGroup(elem);
	else if (ResTree.objInClasses(elem, [ResHorgroup, ResVertgroup]))
		return ResTree.replaceGroups(elem, elem.subGroups(), elem.ops,
				elem.switches);
	else if (ResTree.objInClasses(elem, [ResInsert, ResStack]))
		return ResTree.replaceGroups(elem,
				[elem.group1], [], []);
	else if (elem instanceof ResBox) {
		var hiero = elem.hiero;
		if (hiero === null)
			return ResTree.removeGroup(elem);
		else
			return ResTree.replaceGroups(elem, hiero.groups, hiero.ops,
					hiero.switches);
	} else if (elem instanceof ResModify)
		return ResTree.replaceGroup(elem, elem.group);
};

ResTree.placeInInsert =
function(group) {
	var insert = new ResInsert(null);
	insert.place = "te";
	return ResTree.placeInBinaryFunction(group, insert);
};

ResTree.removeGroup =
function(group) {
	var parent = group.editParent;
	if (parent instanceof ResFragment) {
		if (parent.hiero.groups.length === 1)
			parent.hiero = null;
		else {
			var i = parent.hiero.groups.indexOf(group);
			parent.hiero.groups.splice(i,1);
			parent.hiero.ops.splice(Math.min(i, parent.hiero.ops.length-1),
					1);
			parent.hiero.switches.splice(Math.min(i,
						parent.hiero.switches.length-1),1);
		}
		if (parent.hiero !== null && parent.hiero.groups.length > 0)
			return parent.hiero.groups[Math.min(i,
					parent.hiero.groups.length-1)];
		else if (parent instanceof ResBox)
			return parent;
		else
			return null;
	} else if (parent instanceof ResHorgroup) {
		var i = parent.subGroups().indexOf(group);
		if (parent.groups.length === 2) {
			var other = 1-i;
			return ResTree.replaceGroup(parent, parent.groups[other].group);
		} else {
			parent.groups.splice(i,1);
			parent.ops.splice(Math.min(i, parent.ops.length-1), 1);
			parent.switches.splice(Math.min(i, parent.switches.length-1),1);
			return parent.groups[Math.min(i, parent.groups.length-1)].group;
		}
	} else if (parent instanceof ResVertgroup) {
		var i = parent.subGroups().indexOf(group);
		if (parent.groups.length === 2) {
			var other = 1-i;
			return ResTree.replaceGroup(parent, parent.groups[other].group);
		} else {
			parent.groups.splice(i,1);
			parent.ops.splice(Math.min(i, parent.ops.length-1), 1);
			parent.switches.splice(Math.min(i, parent.switches.length-1),1);
			return parent.groups[Math.min(i, parent.groups.length-1)].group;
		}
	} else if (ResTree.objInClasses(parent, [ResInsert, ResStack])) {
		if (parent.group1 === group)
			return ResTree.replaceGroup(parent, parent.group2);
		else
			return ResTree.replaceGroup(parent, parent.group1);
	}
};

/* res_signinfo.js */

ResContext.signInfo = {
A1:'<canvas class="res">A1</canvas> A1: seated man.<ul><li>Det. <span class="egytransl">s</span>, "man". Ex. <canvas class="res">O34:A1*(.:Z1)</canvas> . </li><li><canvas class="res">A1:Z2</canvas> Log. or det. <span class="egytransl">rHw</span>, "men". Exx. <canvas class="res">r-H*w-A1:Z2</canvas> , <span class="egytransl">rHw</span>, "men"; <canvas class="res">A1:Z2-anx-n:x</canvas> , <span class="egytransl">^rHw-anx</span>, "Rekhu-ankh". </li><li>Det. man and his occupations. Exx. <canvas class="res">zA-A1</canvas> , <span class="egytransl">sA</span>, "son"; <canvas class="res">s*Ab-A1</canvas> , <span class="egytransl">smr</span>, "courtier"; <canvas class="res">H-wr:r-w-G37-A1</canvas> , <span class="egytransl">Hwrw</span>, "wretch"; <canvas class="res">ir:A1</canvas> , <span class="egytransl">jr</span>, "doer". </li><li><canvas class="res">A1*B1:Z1*Z1*Z1</canvas> Det. people and their occupations. Exx. <canvas class="res">r:T-A1*B1:Z2</canvas> , <span class="egytransl">rmT</span>, "people"; <canvas class="res">T14*m-w-A1*B1:Z2</canvas> , <span class="egytransl">aAmw</span>, "Asiatics"; <canvas class="res">mt:[fit]t*.:r-w-[fit]T14*[fit]T14-A1*B1:Z2</canvas> , <span class="egytransl">mtrw</span>, "witnesses". </li><li>Det. in personal names. Ex. <canvas class="res">anx-n:x-w-A1</canvas> , <span class="egytransl">^anxw</span>, "Ankhu". </li><li>Log. <span class="egytransl">=j</span>, "I". </li><li>Det. first person singular. Exx. <canvas class="res">w-A1</canvas> , <span class="egytransl">wj</span>, "me"; <canvas class="res">nw:k-A1</canvas> , <span class="egytransl">jnk</span>, "I"; <canvas class="res">k:w-A1</canvas> , <span class="egytransl">.kw</span>, "I". </li></ul>',
A2:'<canvas class="res">A2</canvas> A2: seated man with hand to mouth.<ul><li>Det. eat and drink. Exx. <canvas class="res">E34:n-m-A2</canvas> , <span class="egytransl">wnm</span>, "eat"; <canvas class="res">H-q:r-A2</canvas> , <span class="egytransl">Hqr</span>, "hungry"; <canvas class="res">s-wr:r-A2</canvas> , <span class="egytransl">swr</span>, "drink". </li><li>Det. speak, think, feel. Exx. <canvas class="res">s-D:d-A2</canvas> , <span class="egytransl">sDd</span>, "recount"; <canvas class="res">g:r-A2</canvas> , <span class="egytransl">gr</span>, "silent"; <canvas class="res">k*[fit]A-A2</canvas> , <span class="egytransl">kAj</span>, "think"; <canvas class="res">U7:r-A2</canvas> , <span class="egytransl">mrj</span>, "love". </li></ul>',
A3:'<canvas class="res">A3</canvas> A3: man sitting on heel.<ul><li>Det. <span class="egytransl">Hmsj</span>, "sit". Ex. <canvas class="res">N41:z-A3</canvas> . </li></ul>',
A4:'<canvas class="res">A4</canvas> A4: seated man with hands raised.<ul><li>Det. praise, supplicate. Ex. <canvas class="res">N14-A4</canvas> , <span class="egytransl">dwA</span>, "praise". </li><li>Det. hide. Exx. <canvas class="res">s-d:g-A4-.:D54</canvas> , <span class="egytransl">sdgj</span>, "hide"; <canvas class="res">i-mn:n-A4</canvas> , <span class="egytransl">jmn</span>, "hidden". </li><li> Cf. <canvas class="res">A30</canvas> A30. </li></ul>',
A5:'<canvas class="res">A5</canvas> A5: crouching man hiding behind wall.<ul><li>Det. hide. Ex. <canvas class="res">i-mn:n-A5-Y1[rotate=270]</canvas> , <span class="egytransl">jmn</span>, "hidden". </li></ul>',
A5a:'<canvas class="res">A5a</canvas> A5a: seated man hiding behind wall.<ul><li> Use as <canvas class="res">A5</canvas> A5. </li></ul>',
A6:'<canvas class="res">A6</canvas> A6: seated man under vase from which water flows.<ul><li>Log. or det. <span class="egytransl">wab</span>, "pure", "clean". </li></ul>',
A6a:'<canvas class="res">A6a</canvas> A6a: seated man reaching for libation stone, under vase from which water flows.<ul><li>Det. <span class="egytransl">sAT</span>, "make libation", "libation stone". </li></ul>',
A6b:'<canvas class="res">A6b</canvas> A6b: seated man reaching down, under vase from which water flows.<ul><li>Det. <span class="egytransl">sAT</span>, "make libation". </li></ul>',
A7:'<canvas class="res">A7</canvas> A7: fatigued man.<ul><li>Det. weary, weak. Exx. <canvas class="res">wr:r-d-A7-G37</canvas> , <span class="egytransl">wrD</span>, "tired"; <canvas class="res">b-d:S-A7-G37</canvas> , <span class="egytransl">bdS</span>, "faint"; <canvas class="res">g-n:n-A7</canvas> , <span class="egytransl">gnn</span>, "soft". </li></ul>',
A8:'<canvas class="res">A8</canvas> A8: man performing <span class="egytransl">hnw</span>-rite.<ul><li>Det. <span class="egytransl">hnw</span>, "jubilation". Ex. <canvas class="res">O4:n-insert[s](.*w,nw)-A8</canvas> . </li></ul>',
A9:'<canvas class="res">A9</canvas> A9: seated man with <canvas class="res">W10</canvas> W10 on head.<ul><li>Log. or det. <span class="egytransl">ATp</span>, "load". Ex. <canvas class="res">A-T:p-A9</canvas> , <canvas class="res">A9-a</canvas> . </li><li>Log. or det. <span class="egytransl">fAj</span>, "raise". Ex. <canvas class="res">f-[fit]A-A9</canvas> , <canvas class="res">A9-A24</canvas> . </li><li>Log. or det. <span class="egytransl">kAt</span>, "work". Ex. <canvas class="res">kA:t-A9</canvas> , <canvas class="res">A9</canvas> . </li></ul>',
A10:'<canvas class="res">A10</canvas> A10: seated man holding oar.<ul><li>Det. sailing. Ex. <canvas class="res">s*qd-d:nw-A10</canvas> , <span class="egytransl">sqdj</span>, "sail (verb)". </li></ul>',
A11:'<canvas class="res">A11</canvas> A11: seated man holding <canvas class="res">S42</canvas> S42 and <canvas class="res">S39</canvas> S39.<ul><li>Log. or det. <span class="egytransl">xnms</span>, "friend". Ex. <canvas class="res">A11</canvas> , <canvas class="res">x:n-m-s-A11</canvas> . </li></ul>',
A12:'<canvas class="res">A12</canvas> A12: soldier with bow and quiver.<ul><li>Log. or det. <span class="egytransl">mSa</span>, "army". Ex. <canvas class="res">A12*Z3</canvas> , <canvas class="res">m-S:a-A12*Z3</canvas> . </li><li>Det. army. Ex. <canvas class="res">mn:n-f-[fit]A-[fit]t-A12*Z3</canvas> , <span class="egytransl">mnfAt</span>, "infantry". </li><li>Mnemonics: mSa.</li></ul>',
A13:'<canvas class="res">A13</canvas> A13: man with arms tied behind his back.<ul><li>Det. enemy. Exx. <canvas class="res">s*b-i*A13</canvas> , <span class="egytransl">sbj</span>, "rebel"; <canvas class="res">x*(.:t):f-A13</canvas> , <span class="egytransl">xftj</span>, "enemy". </li></ul>',
A14:'<canvas class="res">A14</canvas> A14: falling man with blood streaming from his head.<ul><li>Det. die. Ex. <canvas class="res">m:t-A14</canvas> , <span class="egytransl">mwt</span>, "die". </li><li>Det. enemy. Ex. <canvas class="res">x*(.:t):f-A14</canvas> , <span class="egytransl">xftj</span>, "enemy". </li></ul>',
A14a:'<canvas class="res">A14a</canvas> A14a: man whose head is hit with an axe.<ul><li> Use as <canvas class="res">A14</canvas> A14. </li></ul>',
A15:'<canvas class="res">A15</canvas> A15: man falling.<ul><li>Log. or det. <span class="egytransl">xr</span>, "fall". Exx. <canvas class="res">x:r-A15</canvas> , <canvas class="res">A15</canvas> ; <canvas class="res">A15*w</canvas> , <canvas class="res">x:r-w-A15</canvas> , <span class="egytransl">xrw</span>, "fallen (conquered) enemy". </li><li><canvas class="res">A15:X1</canvas> Log. <span class="egytransl">sxrt</span>, "overthrow (infinitive)". </li><li>Mnemonics: xr.</li></ul>',
A16:'<canvas class="res">A16</canvas> A16: man bowing down.<ul><li>Det. <span class="egytransl">ksj</span>, "bow down". Ex. <canvas class="res">k*s-A16</canvas> . </li></ul>',
A17:'<canvas class="res">A17</canvas> A17: child sitting with hand to mouth.<ul><li>Log. or det. <span class="egytransl">Xrd</span>, "child". Ex. <canvas class="res">A17-A1</canvas> , <canvas class="res">X:r:d-A17</canvas> . </li><li>Det. young. Exx. <canvas class="res">r:n-p*M6-A17</canvas> , <span class="egytransl">rnpj</span>, "rejuvenate"; <canvas class="res">S:r-i-A17</canvas> , <span class="egytransl">Srj</span>, "child"; <canvas class="res">ms*s-A17</canvas> , <span class="egytransl">ms</span>, "child"; <canvas class="res">n:nm*m-A17-G37</canvas> , <span class="egytransl">nmHw</span>, "orphan". </li><li>Phon. <span class="egytransl">nnj</span>. Ex. <canvas class="res">M23-t:n-A17-n:n-niwt</canvas> , <span class="egytransl">^nnj-nsw</span>, "Herakleopolis". </li><li> Use as <canvas class="res">A3</canvas> A3. </li><li>Mnemonics: Xrd.</li></ul>',
A17a:'<canvas class="res">A17a</canvas> A17a: child sitting with arms hanging down.<ul><li> Use as <canvas class="res">A3</canvas> A3. Ex. <canvas class="res">N41:z-A17a</canvas> , <span class="egytransl">Hmsj</span>, "sit". </li><li> Use as <canvas class="res">A17</canvas> A17. Ex. <canvas class="res">ms*w-A17a-Z2</canvas> , <span class="egytransl">msw</span>, "children". </li></ul>',
A18:'<canvas class="res">A18</canvas> A18: child wearing <canvas class="res">S3</canvas> S3.<ul><li>Det. child-king. Exx. <canvas class="res">i-n:p-A18</canvas> , <span class="egytransl">jnpw</span>, "crown-prince"; <canvas class="res">V25*H-A18</canvas> , <span class="egytransl">wDH</span>, "weaned princeling". </li></ul>',
A19:'<canvas class="res">A19</canvas> A19: bent man leaning on staff.<ul><li>Log. or det. <span class="egytransl">jAwj</span>, "old". Ex. <canvas class="res">i-A-[fit]w-A19</canvas> , <canvas class="res">A19</canvas> . </li><li>Log. or det. <span class="egytransl">smsw</span>, "eldest". Ex. <canvas class="res">s*m-s*w-A19</canvas> , <canvas class="res">A19</canvas> . </li><li>Log. or det. <span class="egytransl">wr</span>, "great". Ex. <canvas class="res">wr:r-A19</canvas> , <canvas class="res">A19</canvas> , <span class="egytransl">wr</span>, "chief". </li><li>Det. old. Ex. <canvas class="res">t:n-i-A19</canvas> , <span class="egytransl">tnj</span>, "old". </li><li>Det. lean. Exx. <canvas class="res">r:h:n-A19</canvas> , <span class="egytransl">rhn</span>, "lean (verb)"; <canvas class="res">t-wA-A-A19</canvas> , <span class="egytransl">twA</span>, "support oneself". </li><li>Log. or det. <span class="egytransl">jky</span>, "quarryman". Ex. <canvas class="res">i-k-A19</canvas> , <canvas class="res">A19-i*i</canvas> . </li></ul>',
A20:'<canvas class="res">A20</canvas> A20: man leaning on forked staff.<ul><li>Log. or det. <span class="egytransl">smsw</span>, "eldest". Exx. <canvas class="res">A20</canvas> , <canvas class="res">s*m-s*w-A20</canvas> ; <canvas class="res">insert[t,x=0.7,fix](zA,Z1)-f-A20</canvas> , <span class="egytransl">sA=f smsw</span>, "his eldest son". </li><li><canvas class="res">A20:[sep=0.2]N1</canvas> Log. <span class="egytransl">smsw-hAyt</span>, "elder of the portal". </li></ul>',
A21:'<canvas class="res">A21</canvas> A21: man holding staff with handkerchief.<ul><li>Log. or det. <span class="egytransl">sr</span>, "official (noun)". Ex. <canvas class="res">s-r-A21</canvas> , <canvas class="res">A21</canvas> . </li><li>Det. dignitary. Exx. <canvas class="res">Sn-n:nw*W-t*A21-A1:Z1*Z1*Z1</canvas> , <span class="egytransl">Snwt</span>, "courtiers"; <canvas class="res">s*U23-m*[fit](r:.)-[sep=0.4]A21</canvas> , <span class="egytransl">smr</span>, "courtier". </li><li> Use as <canvas class="res">A11</canvas> A11. Ex. <canvas class="res">x:n-nm-m*s-A21</canvas> , <span class="egytransl">xnms</span>, "friend". </li><li> Use as <canvas class="res">A22</canvas> A22. Ex. <canvas class="res">D33:n-ti*A21</canvas> , <span class="egytransl">Xntj</span>, "statue". </li><li>Mnemonics: sr.</li></ul>',
A22:'<canvas class="res">A22</canvas> A22: statue of man with staff and <canvas class="res">S42</canvas> S42.<ul><li>Det. statue. Exx. <canvas class="res">D33:n-ti*A22</canvas> , <span class="egytransl">Xntj</span>, "statue"; <canvas class="res">insert[s](insert[te](.*w*.,t),t)-A22</canvas> , <span class="egytransl">twt</span>, "statue". </li><li> The exact shape varies depending on the nature of the statue. </li></ul>',
A23:'<canvas class="res">A23</canvas> A23: king with staff and <canvas class="res">T3</canvas> T3.<ul><li>Det. <span class="egytransl">jty</span>, "sovereign". Ex. <canvas class="res">i*ti-i*i-A23</canvas> . </li></ul>',
A24:'<canvas class="res">A24</canvas> A24: man striking with both hands.<ul><li>Log. or det. <span class="egytransl">nxt</span>, "strong". Ex. <canvas class="res">n:xt:x*[sep=0.3](.:t)-A24</canvas> , <canvas class="res">A24</canvas> . </li><li>Det. strike, force, effort. Exx. <canvas class="res">H*w-A24</canvas> , <span class="egytransl">Hwj</span>, "strike"; <canvas class="res">n:N42-m-A24</canvas> , <span class="egytransl">nHm</span>, "take away"; <canvas class="res">H-a-DA*A-A24</canvas> , <span class="egytransl">HaDA</span>, "rob"; <canvas class="res">sbA-A-A24</canvas> , <span class="egytransl">sbA</span>, "teach". </li></ul>',
A25:'<canvas class="res">A25</canvas> A25: man striking, with left arm hanging behind back.<ul><li>Log. or det. <span class="egytransl">Hwj</span>, "strike". Ex. <canvas class="res">H*A25-A24</canvas> . </li></ul>',
A26:'<canvas class="res">A26</canvas> A26: man with one arm pointing forward.<ul><li>Det. call. Exx. <canvas class="res">n:i*s-A26</canvas> , <span class="egytransl">njs</span>, "summon"; <canvas class="res">Dw-w-i-A26</canvas> , <span class="egytransl">Dwj</span>, "call". </li><li><canvas class="res">F21*A26</canvas> Log. <span class="egytransl">sDm-aS</span>, "servant". </li><li>Det. <span class="egytransl">j</span>, "O (vocative interjection)". Ex. <canvas class="res">i*A26</canvas> . </li></ul>',
A27:'<canvas class="res">A27</canvas> A27: hastening man.<ul><li>Phon. det. <span class="egytransl">jn</span>. Ex. <canvas class="res">i*A27:n</canvas> , <span class="egytransl">jn</span>, "by". </li></ul>',
A28:'<canvas class="res">A28</canvas> A28: man with hands raised on either side.<ul><li>Log. or det. <span class="egytransl">qAj</span>, "high". Ex. <canvas class="res">q*A-A28</canvas> , <canvas class="res">A28</canvas> . </li><li>Det. joy. Exx. <canvas class="res">H-a-A28-A2</canvas> , <span class="egytransl">Haj</span>, "rejoice"; <canvas class="res">s*wA-S-A28</canvas> , <span class="egytransl">swAS</span>, "praise". </li><li>Det. mourn. Ex. <canvas class="res">H*A-A28</canvas> , <span class="egytransl">HAj</span>, "mourn". </li><li>Det. <span class="egytransl">jAs</span>, "bald". Ex. <canvas class="res">i*A-s*A28</canvas> . </li><li>Do not confuse with: <canvas class="res">A29</canvas> A29. </li></ul>',
A29:'<canvas class="res">A29</canvas> A29: man upside down.<ul><li>Det. upside down. Ex. <canvas class="res">s-x:d-A29</canvas> , <span class="egytransl">sxd</span>, "upside down". </li><li>Do not confuse with: <canvas class="res">A28</canvas> A28. </li></ul>',
A30:'<canvas class="res">A30</canvas> A30: man with hands raised in front.<ul><li>Det. praise, awe, supplicate. Exx. <canvas class="res">i*A-w*A30</canvas> , <span class="egytransl">jAw</span>, "praise"; <canvas class="res">N14-A30</canvas> , <span class="egytransl">dwA</span>, "praise"; <canvas class="res">s*wA-S-A30</canvas> , <span class="egytransl">swAS</span>, "praise"; <canvas class="res">t*wA-A-A30</canvas> , <span class="egytransl">twA</span>, "claim"; <canvas class="res">t-wr:r-A30</canvas> , <span class="egytransl">twr</span>, "show respect". </li><li> Cf. <canvas class="res">A4</canvas> A4. </li></ul>',
A31:'<canvas class="res">A31</canvas> A31: man with hands raised behind him.<ul><li>Det. turn away. Ex. <canvas class="res">a:n-insert[s](.*w,nw)-A31</canvas> , <span class="egytransl">anw</span>, "averted (face)". </li></ul>',
A32:'<canvas class="res">A32</canvas> A32: man dancing with arms to the back.<ul><li>Det. dance. Ex. <canvas class="res">x*[fit]b-A32</canvas> , <span class="egytransl">xbj</span>, "dance". </li><li>Det. joy. Ex. <canvas class="res">h-i*i-h:n-insert[s](.*w,nw)-A32</canvas> , <span class="egytransl">hy-hnw</span>, "jubilate". </li></ul>',
A32a:'<canvas class="res">A32a</canvas> A32a: man dancing with arms to the front.<ul><li> Use as <canvas class="res">A32</canvas> A32. </li></ul>',
A33:'<canvas class="res">A33</canvas> A33: man with stick and bundle on shoulder.<ul><li>Log. or det. <span class="egytransl">mnjw</span>, "herdsman". Ex. <canvas class="res">A33</canvas> , <canvas class="res">mn:n-i*w-A33</canvas> . </li><li>Det. wander. Exx. <canvas class="res">r:w-A33</canvas> , <span class="egytransl">rwj</span>, "wander"; <canvas class="res">S-U1-A33</canvas> , <span class="egytransl">SmA</span>, "stranger". </li><li>Mnemonics: mniw.</li></ul>',
A34:'<canvas class="res">A34</canvas> A34: man pounding in a mortar.<ul><li>Det. <span class="egytransl">xwsj</span>, "pound", "build". Ex. <canvas class="res">x-[fit]w-s*A34</canvas> . </li></ul>',
A35:'<canvas class="res">A35</canvas> A35: man building wall.<ul><li>Log. or det. <span class="egytransl">qd</span>, "build". Ex. <canvas class="res">qd-d:nw-A34</canvas> . </li></ul>',
A36:'<canvas class="res">A36</canvas> A36: man kneading into vessel.<ul><li>Log. or det. <span class="egytransl">aftj</span>, "brewer". Ex. <canvas class="res">A36-t:Z4-A24</canvas> , <canvas class="res">a:[sep=0.5]f:t-A36</canvas> . </li></ul>',
A37:'<canvas class="res">A37</canvas> A37: man in vessel.<ul><li> Use as <canvas class="res">A36</canvas> A36. </li></ul>',
A38:'<canvas class="res">A38</canvas> A38: man holding necks of two emblematic animals with panther heads.<ul><li>Log. <span class="egytransl">^qjs</span>, "Qus". Ex. <canvas class="res">A38</canvas> . </li><li>Mnemonics: qiz.</li></ul>',
A39:'<canvas class="res">A39</canvas> A39: man on two giraffes.<ul><li> Use as <canvas class="res">A38</canvas> A38. </li></ul>',
A40:'<canvas class="res">A40</canvas> A40: seated god.<ul><li>Det. god. Exx. <canvas class="res">p:t-H-A40</canvas> , <span class="egytransl">^ptH</span>, "Ptah"; <canvas class="res">mn:n-T*w-A40</canvas> , <span class="egytransl">^mnTw</span>, "Month". </li><li>Log. <span class="egytransl">=j</span>, "I (god or king)". </li><li>Det. first person singular (god or king). Exx. <canvas class="res">w-A40</canvas> , <span class="egytransl">wj</span>, "me"; <canvas class="res">nw:k-A40</canvas> , <span class="egytransl">jnk</span>, "I". </li><li> Replacing earlier <canvas class="res">G7</canvas> G7. </li></ul>',
A40a:'<canvas class="res">A40a</canvas> A40a: seated god with <canvas class="res">S40</canvas> S40.<ul><li> Use as <canvas class="res">A40</canvas> A40. </li></ul>',
A41:'<canvas class="res">A41</canvas> A41: king with uraeus.<ul><li>Det. king. Exx. <canvas class="res">sw-t:n-A41</canvas> , <span class="egytransl">nsw</span>, "king"; <canvas class="res">Hm*Z1-A41</canvas> , <span class="egytransl">Hm</span>, "majesty"; <canvas class="res">nb-A41</canvas> , <span class="egytransl">nb</span>, "lord". </li><li>Log. <span class="egytransl">=j</span>, "I (king)". </li><li>Det. first person singular (king). Exx. <canvas class="res">w-A41</canvas> , <span class="egytransl">wj</span>, "me"; <canvas class="res">nw:k-A41</canvas> , <span class="egytransl">jnk</span>, "I". </li></ul>',
A42:'<canvas class="res">A42</canvas> A42: king with uraeus and <canvas class="res">S45</canvas> S45.<ul><li> Use as <canvas class="res">A41</canvas> A41. </li></ul>',
A42a:'<canvas class="res">A42a</canvas> A42a: king with uraeus and <canvas class="res">S45</canvas> S45.<ul><li> Use as <canvas class="res">A41</canvas> A41. </li></ul>',
A43:'<canvas class="res">A43</canvas> A43: king wearing <canvas class="res">S1</canvas> S1.<ul><li>Log. or det. <span class="egytransl">nsw</span>, "king (of Upper Egypt)". Ex. <canvas class="res">sw-t:n-A43</canvas> , <canvas class="res">A43</canvas> . </li><li>Det. <span class="egytransl">^wsjr</span>, "Osiris". Ex. <canvas class="res">st:ir-A43</canvas> . </li></ul>',
A43a:'<canvas class="res">A43a</canvas> A43a: king wearing <canvas class="res">S1</canvas> S1 with <canvas class="res">S40</canvas> S40.<ul><li> Use as <canvas class="res">A43</canvas> A43. </li></ul>',
A44:'<canvas class="res">A44</canvas> A44: king wearing <canvas class="res">S1</canvas> S1 with <canvas class="res">S45</canvas> S45.<ul><li> Use as <canvas class="res">A43</canvas> A43. </li></ul>',
A45:'<canvas class="res">A45</canvas> A45: king wearing <canvas class="res">S3</canvas> S3.<ul><li>Log. or det. <span class="egytransl">bjtj</span>, "king of Lower Egypt". Ex. <canvas class="res">L2:t-A45</canvas> , <canvas class="res">A45</canvas> . </li></ul>',
A45a:'<canvas class="res">A45a</canvas> A45a: king wearing <canvas class="res">S3</canvas> S3 with <canvas class="res">S40</canvas> S40.<ul><li> Use as <canvas class="res">A45</canvas> A45. </li><li>Do not confuse with: <canvas class="res">C24</canvas> C24. </li></ul>',
A46:'<canvas class="res">A46</canvas> A46: king wearing <canvas class="res">S3</canvas> S3 with <canvas class="res">S45</canvas> S45.<ul><li> Use as <canvas class="res">A45</canvas> A45. </li></ul>',
A47:'<canvas class="res">A47</canvas> A47: shepherd seated and wrapped in mantle, holding stick.<ul><li>Log. <span class="egytransl">mnjw</span>, "herdsman". Ex. <canvas class="res">A47-w-A1</canvas> . </li><li>Log. or det. <span class="egytransl">sAw</span>, "guard", "protect". Ex. <canvas class="res">z:zA-A-A47-A24</canvas> , <canvas class="res">A47-A-D40</canvas> . </li><li>Do not confuse with: <canvas class="res">A48</canvas> A48. </li><li>Mnemonics: iry.</li></ul>',
A48:'<canvas class="res">A48</canvas> A48: beardless man seated and holding knife.<ul><li>Log. or det. <span class="egytransl">jrj</span>, "relating to", "belonging to". Ex. <canvas class="res">i*r-A48</canvas> , <canvas class="res">A48</canvas> . </li><li>Do not confuse with: <canvas class="res">A47</canvas> A47. </li></ul>',
A49:'<canvas class="res">A49</canvas> A49: seated Syrian holding stick.<ul><li>Det. foreigner. Exx. <canvas class="res">T14*m-w-A49*Z3</canvas> , <span class="egytransl">aAmw</span>, "Asiatics"; <canvas class="res">iwn*iwn*iwn-Aa32*A-A49-A49-A49</canvas> , <span class="egytransl">jwntjw-^stj</span>, "Nubian nomads". </li></ul>',
A50:'<canvas class="res">A50</canvas> A50: noble on chair.<ul><li>Det. revered person. Exx. <canvas class="res">s-n:b-w-A50</canvas> , <span class="egytransl">^snbw</span>, "Sonbu"; <canvas class="res">s*Ab-m:r-A50*Z3</canvas> , <span class="egytransl">smrw</span>, "courtiers". </li><li>Log. <span class="egytransl">=j</span>, "I (revered person)". </li><li>Det. first person singular (revered person). Exx. <canvas class="res">w-A50</canvas> , <span class="egytransl">wj</span>, "me"; <canvas class="res">nw:k-A50</canvas> , <span class="egytransl">jnk</span>, "I". </li><li>Log. or det. <span class="egytransl">Sps</span>, "noble". </li><li>Mnemonics: Sps.</li></ul>',
A51:'<canvas class="res">A51</canvas> A51: noble on chair with <canvas class="res">S45</canvas> S45.<ul><li> Use as <canvas class="res">A50</canvas> A50 [Det. revered person]. Ex. <canvas class="res">imi-.:Z2a-[sep=0.5]w-HAt:t-A51*Z3</canvas> , <span class="egytransl">jmjw-HAt</span>, "ancestors". </li><li> Use as <canvas class="res">A50</canvas> A50 [Log. or det. <span class="egytransl">Sps</span>, "noble"]. Ex. <canvas class="res">A51*s</canvas> , <canvas class="res">S:p-s*A51</canvas> , <span class="egytransl">Sps</span>, "noble". </li><li>Mnemonics: Spsi.</li></ul>',
A52:'<canvas class="res">A52</canvas> A52: noble squatting with <canvas class="res">S45</canvas> S45.<ul><li> Use as <canvas class="res">A50</canvas> A50 [Det. revered person]. Exx. <canvas class="res">pA-pt-A52</canvas> , <span class="egytransl">^pA-Hrj</span>, "Paheri"; <canvas class="res">z:a-H-E31-A52</canvas> , <span class="egytransl">saH</span>, "blessed (deceased)". </li><li> Use as <canvas class="res">A50</canvas> A50 [Log. or det. <span class="egytransl">Sps</span>, "noble"]. Ex. <canvas class="res">S:p:z-A52</canvas> , <span class="egytransl">Sps</span>, "noble". </li></ul>',
A53:'<canvas class="res">A53</canvas> A53: standing mummy.<ul><li>Log. or det. <span class="egytransl">twt</span>, "statue". Ex. <canvas class="res">insert[s](insert[te](.*w*.,t),t)-A53</canvas> , <canvas class="res">A53</canvas> . </li><li>Det. mummy. Ex. <canvas class="res">w*i-A53</canvas> , <span class="egytransl">wj</span>, "mummy-case". </li><li>Det. likeness, form. Exx. <canvas class="res">q*i-A53-mDAt[rotate=270]</canvas> , <span class="egytransl">qj</span>, "form"; <canvas class="res">xpr:r-w-A53-mDAt:Z2</canvas> , <span class="egytransl">xprw</span>, "form". </li></ul>',
A54:'<canvas class="res">A54</canvas> A54: lying mummy.<ul><li>Det. death. Exx. <canvas class="res">mn:n-i-A54</canvas> , <span class="egytransl">mnj</span>, "death"; <canvas class="res">nb-anx-n:x-A54</canvas> , <span class="egytransl">nb-anx</span>, "sarcophagus". </li></ul>',
A55:'<canvas class="res">A55</canvas> A55: mummy on bed.<ul><li>Log. or det. <span class="egytransl">sDr</span>, "lie". Ex. <canvas class="res">s-Dr:r-A55</canvas> , <canvas class="res">A55</canvas> . </li><li>Det. death. Exx. <canvas class="res">x:p*(.:t)-A55</canvas> , <span class="egytransl">xpyt</span>, "death"; <canvas class="res">XA:t-A55</canvas> , <span class="egytransl">XAt</span>, "corpse". </li></ul>',
A56:'<canvas class="res">A56</canvas> A56: seated man holding stick.<ul><li>Det. <span class="egytransl">bAk</span>, "servant". </li></ul>',
A57:'<canvas class="res">A57</canvas> A57: man holding <canvas class="res">R4</canvas> R4.<ul><li>Log. <span class="egytransl">Htp-Dj-nsw</span>, "a boon that the king grants". </li></ul>',
A58:'<canvas class="res">A58</canvas> A58: man applying hoe to ground.<ul><li>Log. or det. <span class="egytransl">SAd</span>, "dig". </li></ul>',
A59:'<canvas class="res">A59</canvas> A59: man threatening with stick.<ul><li>Det. <span class="egytransl">sHr</span>, "drive away". Ex. <canvas class="res">s-Hr:r-A59</canvas> . </li></ul>',
A60:'<canvas class="res">A60</canvas> A60: man sowing seeds.<ul><li>Det. <span class="egytransl">sTj</span>, "sow". Ex. <canvas class="res">s*t-A60</canvas> . </li></ul>',
A61:'<canvas class="res">A61</canvas> A61: man looking over his shoulder.<ul><li>Det. turn back, turn away. </li></ul>',
A62:'<canvas class="res">A62</canvas> A62: Asiatic.<ul><li>Log. <span class="egytransl">wr</span>, "Asiatic prince". </li></ul>',
A63:'<canvas class="res">A63</canvas> A63: king on throne holding staff.<ul><li>Det. be seated (of king). </li></ul>',
A64:'<canvas class="res">A64</canvas> A64: man sitting on heels holding forward <canvas class="res">W10</canvas> W10.<ul><li>Det. offering. </li></ul>',
A65:'<canvas class="res">A65</canvas> A65: man wearing tunic with fringes and holding mace.<ul><li>Log. <span class="egytransl">jrj-nTr</span>, "who belongs to the god". </li></ul>',
A66:'<canvas class="res">A66</canvas> A66: man holding <canvas class="res">Y8</canvas> Y8.<ul><li>Log. or det. <span class="egytransl">jHwj</span>, "sistrum player". </li></ul>',
A67:'<canvas class="res">A67</canvas> A67: dwarf.<ul><li>Log. or det. <span class="egytransl">nmw</span>, "dwarf". </li></ul>',
A68:'<canvas class="res">A68</canvas> A68: man holding up knife.<ul><li>Det. kill. </li></ul>',
A69:'<canvas class="res">A69</canvas> A69: seated man with raised right arm and left arm hanging down.<ul><li>Log. <span class="egytransl">nxt</span>, "strong". Ex. <canvas class="res">t:f:n-A69</canvas> , <span class="egytransl">^tA=f-nxt</span>, "Tefnakht". </li></ul>',
A70:'<canvas class="res">A70</canvas> A70: seated man with raised arms.<ul><li> Use as <canvas class="res">C11</canvas> C11 [Log. <span class="egytransl">HH</span>, "million", "many"]. </li></ul>',
B1:'<canvas class="res">B1</canvas> B1: seated woman.<ul><li>Det. female. Exx. <canvas class="res">z:t-B1</canvas> , <span class="egytransl">st</span>, "woman"; <canvas class="res">N42:t-B1</canvas> , <span class="egytransl">Hmt</span>, "woman", "wife"; <canvas class="res">nTr-t:r:t-B1</canvas> , <span class="egytransl">nTrt</span>, "goddess"; <canvas class="res">insert[te](zA,t)-B1</canvas> , <span class="egytransl">sAt</span>, "daughter"; <canvas class="res">XA-A-r:t-D3-B1</canvas> , <span class="egytransl">XArt</span>, "widow"; <canvas class="res">Hm*t-B1</canvas> , <span class="egytransl">Hmt</span>, "(female) slave"; <canvas class="res">M27-i*i-t-B1</canvas> , <span class="egytransl">Smayt</span>, "(female) singer"; <canvas class="res">nfr-r:t-B1</canvas> , <span class="egytransl">^nfrt</span>, "Nofret". </li><li>Log. or det. <span class="egytransl">=j</span>, "I (female)". </li></ul>',
B2:'<canvas class="res">B2</canvas> B2: pregnant woman.<ul><li>Det. pregnant. Exx. <canvas class="res">E9-w-wr:r-B2</canvas> , <span class="egytransl">jwr</span>, "conceive"; <canvas class="res">b*kA-B2</canvas> , <span class="egytransl">bkA</span>, "pregnant". </li></ul>',
B3:'<canvas class="res">B3</canvas> B3: woman giving birth.<ul><li>Log. or det. <span class="egytransl">msj</span>, "give birth". Ex. <canvas class="res">ms*s-B3</canvas> , <canvas class="res">B3</canvas> . </li><li>Mnemonics: msi.</li></ul>',
B4:'<canvas class="res">B4</canvas> B4: combination of <canvas class="res">B3</canvas> B3 and <canvas class="res">F31</canvas> F31.<ul><li> Use as <canvas class="res">B3</canvas> B3. </li><li> Use as <canvas class="res">A3</canvas> A3. </li></ul>',
B5:'<canvas class="res">B5</canvas> B5: woman suckling child.<ul><li>Det. nurse. Ex. <canvas class="res">mn:n-a-B5</canvas> , <span class="egytransl">mna</span>, "nurse (verb)". </li></ul>',
B5a:'<canvas class="res">B5a</canvas> B5a: woman suckling child (simplified).<ul><li> Use as <canvas class="res">B4</canvas> B4. Ex. <canvas class="res">x:n-m-B5a*t</canvas> , <span class="egytransl">^xnmt</span>, "Khnemt". </li></ul>',
B6:'<canvas class="res">B6</canvas> B6: woman on chair with child on lap.<ul><li>Det. rear. Ex. <canvas class="res">r:n:n-B6</canvas> , <span class="egytransl">rnn</span>, "rear". </li></ul>',
B7:'<canvas class="res">B7</canvas> B7: queen wearing diadem and holding flower.<ul><li>Det. in names of queens. </li></ul>',
B8:'<canvas class="res">B8</canvas> B8: woman holding <canvas class="res">M9</canvas> M9.<ul><li>Det. in women&amp;apos;s names. </li></ul>',
B9:'<canvas class="res">B9</canvas> B9: woman holding <canvas class="res">Y8</canvas> Y8.<ul><li>Log. or det. <span class="egytransl">jHyt</span>, "(female) sistrum player". </li></ul>',
C1:'<canvas class="res">C1</canvas> C1: god with <canvas class="res">N6</canvas> N6.<ul><li>Log. or det. <span class="egytransl">^ra</span>, "Re". Ex. <canvas class="res">r:a-C1</canvas> , <canvas class="res">C1</canvas> . </li></ul>',
C2:'<canvas class="res">C2</canvas> C2: god with head of falcon with sun on head and holding <canvas class="res">S34</canvas> S34 .<ul><li> Use as <canvas class="res">C1</canvas> C1. Ex. <canvas class="res">r:a-C2</canvas> , <canvas class="res">C2</canvas> , <span class="egytransl">^ra</span>, "Re". </li></ul>',
C2a:'<canvas class="res">C2a</canvas> C2a: god with head of falcon with sun on head.<ul><li> Use as <canvas class="res">C1</canvas> C1. </li></ul>',
C2b:'<canvas class="res">C2b</canvas> C2b: <canvas class="res">C2a</canvas> C2a reversed.<ul><li> Use as <canvas class="res">C1</canvas> C1. </li></ul>',
C2c:'<canvas class="res">C2c</canvas> C2c: <canvas class="res">C2</canvas> C2 reversed.<ul><li> Use as <canvas class="res">C1</canvas> C1. </li></ul>',
C3:'<canvas class="res">C3</canvas> C3: god with head of ibis.<ul><li>Log. or det. <span class="egytransl">^DHwtj</span>, "Thoth". Ex. <canvas class="res">G26-C3</canvas> , <canvas class="res">C3</canvas> . </li><li>Mnemonics: DHwty.</li></ul>',
C4:'<canvas class="res">C4</canvas> C4: god with head of ram.<ul><li>Log. or det. <span class="egytransl">^Xnmw</span>, "Khnum". Ex. <canvas class="res">W9*w-C4</canvas> , <canvas class="res">C4</canvas> . </li><li>Mnemonics: Xnmw.</li></ul>',
C5:'<canvas class="res">C5</canvas> C5: god with head of ram holding <canvas class="res">S34</canvas> S34.<ul><li> Use as <canvas class="res">C4</canvas> C4. </li></ul>',
C6:'<canvas class="res">C6</canvas> C6: god with head of jackal.<ul><li>Log. or det. <span class="egytransl">^jnpw</span>, "Anubis". Ex. <canvas class="res">i-n:p-w-C6</canvas> , <canvas class="res">C6</canvas> . </li><li>Det. <span class="egytransl">^wpj-wAwt</span>, "Upwawet". Ex. <canvas class="res">F13-N31-t:Z2-C6</canvas> . </li><li>Mnemonics: inpw.</li></ul>',
C7:'<canvas class="res">C7</canvas> C7: god with head of Seth-animal.<ul><li>Log. or det. <span class="egytransl">^stx</span>, "Seth". Ex. <canvas class="res">sw-w-t:Z4-C7</canvas> , <canvas class="res">C7</canvas> . </li><li>Mnemonics: stX.</li></ul>',
C8:'<canvas class="res">C8</canvas> C8: ithyphallic god with <canvas class="res">S9</canvas> S9, uplifted arm and <canvas class="res">S45</canvas> S45.<ul><li>Log. or det. <span class="egytransl">^mnw</span>, "Min". Ex. <canvas class="res">R22:R12-C8</canvas> , <canvas class="res">C8</canvas> . </li><li>Mnemonics: mnw.</li></ul>',
C9:'<canvas class="res">C9</canvas> C9: goddess with sun and horns.<ul><li>Log. or det. <span class="egytransl">^Hwt-^Hr</span>, "Hathor". Ex. <canvas class="res">O10-C9</canvas> , <canvas class="res">C9</canvas> . </li></ul>',
C10:'<canvas class="res">C10</canvas> C10: goddess with feather on head.<ul><li>Log. or det. <span class="egytransl">^mAat</span>, "Maat". Ex. <canvas class="res">U5:a-t-C10</canvas> , <canvas class="res">C10</canvas> . </li><li>Mnemonics: mAat.</li></ul>',
C10a:'<canvas class="res">C10a</canvas> C10a: goddess with feather on head holding <canvas class="res">S34</canvas> S34.<ul><li> Use as <canvas class="res">C10</canvas> C10. </li></ul>',
C11:'<canvas class="res">C11</canvas> C11: god with arms supporting (the sky) and <canvas class="res">M4</canvas> M4 on head.<ul><li>Log. or det. <span class="egytransl">^HHw</span>, "Heh". </li><li>Log. <span class="egytransl">HH</span>, "million", "many". </li><li>Mnemonics: HH.</li></ul>',
C12:'<canvas class="res">C12</canvas> C12: god with <canvas class="res">S9</canvas> S9 and <canvas class="res">S40</canvas> S40.<ul><li>Log. or det. <span class="egytransl">^jmn</span>, "Amun". </li></ul>',
C13:'<canvas class="res">C13</canvas> C13: <canvas class="res">C12</canvas> C12 reversed.<ul><li> Use as <canvas class="res">C12</canvas> C12. </li></ul>',
C14:'<canvas class="res">C14</canvas> C14: god with <canvas class="res">S9</canvas> S9 and <canvas class="res">T16a</canvas> T16a.<ul><li>Log. or det. <span class="egytransl">^jmn-Hr-xpS=f</span>, "Amun-her-khepeshef". </li></ul>',
C15:'<canvas class="res">C15</canvas> C15: <canvas class="res">C14</canvas> C14 reversed.<ul><li> Use as <canvas class="res">C14</canvas> C14. </li></ul>',
C16:'<canvas class="res">C16</canvas> C16: god wearing <canvas class="res">S3</canvas> S3 with <canvas class="res">S34</canvas> S34.<ul><li>Log. or det. <span class="egytransl">^jtm</span>, "Atum". </li></ul>',
C17:'<canvas class="res">C17</canvas> C17: god with head of falcon and <canvas class="res">S9</canvas> S9.<ul><li>Log. or det. <span class="egytransl">^mnTw</span>, "Month". </li></ul>',
C18:'<canvas class="res">C18</canvas> C18: squatting god.<ul><li>Log. or det. <span class="egytransl">^tA-tnn</span>, "Tatenen". </li></ul>',
C19:'<canvas class="res">C19</canvas> C19: mummy-shaped god.<ul><li>Log. or det. <span class="egytransl">^ptH</span>, "Ptah". </li></ul>',
C20:'<canvas class="res">C20</canvas> C20: mummy-shaped god in shrine.<ul><li> Use as <canvas class="res">C19</canvas> C19. </li></ul>',
C21:'<canvas class="res">C21</canvas> C21: Bes.<ul><li>Log. or det. <span class="egytransl">^bs</span>, "Bes". Ex. <canvas class="res">b*C21</canvas> , <span class="egytransl">^bs</span>, "Bes". </li></ul>',
C22:'<canvas class="res">C22</canvas> C22: god with head of falcon and moon disk.<ul><li>Log. or det. <span class="egytransl">^xnsw</span>, "Khons". </li></ul>',
C23:'<canvas class="res">C23</canvas> C23: goddess with head of feline and <canvas class="res">N6</canvas> N6.<ul><li>Log. or det. <span class="egytransl">^bAstt</span>, "Bastet". </li></ul>',
C24:'<canvas class="res">C24</canvas> C24: god wearing <canvas class="res">S3</canvas> S3 with <canvas class="res">S40</canvas> S40.<ul><li>Log. or det. <span class="egytransl">^njt</span>, "Neith". Ex. <canvas class="res">nfr*C24</canvas> , <span class="egytransl">^nfrt-^nt</span>, "Nofretneith". </li><li>Do not confuse with: <canvas class="res">A45a</canvas> A45a. </li></ul>',
D1:'<canvas class="res">D1</canvas> D1: head in profile.<ul><li>Log. <span class="egytransl">tp</span>, "head". Exx. <canvas class="res">D1:Z1</canvas> , <span class="egytransl">tp</span>, "head"; <canvas class="res">D1:p*Z4</canvas> , <span class="egytransl">tpj</span>, "first". </li><li>Det. head. Exx. <canvas class="res">HA-A-tp</canvas> , <span class="egytransl">HA</span>, "back of the head", "behind"; <canvas class="res">m-a:k-HA*tp</canvas> , <span class="egytransl">mkHA</span>, "neglect"; <canvas class="res">d:h-n:t-tp</canvas> , <span class="egytransl">dhnt</span>, "forehead"; <canvas class="res">d:h-n:tp</canvas> , <span class="egytransl">dhn</span>, "promote". </li><li>Log. or det. <span class="egytransl">DADA</span>, "head". Ex. <canvas class="res">DA*A-DA*A-tp:Z1</canvas> , <canvas class="res">tp:Z1</canvas> . </li><li>Det. <span class="egytransl">gwA</span>, "pull tight". Ex. <canvas class="res">g-wA-A-tp:D40</canvas> . </li><li>Mnemonics: tp.</li></ul>',
D2:'<canvas class="res">D2</canvas> D2: face.<ul><li>Log. <span class="egytransl">Hr</span>, "face", "upon". Ex. <canvas class="res">Hr:Z1</canvas> . </li><li>Phon. <span class="egytransl">Hr</span>. Exx. <canvas class="res">H-Hr:r-Aa19-A24</canvas> , <span class="egytransl">Hr</span>, "prepare"; <canvas class="res">d:Hr-r:G37a</canvas> , <span class="egytransl">dHr</span>, "bitter". </li><li>Mnemonics: Hr.</li></ul>',
D3:'<canvas class="res">D3</canvas> D3: hair.<ul><li>Det. hair. Exx. <canvas class="res">Sn:n-Z4-[sep=0.5]D3</canvas> , <span class="egytransl">Snj</span>, "hair"; <canvas class="res">s*km-m*[fit]D3</canvas> , <span class="egytransl">skm</span>, "grey-haired". </li><li>Det. skin. Exx. <canvas class="res">i-E34a:n-D3</canvas> , <span class="egytransl">jwn</span>, "complexion"; <canvas class="res">i-in:n-nm*m-[fit]D3</canvas> , <span class="egytransl">jnm</span>, "skin". </li><li>Det. mourn. Ex. <canvas class="res">i*A-k*[fit]b-D3</canvas> , <span class="egytransl">jAkb</span>, "mourn". </li><li>Det. empty, bald, forlorn. Exx. <canvas class="res">K4*A-r:t-D3*B1</canvas> , <span class="egytransl">XArt</span>, "widow"; <canvas class="res">w-S:D3</canvas> , <span class="egytransl">wS</span>, "fall out (of hair)". </li><li><canvas class="res">G28-D3</canvas> Log. <span class="egytransl">gm wS(.w)</span>, "found defective (of text)". </li><li>Mnemonics: Sny.</li></ul>',
D4:'<canvas class="res">D4</canvas> D4: eye.<ul><li>Log. <span class="egytransl">jrt</span>, "eye". Ex. <canvas class="res">D4:X1*Z1</canvas> . </li><li><canvas class="res">U1:D4</canvas> , <canvas class="res">D4:D4</canvas> Log. <span class="egytransl">mAA</span>, "see". Ex. <canvas class="res">U2:D4-A*A</canvas> . </li><li>Phon. <span class="egytransl">jr</span>. Exx. <canvas class="res">D4</canvas> , <span class="egytransl">jrj</span>, "make"; <canvas class="res">i-ir:t*t-W20</canvas> , <span class="egytransl">jrTt</span>, "milk". </li><li><canvas class="res">U1:D4</canvas> Phon. <span class="egytransl">mA</span>. Ex. <canvas class="res">U2:D4-A*w-F27:Z2</canvas> , <span class="egytransl">mAjw</span>, "lions". </li><li>Det. eye, see. Exx. <canvas class="res">d:g-D4</canvas> , <span class="egytransl">dgj</span>, "look"; <canvas class="res">S:p-D4</canvas> , <span class="egytransl">Sp</span>, "blind"; <canvas class="res">rs*D4</canvas> , <span class="egytransl">rs</span>, "wakeful". </li><li>Log. or det. <span class="egytransl">rmj</span>, "weep". Ex. <canvas class="res">r:m-D4</canvas> . </li><li>Mnemonics: ir.</li></ul>',
D5:'<canvas class="res">D5</canvas> D5: eye touched up with paint.<ul><li> Use as <canvas class="res">D4</canvas> D4 [Det. eye, see]. Exx. <canvas class="res">d:g-D5</canvas> , <span class="egytransl">dgj</span>, "look"; <canvas class="res">S:p-D5</canvas> , <span class="egytransl">Sp</span>, "blind"; <canvas class="res">rs*D5</canvas> , <span class="egytransl">rs</span>, "wakeful". </li></ul>',
D6:'<canvas class="res">D6</canvas> D6: eye with painted upper lid.<ul><li> Use as <canvas class="res">D4</canvas> D4 [Det. eye, see]. </li></ul>',
D7:'<canvas class="res">D7</canvas> D7: eye with painted lower lid.<ul><li>Det. adorn. Exx. <canvas class="res">ms*s-D-t*[fit]mwt-D7:Z2b</canvas> , <span class="egytransl">msdmt</span>, "black eye-paint"; <canvas class="res">a:n-D7</canvas> , <span class="egytransl">an</span>, "beautiful". </li><li>Phon. det. <span class="egytransl">an</span>. Ex. <canvas class="res">a:n-nw*[fit]w-D7</canvas> , <span class="egytransl">^anw</span>, "Ainu". </li><li>Det. eye, see. Ex. <canvas class="res">p:t-rnp*D7</canvas> , <span class="egytransl">ptr</span>, "behold". </li></ul>',
D8:'<canvas class="res">D8</canvas> D8: eye enclosed in <canvas class="res">N18</canvas> N18.<ul><li>Det. <span class="egytransl">^anw</span>, "Ainu". Ex. <canvas class="res">a:nw-D8</canvas> . </li><li>Phon. det. <span class="egytransl">an</span>. Ex. <canvas class="res">a:n-D8</canvas> , <span class="egytransl">an</span>, "beautiful". </li><li> Cf. <canvas class="res">D7</canvas> D7. </li></ul>',
D8a:'<canvas class="res">D8a</canvas> D8a: eye with painted lower lid enclosed in <canvas class="res">N18</canvas> N18.<ul><li> Use as <canvas class="res">D8</canvas> D8. </li></ul>',
D9:'<canvas class="res">D9</canvas> D9: eye with flowing tears.<ul><li> Use as <canvas class="res">D4</canvas> D4 [Log. or det. <span class="egytransl">rmj</span>, "weep"]. Ex. <canvas class="res">D21:m-D9</canvas> , <canvas class="res">D9</canvas> . </li><li>Mnemonics: rmi.</li></ul>',
D10:'<canvas class="res">D10</canvas> D10: <span class="egytransl">wDAt</span>-eye.<ul><li>Log. or det. <span class="egytransl">wDAt</span>, "the uninjured eye of Horus". Ex. <canvas class="res">w*DA-A*[fit]t-D10</canvas> , <canvas class="res">D10</canvas> . </li><li>Mnemonics: wDAt.</li></ul>',
D11:'<canvas class="res">D11</canvas> D11: left part of white of <canvas class="res">D10</canvas> D10.<ul><li>Log. <span class="egytransl">1/2</span>, "1/2 heqat". </li></ul>',
D12:'<canvas class="res">D12</canvas> D12: pupil of eye.<ul><li>Det. <span class="egytransl">DfD</span>, "pupil of eye". Ex. <canvas class="res">insert[bs](D,f)-insert[b](D,D12)</canvas> . </li><li>Log. <span class="egytransl">1/4</span>, "1/4 heqat". </li><li>Do not confuse with: <canvas class="res">D67</canvas> D67, <canvas class="res">N5</canvas> N5, <canvas class="res">N33</canvas> N33, <canvas class="res">S21</canvas> S21, <canvas class="res">Z13</canvas> Z13. </li></ul>',
D13:'<canvas class="res">D13</canvas> D13: eye-brow.<ul><li>Log. <span class="egytransl">1/8</span>, "1/8 heqat". </li><li>Det. <span class="egytransl">jnH</span>, "eyebrows". Ex. <canvas class="res">i-in:n-H-D13:D13</canvas> . </li></ul>',
D14:'<canvas class="res">D14</canvas> D14: right part of white of <canvas class="res">D10</canvas> D10.<ul><li>Log. <span class="egytransl">1/16</span>, "1/16 heqat". </li></ul>',
D15:'<canvas class="res">D15</canvas> D15: diagonal marking of <canvas class="res">D10</canvas> D10.<ul><li>Log. <span class="egytransl">1/32</span>, "1/32 heqat". </li></ul>',
D16:'<canvas class="res">D16</canvas> D16: vertical marking of <canvas class="res">D10</canvas> D10.<ul><li>Log. <span class="egytransl">1/64</span>, "1/64 heqat". </li><li>Do not confuse with: <canvas class="res">P11</canvas> P11, <canvas class="res">Aa28</canvas> Aa28. </li></ul>',
D17:'<canvas class="res">D17</canvas> D17: combination of <canvas class="res">D16</canvas> D16 and <canvas class="res">D15</canvas> D15.<ul><li>Log. or det. <span class="egytransl">tjt</span>, "image". Ex. <canvas class="res">t*i-t:D17</canvas> , <canvas class="res">insert[t,sep=0.6](D17,t[scale=0.8])</canvas> . </li></ul>',
D18:'<canvas class="res">D18</canvas> D18: ear.<ul><li>Log. or det. <span class="egytransl">msDr</span>, "ear". Exx. <canvas class="res">ms*s-Dr:D21-D18</canvas> ; <canvas class="res">D18*[sep=0.2]D18</canvas> , <span class="egytransl">msDrwj</span>, "both ears". </li></ul>',
D19:'<canvas class="res">D19</canvas> D19: nose, eye and cheek.<ul><li>Log. or det. <span class="egytransl">fnD</span>, "nose". Ex. <canvas class="res">f:nD-D19</canvas> , <canvas class="res">f:n:d-D19</canvas> . </li><li>Det. nose, smell, face. Exx. <canvas class="res">S:D21:t-D19</canvas> , <span class="egytransl">Srt</span>, "nose"; <canvas class="res">s*sn:n-D19</canvas> , <span class="egytransl">sn</span>, "smell"; <canvas class="res">xnt-n:t-D19</canvas> , <span class="egytransl">xnt</span>, "face". </li><li>Det. joy. Exx. <canvas class="res">D21:S-D19</canvas> , <span class="egytransl">rSw</span>, "rejoice"; <canvas class="res">xnt-n:t:S-D19</canvas> , <span class="egytransl">xntS</span>, "take pleasure". </li><li>Det. soft, kind. Ex. <canvas class="res">s-f:n-D19</canvas> , <span class="egytransl">sfn</span>, "mild". </li><li>Det. <span class="egytransl">btn</span>, "disobedient". Ex. <canvas class="res">b-T:n-D19</canvas> . </li><li>Log. or det. <span class="egytransl">xnt</span>, "in front of". Ex. <canvas class="res">xnt-n:t*Z4-D19</canvas> , <canvas class="res">D19:t</canvas> . </li><li>Phon. <span class="egytransl">xnt</span>. </li><li> Use as <canvas class="res">Aa32</canvas> Aa32. Ex. <canvas class="res">D19-t:Z4-N33:Z2</canvas> , <span class="egytransl">stj</span>, "spruce ochre". </li><li> Use as <canvas class="res">U31</canvas> U31. Ex. <canvas class="res">x:n-i-D19:D40</canvas> , <span class="egytransl">xnr</span>, "confine". </li><li>Mnemonics: fnD.</li></ul>',
D20:'<canvas class="res">D20</canvas> D20: nose, eye and cheek in semi-cursive form.<ul><li> Use as <canvas class="res">D19</canvas> D19. </li></ul>',
D21:'<canvas class="res">D21</canvas> D21: mouth.<ul><li>Log. <span class="egytransl">rA</span>, "mouth". Ex. <canvas class="res">D21:Z1</canvas> . </li><li>Phon. <span class="egytransl">r</span>. </li><li>(group-writing) <canvas class="res">D21:Z1</canvas> Phon. <span class="egytransl">r</span>. Ex. <canvas class="res">i*R7[scale=0.7]-[sep=0.5]bA-D21:Z1-E6</canvas> , <span class="egytransl">jbr</span>, "stallion". </li><li>Do not confuse with: <canvas class="res">V38</canvas> V38. </li><li>Mnemonics: r, rA.</li></ul>',
D22:'<canvas class="res">D22</canvas> D22: mouth with two strokes.<ul><li>Log. <span class="egytransl">2/3</span>, "two-thirds". </li></ul>',
D23:'<canvas class="res">D23</canvas> D23: mouth with three strokes.<ul><li>Log. <span class="egytransl">3/4</span>, "three-quarters". </li></ul>',
D24:'<canvas class="res">D24</canvas> D24: upper lip with teeth.<ul><li>Log. or det. <span class="egytransl">spt</span>, "lip", "border". Ex. <canvas class="res">D24:t*Z1</canvas> , <canvas class="res">s*(p:t)-D24</canvas> . </li><li>Do not confuse with: <canvas class="res">F42</canvas> F42. </li><li>Mnemonics: spt.</li></ul>',
D25:'<canvas class="res">D25</canvas> D25: lips with teeth.<ul><li>Log. or det. <span class="egytransl">sptj</span>, "both lips". Ex. <canvas class="res">s*[fit](p:t*Z4)-[sep=0.3]D25</canvas> , <canvas class="res">D25:t*Z4</canvas> . </li><li>Mnemonics: spty.</li></ul>',
D26:'<canvas class="res">D26</canvas> D26: liquid issuing from lips.<ul><li>Det. expel (through mouth). Exx. <canvas class="res">p:z-g-D26</canvas> , <span class="egytransl">psg</span>, "spit"; <canvas class="res">b-S:D26</canvas> , <span class="egytransl">bSj</span>, "vomit"; <canvas class="res">q*[sep=0.2]A-a:D26</canvas> , <canvas class="res">q:a-D26</canvas> , <span class="egytransl">qAa</span>, "spew out"; <canvas class="res">z:n:f-D26:Z2</canvas> , <span class="egytransl">snf</span>, "blood". </li></ul>',
D27:'<canvas class="res">D27</canvas> D27: small breast.<ul><li>Log. or det. <span class="egytransl">mnD</span>, "breast". Ex. <canvas class="res">mn:n-insert[b](D,D27)</canvas> , <canvas class="res">mn:n-d:D27*F51</canvas> . </li><li>Det. suckle, rear. Exx. <canvas class="res">z:n-q:D27</canvas> , <span class="egytransl">snq</span>, "suckle"; <canvas class="res">mn:n-a:Z4*D27</canvas> , <span class="egytransl">mnaj</span>, "tutor". </li><li>Mnemonics: mnD.</li></ul>',
D27a:'<canvas class="res">D27a</canvas> D27a: large breast.<ul><li> Use as <canvas class="res">D27</canvas> D27. </li></ul>',
D28:'<canvas class="res">D28</canvas> D28: arms in <span class="egytransl">kA</span>-posture.<ul><li>Log. <span class="egytransl">kA</span>, "spirit". Ex. <canvas class="res">kA:Z1</canvas> . </li><li>Phon. <span class="egytransl">kA</span>. Exx. <canvas class="res">kA:t-A9</canvas> , <span class="egytransl">kAt</span>, "work"; <canvas class="res">H*kA-A-A2</canvas> , <span class="egytransl">HkA</span>, "magic". </li><li>(group-writing) <canvas class="res">D28:Z1</canvas> Phon. <span class="egytransl">k</span>. </li><li>Mnemonics: kA.</li></ul>',
D29:'<canvas class="res">D29</canvas> D29: combination of <canvas class="res">D28</canvas> D28 and <canvas class="res">R12</canvas> R12.<ul><li>Log. <span class="egytransl">kA</span>, "spirit". </li></ul>',
D30:'<canvas class="res">D30</canvas> D30: <canvas class="res">D28</canvas> D28 with tail.<ul><li>Det. <span class="egytransl">^nHb-kAw</span>, "Nehebkau". Ex. <canvas class="res">nH*H-b*Z9-kA:Z2-D30</canvas> . </li></ul>',
D31:'<canvas class="res">D31</canvas> D31: combination of <canvas class="res">D32</canvas> D32 and <canvas class="res">U36</canvas> U36.<ul><li>Log. <span class="egytransl">Hm-kA</span>, "ka-priest". </li></ul>',
D31a:'<canvas class="res">D31a</canvas> D31a: combination of <canvas class="res">D28</canvas> D28 and <canvas class="res">U36</canvas> U36.<ul><li> Use as <canvas class="res">D31</canvas> D31. </li></ul>',
D32:'<canvas class="res">D32</canvas> D32: arms embracing.<ul><li>Det. envelop. Exx. <canvas class="res">i-in:n-q-D32</canvas> , <span class="egytransl">jnq</span>, "envelop"; <canvas class="res">H-p:t-D32</canvas> , <span class="egytransl">Hpt</span>, "embrace"; <canvas class="res">p:g-A-D32</canvas> , <span class="egytransl">pgA</span>, "unfold". </li></ul>',
D33:'<canvas class="res">D33</canvas> D33: arms rowing.<ul><li>Log. <span class="egytransl">Xnj</span>, "row". Ex. <canvas class="res">D33:n-P1</canvas> . </li><li>Phon. <span class="egytransl">Xn</span>. Ex. <canvas class="res">D33-n:n-nw*[sep=0.3]w-E20-D40:Z2</canvas> , <span class="egytransl">Xnnw</span>, "turmoil". </li></ul>',
D34:'<canvas class="res">D34</canvas> D34: arms holding shield and battle-axe.<ul><li>Log. <span class="egytransl">aHA</span>, "fight". Ex. <canvas class="res">D34-A-A24</canvas> . </li><li>Mnemonics: aHA.</li></ul>',
D34a:'<canvas class="res">D34a</canvas> D34a: arms holding shield and mace.<ul><li> Use as <canvas class="res">D34</canvas> D34. </li></ul>',
D35:'<canvas class="res">D35</canvas> D35: arms in gesture of negation.<ul><li>Log. <span class="egytransl">n</span>, "not". </li><li><canvas class="res">D35:N35</canvas> Log. <span class="egytransl">nn</span>, "not". </li><li>Det. negation. Exx. <canvas class="res">i*m-D35</canvas> , <span class="egytransl">jmj</span>, "should not"; <canvas class="res">x*m-[sep=0.2]D35</canvas> , <span class="egytransl">xm</span>, "not know". </li><li>Log. <span class="egytransl">jwtj</span>, "which not". Ex. <canvas class="res">D35:t*Z4-G37</canvas> , <canvas class="res">D35-[sep=0.3]insert[te](w*.,t)</canvas> , <canvas class="res">i*w-D35-ti*i</canvas> . </li><li>Phon. <span class="egytransl">n</span>. Exx. <canvas class="res">n</canvas> , <span class="egytransl">n</span>, "to"; <canvas class="res">D35:n-Sm-m-[sep=0.2]F51</canvas> , <span class="egytransl">nnSm</span>, "spleen". </li><li>Phon. det. <span class="egytransl">xm</span>. Ex. <canvas class="res">x:z-m-D35:pr</canvas> , <span class="egytransl">xm</span>, "shrine". </li><li>Phon. det. <span class="egytransl">mx</span>. Ex. <canvas class="res">s*m-[sep=0.5]x:D35</canvas> , <span class="egytransl">smx</span>, "forget". </li></ul>',
D36:'<canvas class="res">D36</canvas> D36: forearm.<ul><li>Log. <span class="egytransl">a</span>, "arm". Ex. <canvas class="res">a:Z1</canvas> . </li><li>Phon. <span class="egytransl">a</span>. </li><li> Use as <canvas class="res">D37</canvas> D37. </li><li> Use as <canvas class="res">D38</canvas> D38. </li><li> Use as <canvas class="res">D39</canvas> D39. </li><li> Use as <canvas class="res">D40</canvas> D40. </li><li> Use as <canvas class="res">D41</canvas> D41. </li><li> Use as <canvas class="res">D42</canvas> D42. </li><li> Use as <canvas class="res">D43</canvas> D43. </li><li> Use as <canvas class="res">D44</canvas> D44. </li><li>Mnemonics: a.</li></ul>',
D37:'<canvas class="res">D37</canvas> D37: forearm with <canvas class="res">X8</canvas> X8.<ul><li>Log. <span class="egytransl">jmj</span>, "give!". Ex. <canvas class="res">i-D37</canvas> , <canvas class="res">D37</canvas> . </li><li>Log. <span class="egytransl">Dj</span>, "give". Ex. <canvas class="res">D37</canvas> . </li><li><canvas class="res">D21:D37</canvas> Log. <span class="egytransl">rDj</span>, "give". Ex. <canvas class="res">D21:D37</canvas> . </li><li>Phon. <span class="egytransl">D</span>. Ex. <canvas class="res">D37:D37-[sep=1.0]w-niwt</canvas> , <span class="egytransl">Ddw</span>, "Busiris". </li><li>Phon. <span class="egytransl">mj</span>, <span class="egytransl">m</span>. Exx. <canvas class="res">k-[sep=0.3]m-D37-B1</canvas> , <span class="egytransl">^kmj</span>, "Kemi"; <canvas class="res">m-D37:k</canvas> , <span class="egytransl">mk</span>, "behold". </li></ul>',
D38:'<canvas class="res">D38</canvas> D38: forearm with rounded loaf.<ul><li>Det. <span class="egytransl">jmj</span>, "give!". Ex. <canvas class="res">i*m-Aa15:D38</canvas> . </li><li>Phon. <span class="egytransl">m</span>, <span class="egytransl">mj</span>. Exx. <canvas class="res">m-D38:k-D40</canvas> , <span class="egytransl">mkj</span>, "protect"; <canvas class="res">i-t:D38-A40</canvas> , <span class="egytransl">^jtm</span>, "Atum". </li></ul>',
D39:'<canvas class="res">D39</canvas> D39: forearm with <canvas class="res">W24</canvas> W24.<ul><li>Log. or det. <span class="egytransl">Hnk</span>, "offer". Ex. <canvas class="res">H-M2:n-k:D39</canvas> , <canvas class="res">D39</canvas> . </li><li>Det. offer, present. Ex. <canvas class="res">d:r-p:D39</canvas> , <span class="egytransl">drp</span>, "offer". </li><li> Use as <canvas class="res">D37</canvas> D37. Exx. <canvas class="res">D21:D39</canvas> , <span class="egytransl">rDj</span>, "who causes"; <canvas class="res">ra*m-D39:k-t</canvas> , <span class="egytransl">^mkt-^ra</span>, "Meketre". </li><li> Use as <canvas class="res">D38</canvas> D38. </li><li> Use as <canvas class="res">D36</canvas> D36. Ex. <canvas class="res">m-D39</canvas> , <span class="egytransl">m-a</span>, "by the hand of". </li></ul>',
D40:'<canvas class="res">D40</canvas> D40: forearm with stick.<ul><li> Use as <canvas class="res">A24</canvas> A24. Exx. <canvas class="res">n:xt:x*t-D40</canvas> , <canvas class="res">D40</canvas> , <span class="egytransl">nxt</span>, "strong"; <canvas class="res">i*(t:H)-D40</canvas> , <span class="egytransl">jtH</span>, "drag". </li><li>Log. or det. <span class="egytransl">xAj</span>, "examine". Ex. <canvas class="res">xA*A-D40</canvas> , <canvas class="res">D40</canvas> . </li><li> Use as <canvas class="res">D37</canvas> D37. </li></ul>',
D41:'<canvas class="res">D41</canvas> D41: forearm with palm down and bent upper arm.<ul><li>Det. arm and movement of arms. Exx. <canvas class="res">g*b-bA*A-D41</canvas> , <span class="egytransl">gbA</span>, "arm"; <canvas class="res">D21:mn:n-D41</canvas> , <canvas class="res">D21:n-D41</canvas> , <canvas class="res">D41:F51*Z1</canvas> , <span class="egytransl">rmn</span>, "arm"; <canvas class="res">iAb*[fit]b-Z4:D41</canvas> , <span class="egytransl">jAbj</span>, "left"; <canvas class="res">X*[fit]m-s*D41</canvas> , <span class="egytransl">Xms</span>, "bend"; <canvas class="res">D21:q-D41</canvas> , <span class="egytransl">rqj</span>, "resist"; <canvas class="res">H*Hz*s-D41</canvas> , <span class="egytransl">Hsj</span>, "sing". </li><li>Det. cease. Exx. <canvas class="res">g:r-H*D41</canvas> , <span class="egytransl">grH</span>, "finish"; <canvas class="res">n:i-[sep=0.2]D41</canvas> , <span class="egytransl">nj</span>, "reject". </li><li>Phon. or phon. det. <span class="egytransl">nj</span>. Exx. <canvas class="res">D41:W-G34</canvas> , <span class="egytransl">njw</span>, "ostrich"; <canvas class="res">D41:Z1*W10</canvas> , <canvas class="res">n:[sep=0.3]i*w-D41-W22</canvas> , <span class="egytransl">njw</span>, "bowl". </li></ul>',
D42:'<canvas class="res">D42</canvas> D42: forearm with palm down and straight upper arm.<ul><li>Log. or det. <span class="egytransl">mH</span>, "cubit". Ex. <canvas class="res">mH:[sep=0.1]D42</canvas> , <canvas class="res">D42</canvas> . </li></ul>',
D43:'<canvas class="res">D43</canvas> D43: forearm with <canvas class="res">S45</canvas> S45.<ul><li>Log. <span class="egytransl">xwj</span>, "protect". Ex. <canvas class="res">x:[sep=0.4]D43-[sep=0.4]w*mDAt[rotate=270]</canvas> . </li><li>Phon. <span class="egytransl">xw</span>. Exx. <canvas class="res">x:[sep=0.6]D43-w*[sep=0.4]w-G37a:Z2</canvas> , <span class="egytransl">xww</span>, "evil"; <canvas class="res">s-x:[sep=0.4]D43-d:mDAt</canvas> , <span class="egytransl">sxwd</span>, "enrich". </li></ul>',
D44:'<canvas class="res">D44</canvas> D44: forearm with <canvas class="res">S42</canvas> S42.<ul><li>Log. or det. <span class="egytransl">xrp</span>, "administer". Ex. <canvas class="res">x:r-p:[sep=0.4]D44</canvas> , <canvas class="res">D44</canvas> . </li><li> Use as <canvas class="res">D37</canvas> D37. </li></ul>',
D45:'<canvas class="res">D45</canvas> D45: arm with <span class="egytransl">nHbt</span>-wand.<ul><li>Log. or det. <span class="egytransl">Dsr</span>, "sacred". Ex. <canvas class="res">D45:r-mDAt[rotate=270]</canvas> , <canvas class="res">D45</canvas> , <canvas class="res">insert[b,sep=0.5](D,s)-D45:r</canvas> . </li><li>Mnemonics: Dsr.</li></ul>',
D46:'<canvas class="res">D46</canvas> D46: hand.<ul><li>Log. <span class="egytransl">Drt</span>, "hand". Ex. <canvas class="res">d:t*Z1</canvas> . </li><li>Phon. <span class="egytransl">d</span>. Ex. <canvas class="res">w-d:D40</canvas> , <span class="egytransl">wdj</span>, "put". </li><li>Mnemonics: d.</li></ul>',
D46a:'<canvas class="res">D46a</canvas> D46a: liquid falling from hand.<ul><li>Log. <span class="egytransl">jdt</span>, "fragrance". Ex. <canvas class="res">D46a:t</canvas> , <canvas class="res">D46a:t-N4</canvas> . </li></ul>',
D47:'<canvas class="res">D47</canvas> D47: hand with palm up.<ul><li>Det. hand. Exx. <canvas class="res">Dr:r-t:D47</canvas> , <span class="egytransl">Drt</span>, "hand"; <canvas class="res">DA-t:D47</canvas> , <span class="egytransl">DAt</span>, "hand". </li></ul>',
D48:'<canvas class="res">D48</canvas> D48: hand without thumb.<ul><li>Log. <span class="egytransl">Ssp</span>, "palm". </li></ul>',
D48a:'<canvas class="res">D48a</canvas> D48a: hand holding an egg.<ul><li>Log. or det. <span class="egytransl">Hnt</span>, "basin". </li></ul>',
D49:'<canvas class="res">D49</canvas> D49: fist.<ul><li>Det. grasp. </li></ul>',
D50:'<canvas class="res">D50</canvas> D50: finger vertically.<ul><li>Log. or det. <span class="egytransl">Dba</span>, "finger". </li><li>Log. <span class="egytransl">Dba</span>, "10000". </li><li>Phon. <span class="egytransl">Dba</span>. </li><li><canvas class="res">D50*D50</canvas> Det. accurate. </li><li>Do not confuse with: <canvas class="res">D51</canvas> D51. </li><li>Mnemonics: Dba.</li></ul>',
D50a:'<canvas class="res">D50a</canvas> D50a: ....<ul><li> Use as 2* <canvas class="res">D50</canvas> D50. </li></ul>',
D50b:'<canvas class="res">D50b</canvas> D50b: ....<ul><li> Use as 3* <canvas class="res">D50</canvas> D50. </li></ul>',
D50c:'<canvas class="res">D50c</canvas> D50c: ....<ul><li> Use as 4* <canvas class="res">D50</canvas> D50. </li></ul>',
D50d:'<canvas class="res">D50d</canvas> D50d: ....<ul><li> Use as 5* <canvas class="res">D50</canvas> D50. </li></ul>',
D50e:'<canvas class="res">D50e</canvas> D50e: ....<ul><li> Use as 6* <canvas class="res">D50</canvas> D50. </li></ul>',
D50f:'<canvas class="res">D50f</canvas> D50f: ....<ul><li> Use as 7* <canvas class="res">D50</canvas> D50. </li></ul>',
D50g:'<canvas class="res">D50g</canvas> D50g: ....<ul><li> Use as 8* <canvas class="res">D50</canvas> D50. </li></ul>',
D50h:'<canvas class="res">D50h</canvas> D50h: ....<ul><li> Use as 9* <canvas class="res">D50</canvas> D50. </li></ul>',
D50i:'<canvas class="res">D50i</canvas> D50i: ....<ul><li> Use as 5* <canvas class="res">D50</canvas> D50. </li></ul>',
D51:'<canvas class="res">D51</canvas> D51: finger horizontally.<ul><li>Log. or det. <span class="egytransl">ant</span>, "nail". </li><li>Det. actions involving fingers. </li><li>Phon. det. <span class="egytransl">dqr</span>. </li><li><canvas class="res">D51:N33a</canvas> Log. <span class="egytransl">dqr</span>, "fruit". </li><li><canvas class="res">D51:N33a</canvas> Log. <span class="egytransl">qAw</span>, "grains". </li><li>Do not confuse with: <canvas class="res">D50</canvas> D50. </li></ul>',
D52:'<canvas class="res">D52</canvas> D52: phallus.<ul><li>Det. male, penis. </li><li><canvas class="res">D52:E1</canvas> Log. <span class="egytransl">kA</span>, "bull". </li><li>Phon. <span class="egytransl">mt</span>. </li><li>Mnemonics: mt.</li></ul>',
D52a:'<canvas class="res">D52a</canvas> D52a: combination of <canvas class="res">D52</canvas> D52 and <canvas class="res">S29</canvas> S29.<ul><li>Phon. <span class="egytransl">smt</span>. </li></ul>',
D53:'<canvas class="res">D53</canvas> D53: liquid issuing from phallus.<ul><li>Det. penis and associated actions. </li><li>Det. male. </li><li>Log. or det. <span class="egytransl">bAH</span>, "* glans". Ex. <canvas class="res">G17-D53:Z1</canvas> , <canvas class="res">G17*b-bA*A-H-D53:Y1</canvas> , <span class="egytransl">m-bAH</span>, "in the presence of". </li></ul>',
D54:'<canvas class="res">D54</canvas> D54: legs walking.<ul><li>Log. <span class="egytransl">jw</span>, "come". </li><li>Det. movement. </li><li>Log. <span class="egytransl">nmtt</span>, "step". Ex. <canvas class="res">D54-X1:Z1</canvas> . </li></ul>',
D54a:'<canvas class="res">D54a</canvas> D54a: hieratic legs walking.<ul><li> Use as <canvas class="res">D54</canvas> D54. </li></ul>',
D55:'<canvas class="res">D55</canvas> D55: legs walking backwards.<ul><li>Det. backwards. </li></ul>',
D56:'<canvas class="res">D56</canvas> D56: leg.<ul><li>Log. or det. <span class="egytransl">rd</span>, "foot". </li><li>Det. foot. </li><li>Phon. or phon. det. <span class="egytransl">pds</span>. </li><li>Phon. or phon. det. <span class="egytransl">war</span>. </li><li>Phon. or phon. det. <span class="egytransl">sbq</span>. </li><li>Phon. <span class="egytransl">gH</span>. </li><li>Phon. det. <span class="egytransl">gHs</span>. </li><li><canvas class="res">D56*D54</canvas> Det. movement. </li><li>Mnemonics: rd, sbq, gH, gHs.</li></ul>',
D57:'<canvas class="res">D57</canvas> D57: combination of <canvas class="res">D56</canvas> D56 and <canvas class="res">T30</canvas> T30.<ul><li>Det. mutilate. </li><li>Phon. or phon. det. <span class="egytransl">jAT</span>. </li><li>Phon. or phon. det. <span class="egytransl">sjAT</span>. </li></ul>',
D58:'<canvas class="res">D58</canvas> D58: foot.<ul><li>Log. <span class="egytransl">bw</span>, "place". </li><li>Phon. <span class="egytransl">b</span>. </li><li>Mnemonics: b.</li></ul>',
D59:'<canvas class="res">D59</canvas> D59: combination of <canvas class="res">D58</canvas> D58 and <canvas class="res">D36</canvas> D36.<ul><li>Phon. <span class="egytransl">ab</span>. </li><li>Mnemonics: ab.</li></ul>',
D60:'<canvas class="res">D60</canvas> D60: <canvas class="res">D58</canvas> D58 under vase from which water flows.<ul><li> Use as <canvas class="res">A6</canvas> A6. </li><li>Mnemonics: wab.</li></ul>',
D61:'<canvas class="res">D61</canvas> D61: three toes oriented leftward.<ul><li>Log. or det. <span class="egytransl">sAH</span>, "toe". </li><li>Phon. or phon. det. <span class="egytransl">sAH</span>. </li><li>Mnemonics: sAH.</li></ul>',
D62:'<canvas class="res">D62</canvas> D62: three toes oriented rightward.<ul><li> Use as <canvas class="res">D61</canvas> D61. </li></ul>',
D63:'<canvas class="res">D63</canvas> D63: two toes oriented leftward.<ul><li> Use as <canvas class="res">D61</canvas> D61. </li></ul>',
D64:'<canvas class="res">D64</canvas> D64: hand with palm down.<ul><li>Det. <span class="egytransl">kp</span>, "severed hands". </li></ul>',
D65:'<canvas class="res">D65</canvas> D65: lock of hair.<ul><li>Log. or det. <span class="egytransl">Hnkt</span>, "lock of hair". </li><li>Log. <span class="egytransl">Srj</span>, "boy". </li><li>Log. <span class="egytransl">Srjt</span>, "girl". </li></ul>',
D66:'<canvas class="res">D66</canvas> D66: arm with reed pen.<ul><li>Det. writing. Exx. <canvas class="res">w-d:n-D66</canvas> , <span class="egytransl">wdn</span>, "record royal titulary"; <canvas class="res">s-F46a:D66</canvas> , <span class="egytransl">spXr</span>, "write". </li></ul>',
D67:'<canvas class="res">D67</canvas> D67: dot.<ul><li>Log. <span class="egytransl">1</span>, "1 heqat". </li><li>Do not confuse with: <canvas class="res">D12</canvas> D12, <canvas class="res">N5</canvas> N5, <canvas class="res">N33</canvas> N33, <canvas class="res">S21</canvas> S21, <canvas class="res">Z13</canvas> Z13. </li></ul>',
D67a:'<canvas class="res">D67a</canvas> D67a: ....<ul><li> Use as 2* <canvas class="res">D67</canvas> D67. </li></ul>',
D67b:'<canvas class="res">D67b</canvas> D67b: ....<ul><li> Use as 3* <canvas class="res">D67</canvas> D67. </li></ul>',
D67c:'<canvas class="res">D67c</canvas> D67c: ....<ul><li> Use as 4* <canvas class="res">D67</canvas> D67. </li></ul>',
D67d:'<canvas class="res">D67d</canvas> D67d: ....<ul><li> Use as 5* <canvas class="res">D67</canvas> D67. </li></ul>',
D67e:'<canvas class="res">D67e</canvas> D67e: ....<ul><li> Use as 6* <canvas class="res">D67</canvas> D67. </li></ul>',
D67f:'<canvas class="res">D67f</canvas> D67f: ....<ul><li> Use as 7* <canvas class="res">D67</canvas> D67. </li></ul>',
D67g:'<canvas class="res">D67g</canvas> D67g: ....<ul><li> Use as 8* <canvas class="res">D67</canvas> D67. </li></ul>',
D67h:'<canvas class="res">D67h</canvas> D67h: ....<ul><li> Use as 9* <canvas class="res">D67</canvas> D67. </li></ul>',
E1:'<canvas class="res">E1</canvas> E1: bull.<ul><li>Log. <span class="egytransl">kA</span>, "bull". </li><li>Log. <span class="egytransl">jH</span>, "cattle". </li><li>Det. cattle. </li></ul>',
E2:'<canvas class="res">E2</canvas> E2: bull charging.<ul><li>Log. <span class="egytransl">kA</span>, "bull". </li><li>Det. <span class="egytransl">smA</span>, "fighting bull". </li></ul>',
E3:'<canvas class="res">E3</canvas> E3: calf.<ul><li>Log. or det. <span class="egytransl">bHs</span>, "calf". </li><li>Det. <span class="egytransl">wnDw</span>, "short-horned cattle". </li></ul>',
E4:'<canvas class="res">E4</canvas> E4: sacred <span class="egytransl">HsAt</span>-cow.<ul><li>Log. or det. <span class="egytransl">HsAt</span>, "sacred hesat-cow". </li></ul>',
E5:'<canvas class="res">E5</canvas> E5: cow suckling calf.<ul><li>Det. solicitous. </li></ul>',
E6:'<canvas class="res">E6</canvas> E6: horse.<ul><li>Log. or det. <span class="egytransl">ssmt</span>, "horse". </li><li>Det. horse. </li><li>Mnemonics: zzmt.</li></ul>',
E7:'<canvas class="res">E7</canvas> E7: donkey.<ul><li>Log. or det. <span class="egytransl">aA</span>, "ass". </li></ul>',
E8:'<canvas class="res">E8</canvas> E8: kid.<ul><li>Log. or det. <span class="egytransl">jb</span>, "kid". </li><li>Phon. or phon. det. <span class="egytransl">jb</span>. </li><li>Det. small cattle. </li></ul>',
E8a:'<canvas class="res">E8a</canvas> E8a: kid jumping.<ul><li> Use as <canvas class="res">E8</canvas> E8. </li></ul>',
E9:'<canvas class="res">E9</canvas> E9: newborn bubalis or hartebeest.<ul><li>Phon. <span class="egytransl">jw</span>. </li><li>(group-writing) <canvas class="res">E9[scale=0.8]*[fit]G43</canvas> Phon. <span class="egytransl">j</span>. </li></ul>',
E9a:'<canvas class="res">E9a</canvas> E9a: mature bovine lying down.<ul><li>Det. <span class="egytransl">smA</span>, "sacrificial animal". </li></ul>',
E10:'<canvas class="res">E10</canvas> E10: ram.<ul><li>Log. or det. <span class="egytransl">bA</span>, "ram". </li><li><canvas class="res">.:W9*[fit]E10</canvas> Log. or det. <span class="egytransl">^Xnmw</span>, "Khnum". </li><li>Det. ram, sheep. </li></ul>',
E11:'<canvas class="res">E11</canvas> E11: ram.<ul><li> Use as <canvas class="res">E10</canvas> E10. </li></ul>',
E12:'<canvas class="res">E12</canvas> E12: pig.<ul><li>Log. or det. <span class="egytransl">rrj</span>, "pig". </li><li>Log. or det. <span class="egytransl">SAj</span>, "pig". </li></ul>',
E13:'<canvas class="res">E13</canvas> E13: cat.<ul><li>Log. or det. <span class="egytransl">mjw</span>, "cat (m.)". </li><li>Log. or det. <span class="egytransl">myt</span>, "cat (f.)". </li></ul>',
E14:'<canvas class="res">E14</canvas> E14: dog (saluki).<ul><li>Log. or det. <span class="egytransl">jw</span>, "dog". </li><li>Log. or det. <span class="egytransl">Tsm</span>, "dog". </li></ul>',
E15:'<canvas class="res">E15</canvas> E15: lying canine.<ul><li>Log. or det. <span class="egytransl">^jnpw</span>, "Anubis". </li><li>Log. <span class="egytransl">Hrj-sStA</span>, "master of secrets". </li></ul>',
E16:'<canvas class="res">E16</canvas> E16: lying canine on shrine.<ul><li> Use as <canvas class="res">E15</canvas> E15. </li></ul>',
E16a:'<canvas class="res">E16a</canvas> E16a: lying canine on shrine with <canvas class="res">S45</canvas> S45.<ul><li> Use as <canvas class="res">E15</canvas> E15. </li></ul>',
E17:'<canvas class="res">E17</canvas> E17: jackal.<ul><li>Log. or det. <span class="egytransl">sAb</span>, "jackal", "dignitary". </li><li>Mnemonics: zAb.</li></ul>',
E17a:'<canvas class="res">E17a</canvas> E17a: jackal looking back.<ul><li>Log. or det. <span class="egytransl">sTA</span>, "drag". </li><li>Phon. or phon. det. <span class="egytransl">sTA</span>. </li></ul>',
E18:'<canvas class="res">E18</canvas> E18: wolf on <canvas class="res">R12</canvas> R12 with <span class="egytransl">SdSd</span>.<ul><li>Log. or det. <span class="egytransl">^wpj-wAwt</span>, "Wepwawet". </li></ul>',
E19:'<canvas class="res">E19</canvas> E19: combination of <canvas class="res">E19</canvas> E19 and <canvas class="res">T3</canvas> T3.<ul><li> Use as <canvas class="res">E18</canvas> E18. </li></ul>',
E20:'<canvas class="res">E20</canvas> E20: Seth-animal.<ul><li>Log. <span class="egytransl">^stx</span>, "Seth". </li><li>Det. turmoil. </li><li> Use as <canvas class="res">E7</canvas> E7. </li><li> Use as <canvas class="res">E27</canvas> E27. </li></ul>',
E20a:'<canvas class="res">E20a</canvas> E20a: combination of <canvas class="res">E20</canvas> E20 and <canvas class="res">V30</canvas> V30.<ul><li><canvas class="res">G6a-[sep=0.2]E20a</canvas> Log. <span class="egytransl">nbwj</span>, "the two lords". </li></ul>',
E21:'<canvas class="res">E21</canvas> E21: lying Seth-animal.<ul><li>Det. turmoil. </li></ul>',
E22:'<canvas class="res">E22</canvas> E22: lion.<ul><li>Log. or det. <span class="egytransl">mAj</span>, "lion". </li><li>Mnemonics: mAi.</li></ul>',
E23:'<canvas class="res">E23</canvas> E23: lying lion.<ul><li>Log. or det. <span class="egytransl">rw</span>, "lion". </li><li>Phon. <span class="egytransl">rw</span>. </li><li>(group-writing) <canvas class="res">E23:Z1</canvas> , <canvas class="res">E23</canvas> Phon. <span class="egytransl">r</span>. </li><li> Use as <canvas class="res">U13</canvas> U13. </li><li>Mnemonics: l, rw.</li></ul>',
E24:'<canvas class="res">E24</canvas> E24: panther.<ul><li>Log. or det. <span class="egytransl">Aby</span>, "panther". </li><li>Mnemonics: Aby.</li></ul>',
E25:'<canvas class="res">E25</canvas> E25: hippopotamus.<ul><li>Log. or det. <span class="egytransl">db</span>, "hippopotamus". </li><li>Log. or det. <span class="egytransl">xAb</span>, "hippopotamus". </li></ul>',
E26:'<canvas class="res">E26</canvas> E26: elephant.<ul><li>Log. or det. <span class="egytransl">Abw</span>, "elephant". </li></ul>',
E27:'<canvas class="res">E27</canvas> E27: giraffe.<ul><li>Log. or det. <span class="egytransl">mmj</span>, "giraffe". </li><li>Det. foretell. </li></ul>',
E28:'<canvas class="res">E28</canvas> E28: oryx.<ul><li>Log. or det. <span class="egytransl">mA-HD</span>, "oryx". </li></ul>',
E28a:'<canvas class="res">E28a</canvas> E28a: combination of <canvas class="res">E28</canvas> E28, <canvas class="res">N24</canvas> N24 and some type of jar .<ul><li> Use as <canvas class="res">NU16</canvas> NU16. </li></ul>',
E29:'<canvas class="res">E29</canvas> E29: gazelle.<ul><li>Log. or det. <span class="egytransl">gHs</span>, "gazelle". </li></ul>',
E30:'<canvas class="res">E30</canvas> E30: ibex.<ul><li>Log. or det. <span class="egytransl">njAw</span>, "ibex". </li></ul>',
E31:'<canvas class="res">E31</canvas> E31: goat with collar.<ul><li>Log. or det. <span class="egytransl">saH</span>, "rank", "dignity". </li></ul>',
E32:'<canvas class="res">E32</canvas> E32: baboon.<ul><li>Log. or det. <span class="egytransl">jan</span>, "baboon". </li><li>Det. monkey. </li><li>Det. furious. </li></ul>',
E33:'<canvas class="res">E33</canvas> E33: monkey.<ul><li>Log. or det. <span class="egytransl">gjf</span>, "vervet monkey". </li></ul>',
E34:'<canvas class="res">E34</canvas> E34: hare.<ul><li>Phon. <span class="egytransl">wn</span>. </li><li>Mnemonics: wn.</li></ul>',
E34a:'<canvas class="res">E34a</canvas> E34a: hare (low).<ul><li> Use as <canvas class="res">E34</canvas> E34. </li></ul>',
E36:'<canvas class="res">E36</canvas> E36: baboon.<ul><li>Log. <span class="egytransl">^DHwtj</span>, "Thoth". Ex. <canvas class="res">E36*i</canvas> . </li><li>Log. <span class="egytransl">Dd</span>, "say". </li><li>Log. <span class="egytransl">nfr</span>, "beautiful". </li><li> Use as <canvas class="res">E37</canvas> E37. </li></ul>',
E37:'<canvas class="res">E37</canvas> E37: combination of <canvas class="res">E36</canvas> E36, <canvas class="res">V36</canvas> V36 and <canvas class="res">V30</canvas> V30 .<ul><li>Det. <span class="egytransl">Sbt</span>, "water-clock". </li></ul>',
E38:'<canvas class="res">E38</canvas> E38: long-horned bull.<ul><li> Use as <canvas class="res">E1</canvas> E1. </li></ul>',
F1:'<canvas class="res">F1</canvas> F1: head of ox.<ul><li> Use as <canvas class="res">E1</canvas> E1. </li><li>Do not confuse with: <canvas class="res">F1a</canvas> F1a. </li></ul>',
F1a:'<canvas class="res">F1a</canvas> F1a: head of bovine.<ul><li>Det. nose, smell, face. </li><li>Det. joy. </li><li>Do not confuse with: <canvas class="res">F1</canvas> F1. </li></ul>',
F2:'<canvas class="res">F2</canvas> F2: head of charging ox.<ul><li>Det. <span class="egytransl">Dnd</span>, "rage". Ex. <canvas class="res">insert[bs](D,n:d)-F2</canvas> . </li></ul>',
F3:'<canvas class="res">F3</canvas> F3: head of hippopotamus.<ul><li>Phon. or phon. det. <span class="egytransl">At</span>. </li></ul>',
F4:'<canvas class="res">F4</canvas> F4: forepart of lion.<ul><li>Log. <span class="egytransl">HAt</span>, "front". </li><li><canvas class="res">F4:D36</canvas> Log. <span class="egytransl">HAtj-a</span>, "prince". </li><li>Mnemonics: HAt.</li></ul>',
F5:'<canvas class="res">F5</canvas> F5: head of bubalis or hartebeest.<ul><li>Phon. or phon. det. <span class="egytransl">SsA</span>. </li><li>Phon. det. <span class="egytransl">sSA</span>. </li><li>Mnemonics: SsA.</li></ul>',
F6:'<canvas class="res">F6</canvas> F6: forepart of bubalis or hartebeest.<ul><li> Use as <canvas class="res">F5</canvas> F5. </li></ul>',
F7:'<canvas class="res">F7</canvas> F7: head of ram.<ul><li>Log. or det. <span class="egytransl">Sft</span>, "ram". </li><li>Log. or det. <span class="egytransl">Sfyt</span>, "worth". </li><li>Phon. det. <span class="egytransl">Sft</span>. Ex. <canvas class="res">S:f-S:f-t*F7</canvas> , <span class="egytransl">SfSft</span>, "dignity". </li></ul>',
F8:'<canvas class="res">F8</canvas> F8: forepart of ram.<ul><li> Use as <canvas class="res">F7</canvas> F7. </li></ul>',
F9:'<canvas class="res">F9</canvas> F9: head of leopard.<ul><li><canvas class="res">F9*F9</canvas> Log. or det. <span class="egytransl">pHtj</span>, "strength". </li><li>Phon. det. * <span class="egytransl">At</span>. </li></ul>',
F10:'<canvas class="res">F10</canvas> F10: head and neck of animal.<ul><li>Det. neck, throat. </li></ul>',
F11:'<canvas class="res">F11</canvas> F11: head and neck of animal.<ul><li> Use as <canvas class="res">F10</canvas> F10. </li></ul>',
F12:'<canvas class="res">F12</canvas> F12: head and neck of canine.<ul><li>Log. or det. <span class="egytransl">wsrt</span>, "neck". </li><li>Phon. <span class="egytransl">wsr</span>. </li><li>Mnemonics: wsr.</li></ul>',
F13:'<canvas class="res">F13</canvas> F13: horns.<ul><li>Log. <span class="egytransl">wpt</span>, "brow", "top". Ex. <canvas class="res">F13:X1*Z1</canvas> . </li><li>Phon. or phon. det. <span class="egytransl">wp</span>. </li><li>Phon. <span class="egytransl">jp</span>. </li><li>Mnemonics: wp.</li></ul>',
F13a:'<canvas class="res">F13a</canvas> F13a: horns (low).<ul><li> Use as <canvas class="res">F13</canvas> F13. </li></ul>',
F14:'<canvas class="res">F14</canvas> F14: combination of <canvas class="res">F13</canvas> F13 and <canvas class="res">M4</canvas> M4.<ul><li>Log. <span class="egytransl">wpt-rnpt</span>, "New-Year&amp;apos;s Day". </li></ul>',
F15:'<canvas class="res">F15</canvas> F15: combination of <canvas class="res">F14</canvas> F14 and <canvas class="res">N5</canvas> N5.<ul><li> Use as <canvas class="res">F14</canvas> F14. </li></ul>',
F16:'<canvas class="res">F16</canvas> F16: horn.<ul><li>Log. or det. <span class="egytransl">dp</span>, "horn". </li><li>Det. horn. </li><li>Log. or det. <span class="egytransl">ab</span>, "horn". </li><li>Phon. or phon. det. <span class="egytransl">ab</span>. </li><li>Mnemonics: db.</li></ul>',
F17:'<canvas class="res">F17</canvas> F17: combination of <canvas class="res">F16</canvas> F16 with vase from which water flows.<ul><li>Log. or det. <span class="egytransl">abw</span>, "purification". </li></ul>',
F18:'<canvas class="res">F18</canvas> F18: tusk.<ul><li>Log. or det. <span class="egytransl">jbH</span>, "tooth". </li><li>Det. tooth. </li><li>Phon. or phon. det. <span class="egytransl">bH</span>. </li><li>Phon. det. <span class="egytransl">Hw</span>. </li><li>(group-writing) <canvas class="res">F18:Y1</canvas> Phon. <span class="egytransl">H</span>. </li><li>Phon. or phon. det. <span class="egytransl">bjA</span>. </li><li>Phon. det. <span class="egytransl">bj</span>. </li><li>Mnemonics: Hw, bH.</li></ul>',
F19:'<canvas class="res">F19</canvas> F19: lower jaw-bone of ox.<ul><li>Log. or det. <span class="egytransl">artj</span>, "jaw". </li></ul>',
F20:'<canvas class="res">F20</canvas> F20: tongue.<ul><li>Log. <span class="egytransl">ns</span>, "tongue". </li><li>Phon. <span class="egytransl">ns</span>. </li><li>Det. tongue. </li><li>Log. <span class="egytransl">jmj-rA</span>, "overseer". </li><li>Mnemonics: ns.</li></ul>',
F21:'<canvas class="res">F21</canvas> F21: ear of bovine.<ul><li>Log. or det. <span class="egytransl">msDr</span>, "ear". </li><li><canvas class="res">S34*S34-F21:[fit]F21</canvas> Log. <span class="egytransl">anxwj</span>, "both ears". </li><li>Log. or det. <span class="egytransl">sDm</span>, "hear". </li><li>Det. hearing. </li><li>Phon. or phon. det. <span class="egytransl">jdn</span>. </li><li><canvas class="res">F21:Z1</canvas> Log. or det. <span class="egytransl">DrD</span>, "leaf". </li><li>Phon. <span class="egytransl">sdm</span>. </li><li>Mnemonics: idn, msDr, sDm, DrD.</li></ul>',
F21a:'<canvas class="res">F21a</canvas> F21a: hieratic ear of bovine.<ul><li> Use as <canvas class="res">F21</canvas> F21. </li></ul>',
F22:'<canvas class="res">F22</canvas> F22: hind-quarters of lion.<ul><li>Log. <span class="egytransl">pHwj</span>, "end". Ex. <canvas class="res">F22-[fit]insert[te](w,Z4)</canvas> . </li><li>Phon. or phon. det. <span class="egytransl">pH</span>. </li><li>Det. end, bottom. </li><li>Phon. or phon. det. <span class="egytransl">kfA</span>. </li><li>Mnemonics: pH, kfA.</li></ul>',
F23:'<canvas class="res">F23</canvas> F23: foreleg of ox.<ul><li>Log. or det. <span class="egytransl">xpS</span>, "foreleg". </li><li>Det. <span class="egytransl">^msxtjw</span>, "Great Bear". Ex. <canvas class="res">ms*s-x-G4-w-F23:sbA-A40</canvas> . </li><li>Mnemonics: xpS.</li></ul>',
F24:'<canvas class="res">F24</canvas> F24: <canvas class="res">F23</canvas> F23 reversed.<ul><li> Use as <canvas class="res">F23</canvas> F23. </li></ul>',
F25:'<canvas class="res">F25</canvas> F25: leg of ox.<ul><li>Log. <span class="egytransl">wHmt</span>, "hoof". </li><li>Phon. <span class="egytransl">wHm</span>. </li><li>Mnemonics: wHm.</li></ul>',
F26:'<canvas class="res">F26</canvas> F26: skin of goat.<ul><li>Log. <span class="egytransl">Xnt</span>, "skin". </li><li>Phon. <span class="egytransl">Xn</span>. </li><li>Mnemonics: Xn.</li></ul>',
F27:'<canvas class="res">F27</canvas> F27: skin of cow with bent tail.<ul><li>Det. skin, mammal. </li></ul>',
F28:'<canvas class="res">F28</canvas> F28: skin of cow with straight tail.<ul><li>Log. <span class="egytransl">sAb</span>, "dappled". </li><li><canvas class="res">F28*H6</canvas> Log. <span class="egytransl">sAb Swt</span>, "dappled of feathers". </li><li> Use as <canvas class="res">U23</canvas> U23. </li></ul>',
F29:'<canvas class="res">F29</canvas> F29: cow&amp;apos;s skin pierced by arrow.<ul><li>Log. or det. <span class="egytransl">stj</span>, "pierce". </li><li>Phon. <span class="egytransl">st</span>. </li><li>Mnemonics: sti.</li></ul>',
F30:'<canvas class="res">F30</canvas> F30: water-skin.<ul><li>Log. <span class="egytransl">Sdw</span>, "water-skin". </li><li>Phon. <span class="egytransl">Sd</span>. </li><li>Mnemonics: Sd.</li></ul>',
F31:'<canvas class="res">F31</canvas> F31: three skins tied together.<ul><li>Log. <span class="egytransl">mst</span>, "apron of skins". </li><li>Phon. <span class="egytransl">ms</span>. </li><li>Mnemonics: ms.</li></ul>',
F31a:'<canvas class="res">F31a</canvas> F31a: three skins tied together (simplified).<ul><li> Use as <canvas class="res">F31</canvas> F31. </li></ul>',
F32:'<canvas class="res">F32</canvas> F32: animal&amp;apos;s belly.<ul><li>Log. <span class="egytransl">Xt</span>, "belly". </li><li>Phon. <span class="egytransl">X</span>. </li><li>Mnemonics: X.</li></ul>',
F33:'<canvas class="res">F33</canvas> F33: tail.<ul><li>Log. or det. <span class="egytransl">sd</span>, "tail". </li><li>Phon. or phon. det. <span class="egytransl">sd</span>. </li><li>Mnemonics: sd.</li></ul>',
F34:'<canvas class="res">F34</canvas> F34: heart.<ul><li>Log. or det. <span class="egytransl">jb</span>, "heart". </li><li>Det. heart. </li><li>Mnemonics: ib.</li></ul>',
F35:'<canvas class="res">F35</canvas> F35: heart and windpipe.<ul><li>Phon. <span class="egytransl">nfr</span>. </li><li>Mnemonics: nfr.</li></ul>',
F36:'<canvas class="res">F36</canvas> F36: lung and windpipe.<ul><li>Log. <span class="egytransl">smA</span>, "lung". </li><li>Phon. or phon. det. <span class="egytransl">smA</span>. </li><li>Mnemonics: zmA.</li></ul>',
F37:'<canvas class="res">F37</canvas> F37: backbone and ribs and spinal cord.<ul><li>Log. <span class="egytransl">jAt</span>, "back". </li><li>Det. <span class="egytransl">psD</span>, "back". </li><li>Phon. det. <span class="egytransl">sm</span>. </li></ul>',
F37a:'<canvas class="res">F37a</canvas> F37a: backbone and ribs.<ul><li> Use as <canvas class="res">F37</canvas> F37. </li></ul>',
F38:'<canvas class="res">F38</canvas> F38: backbone and ribs.<ul><li> Use as <canvas class="res">F37</canvas> F37 [Det. <span class="egytransl">psD</span>, "back"]. </li></ul>',
F38a:'<canvas class="res">F38a</canvas> F38a: backbone and ribs and spinal cord.<ul><li> Use as <canvas class="res">F37</canvas> F37. </li></ul>',
F39:'<canvas class="res">F39</canvas> F39: backbone and spinal cord.<ul><li>Log. or det. <span class="egytransl">jmAx</span>, "spinal cord". </li><li>Log. or det. <span class="egytransl">jmAx</span>, "revered". </li><li> Use as <canvas class="res">F37</canvas> F37 [Det. <span class="egytransl">psD</span>, "back"]. </li><li>Mnemonics: imAx.</li></ul>',
F40:'<canvas class="res">F40</canvas> F40: backbone and spinal cords.<ul><li>Phon. <span class="egytransl">Aw</span>. </li><li>Mnemonics: Aw.</li></ul>',
F41:'<canvas class="res">F41</canvas> F41: vertebrae.<ul><li> Use as <canvas class="res">F37</canvas> F37 [Det. <span class="egytransl">psD</span>, "back"]. </li><li>Det. <span class="egytransl">Sat</span>, "injury". </li></ul>',
F42:'<canvas class="res">F42</canvas> F42: rib.<ul><li>Log. or det. <span class="egytransl">spr</span>, "rib". </li><li>Phon. <span class="egytransl">spr</span>. </li><li>Do not confuse with: <canvas class="res">D24</canvas> D24, <canvas class="res">N12</canvas> N12. </li><li>Mnemonics: spr.</li></ul>',
F43:'<canvas class="res">F43</canvas> F43: ribs.<ul><li>Det. <span class="egytransl">spHt</span>, "ribs of beef". Ex. <canvas class="res">s*p*H-t:F43</canvas> . </li></ul>',
F44:'<canvas class="res">F44</canvas> F44: leg-bone with meat.<ul><li>Det. bone and meat. </li><li>Phon. or phon. det. <span class="egytransl">jwa</span>. </li><li>Phon. or phon. det. <span class="egytransl">jsw</span>. </li><li>Mnemonics: iwa, isw.</li></ul>',
F45:'<canvas class="res">F45</canvas> F45: uterus.<ul><li>Log. or det. <span class="egytransl">jdt</span>, "* uterus". </li></ul>',
F45a:'<canvas class="res">F45a</canvas> F45a: uterus (simplified).<ul><li> Use as <canvas class="res">F45</canvas> F45. </li></ul>',
F46:'<canvas class="res">F46</canvas> F46: intestine.<ul><li>Log. <span class="egytransl">qAb</span>, "intestine". </li><li>Phon. or phon. det. <span class="egytransl">qAb</span>. </li><li>Log. or det. <span class="egytransl">pXr</span>, "turn". </li><li>Phon. <span class="egytransl">pXr</span>. </li><li>Log. or det. <span class="egytransl">dbn</span>, "go round". </li><li>Phon. <span class="egytransl">dbn</span>. </li><li>Det. <span class="egytransl">wDb</span>, "turn". </li><li>Mnemonics: pXr, qAb.</li></ul>',
F46a:'<canvas class="res">F46a</canvas> F46a: intestine.<ul><li> Use as <canvas class="res">F46</canvas> F46. </li></ul>',
F47:'<canvas class="res">F47</canvas> F47: intestine.<ul><li> Use as <canvas class="res">F46</canvas> F46. </li></ul>',
F47a:'<canvas class="res">F47a</canvas> F47a: intestine.<ul><li> Use as <canvas class="res">F46</canvas> F46. </li></ul>',
F48:'<canvas class="res">F48</canvas> F48: intestine.<ul><li> Use as <canvas class="res">F46</canvas> F46. </li></ul>',
F49:'<canvas class="res">F49</canvas> F49: intestine.<ul><li> Use as <canvas class="res">F46</canvas> F46. </li></ul>',
F50:'<canvas class="res">F50</canvas> F50: combination of <canvas class="res">F46</canvas> F46 and <canvas class="res">S29</canvas> S29.<ul><li>Log. <span class="egytransl">spXr</span>, "copy". </li></ul>',
F51:'<canvas class="res">F51</canvas> F51: piece of flesh.<ul><li>Det. parts of the body. </li><li><canvas class="res">F51:[fit]F51:[fit]F51</canvas> Log. <span class="egytransl">Haw</span>, "body". </li><li>Log. <span class="egytransl">kns</span>, "vagina". </li><li>Do not confuse with: <canvas class="res">F51c</canvas> F51c. </li></ul>',
F51a:'<canvas class="res">F51a</canvas> F51a: three pieces of flesh horizontally.<ul><li> Use as 3* <canvas class="res">F51</canvas> F51. </li></ul>',
F51b:'<canvas class="res">F51b</canvas> F51b: three pieces of flesh vertically.<ul><li> Use as 3* <canvas class="res">F51</canvas> F51. </li></ul>',
F51c:'<canvas class="res">F51c</canvas> F51c: <canvas class="res">F51</canvas> F51 reversed.<ul><li>Phon. or phon. det. <span class="egytransl">As</span>. </li><li>Phon. <span class="egytransl">ws</span>. </li><li>Do not confuse with: <canvas class="res">F51</canvas> F51. </li></ul>',
F52:'<canvas class="res">F52</canvas> F52: excrement.<ul><li>Log. or det. <span class="egytransl">Hs</span>, "excrement". </li></ul>',
F53:'<canvas class="res">F53</canvas> F53: divine rod with <canvas class="res">F7</canvas> F7.<ul><li>Log. <span class="egytransl">mdw</span>, "(divine) staff". </li></ul>',
G1:'<canvas class="res">G1</canvas> G1: Egyptian vulture.<ul><li>Log. <span class="egytransl">A</span>, "vulture". </li><li>Phon. <span class="egytransl">A</span>. </li><li>Do not confuse with: <canvas class="res">G4</canvas> G4. </li><li>Mnemonics: A.</li></ul>',
G2:'<canvas class="res">G2</canvas> G2: two Egyptian vultures.<ul><li>Phon. <span class="egytransl">AA</span>. </li><li>Mnemonics: AA.</li></ul>',
G3:'<canvas class="res">G3</canvas> G3: combination of <canvas class="res">G1</canvas> G1 and <canvas class="res">U1</canvas> U1.<ul><li>Phon. <span class="egytransl">mA</span>. </li></ul>',
G4:'<canvas class="res">G4</canvas> G4: buzzard.<ul><li>Phon. <span class="egytransl">tjw</span>. </li><li>Do not confuse with: <canvas class="res">G1</canvas> G1. </li><li>Mnemonics: tyw.</li></ul>',
G5:'<canvas class="res">G5</canvas> G5: falcon.<ul><li>Log. <span class="egytransl">^Hr</span>, "Horus". </li></ul>',
G6:'<canvas class="res">G6</canvas> G6: combination of <canvas class="res">G5</canvas> G5 and <canvas class="res">S45</canvas> S45.<ul><li>Det. <span class="egytransl">bjk</span>, "falcon". Ex. <canvas class="res">b*i-k-G6</canvas> . </li></ul>',
G6a:'<canvas class="res">G6a</canvas> G6a: falcon on <canvas class="res">V30</canvas> V30.<ul><li><canvas class="res">G6a-[sep=0.2]E20a</canvas> Log. <span class="egytransl">nbwj</span>, "the two lords". </li></ul>',
G7:'<canvas class="res">G7</canvas> G7: falcon on <canvas class="res">R12</canvas> R12.<ul><li>Det. <span class="egytransl">^Hr</span>, "Horus". </li><li>Det. god, king. </li><li>Log. <span class="egytransl">=j</span>, "I (king)". </li><li>Det. first person singular (king). Ex. <canvas class="res">w-G7</canvas> , <span class="egytransl">wj</span>, "me". </li></ul>',
G7a:'<canvas class="res">G7a</canvas> G7a: falcon in boat.<ul><li>Log. <span class="egytransl">^nmtj</span>, "Nemti". </li></ul>',
G7b:'<canvas class="res">G7b</canvas> G7b: falcon in boat.<ul><li> Use as <canvas class="res">G7a</canvas> G7a. </li></ul>',
G8:'<canvas class="res">G8</canvas> G8: falcon on <canvas class="res">S12</canvas> S12.<ul><li>Log. <span class="egytransl">^Hr-nbw</span>, "Gold Horus". </li></ul>',
G9:'<canvas class="res">G9</canvas> G9: falcon with <canvas class="res">N5</canvas> N5 on head.<ul><li>Log. <span class="egytransl">^ra-^Hr-Axtj</span>, "Re-Harakhti". </li></ul>',
G10:'<canvas class="res">G10</canvas> G10: falcon in Sokar barque.<ul><li>Log. or det. <span class="egytransl">^skr</span>, "Sokar". </li><li>Det. <span class="egytransl">Hnw</span>, "Sokar-bark". </li></ul>',
G11:'<canvas class="res">G11</canvas> G11: image of falcon.<ul><li>Det. <span class="egytransl">aSm</span>, "divine image". Ex. <canvas class="res">a:S-m-G11</canvas> . </li><li>Det. <span class="egytransl">Snbt</span>, "breast". Ex. <canvas class="res">Sn:n-b-t:G11</canvas> . </li></ul>',
G11a:'<canvas class="res">G11a</canvas> G11a: image of falcon on <canvas class="res">R12</canvas> R12.<ul><li> Use as <canvas class="res">G11</canvas> G11 [Det. <span class="egytransl">aSm</span>, "divine image"]. </li></ul>',
G12:'<canvas class="res">G12</canvas> G12: combination of <canvas class="res">G11</canvas> G11 and <canvas class="res">S45</canvas> S45.<ul><li> Use as <canvas class="res">G11</canvas> G11 [Det. <span class="egytransl">aSm</span>, "divine image"]. </li></ul>',
G13:'<canvas class="res">G13</canvas> G13: image of falcon with <canvas class="res">S9</canvas> S9.<ul><li>Log. <span class="egytransl">^Hr</span>, "Horus ". Ex. <canvas class="res">G13-O47:O49</canvas> , <span class="egytransl">^Hr-nxnj</span>, "Horus of Hieraconpolis". </li><li>Det. <span class="egytransl">^spdw</span>, "Sopdu". Ex. <canvas class="res">M44*w-G13</canvas> . </li></ul>',
G14:'<canvas class="res">G14</canvas> G14: vulture.<ul><li>Log. or det. <span class="egytransl">nrt</span>, "vulture". </li><li>Phon. det. <span class="egytransl">nr</span>. </li><li>Phon. <span class="egytransl">mwt</span>. </li><li>Phon. <span class="egytransl">mt</span>. </li><li>Mnemonics: mwt.</li></ul>',
G15:'<canvas class="res">G15</canvas> G15: combination of <canvas class="res">G14</canvas> G14 and <canvas class="res">S45</canvas> S45.<ul><li>Log. <span class="egytransl">^mwt</span>, "Mut". </li></ul>',
G16:'<canvas class="res">G16</canvas> G16: vulture and cobra each on <canvas class="res">V30</canvas> V30.<ul><li>Log. <span class="egytransl">nbtj</span>, "Two Ladies". </li><li>Mnemonics: nbty.</li></ul>',
G17:'<canvas class="res">G17</canvas> G17: owl.<ul><li>Phon. <span class="egytransl">m</span>. </li><li>Mnemonics: m.</li></ul>',
G18:'<canvas class="res">G18</canvas> G18: two owls.<ul><li>Phon. <span class="egytransl">mm</span>. </li><li>Log. <span class="egytransl">jm</span>, "therein". </li><li>Mnemonics: mm.</li></ul>',
G19:'<canvas class="res">G19</canvas> G19: combination of <canvas class="res">G17</canvas> G17 and <canvas class="res">D37</canvas> D37.<ul><li>Phon. <span class="egytransl">m</span>. </li><li>Phon. <span class="egytransl">mj</span>. </li></ul>',
G20:'<canvas class="res">G20</canvas> G20: combination of <canvas class="res">G17</canvas> G17 and <canvas class="res">D36</canvas> D36.<ul><li> Use as <canvas class="res">G19</canvas> G19. </li></ul>',
G20a:'<canvas class="res">G20a</canvas> G20a: combination of <canvas class="res">G17</canvas> G17 and <canvas class="res">D21</canvas> D21.<ul><li>Phon. <span class="egytransl">mr</span>. </li></ul>',
G21:'<canvas class="res">G21</canvas> G21: guinea-fowl.<ul><li>Log. <span class="egytransl">nH</span>, "guinea-fowl". </li><li>Phon. <span class="egytransl">nH</span>. </li><li>Mnemonics: nH.</li></ul>',
G22:'<canvas class="res">G22</canvas> G22: hoopoe.<ul><li>Phon. <span class="egytransl">Db</span>. </li><li>Mnemonics: Db.</li></ul>',
G23:'<canvas class="res">G23</canvas> G23: lawping.<ul><li>Log. or det. <span class="egytransl">rxyt</span>, "common folk". </li><li>Mnemonics: rxyt.</li></ul>',
G24:'<canvas class="res">G24</canvas> G24: lawping with twisted wings.<ul><li> Use as <canvas class="res">G23</canvas> G23. </li></ul>',
G25:'<canvas class="res">G25</canvas> G25: northern bald ibis.<ul><li>Log. <span class="egytransl">Ax</span>, "spirit". </li><li>Phon. <span class="egytransl">Ax</span>. </li><li>Mnemonics: Ax.</li></ul>',
G26:'<canvas class="res">G26</canvas> G26: sacred ibis on <canvas class="res">R12</canvas> R12.<ul><li>Log. or det. <span class="egytransl">hb</span>, "ibis". </li><li>Log. or det. <span class="egytransl">^DHwtj</span>, "Thoth". </li></ul>',
G26a:'<canvas class="res">G26a</canvas> G26a: sacred ibis.<ul><li> Use as <canvas class="res">G26</canvas> G26. </li></ul>',
G27:'<canvas class="res">G27</canvas> G27: flamingo.<ul><li>Log. or det. <span class="egytransl">dSr</span>, "flamingo". </li><li>Phon. or phon. det. <span class="egytransl">dSr</span>. </li><li>Mnemonics: dSr.</li></ul>',
G28:'<canvas class="res">G28</canvas> G28: glossy ibis.<ul><li>Phon. <span class="egytransl">gm</span>. </li><li>Mnemonics: gm.</li></ul>',
G29:'<canvas class="res">G29</canvas> G29: saddle-billed stork.<ul><li>Log. <span class="egytransl">bA</span>, "soul". </li><li>Phon. <span class="egytransl">bA</span>. </li><li>(group-writing) <canvas class="res">insert[te](G29,Z1)</canvas> , <canvas class="res">insert[bs](.*G29,R7)</canvas> , <canvas class="res">D58*G29</canvas> Phon. <span class="egytransl">b</span>. </li><li>Mnemonics: bA.</li></ul>',
G30:'<canvas class="res">G30</canvas> G30: three saddle-billed storks.<ul><li>Log. <span class="egytransl">bAw</span>, "might". </li></ul>',
G31:'<canvas class="res">G31</canvas> G31: heron.<ul><li>Log. or det. <span class="egytransl">bnw</span>, "phoenix". </li><li>Log. or det. <span class="egytransl">Sntj</span>, "heron". </li></ul>',
G32:'<canvas class="res">G32</canvas> G32: heron on perch.<ul><li>Log. or det. <span class="egytransl">baH</span>, "inundated". </li><li>Mnemonics: baHi.</li></ul>',
G33:'<canvas class="res">G33</canvas> G33: cattle egret.<ul><li>Log. or det. <span class="egytransl">sdA</span>, "egret". </li><li>Phon. det. <span class="egytransl">sdA</span>. </li></ul>',
G34:'<canvas class="res">G34</canvas> G34: ostrich.<ul><li>Log. or det. <span class="egytransl">njw</span>, "ostrich". </li></ul>',
G35:'<canvas class="res">G35</canvas> G35: cormorant.<ul><li>Phon. <span class="egytransl">aq</span>. </li><li>Mnemonics: aq.</li></ul>',
G36:'<canvas class="res">G36</canvas> G36: swallow.<ul><li>Phon. <span class="egytransl">wr</span>. </li><li>Log. or det. <span class="egytransl">mnt</span>, "swallow". </li><li>Do not confuse with: <canvas class="res">G37</canvas> G37. </li><li>Mnemonics: wr.</li></ul>',
G36a:'<canvas class="res">G36a</canvas> G36a: swallow (low).<ul><li> Use as <canvas class="res">G36</canvas> G36. </li></ul>',
G37:'<canvas class="res">G37</canvas> G37: sparrow.<ul><li>Log. or det. <span class="egytransl">nDs</span>, "small". </li><li>Det. small, bad, defective. </li><li>Do not confuse with: <canvas class="res">G36</canvas> G36. </li></ul>',
G37a:'<canvas class="res">G37a</canvas> G37a: sparrow (low).<ul><li> Use as <canvas class="res">G37</canvas> G37. </li></ul>',
G38:'<canvas class="res">G38</canvas> G38: white-fronted goose.<ul><li>Log. or det. <span class="egytransl">gb</span>, "white-fronted goose". </li><li>Det. goose. </li><li>Phon. <span class="egytransl">gb</span>. </li><li>Phon. det. <span class="egytransl">wfA</span>. </li><li>Phon. det. <span class="egytransl">wsf</span>. </li><li>Phon. det. <span class="egytransl">wdf</span>. </li><li>Phon. det. <span class="egytransl">Htm</span>. </li><li>Det. (any) bird, flying insect. </li><li>Do not confuse with: <canvas class="res">G39</canvas> G39. </li><li>Mnemonics: gb.</li></ul>',
G39:'<canvas class="res">G39</canvas> G39: pintail.<ul><li>Log. or det. <span class="egytransl">st</span>, "pintail". </li><li>Phon. <span class="egytransl">sA</span>. </li><li>Do not confuse with: <canvas class="res">G38</canvas> G38. </li><li>Mnemonics: zA.</li></ul>',
G40:'<canvas class="res">G40</canvas> G40: pintail flying.<ul><li>Log. <span class="egytransl">pA</span>, "fly". </li><li>Phon. <span class="egytransl">pA</span>. </li><li>(group-writing) <canvas class="res">G40</canvas> Phon. <span class="egytransl">p</span>. </li><li> Use as <canvas class="res">G41</canvas> G41. </li><li>Mnemonics: pA.</li></ul>',
G41:'<canvas class="res">G41</canvas> G41: pintail alighting.<ul><li>Det. <span class="egytransl">xnj</span>, "alight". </li><li>Phon. det. <span class="egytransl">xn</span>. </li><li>Phon. <span class="egytransl">qmj</span>. </li><li>Phon. det. <span class="egytransl">qmj</span>. </li><li>Phon. det. <span class="egytransl">sHw</span>. </li><li><canvas class="res">T14*[sep=0.2]G41</canvas> Phon. det. <span class="egytransl">qmA</span>. </li><li><canvas class="res">T14*[sep=0.2]G41</canvas> Phon. det. <span class="egytransl">Tn</span>. </li><li> Use as <canvas class="res">G40</canvas> G40. </li><li>(group-writing) <canvas class="res">G41-G1</canvas> Phon. <span class="egytransl">p</span>. </li><li>Det. (any) bird, flying insect. </li><li>Mnemonics: xn.</li></ul>',
G42:'<canvas class="res">G42</canvas> G42: widgeon.<ul><li>Log. or det. <span class="egytransl">wSA</span>, "fatten". </li><li>Det. <span class="egytransl">DfA</span>, "provisions". </li><li>Mnemonics: wSA.</li></ul>',
G43:'<canvas class="res">G43</canvas> G43: quail chick.<ul><li>Phon. <span class="egytransl">w</span>. </li><li>Mnemonics: w.</li></ul>',
G43a:'<canvas class="res">G43a</canvas> G43a: combination of <canvas class="res">G43</canvas> G43 and <canvas class="res">X1</canvas> X1.<ul><li>Phon. <span class="egytransl">tw</span>. </li><li>Phon. <span class="egytransl">wt</span>. </li></ul>',
G44:'<canvas class="res">G44</canvas> G44: two quail chicks.<ul><li>Phon. <span class="egytransl">ww</span>. </li><li>Mnemonics: ww.</li></ul>',
G45:'<canvas class="res">G45</canvas> G45: combination of <canvas class="res">G43</canvas> G43 and <canvas class="res">D36</canvas> D36.<ul><li>Phon. <span class="egytransl">wa</span>. </li></ul>',
G45a:'<canvas class="res">G45a</canvas> G45a: combination of <canvas class="res">G43</canvas> G43 and <canvas class="res">D37</canvas> D37.<ul><li>Phon. <span class="egytransl">Dj{w}</span>. </li><li>Phon. <span class="egytransl">mj{w}</span>. </li></ul>',
G46:'<canvas class="res">G46</canvas> G46: combination of <canvas class="res">G43</canvas> G43 and <canvas class="res">U1</canvas> U1.<ul><li>Phon. <span class="egytransl">mAw</span>. </li><li>Mnemonics: mAw.</li></ul>',
G47:'<canvas class="res">G47</canvas> G47: duckling.<ul><li>Log. <span class="egytransl">TA</span>, "nestling". </li><li>Phon. <span class="egytransl">TA</span>. </li><li>(group-writing) <canvas class="res">insert[te](G47,Z1)</canvas> Phon. <span class="egytransl">T</span>. </li><li>Mnemonics: TA.</li></ul>',
G48:'<canvas class="res">G48</canvas> G48: three ducklings in nest.<ul><li>Log. or det. <span class="egytransl">sS</span>, "nest". </li></ul>',
G49:'<canvas class="res">G49</canvas> G49: three ducklings in pool.<ul><li>Log. or det. <span class="egytransl">sS</span>, "nest". </li></ul>',
G50:'<canvas class="res">G50</canvas> G50: two plovers.<ul><li>Log. <span class="egytransl">rxtj</span>, "washerman". </li></ul>',
G51:'<canvas class="res">G51</canvas> G51: bird pecking at fish.<ul><li>Det. <span class="egytransl">HAm</span>, "catch fish". Ex. <canvas class="res">HA-A-m-G51-A24</canvas> . </li></ul>',
G52:'<canvas class="res">G52</canvas> G52: goose picking up grain.<ul><li>Det. <span class="egytransl">snm</span>, "feed". Ex. <canvas class="res">s-n:nm*m-G52</canvas> . </li></ul>',
G53:'<canvas class="res">G53</canvas> G53: human-headed bird with <canvas class="res">R7</canvas> R7.<ul><li>Log. <span class="egytransl">bA</span>, "soul". </li></ul>',
G54:'<canvas class="res">G54</canvas> G54: plucked bird.<ul><li>Det. <span class="egytransl">wSn</span>, "wring neck (of bird)". Ex. <canvas class="res">w-S:n-G54</canvas> . </li><li>Phon. or phon. det. <span class="egytransl">snD</span>. </li><li>Mnemonics: snD.</li></ul>',
H1:'<canvas class="res">H1</canvas> H1: head of pintail.<ul><li>Log. <span class="egytransl">Apdw</span>, "fowl". </li><li>Det. <span class="egytransl">wSn</span>, "wring neck (of bird)". Ex. <canvas class="res">w-S:n-H1:a</canvas> . </li><li> Use as <canvas class="res">H2</canvas> H2. </li></ul>',
H2:'<canvas class="res">H2</canvas> H2: head of crested bird.<ul><li>Phon. det. <span class="egytransl">mAa</span>. </li><li>Phon. or phon. det. <span class="egytransl">wSm</span>. </li><li> Use as <canvas class="res">H3</canvas> H3. </li><li>Mnemonics: wSm, pq.</li></ul>',
H3:'<canvas class="res">H3</canvas> H3: head of spoonbill.<ul><li>Phon. or phon. det. <span class="egytransl">pAq</span>. </li><li>Mnemonics: pAq.</li></ul>',
H4:'<canvas class="res">H4</canvas> H4: head of vulture.<ul><li>Phon. det. <span class="egytransl">nr</span>. </li><li>Phon. <span class="egytransl">rm</span>. </li><li>Mnemonics: nr.</li></ul>',
H5:'<canvas class="res">H5</canvas> H5: wing.<ul><li>Det. wing, fly. </li></ul>',
H6:'<canvas class="res">H6</canvas> H6: feather.<ul><li>Log. or det. <span class="egytransl">Swt</span>, "feather". </li><li>Phon. <span class="egytransl">Sw</span>. </li><li>Log. or det. <span class="egytransl">mAat</span>, "truth". </li><li>Mnemonics: Sw.</li></ul>',
H6a:'<canvas class="res">H6a</canvas> H6a: hieratic feather.<ul><li> Use as <canvas class="res">H6</canvas> H6 [Phon. <span class="egytransl">Sw</span>]. </li></ul>',
H7:'<canvas class="res">H7</canvas> H7: claw.<ul><li>Phon. <span class="egytransl">SA</span>. </li></ul>',
H8:'<canvas class="res">H8</canvas> H8: egg.<ul><li>Det. <span class="egytransl">swHt</span>, "egg". </li><li>Log. <span class="egytransl">sA</span>, "son". </li><li>Det. <span class="egytransl">pat</span>, "patricians". </li><li> Use as <canvas class="res">F51c</canvas> F51c. </li></ul>',
I1:'<canvas class="res">I1</canvas> I1: gecko.<ul><li>Log. or det. <span class="egytransl">HntAsw</span>, "lizard". </li><li>Log. or det. <span class="egytransl">aSA</span>, "gecko". </li><li>Phon. <span class="egytransl">aSA</span>. </li><li>Mnemonics: aSA.</li></ul>',
I2:'<canvas class="res">I2</canvas> I2: turtle.<ul><li>Log. or det. <span class="egytransl">Stw</span>, "turtle". </li><li>Mnemonics: Styw.</li></ul>',
I3:'<canvas class="res">I3</canvas> I3: crocodile.<ul><li>Log. or det. <span class="egytransl">msH</span>, "crocodile". </li><li>Log. or det. <span class="egytransl">xntj</span>, "crocodile". </li><li>Det. greedy. </li><li>Det. agression. </li><li><canvas class="res">I3:I3</canvas> Log. <span class="egytransl">jty</span>, "sovereign". Ex. <canvas class="res">I3:I3-G7</canvas> . </li><li>Mnemonics: mzH.</li></ul>',
I4:'<canvas class="res">I4</canvas> I4: crocodile on shrine.<ul><li>Log. or det. <span class="egytransl">^sbk</span>, "Sobek". </li><li>Mnemonics: sbk.</li></ul>',
I5:'<canvas class="res">I5</canvas> I5: crocodile with curved tail.<ul><li>Log. or det. <span class="egytransl">sAq</span>, "gather". </li><li>Mnemonics: sAq.</li></ul>',
I5a:'<canvas class="res">I5a</canvas> I5a: image of crocodile.<ul><li> Use as <canvas class="res">I4</canvas> I4. </li></ul>',
I6:'<canvas class="res">I6</canvas> I6: crocodile scales.<ul><li>Phon. <span class="egytransl">km</span>. </li><li>Mnemonics: km.</li></ul>',
I7:'<canvas class="res">I7</canvas> I7: frog.<ul><li>Det. frog. Ex. <canvas class="res">H*(q:t)-I7</canvas> , <span class="egytransl">^Hqt</span>, "Heket". </li><li>Log. <span class="egytransl">wHm-anx</span>, "repeating life". </li></ul>',
I8:'<canvas class="res">I8</canvas> I8: tadpole.<ul><li>Log. <span class="egytransl">Hfnr</span>, "tadpole". </li><li>Log. <span class="egytransl">Hfn</span>, "100000". </li><li>Mnemonics: Hfn.</li></ul>',
I9:'<canvas class="res">I9</canvas> I9: horned viper.<ul><li>Phon. <span class="egytransl">f</span>. </li><li>Det. <span class="egytransl">jt</span>, "father". Ex. <canvas class="res">i*(t:f)-A1</canvas> , <canvas class="res">t:f-A1</canvas> . </li><li>Mnemonics: f.</li></ul>',
I9a:'<canvas class="res">I9a</canvas> I9a: horned viper crawling out of enclosure.<ul><li>Log. <span class="egytransl">prj</span>, "go out". </li></ul>',
I10:'<canvas class="res">I10</canvas> I10: cobra.<ul><li>Log. <span class="egytransl">Dt</span>, "cobra". </li><li>Phon. <span class="egytransl">D</span>. </li><li>Mnemonics: D.</li></ul>',
I10a:'<canvas class="res">I10a</canvas> I10a: cobra with feather.<ul><li>Log. or det. <span class="egytransl">^wADyt</span>, "Wadjit (tenth nome of Upper Egypt)". </li></ul>',
I11:'<canvas class="res">I11</canvas> I11: two cobras.<ul><li>Phon. <span class="egytransl">DD</span>. </li><li>Mnemonics: DD.</li></ul>',
I11a:'<canvas class="res">I11a</canvas> I11a: combination of <canvas class="res">I10</canvas> I10, <canvas class="res">X1</canvas> X1 and <canvas class="res">N18</canvas> N18.<ul><li>Log. <span class="egytransl">Dt</span>, "eternity". </li></ul>',
I12:'<canvas class="res">I12</canvas> I12: erect cobra.<ul><li>Det. <span class="egytransl">jart</span>, "uraeus". </li><li>Det. goddess. </li></ul>',
I13:'<canvas class="res">I13</canvas> I13: erect cobra on <canvas class="res">V30</canvas> V30.<ul><li>Det. goddess. </li></ul>',
I14:'<canvas class="res">I14</canvas> I14: snake.<ul><li>Det. snake. Exx. <canvas class="res">H-f:[sep=0.2]A-w-I14</canvas> , <span class="egytransl">HfAw</span>, "serpent"; <canvas class="res">insert[bs](D,d)-f:t-I14</canvas> , <span class="egytransl">Ddft</span>, "snake". </li></ul>',
I15:'<canvas class="res">I15</canvas> I15: snake.<ul><li> Use as <canvas class="res">I14</canvas> I14. </li></ul>',
K1:'<canvas class="res">K1</canvas> K1: tilapia.<ul><li>Log. or det. <span class="egytransl">jnt</span>, "tilapia". </li><li>Phon. <span class="egytransl">jn</span>. </li><li>Mnemonics: in.</li></ul>',
K2:'<canvas class="res">K2</canvas> K2: barbel.<ul><li>Phon. det. <span class="egytransl">bw</span>. </li></ul>',
K3:'<canvas class="res">K3</canvas> K3: mullet.<ul><li>Log. or det. <span class="egytransl">aDw</span>, "mullet". </li><li>Phon. <span class="egytransl">aD</span>. </li><li>Mnemonics: ad.</li></ul>',
K4:'<canvas class="res">K4</canvas> K4: elephant-snout fish.<ul><li>Log. <span class="egytransl">XAt</span>, "elephant-snout fish". </li><li>Phon. <span class="egytransl">XA</span>. </li><li>Mnemonics: XA.</li></ul>',
K5:'<canvas class="res">K5</canvas> K5: Petrocephalus bane.<ul><li>Phon. det. <span class="egytransl">bs</span>. </li><li>Det. fish. </li><li>Mnemonics: bz.</li></ul>',
K6:'<canvas class="res">K6</canvas> K6: fish scale.<ul><li>Log. or det. <span class="egytransl">nSmt</span>, "fish scale". </li><li>Do not confuse with: <canvas class="res">L6</canvas> L6. </li><li>Mnemonics: nSmt.</li></ul>',
K7:'<canvas class="res">K7</canvas> K7: puffer.<ul><li>Det. <span class="egytransl">Spt</span>, "discontented". Ex. <canvas class="res">S:p*t-K7</canvas> . </li></ul>',
K8:'<canvas class="res">K8</canvas> K8: catfish.<ul><li>Log. or det. <span class="egytransl">nar</span>, "catfish". </li></ul>',
L1:'<canvas class="res">L1</canvas> L1: dung beetle.<ul><li>Log. or det. <span class="egytransl">xprr</span>, "dung beetle". </li><li>Phon. <span class="egytransl">xpr</span>. </li><li>Mnemonics: xpr.</li></ul>',
L2:'<canvas class="res">L2</canvas> L2: bee.<ul><li>Log. <span class="egytransl">bjt</span>, "bee". </li><li>Phon. <span class="egytransl">bjt</span>. </li><li>Mnemonics: bit.</li></ul>',
L2a:'<canvas class="res">L2a</canvas> L2a: combination of <canvas class="res">M23</canvas> M23, <canvas class="res">L2</canvas> L2 and two <canvas class="res">X1</canvas> X1.<ul><li>Log. <span class="egytransl">nsw-bjtj</span>, "king of Upper and Lower Egypt". </li></ul>',
L3:'<canvas class="res">L3</canvas> L3: fly.<ul><li>Log. or det. <span class="egytransl">aff</span>, "fly (noun)". </li></ul>',
L4:'<canvas class="res">L4</canvas> L4: locust.<ul><li>Log. or det. <span class="egytransl">snHm</span>, "locust". </li></ul>',
L5:'<canvas class="res">L5</canvas> L5: centipede.<ul><li>Log. or det. <span class="egytransl">spA</span>, "centipede". </li></ul>',
L6:'<canvas class="res">L6</canvas> L6: shell.<ul><li>Phon. <span class="egytransl">xA</span>. </li><li>Do not confuse with: <canvas class="res">K6</canvas> K6. </li></ul>',
L6a:'<canvas class="res">L6a</canvas> L6a: <canvas class="res">L6</canvas> L6 reversed.<ul><li> Use as <canvas class="res">L6</canvas> L6. </li></ul>',
L7:'<canvas class="res">L7</canvas> L7: scorpion.<ul><li>Log. <span class="egytransl">^srqt</span>, "Selkis". </li><li>Mnemonics: srqt.</li></ul>',
L8:'<canvas class="res">L8</canvas> L8: .<ul><li>Phon. * <span class="egytransl">n</span>. Ex. <canvas class="res">anx-L8*x</canvas> , <span class="egytransl">anx</span>, "Ankh". </li></ul>',
M1:'<canvas class="res">M1</canvas> M1: tree.<ul><li>Det. tree. </li><li>Phon. <span class="egytransl">jAm</span>, <span class="egytransl">jmA</span>, <span class="egytransl">jm</span>. </li><li>Mnemonics: iAm.</li></ul>',
M1a:'<canvas class="res">M1a</canvas> M1a: combination of <canvas class="res">M1</canvas> M1 and <canvas class="res">M3</canvas> M3.<ul><li>Det. tree. </li></ul>',
M1b:'<canvas class="res">M1b</canvas> M1b: combination of <canvas class="res">M1</canvas> M1 and <canvas class="res">I9</canvas> I9.<ul><li>Log. <span class="egytransl">^nDft</span>, "Nedjfit". </li></ul>',
M2:'<canvas class="res">M2</canvas> M2: plant.<ul><li>Det. plant, flower. </li><li>Phon. <span class="egytransl">Hn</span>. </li><li>Phon. det. <span class="egytransl">js</span>. </li><li>Log. <span class="egytransl">=j</span>, "I". </li><li>Det. <span class="egytransl">s</span>, "man". Ex. <canvas class="res">z:M2*Z1</canvas> . </li><li>Mnemonics: Hn.</li></ul>',
M3:'<canvas class="res">M3</canvas> M3: branch.<ul><li>Log. <span class="egytransl">xt</span>, "wood". </li><li>Phon. <span class="egytransl">xt</span>. </li><li>Det. wood. </li><li>Phon. det. <span class="egytransl">Da</span>. </li><li>Mnemonics: xt.</li></ul>',
M3a:'<canvas class="res">M3a</canvas> M3a: combination of <canvas class="res">G17</canvas> G17 and <canvas class="res">M3</canvas> M3.<ul><li>Log. <span class="egytransl">m-xt</span>, "after". </li></ul>',
M4:'<canvas class="res">M4</canvas> M4: palm branch.<ul><li>Det. <span class="egytransl">rnpj</span>, "young". </li><li>Log. or det. <span class="egytransl">rnp</span>, "year". </li><li>Log. <span class="egytransl">HAt-sp</span>, "regnal year". </li><li>Log. <span class="egytransl">snf</span>, "last year". </li><li> Use as <canvas class="res">M5</canvas> M5. </li><li> Use as <canvas class="res">M6</canvas> M6. </li><li> Use as <canvas class="res">M7</canvas> M7. </li><li>Mnemonics: rnp.</li></ul>',
M5:'<canvas class="res">M5</canvas> M5: combination of <canvas class="res">M4</canvas> M4 and <canvas class="res">X1</canvas> X1.<ul><li>Log. or det. <span class="egytransl">tr</span>, "season". </li><li>Phon. det. <span class="egytransl">tr</span>. </li><li>Phon. det. <span class="egytransl">rj</span>. </li></ul>',
M6:'<canvas class="res">M6</canvas> M6: combination of <canvas class="res">M4</canvas> M4 and <canvas class="res">D21</canvas> D21.<ul><li>Log. or det. <span class="egytransl">tr</span>, "season". </li><li>Phon. det. <span class="egytransl">tr</span>, <span class="egytransl">tj</span>. </li><li>Phon. det. <span class="egytransl">rj</span>. </li><li>Mnemonics: tr.</li></ul>',
M7:'<canvas class="res">M7</canvas> M7: combination of <canvas class="res">M4</canvas> M4 and <canvas class="res">Q3</canvas> Q3.<ul><li>Log. or det. <span class="egytransl">rnpj</span>, "young". </li></ul>',
M8:'<canvas class="res">M8</canvas> M8: pool with lotus flowers.<ul><li>Log. or det. <span class="egytransl">SA</span>, "land", "pool". </li><li>Phon. <span class="egytransl">SA</span>. </li><li>(group-writing) <canvas class="res">M8</canvas> , <canvas class="res">M8-G1</canvas> Phon. <span class="egytransl">S</span>. </li><li>Log. or det. <span class="egytransl">Axt</span>, "Season of Inundation". </li><li>Mnemonics: SA.</li></ul>',
M9:'<canvas class="res">M9</canvas> M9: lotus flower.<ul><li>Log. or det. <span class="egytransl">SSn</span>, "lotus". </li><li>Mnemonics: zSn.</li></ul>',
M10:'<canvas class="res">M10</canvas> M10: lotus bud with straight stem.<ul><li>Log. or det. <span class="egytransl">nHbt</span>, "lotus bud". </li></ul>',
M10a:'<canvas class="res">M10a</canvas> M10a: lotus bud with winding stem.<ul><li> Use as <canvas class="res">M10</canvas> M10. </li></ul>',
M11:'<canvas class="res">M11</canvas> M11: flower on long twisted stalk.<ul><li>Log. or det. <span class="egytransl">wdn</span>, "offer". </li><li>Mnemonics: wdn.</li></ul>',
M12:'<canvas class="res">M12</canvas> M12: lotus plant.<ul><li>Phon. <span class="egytransl">xA</span>. </li><li>Log. <span class="egytransl">xA</span>, "1000". </li><li>(group-writing) <canvas class="res">M12</canvas> , <canvas class="res">M12*G1</canvas> Phon. <span class="egytransl">x</span>. </li><li>Mnemonics: xA.</li></ul>',
M12a:'<canvas class="res">M12a</canvas> M12a: ....<ul><li> Use as 2* <canvas class="res">M12</canvas> M12. </li></ul>',
M12b:'<canvas class="res">M12b</canvas> M12b: ....<ul><li> Use as 3* <canvas class="res">M12</canvas> M12. </li></ul>',
M12c:'<canvas class="res">M12c</canvas> M12c: ....<ul><li> Use as 4* <canvas class="res">M12</canvas> M12. </li></ul>',
M12d:'<canvas class="res">M12d</canvas> M12d: ....<ul><li> Use as 5* <canvas class="res">M12</canvas> M12. </li></ul>',
M12e:'<canvas class="res">M12e</canvas> M12e: ....<ul><li> Use as 6* <canvas class="res">M12</canvas> M12. </li></ul>',
M12f:'<canvas class="res">M12f</canvas> M12f: ....<ul><li> Use as 7* <canvas class="res">M12</canvas> M12. </li></ul>',
M12g:'<canvas class="res">M12g</canvas> M12g: ....<ul><li> Use as 8* <canvas class="res">M12</canvas> M12. </li></ul>',
M12h:'<canvas class="res">M12h</canvas> M12h: ....<ul><li> Use as 9* <canvas class="res">M12</canvas> M12. </li></ul>',
M13:'<canvas class="res">M13</canvas> M13: papyrus.<ul><li>Log. or det. <span class="egytransl">wAD</span>, "papyrus". </li><li>Phon. or phon. det. <span class="egytransl">wAD</span>. </li><li> Use as <canvas class="res">V24</canvas> V24. </li><li>Mnemonics: wAD.</li></ul>',
M14:'<canvas class="res">M14</canvas> M14: combination of <canvas class="res">M13</canvas> M13 and <canvas class="res">I10</canvas> I10.<ul><li>Phon. <span class="egytransl">wAD</span>. </li><li> Use as <canvas class="res">V24</canvas> V24. </li></ul>',
M15:'<canvas class="res">M15</canvas> M15: clump of papyrus with buds.<ul><li>Det. papyrus, watery regions. </li><li>Phon. det. <span class="egytransl">wAx</span>. </li><li><canvas class="res">M15-L2-X1:O49</canvas> Log. <span class="egytransl">^Ax-bjt</span>, "Chemmis". </li><li>Log. or det. <span class="egytransl">mHw</span>, "Lower Egypt". </li></ul>',
M15a:'<canvas class="res">M15a</canvas> M15a: combination of <canvas class="res">M15</canvas> M15 and <canvas class="res">O49</canvas> O49.<ul><li>Log. <span class="egytransl">^Ax-bjt</span>, "Chemmis". </li></ul>',
M16:'<canvas class="res">M16</canvas> M16: clump of papyrus.<ul><li>Phon. <span class="egytransl">HA</span>. </li><li>(group-writing) <canvas class="res">M16</canvas> , <canvas class="res">M16-G1</canvas> Phon. <span class="egytransl">H</span>. </li><li>Log. or det. <span class="egytransl">mHw</span>, "Lower Egypt". </li><li>Mnemonics: HA.</li></ul>',
M16a:'<canvas class="res">M16a</canvas> M16a: combination of <canvas class="res">M16</canvas> M16 and <canvas class="res">O49</canvas> O49.<ul><li>Log. <span class="egytransl">^tA-mHw</span>, "Lower Egypt". </li></ul>',
M17:'<canvas class="res">M17</canvas> M17: reed.<ul><li>Log. <span class="egytransl">j</span>, "reed". </li><li>Phon. <span class="egytransl">j</span>. </li><li><canvas class="res">M17*[fix,sep=0.2]M17</canvas> Phon. <span class="egytransl">y</span>. </li><li>(group-writing) <canvas class="res">M17*[fix,sep=0.2]M17</canvas> Phon. Hebrew Yod. </li><li>(group-writing) <canvas class="res">M17-A2</canvas> Phon. Hebrew Alef. </li><li>Mnemonics: i.</li></ul>',
M17a:'<canvas class="res">M17a</canvas> M17a: two reeds.<ul><li> Use as 2* <canvas class="res">M17</canvas> M17. </li></ul>',
M18:'<canvas class="res">M18</canvas> M18: combination of <canvas class="res">M17</canvas> M17 and <canvas class="res">D54</canvas> D54.<ul><li>Log. <span class="egytransl">jj</span>, "come". </li><li>Mnemonics: ii.</li></ul>',
M19:'<canvas class="res">M19</canvas> M19: heaped conical cakes between <canvas class="res">M17</canvas> M17 and <canvas class="res">U36</canvas> U36.<ul><li>Log. or det. <span class="egytransl">aAbt</span>, "offering". </li></ul>',
M20:'<canvas class="res">M20</canvas> M20: field of reeds.<ul><li>Log. <span class="egytransl">sxt</span>, "marshland". </li><li> Use as <canvas class="res">M21</canvas> M21 [Phon. <span class="egytransl">sm</span>]. </li><li>Mnemonics: sxt.</li></ul>',
M21:'<canvas class="res">M21</canvas> M21: reeds with root.<ul><li>Log. or det. <span class="egytransl">sm</span>, "plant". </li><li>Phon. <span class="egytransl">sm</span>. </li><li>Mnemonics: sm.</li></ul>',
M22:'<canvas class="res">M22</canvas> M22: rush.<ul><li>Phon. <span class="egytransl">nxb</span>. </li><li><canvas class="res">M22*[sep=0.5]M22</canvas> Phon. <span class="egytransl">nn</span>. </li></ul>',
M22a:'<canvas class="res">M22a</canvas> M22a: two rushes.<ul><li> Use as 2* <canvas class="res">M22</canvas> M22. </li></ul>',
M23:'<canvas class="res">M23</canvas> M23: sedge.<ul><li>Log. <span class="egytransl">swt</span>, "sedge". </li><li>Phon. <span class="egytransl">sw</span>. </li><li>(group-writing) <canvas class="res">M23*G43</canvas> Phon. <span class="egytransl">s</span>. </li><li><canvas class="res">M23-X1:N35</canvas> , <canvas class="res">M23*X1</canvas> , <canvas class="res">M23</canvas> Log. <span class="egytransl">nsw</span>, "king of Upper Egypt". </li><li><canvas class="res">M23:X1-L2:X1</canvas> Log. <span class="egytransl">nsw-bjtj</span>, "king of Upper and Lower Egypt". </li><li>Mnemonics: sw.</li></ul>',
M24:'<canvas class="res">M24</canvas> M24: combination of <canvas class="res">M23</canvas> M23 and <canvas class="res">D21</canvas> D21.<ul><li>Log. <span class="egytransl">rs</span>, "south". </li><li>Mnemonics: rsw.</li></ul>',
M24a:'<canvas class="res">M24a</canvas> M24a: lily.<ul><li><canvas class="res">M24a-M13</canvas> Log. <span class="egytransl">tAwj</span>, "the two lands". </li></ul>',
M25:'<canvas class="res">M25</canvas> M25: combination of <canvas class="res">M26</canvas> M26 and <canvas class="res">D21</canvas> D21.<ul><li> Use as <canvas class="res">M24</canvas> M24. </li><li> Use as <canvas class="res">M26</canvas> M26. </li></ul>',
M26:'<canvas class="res">M26</canvas> M26: flowering sedge.<ul><li>Log. <span class="egytransl">^Smaw</span>, "Upper Egypt". </li><li>Phon. or phon. det. <span class="egytransl">Sma</span>. </li><li>Mnemonics: Sma.</li></ul>',
M27:'<canvas class="res">M27</canvas> M27: combination of <canvas class="res">M26</canvas> M26 and <canvas class="res">D36</canvas> D36.<ul><li>Log. <span class="egytransl">^Smaw</span>, "Upper Egypt". </li><li>Phon. <span class="egytransl">Sma</span>. </li></ul>',
M28:'<canvas class="res">M28</canvas> M28: combination of <canvas class="res">M26</canvas> M26 and <canvas class="res">V20</canvas> V20.<ul><li>Log. <span class="egytransl">mDw Sma</span>, "the tens of Upper Egypt". </li></ul>',
M28a:'<canvas class="res">M28a</canvas> M28a: three lilies on <canvas class="res">O49</canvas> O49.<ul><li>Log. <span class="egytransl">tA-^Smaw</span>, "Upper Egypt". </li></ul>',
M29:'<canvas class="res">M29</canvas> M29: pod.<ul><li>Phon. <span class="egytransl">nDm</span>. </li><li>Mnemonics: nDm.</li></ul>',
M30:'<canvas class="res">M30</canvas> M30: root.<ul><li>Log. or det. <span class="egytransl">bnr</span>, "sweet". </li><li>Mnemonics: bnr.</li></ul>',
M31:'<canvas class="res">M31</canvas> M31: rhizome.<ul><li>Det. <span class="egytransl">rd</span>, "grow". Ex. <canvas class="res">r:d-M31</canvas> . </li></ul>',
M31a:'<canvas class="res">M31a</canvas> M31a: <canvas class="res">M1</canvas> M1 in vase.<ul><li> Use as <canvas class="res">M31</canvas> M31. </li></ul>',
M32:'<canvas class="res">M32</canvas> M32: rhizome.<ul><li> Use as <canvas class="res">M31</canvas> M31. </li></ul>',
M33:'<canvas class="res">M33</canvas> M33: 3 grains horizontally.<ul><li>Log. or det. <span class="egytransl">jt</span>, "barley". </li><li>Det. grain. </li></ul>',
M33a:'<canvas class="res">M33a</canvas> M33a: 3 grains vertically.<ul><li> Use as <canvas class="res">M33</canvas> M33. </li></ul>',
M33b:'<canvas class="res">M33b</canvas> M33b: 3 grains in triangular arrangement.<ul><li> Use as <canvas class="res">M33</canvas> M33. </li></ul>',
M34:'<canvas class="res">M34</canvas> M34: ear of emmer.<ul><li>Log. or det. <span class="egytransl">bdt</span>, "emmer". </li><li>Mnemonics: bdt.</li></ul>',
M35:'<canvas class="res">M35</canvas> M35: heap of grain.<ul><li>Det. heap. </li></ul>',
M36:'<canvas class="res">M36</canvas> M36: bundle of flax showing bolls.<ul><li>Phon. <span class="egytransl">Dr</span>. </li><li>Det. bundle together. </li><li>Mnemonics: Dr.</li></ul>',
M37:'<canvas class="res">M37</canvas> M37: bundle of flax.<ul><li> Use as <canvas class="res">M36</canvas> M36 [Phon. <span class="egytransl">Dr</span>]. </li></ul>',
M38:'<canvas class="res">M38</canvas> M38: wide bundle of flax.<ul><li>Det. flax. </li><li>Det. bundle together. </li></ul>',
M39:'<canvas class="res">M39</canvas> M39: basket of fruit or grain.<ul><li>Det. vegetable offering. </li></ul>',
M40:'<canvas class="res">M40</canvas> M40: bundle of reeds.<ul><li>Log. or det. <span class="egytransl">jsw</span>, "reeds". </li><li>Phon. <span class="egytransl">js</span>. </li><li>Do not confuse with: <canvas class="res">Aa28</canvas> Aa28. </li><li>Mnemonics: iz.</li></ul>',
M40a:'<canvas class="res">M40a</canvas> M40a: bundle of reeds.<ul><li> Use as <canvas class="res">M40</canvas> M40. </li><li>Do not confuse with: <canvas class="res">Aa28</canvas> Aa28. </li></ul>',
M41:'<canvas class="res">M41</canvas> M41: piece of wood.<ul><li>Det. wood. </li></ul>',
M42:'<canvas class="res">M42</canvas> M42: flower.<ul><li>Phon. <span class="egytransl">wn</span>. </li><li>Log. <span class="egytransl">wnm</span>, "eat". </li></ul>',
M43:'<canvas class="res">M43</canvas> M43: vine on trellis.<ul><li>Det. vine, fruit. </li></ul>',
M44:'<canvas class="res">M44</canvas> M44: thorn.<ul><li>Log. or det. <span class="egytransl">spd</span>, "sharp". </li><li>Det. sharp. </li><li>Do not confuse with: <canvas class="res">X8a</canvas> X8a. </li></ul>',
N1:'<canvas class="res">N1</canvas> N1: sky.<ul><li>Log. or det. <span class="egytransl">pt</span>, "sky". </li><li>Det. sky, high. </li><li><canvas class="res">W25:N1</canvas> Log. <span class="egytransl">^jnj-Hrt</span>, "Onuris". </li><li>Phon. <span class="egytransl">Hr</span>, <span class="egytransl">Hrj</span>, <span class="egytransl">Hrw</span>. </li><li>Det. gate. </li><li>Mnemonics: pt.</li></ul>',
N2:'<canvas class="res">N2</canvas> N2: sky with sceptre.<ul><li>Log. or det. <span class="egytransl">grH</span>, "night". </li><li>Det. night. </li></ul>',
N3:'<canvas class="res">N3</canvas> N3: sky with sceptre.<ul><li> Use as <canvas class="res">N2</canvas> N2. </li></ul>',
N4:'<canvas class="res">N4</canvas> N4: sky with rain.<ul><li>Log. or det. <span class="egytransl">jAdt</span>, "dew". </li><li>Det. precipitation. </li><li>Mnemonics: iAdt, idt.</li></ul>',
N5:'<canvas class="res">N5</canvas> N5: sun.<ul><li>Log. or det. <span class="egytransl">ra</span>, "sun". </li><li>Log. or det. <span class="egytransl">hrw</span>, "day". </li><li>Log. or det. <span class="egytransl">sw</span>, "day". </li><li>Det. sun, time. </li><li>Do not confuse with: <canvas class="res">D12</canvas> D12, <canvas class="res">D67</canvas> D67, <canvas class="res">N33</canvas> N33, <canvas class="res">S21</canvas> S21, <canvas class="res">Z13</canvas> Z13. </li><li>Mnemonics: ra, zw, hrw.</li></ul>',
N6:'<canvas class="res">N6</canvas> N6: sun with uraeus.<ul><li>Log. or det. <span class="egytransl">ra</span>, "sun". </li></ul>',
N7:'<canvas class="res">N7</canvas> N7: combination of <canvas class="res">N5</canvas> N5 and <canvas class="res">T28</canvas> T28.<ul><li>Log. <span class="egytransl">Xrt-hrw</span>, "day-time". </li></ul>',
N8:'<canvas class="res">N8</canvas> N8: sunshine.<ul><li>Log. or det. <span class="egytransl">Axw</span>, "sunshine". </li><li>Det. shine. </li><li>Log. or det. <span class="egytransl">wbn</span>, "rise". </li><li>Phon. <span class="egytransl">wbn</span>. </li><li>Log. <span class="egytransl">Hnmmt</span>, "sun-folk of Heliopolis". </li><li>Mnemonics: Hnmmt.</li></ul>',
N9:'<canvas class="res">N9</canvas> N9: moon with lower half obscured.<ul><li>Log. or det. <span class="egytransl">psDntjw</span>, "New-moon festival". </li><li>Phon. <span class="egytransl">psD</span>. </li><li>Mnemonics: pzD.</li></ul>',
N10:'<canvas class="res">N10</canvas> N10: moon with lower section obscured.<ul><li> Use as <canvas class="res">N9</canvas> N9. </li></ul>',
N11:'<canvas class="res">N11</canvas> N11: crescent moon.<ul><li>Log. or det. <span class="egytransl">jaH</span>, "moon". </li><li>Phon. or phon. det. <span class="egytransl">waH</span>. </li><li><canvas class="res">N11:[fit]N14</canvas> Log. <span class="egytransl">Abd</span>, "month". </li><li>Log. <span class="egytransl">Abd</span>, "month". </li><li>Log. <span class="egytransl">sSp</span>, "palm". </li><li> Use as <canvas class="res">F42</canvas> F42. </li><li>Mnemonics: Abd, iaH.</li></ul>',
N12:'<canvas class="res">N12</canvas> N12: crescent moon.<ul><li>Log. or det. <span class="egytransl">jaH</span>, "moon". </li><li>Do not confuse with: <canvas class="res">F42</canvas> F42. </li></ul>',
N13:'<canvas class="res">N13</canvas> N13: combination of <canvas class="res">N11</canvas> N11 and <canvas class="res">N14</canvas> N14.<ul><li>Log. * <span class="egytransl">smdt</span>, "half-month festival". </li></ul>',
N14:'<canvas class="res">N14</canvas> N14: star.<ul><li>Log. or det. <span class="egytransl">sbA</span>, "star". </li><li>Phon. <span class="egytransl">sbA</span>. </li><li>Det. star, time. </li><li>Phon. or phon. det. <span class="egytransl">dwA</span>. </li><li>Log. or det. <span class="egytransl">wnwt</span>, "hour". </li><li>Mnemonics: sbA, dwA.</li></ul>',
N15:'<canvas class="res">N15</canvas> N15: star in circle.<ul><li>Log. or det. <span class="egytransl">dwAt</span>, "netherworld". </li><li>Mnemonics: dwAt.</li></ul>',
N16:'<canvas class="res">N16</canvas> N16: land with grains.<ul><li>Log. <span class="egytransl">tA</span>, "earth", "land". </li><li>Phon. <span class="egytransl">tA</span>. </li><li>(group-writing) <canvas class="res">N16:N21*Z1</canvas> Phon. <span class="egytransl">t</span>. </li><li>Det. land, eternity. </li><li>Mnemonics: tA.</li></ul>',
N17:'<canvas class="res">N17</canvas> N17: land.<ul><li> Use as <canvas class="res">N16</canvas> N16. </li></ul>',
N18:'<canvas class="res">N18</canvas> N18: sandy tract.<ul><li>Log. <span class="egytransl">jw</span>, "island". </li><li>(group-writing) <canvas class="res">N18:N21*Z1</canvas> Phon. <span class="egytransl">j</span>. </li><li>Det. desert, foreign land. </li><li><canvas class="res">insert[te](G9*.,N18:[fix,sep=0.5]N18)</canvas> Log. <span class="egytransl">^Hr-Axtj</span>, "Harakhti". </li><li>Do not confuse with: <canvas class="res">S26a</canvas> S26a, <canvas class="res">X4b</canvas> X4b, <canvas class="res">Z8</canvas> Z8. </li><li>Mnemonics: iw.</li></ul>',
N18a:'<canvas class="res">N18a</canvas> N18a: combination of <canvas class="res">N18</canvas> N18 and <canvas class="res">N35</canvas> N35.<ul><li>Log. <span class="egytransl">^jmn</span>, "Amun". </li><li>Phon. <span class="egytransl">n</span>. </li></ul>',
N18b:'<canvas class="res">N18b</canvas> N18b: combination of <canvas class="res">X4b</canvas> X4b and <canvas class="res">O34</canvas> O34.<ul><li>Phon. <span class="egytransl">Sns</span>. </li></ul>',
N19:'<canvas class="res">N19</canvas> N19: two sandy tracts.<ul><li> Use as 2* <canvas class="res">N18</canvas> N18. </li></ul>',
N20:'<canvas class="res">N20</canvas> N20: tongue of land.<ul><li>Log. or det. <span class="egytransl">wDb</span>, "sandbank". </li><li>Phon. <span class="egytransl">wDb</span>. </li><li>Mnemonics: wDb.</li></ul>',
N21:'<canvas class="res">N21</canvas> N21: short tongue of land.<ul><li>Log. or det. <span class="egytransl">jdb</span>, "land". </li><li>Det. land. </li><li> Use as <canvas class="res">N23</canvas> N23. </li></ul>',
N22:'<canvas class="res">N22</canvas> N22: broad tongue of land.<ul><li> Use as <canvas class="res">N20</canvas> N20. </li><li>Det. land. </li></ul>',
N23:'<canvas class="res">N23</canvas> N23: irrigation canal.<ul><li>Det. irrigated land. </li><li><canvas class="res">N5:N23</canvas> Det. time. </li></ul>',
N24:'<canvas class="res">N24</canvas> N24: irrigation canal system.<ul><li>Log. or det. <span class="egytransl">spAt</span>, "district". </li><li>Det. province. </li><li>Det. garden. </li><li>Mnemonics: spAt.</li></ul>',
N25:'<canvas class="res">N25</canvas> N25: three hills.<ul><li>Log. or det. <span class="egytransl">xAst</span>, "foreign land". </li><li>Det. desert, foreign land. </li><li><canvas class="res">N25:R12</canvas> Log. <span class="egytransl">^HA</span>, "Ha". </li><li>Mnemonics: xAst.</li></ul>',
N25a:'<canvas class="res">N25a</canvas> N25a: three hills (low).<ul><li> Use as <canvas class="res">N25</canvas> N25. </li></ul>',
N26:'<canvas class="res">N26</canvas> N26: two hills.<ul><li>Log. <span class="egytransl">Dw</span>, "mountain". </li><li>Phon. <span class="egytransl">Dw</span>. </li><li>Mnemonics: Dw.</li></ul>',
N27:'<canvas class="res">N27</canvas> N27: sun over mountain.<ul><li>Log. <span class="egytransl">Axt</span>, "horizon". </li><li>Mnemonics: Axt.</li></ul>',
N28:'<canvas class="res">N28</canvas> N28: rays of sun over hill.<ul><li>Log. <span class="egytransl">xa</span>, "hill". </li><li>Phon. <span class="egytransl">xa</span>. </li><li>Mnemonics: xa.</li></ul>',
N29:'<canvas class="res">N29</canvas> N29: slope of hill.<ul><li>Log. or det. <span class="egytransl">qAA</span>, "hill". </li><li>Phon. <span class="egytransl">q</span>. </li><li>Do not confuse with: <canvas class="res">X7</canvas> X7. </li><li>Mnemonics: q.</li></ul>',
N30:'<canvas class="res">N30</canvas> N30: mound of earth.<ul><li>Log. or det. <span class="egytransl">jAt</span>, "mound". </li><li>Mnemonics: iAt.</li></ul>',
N31:'<canvas class="res">N31</canvas> N31: road with shrubs.<ul><li>Log. or det. <span class="egytransl">wAt</span>, "road". </li><li>Det. road, travel, position. </li><li><canvas class="res">W25*N31</canvas> Log. <span class="egytransl">^jnj-Hrt</span>, "Onuris". </li><li>Log. <span class="egytransl">Hrw</span>, "besides". </li><li>Log. <span class="egytransl">wA</span>, "fall". </li><li>Log. <span class="egytransl">^Hr</span>, "Horus". </li></ul>',
N32:'<canvas class="res">N32</canvas> N32: lump of clay.<ul><li>Phon. det. <span class="egytransl">sjn</span>. </li><li> Use as <canvas class="res">F52</canvas> F52. </li></ul>',
N33:'<canvas class="res">N33</canvas> N33: grain.<ul><li>Det. sand, metal, mineral, medicin. </li><li> Use as <canvas class="res">A14</canvas> A14. </li><li><canvas class="res">N33*N33*N33</canvas>  Use as 3* <canvas class="res">Z1</canvas> Z1. </li><li>Do not confuse with: <canvas class="res">D12</canvas> D12, <canvas class="res">D67</canvas> D67, <canvas class="res">N5</canvas> N5, <canvas class="res">S21</canvas> S21, <canvas class="res">Z13</canvas> Z13. </li></ul>',
N33a:'<canvas class="res">N33a</canvas> N33a: three grains.<ul><li> Use as 3* <canvas class="res">N33</canvas> N33. </li></ul>',
N34:'<canvas class="res">N34</canvas> N34: ingot of metal.<ul><li>Log. * <span class="egytransl">Hmtj</span>, "copper". </li><li>Det. copper, bronze. </li></ul>',
N34a:'<canvas class="res">N34a</canvas> N34a: ingot of metal.<ul><li> Use as <canvas class="res">N34</canvas> N34. </li></ul>',
N35:'<canvas class="res">N35</canvas> N35: ripple of water.<ul><li>Log. <span class="egytransl">nt</span>, "water". </li><li>Phon. <span class="egytransl">n</span>. </li><li>(group-writing) <canvas class="res">N35:G1</canvas> , <canvas class="res">N35:U19:[fit]W24</canvas> , <canvas class="res">N35:Z2</canvas> Phon. <span class="egytransl">n</span>. </li><li>(group-writing) <canvas class="res">N35:Z2-E23:Z1</canvas> , <canvas class="res">N35:Z2-D21:Z1</canvas> Phon. <span class="egytransl">l</span>. </li><li> Use as <canvas class="res">N17</canvas> N17. </li><li><canvas class="res">N35:N35:N35</canvas> Log. <span class="egytransl">mw</span>, "water". </li><li><canvas class="res">N35:N35:N35</canvas> Phon. <span class="egytransl">mw</span>. </li><li>(group-writing) <canvas class="res">N35:N35:N35</canvas> Phon. <span class="egytransl">m</span>. </li><li><canvas class="res">N35:N35:N35</canvas> Det. water, liquid and associated actions. </li><li><canvas class="res">N35a-N36:N23</canvas> , <canvas class="res">N35a-N36</canvas> Det. river, lake, sea. </li><li>Mnemonics: n.</li></ul>',
N35a:'<canvas class="res">N35a</canvas> N35a: three ripples of water.<ul><li> Use as 3* <canvas class="res">N35</canvas> N35. </li><li>Mnemonics: mw.</li></ul>',
N36:'<canvas class="res">N36</canvas> N36: canal.<ul><li>Log. or det. <span class="egytransl">mr</span>, "canal". </li><li>Phon. or phon. det. <span class="egytransl">mr</span>. </li><li>Phon. <span class="egytransl">mj</span>. </li><li>Det. river, lake, sea. </li></ul>',
N37:'<canvas class="res">N37</canvas> N37: pool.<ul><li>Log. <span class="egytransl">S</span>, "pool". </li><li>Phon. <span class="egytransl">S</span>. </li><li> Use as <canvas class="res">N36</canvas> N36. </li><li>Do not confuse with: <canvas class="res">O39</canvas> O39, <canvas class="res">Aa12</canvas> Aa12. </li><li>Mnemonics: S.</li></ul>',
N37a:'<canvas class="res">N37a</canvas> N37a: pool.<ul><li> Use as <canvas class="res">N37</canvas> N37. </li><li>Do not confuse with: <canvas class="res">S26b</canvas> S26b. </li></ul>',
N38:'<canvas class="res">N38</canvas> N38: deep pool.<ul><li> Use as <canvas class="res">N37</canvas> N37. </li></ul>',
N39:'<canvas class="res">N39</canvas> N39: pool with water.<ul><li> Use as <canvas class="res">N37</canvas> N37. </li></ul>',
N40:'<canvas class="res">N40</canvas> N40: combination of <canvas class="res">N37</canvas> N37 and <canvas class="res">D54</canvas> D54.<ul><li>Log. <span class="egytransl">Sm</span>, "go". Ex. <canvas class="res">N40*G17-D54</canvas> . </li><li>Mnemonics: Sm.</li></ul>',
N41:'<canvas class="res">N41</canvas> N41: well with ripple of water.<ul><li>Det. well, pool, marsh. </li><li>Phon. <span class="egytransl">Hm</span>. </li><li>Log. or det. <span class="egytransl">jdt</span>, "* uterus". </li><li>Phon. <span class="egytransl">bjA</span>. </li><li><canvas class="res">N41*N41:[size=inf]N41</canvas> Log. or det. <span class="egytransl">pHww</span>, "ends". </li><li>Do not confuse with: <canvas class="res">V37</canvas> V37. </li><li>Mnemonics: id.</li></ul>',
N42:'<canvas class="res">N42</canvas> N42: well with line of water.<ul><li> Use as <canvas class="res">N41</canvas> N41. </li></ul>',
NL1:'<canvas class="res">NL1</canvas> NL1: sign of first nome of Lower Egypt.<ul><li>Log. <span class="egytransl">^jnbw-HD</span>, "Inbuhedi (first nome of Lower Egypt)". </li></ul>',
NL2:'<canvas class="res">NL2</canvas> NL2: sign of second nome of Lower Egypt.<ul><li>Log. <span class="egytransl">^xpS</span>, "Khepesh (second nome of Lower Egypt)". </li></ul>',
NL3:'<canvas class="res">NL3</canvas> NL3: sign of third nome of Lower Egypt.<ul><li>Log. <span class="egytransl">^jmntt</span>, "Imenti (third nome of Lower Egypt)". </li></ul>',
NL4:'<canvas class="res">NL4</canvas> NL4: sign of fourth nome of Lower Egypt.<ul><li>Log. <span class="egytransl">^nrt-rst</span>, "southern Neret (fourth nome of Lower Egypt)". </li></ul>',
NL5:'<canvas class="res">NL5</canvas> NL5: sign of fifth nome of Lower Egypt.<ul><li>Log. <span class="egytransl">^nrt-mHtt</span>, "northern Neret (fifth nome of Lower Egypt)". </li></ul>',
NL5a:'<canvas class="res">NL5a</canvas> NL5a: sign of fifth nome of Lower Egypt.<ul><li> Use as <canvas class="res">NL5</canvas> NL5. </li></ul>',
NL6:'<canvas class="res">NL6</canvas> NL6: sign of sixth nome of Lower Egypt.<ul><li>Log. <span class="egytransl">^xAsww</span>, "Khasu (sixth nome of Lower Egypt)". </li></ul>',
NL7:'<canvas class="res">NL7</canvas> NL7: sign of seventh nome of Lower Egypt.<ul><li>Log. <span class="egytransl">^Hwj-jmntj</span>, "Hui-imenti (seventh nome of Lower Egypt)". </li></ul>',
NL8:'<canvas class="res">NL8</canvas> NL8: sign of eighth nome of Lower Egypt.<ul><li>Log. <span class="egytransl">^Hwj-jAbtj</span>, "Hui-jabtj (eighth nome of Lower Egypt)". </li></ul>',
NL9:'<canvas class="res">NL9</canvas> NL9: sign of ninth nome of Lower Egypt.<ul><li>Log. <span class="egytransl">^anDtj</span>, "Anedjiti (ninth nome of Lower Egypt)". </li></ul>',
NL10:'<canvas class="res">NL10</canvas> NL10: sign of tenth nome of Lower Egypt.<ul><li>Log. <span class="egytransl">^km-wr</span>, "Kem-wer (tenth nome of Lower Egypt)". </li></ul>',
NL11:'<canvas class="res">NL11</canvas> NL11: sign of eleventh nome of Lower Egypt.<ul><li>Log. <span class="egytransl">^Hsbw</span>, "Hesbu (eleventh nome of Lower Egypt)". </li></ul>',
NL12:'<canvas class="res">NL12</canvas> NL12: sign of twelfth nome of Lower Egypt.<ul><li>Log. <span class="egytransl">^Tb-nTr</span>, "Tjeb-netjer (twelfth nome of Lower Egypt)". </li></ul>',
NL13:'<canvas class="res">NL13</canvas> NL13: sign of thirteenth nome of Lower Egypt.<ul><li>Log. <span class="egytransl">^HqA-anDw</span>, "Heqa-ondju (thirteenth nome of Lower Egypt)". </li></ul>',
NL14:'<canvas class="res">NL14</canvas> NL14: sign of fourteenth nome of Lower Egypt.<ul><li>Log. <span class="egytransl">^xntj-jAbtj</span>, "Khenti-abt (fourteenth nome of Lower Egypt)". </li></ul>',
NL15:'<canvas class="res">NL15</canvas> NL15: sign of fifteenth nome of Lower Egypt.<ul><li>Log. <span class="egytransl">^DHwtj</span>, "Djehuti (fifteenth nome of Lower Egypt)". </li></ul>',
NL16:'<canvas class="res">NL16</canvas> NL16: sign of sixteenth nome of Lower Egypt.<ul><li>Log. <span class="egytransl">^HAt-mHjt</span>, "Hat-mehit (sixteenth nome of Lower Egypt)". </li></ul>',
NL17:'<canvas class="res">NL17</canvas> NL17: sign of seventeenth nome of Lower Egypt.<ul><li>Log. <span class="egytransl">^smA-bHdt</span>, "Sema-Behdet (seventeenth nome of Lower Egypt)". </li></ul>',
NL17a:'<canvas class="res">NL17a</canvas> NL17a: sign of seventeenth nome of Lower Egypt.<ul><li> Use as <canvas class="res">NL17</canvas> NL17. </li></ul>',
NL18:'<canvas class="res">NL18</canvas> NL18: sign of eighteenth nome of Lower Egypt.<ul><li>Log. <span class="egytransl">^jmt-xnt</span>, "southern Imet (eighteenth nome of Lower Egypt)". </li></ul>',
NL19:'<canvas class="res">NL19</canvas> NL19: sign of nineteenth nome of Lower Egypt.<ul><li>Log. <span class="egytransl">^jmt-pH</span>, "northern Imet (nineteenth nome of Lower Egypt)". </li></ul>',
NL20:'<canvas class="res">NL20</canvas> NL20: sign of twentieth nome of Lower Egypt.<ul><li>Log. <span class="egytransl">^spd</span>, "Sopdu (twentieth nome of Lower Egypt)". </li></ul>',
NU1:'<canvas class="res">NU1</canvas> NU1: sign of first nome of Upper Egypt.<ul><li>Log. <span class="egytransl">^tA-stj</span>, "Taseti (first nome of Upper Egypt)". </li></ul>',
NU2:'<canvas class="res">NU2</canvas> NU2: sign of second nome of Upper Egypt.<ul><li>Log. <span class="egytransl">^wTs-^Hr</span>, "Wetjes-Hor (second nome of Upper Egypt)". </li></ul>',
NU3:'<canvas class="res">NU3</canvas> NU3: sign of third nome of Upper Egypt.<ul><li>Log. <span class="egytransl">^nxn</span>, "Nekhen (third nome of Upper Egypt)". </li></ul>',
NU4:'<canvas class="res">NU4</canvas> NU4: sign of fourth nome of Upper Egypt.<ul><li>Log. <span class="egytransl">^wAst</span>, "Waset (fourth nome of Upper Egypt)". </li></ul>',
NU5:'<canvas class="res">NU5</canvas> NU5: sign of fifth nome of Upper Egypt.<ul><li>Log. <span class="egytransl">^nTrwj</span>, "Netjerui (fifth nome of Upper Egypt)". </li></ul>',
NU6:'<canvas class="res">NU6</canvas> NU6: sign of sixth nome of Upper Egypt.<ul><li>Log. <span class="egytransl">^jqr</span>, "Iqer (sixth nome of Upper Egypt)". </li></ul>',
NU7:'<canvas class="res">NU7</canvas> NU7: sign of seventh nome of Upper Egypt.<ul><li>Log. <span class="egytransl">^bAt</span>, "Bat (seventh nome of Upper Egypt)". </li></ul>',
NU8:'<canvas class="res">NU8</canvas> NU8: sign of eighth nome of Upper Egypt.<ul><li>Log. <span class="egytransl">^tA-wr</span>, "Tawer (eighth nome of Upper Egypt)". </li></ul>',
NU9:'<canvas class="res">NU9</canvas> NU9: sign of ninth nome of Upper Egypt.<ul><li>Log. <span class="egytransl">^mnw</span>, "Menu (ninth nome of Upper Egypt)". </li></ul>',
NU10:'<canvas class="res">NU10</canvas> NU10: sign of tenth nome of Upper Egypt.<ul><li>Log. <span class="egytransl">^wADyt</span>, "Wadjit (tenth nome of Upper Egypt)". </li></ul>',
NU10a:'<canvas class="res">NU10a</canvas> NU10a: sign of tenth nome of Upper Egypt.<ul><li> Use as <canvas class="res">NU10</canvas> NU10. </li></ul>',
NU11:'<canvas class="res">NU11</canvas> NU11: sign of eleventh nome of Upper Egypt.<ul><li>Log. <span class="egytransl">^SA</span>, "Sha (eleventh nome of Upper Egypt)". </li></ul>',
NU11a:'<canvas class="res">NU11a</canvas> NU11a: sign of eleventh nome of Upper Egypt.<ul><li> Use as <canvas class="res">NU11</canvas> NU11. </li></ul>',
NU12:'<canvas class="res">NU12</canvas> NU12: sign of twelfth nome of Upper Egypt.<ul><li>Log. <span class="egytransl">^Atft</span>, "Atfet (twelfth nome of Upper Egypt)". </li></ul>',
NU13:'<canvas class="res">NU13</canvas> NU13: sign of thirteenth nome of Upper Egypt.<ul><li>Log. <span class="egytransl">^nDft-xntt</span>, "southern Nedjfit (thirteenth nome of Upper Egypt)". </li></ul>',
NU14:'<canvas class="res">NU14</canvas> NU14: sign of fourteenth nome of Upper Egypt.<ul><li>Log. <span class="egytransl">^nDft-pHt</span>, "northern Nedjfit (fourteenth nome of Upper Egypt)". </li></ul>',
NU15:'<canvas class="res">NU15</canvas> NU15: sign of fifteenth nome of Upper Egypt.<ul><li>Log. <span class="egytransl">^wnt</span>, "Unet (fifteenth nome of Upper Egypt)". </li></ul>',
NU16:'<canvas class="res">NU16</canvas> NU16: sign of sixteenth nome of Upper Egypt.<ul><li>Log. <span class="egytransl">^mA-HD</span>, "Ma-hedi (sixteenth nome of Upper Egypt)". </li></ul>',
NU17:'<canvas class="res">NU17</canvas> NU17: sign of seventeenth nome of Upper Egypt.<ul><li>Log. <span class="egytransl">^jnpwt</span>, "Input (seventeenth nome of Upper Egypt)". </li></ul>',
NU18:'<canvas class="res">NU18</canvas> NU18: sign of eighteenth nome of Upper Egypt.<ul><li>Log. <span class="egytransl">^nmtj</span>, "Nemti (eighteenth nome of Upper Egypt)". </li></ul>',
NU18a:'<canvas class="res">NU18a</canvas> NU18a: sign of eighteenth nome of Upper Egypt.<ul><li> Use as <canvas class="res">NU18</canvas> NU18. </li></ul>',
NU19:'<canvas class="res">NU19</canvas> NU19: sign of nineteenth nome of Upper Egypt.<ul><li>Log. <span class="egytransl">^wAbwj</span>, "Wabui (nineteenth nome of Upper Egypt)". </li></ul>',
NU20:'<canvas class="res">NU20</canvas> NU20: sign of twentieth nome of Upper Egypt.<ul><li>Log. <span class="egytransl">^nart-xntt</span>, "southern Noret (twentieth nome of Upper Egypt)". </li></ul>',
NU21:'<canvas class="res">NU21</canvas> NU21: sign of twenty-first nome of Upper Egypt.<ul><li>Log. <span class="egytransl">^nart-pHt</span>, "northern Noret (twenty-first nome of Upper Egypt)". </li></ul>',
NU22:'<canvas class="res">NU22</canvas> NU22: sign of twenty-second nome of Upper Egypt.<ul><li>Log. <span class="egytransl">^mdnjt</span>, "Medenit (twenty-second nome of Upper Egypt)". </li></ul>',
NU22a:'<canvas class="res">NU22a</canvas> NU22a: sign of second nome of Upper Egypt.<ul><li> Use as <canvas class="res">NU22</canvas> NU22. </li></ul>',
O1:'<canvas class="res">O1</canvas> O1: house.<ul><li>Log. <span class="egytransl">pr</span>, "house". </li><li>Phon. <span class="egytransl">pr</span>. </li><li>Det. building, seat, place. </li><li>Mnemonics: pr.</li></ul>',
O1a:'<canvas class="res">O1a</canvas> O1a: combination of <canvas class="res">O1</canvas> O1 and <canvas class="res">S34</canvas> S34.<ul><li>Log. <span class="egytransl">pr-anx</span>, "temple scriptorium". </li></ul>',
O2:'<canvas class="res">O2</canvas> O2: combination of <canvas class="res">O1</canvas> O1 and <canvas class="res">T3</canvas> T3.<ul><li>Log. <span class="egytransl">pr-HD</span>, "treasury". </li></ul>',
O3:'<canvas class="res">O3</canvas> O3: combination of <canvas class="res">O1</canvas> O1, <canvas class="res">P8</canvas> P8, <canvas class="res">X3</canvas> X3, and <canvas class="res">W22</canvas> W22 .<ul><li>Log. <span class="egytransl">prt-r-xrw</span>, "invocation offerings". </li></ul>',
O4:'<canvas class="res">O4</canvas> O4: shelter.<ul><li>Log. <span class="egytransl">h</span>, "grounds". </li><li>Phon. <span class="egytransl">h</span>. </li><li>Mnemonics: h.</li></ul>',
O5:'<canvas class="res">O5</canvas> O5: winding wall from upper-left corner.<ul><li>Det. <span class="egytransl">mrrt</span>, "street". Ex. <canvas class="res">mr-r:r-t:O5-pr</canvas> . </li><li>Phon. or phon. det. <span class="egytransl">mr</span>. </li><li>Phon. or phon. det. <span class="egytransl">nm</span>. </li></ul>',
O5a:'<canvas class="res">O5a</canvas> O5a: winding wall from lower-left corner.<ul><li> Use as <canvas class="res">O5</canvas> O5. </li></ul>',
O6:'<canvas class="res">O6</canvas> O6: enclosure.<ul><li>Log. <span class="egytransl">Hwt</span>, "(large) building". </li><li>Log. <span class="egytransl">Htt</span>, "quary". </li><li>Mnemonics: Hwt.</li></ul>',
O6a:'<canvas class="res">O6a</canvas> O6a: opening of <span class="egytransl">Hwt</span>-enclosure.<ul><li>Typ. opening of <span class="egytransl">Hwt</span> enclosure. </li></ul>',
O6b:'<canvas class="res">O6b</canvas> O6b: opening of <span class="egytransl">Hwt</span>-enclosure.<ul><li>Typ. opening of <span class="egytransl">Hwt</span> enclosure. </li></ul>',
O6c:'<canvas class="res">O6c</canvas> O6c: opening of <span class="egytransl">Hwt</span>-enclosure.<ul><li>Typ. opening of <span class="egytransl">Hwt</span> enclosure. </li></ul>',
O6d:'<canvas class="res">O6d</canvas> O6d: closing of <span class="egytransl">Hwt</span>-enclosure.<ul><li>Typ. closing of <span class="egytransl">Hwt</span> enclosure. </li></ul>',
O6e:'<canvas class="res">O6e</canvas> O6e: closing of <span class="egytransl">Hwt</span>-enclosure.<ul><li>Typ. closing of <span class="egytransl">Hwt</span> enclosure. </li></ul>',
O6f:'<canvas class="res">O6f</canvas> O6f: closing of <span class="egytransl">Hwt</span>-enclosure.<ul><li>Typ. closing of <span class="egytransl">Hwt</span> enclosure. </li></ul>',
O7:'<canvas class="res">O7</canvas> O7: combination of <canvas class="res">O6</canvas> O6 and <canvas class="res">X1</canvas> X1.<ul><li> Use as <canvas class="res">O6</canvas> O6. </li></ul>',
O8:'<canvas class="res">O8</canvas> O8: combination of <canvas class="res">O7</canvas> O7 and <canvas class="res">O29</canvas> O29.<ul><li>Log. <span class="egytransl">Hwt-aAt</span>, "large building". </li></ul>',
O9:'<canvas class="res">O9</canvas> O9: combination of <canvas class="res">O7</canvas> O7 and <canvas class="res">V30</canvas> V30.<ul><li>Log. <span class="egytransl">^nbt-Hwt</span>, "Nephthys". </li></ul>',
O10:'<canvas class="res">O10</canvas> O10: combination of <canvas class="res">O6</canvas> O6 and <canvas class="res">G5</canvas> G5.<ul><li>Log. <span class="egytransl">^Hwt-^Hr</span>, "Hathor". </li></ul>',
O10a:'<canvas class="res">O10a</canvas> O10a: combination of <canvas class="res">O6</canvas> O6 and <canvas class="res">S34</canvas> S34.<ul><li>Log. <span class="egytransl">Hwt-anx</span>, "royal living quarters". </li></ul>',
O10b:'<canvas class="res">O10b</canvas> O10b: combination of <canvas class="res">O6</canvas> O6 and <canvas class="res">L2</canvas> L2.<ul><li>Log. <span class="egytransl">Hwt-bjtj</span>, "house of the king of Lower Egypt". </li></ul>',
O10c:'<canvas class="res">O10c</canvas> O10c: combination of <canvas class="res">O18</canvas> O18 and <canvas class="res">D2</canvas> D2.<ul><li>Log. * <span class="egytransl">Hwt-Hr</span>, "Hut-her". Ex. <canvas class="res">O10c-Aa1:[fit]D40:.</canvas> , <span class="egytransl">Hwt-Hr-nxt</span>, "Hut-her-nekhet". </li><li> Or perhaps <span class="egytransl">Hr</span>. </li></ul>',
O11:'<canvas class="res">O11</canvas> O11: palace.<ul><li>Log. <span class="egytransl">aH</span>, "palace". </li><li>Mnemonics: aH.</li></ul>',
O12:'<canvas class="res">O12</canvas> O12: combination of <canvas class="res">O11</canvas> O11 and <canvas class="res">D36</canvas> D36.<ul><li> Use as <canvas class="res">O11</canvas> O11. </li></ul>',
O13:'<canvas class="res">O13</canvas> O13: battlemented enclosure.<ul><li>Log. or det. <span class="egytransl">sbxt</span>, "gateway". </li></ul>',
O14:'<canvas class="res">O14</canvas> O14: part of battlemented enclosure.<ul><li> Use as <canvas class="res">O13</canvas> O13. </li></ul>',
O15:'<canvas class="res">O15</canvas> O15: enclosure with <canvas class="res">W10</canvas> W10 and <canvas class="res">X1</canvas> X1.<ul><li>Log. <span class="egytransl">wsxt</span>, "hall". </li><li>Mnemonics: wsxt.</li></ul>',
O16:'<canvas class="res">O16</canvas> O16: gateway with serpents.<ul><li>Log. or det. <span class="egytransl">tA</span>, "door (in temple)". </li><li>Log. <span class="egytransl">tAytj</span>, "he of the door (title)". </li><li> Use as <canvas class="res">S22</canvas> S22 [Log. or det. <span class="egytransl">tA-wr</span>, "larboard"]. </li></ul>',
O17:'<canvas class="res">O17</canvas> O17: open gateway with serpents.<ul><li> Use as <canvas class="res">O16</canvas> O16. </li></ul>',
O18:'<canvas class="res">O18</canvas> O18: shrine in profile.<ul><li>Log. or det. <span class="egytransl">kAr</span>, "chapel". </li><li>Mnemonics: kAr.</li></ul>',
O19:'<canvas class="res">O19</canvas> O19: shrine with fence.<ul><li>Det. shrine. </li></ul>',
O19a:'<canvas class="res">O19a</canvas> O19a: shrine.<ul><li> Use as <canvas class="res">O19</canvas> O19. </li></ul>',
O20:'<canvas class="res">O20</canvas> O20: shrine.<ul><li>Det. sanctuary. </li></ul>',
O20a:'<canvas class="res">O20a</canvas> O20a: shrine.<ul><li> Use as <canvas class="res">O20</canvas> O20. </li></ul>',
O21:'<canvas class="res">O21</canvas> O21: fa&ccedil;ade of shrine.<ul><li>Log. or det. <span class="egytransl">sH</span>, "booth". </li></ul>',
O22:'<canvas class="res">O22</canvas> O22: booth with pole.<ul><li>Log. or det. <span class="egytransl">sH</span>, "booth". </li><li>Phon. det. <span class="egytransl">sH</span>. </li><li>Phon. <span class="egytransl">HAb</span>. </li><li>Mnemonics: zH.</li></ul>',
O23:'<canvas class="res">O23</canvas> O23: double platform.<ul><li>Log. or det. <span class="egytransl">Hd-sd</span>, "Sed festival". </li></ul>',
O24:'<canvas class="res">O24</canvas> O24: pyramid.<ul><li>Log. or det. <span class="egytransl">mr</span>, "pyramid". </li><li>Det. pyramid. </li></ul>',
O24a:'<canvas class="res">O24a</canvas> O24a: pedestal of sun temple.<ul><li>Det. in names of sun-obelisks. </li></ul>',
O25:'<canvas class="res">O25</canvas> O25: obelisk.<ul><li>Log. or det. <span class="egytransl">txn</span>, "obelisk". </li><li>Mnemonics: txn.</li></ul>',
O25a:'<canvas class="res">O25a</canvas> O25a: obelisk and pedestal of sun temple.<ul><li> Use as <canvas class="res">O24a</canvas> O24a. </li></ul>',
O26:'<canvas class="res">O26</canvas> O26: stela.<ul><li>Log. or det. <span class="egytransl">wD</span>, "stela". </li><li>Det. stela. </li></ul>',
O27:'<canvas class="res">O27</canvas> O27: hall of columns.<ul><li>Det. hall of columns. </li><li>Phon. or phon. det. <span class="egytransl">xA</span>. </li></ul>',
O28:'<canvas class="res">O28</canvas> O28: column.<ul><li>Log. <span class="egytransl">jwn</span>, "column". </li><li>Phon. <span class="egytransl">jwn</span>. </li><li>Mnemonics: iwn.</li></ul>',
O29:'<canvas class="res">O29</canvas> O29: horizontal wooden column.<ul><li>Log. <span class="egytransl">aA</span>, "column". </li><li>Phon. <span class="egytransl">aA</span>. </li><li>(group-writing) <canvas class="res">O29:D36</canvas> , <canvas class="res">O29</canvas> Phon. <span class="egytransl">a</span>. </li><li>Mnemonics: aA.</li></ul>',
O29a:'<canvas class="res">O29a</canvas> O29a: vertical wooden column.<ul><li> Use as <canvas class="res">O29</canvas> O29. </li></ul>',
O30:'<canvas class="res">O30</canvas> O30: support.<ul><li>Log. or det. <span class="egytransl">sxnt</span>, "support". </li><li><canvas class="res">O30*[sep=0.0]O30*[sep=0.0]O30*[sep=0.0]O30</canvas> Log. or det. <span class="egytransl">sxnwt</span>, "the four support (of the sky)". </li><li>Do not confuse with: <canvas class="res">U42</canvas> U42. </li><li>Mnemonics: zxnt.</li></ul>',
O30a:'<canvas class="res">O30a</canvas> O30a: four supports.<ul><li> Use as 4* <canvas class="res">O30</canvas> O30. </li></ul>',
O31:'<canvas class="res">O31</canvas> O31: door.<ul><li>Log. or det. <span class="egytransl">aA</span>, "door". </li><li>Phon. <span class="egytransl">aA</span>. </li><li>Det. open. </li></ul>',
O32:'<canvas class="res">O32</canvas> O32: gateway.<ul><li>Log. or det. <span class="egytransl">sbA</span>, "door". </li><li>Det. door, gateway. </li></ul>',
O33:'<canvas class="res">O33</canvas> O33: fa&ccedil;ade of palace.<ul><li>Log. or det. <span class="egytransl">srx</span>, "banner". </li></ul>',
O33a:'<canvas class="res">O33a</canvas> O33a: closing of <span class="egytransl">srx</span>-enclosure.<ul><li>Typ. closing of <span class="egytransl">srx</span> enclosure. </li></ul>',
O34:'<canvas class="res">O34</canvas> O34: bolt.<ul><li>Log. <span class="egytransl">s</span>, "bolt". </li><li>Phon. <span class="egytransl">s</span>. </li><li> Use as <canvas class="res">R22</canvas> R22 [Log. <span class="egytransl">^xm</span>, "Ausim"]. </li><li>Do not confuse with: <canvas class="res">S24</canvas> S24. </li><li>Mnemonics: z.</li></ul>',
O35:'<canvas class="res">O35</canvas> O35: combination of <canvas class="res">O34</canvas> O34 and <canvas class="res">D54</canvas> D54.<ul><li>Log. <span class="egytransl">sbj</span>, "go". </li><li>Log. <span class="egytransl">sbj</span>, "perish". Ex. <canvas class="res">O35-D54</canvas> . </li><li>Log. <span class="egytransl">ms</span>, "bring". Ex. <canvas class="res">G17-O35-D54</canvas> . </li><li>Log. <span class="egytransl">js</span>, "go!". Ex. <canvas class="res">M17-O35</canvas> . </li><li>Log. <span class="egytransl">sj</span>, "who?". Ex. <canvas class="res">O35-M17*M17</canvas> , <canvas class="res">O35-S29</canvas> . </li><li>Mnemonics: zb.</li></ul>',
O36:'<canvas class="res">O36</canvas> O36: wall.<ul><li>Log. or det. <span class="egytransl">jnb</span>, "wall". </li><li>Det. wall. </li><li>Mnemonics: inb.</li></ul>',
O36a:'<canvas class="res">O36a</canvas> O36a: opening of oval fortified wall enclosure.<ul><li>Typ. opening of fortified wall cartouche. </li></ul>',
O36b:'<canvas class="res">O36b</canvas> O36b: closing of oval fortified wall enclosure.<ul><li>Typ. closing of fortified wall cartouche. </li></ul>',
O36c:'<canvas class="res">O36c</canvas> O36c: opening of square fortified wall enclosure.<ul><li>Typ. opening of square fortified wall cartouche. </li></ul>',
O36d:'<canvas class="res">O36d</canvas> O36d: closure of square fortified wall enclosure.<ul><li>Typ. closing of square fortified wall cartouche. </li></ul>',
O37:'<canvas class="res">O37</canvas> O37: falling wall.<ul><li>Det. overthrow, tilt. </li></ul>',
O38:'<canvas class="res">O38</canvas> O38: corner of wall.<ul><li>Log. or det. <span class="egytransl">qnbt</span>, "corner", "court of magistrates". </li><li>Det. gate, street. </li><li>Log. or det. <span class="egytransl">tm</span>, "(part of a title)". Ex. <canvas class="res">t:tm-O38[mirror]</canvas> , <span class="egytransl">Hrj n tm</span>, "(a title)". </li></ul>',
O39:'<canvas class="res">O39</canvas> O39: stone.<ul><li>Det. stone. </li><li>Do not confuse with: <canvas class="res">N37</canvas> N37. </li></ul>',
O40:'<canvas class="res">O40</canvas> O40: stairway.<ul><li>Log. or det. <span class="egytransl">rwd</span>, "stairway". </li><li>Log. or det. <span class="egytransl">xtjw</span>, "terrace". </li><li>Det. stairway. </li></ul>',
O41:'<canvas class="res">O41</canvas> O41: double stairway.<ul><li>Det. stairway, ascent. </li></ul>',
O42:'<canvas class="res">O42</canvas> O42: fence.<ul><li>Phon. <span class="egytransl">Ssp</span>. </li><li>Phon. <span class="egytransl">sSp</span>. </li><li>Mnemonics: Szp.</li></ul>',
O43:'<canvas class="res">O43</canvas> O43: low fence.<ul><li> Use as <canvas class="res">O42</canvas> O42. </li></ul>',
O44:'<canvas class="res">O44</canvas> O44: emblem of Min.<ul><li>Log. or det. <span class="egytransl">jAwt</span>, "rank". </li></ul>',
O45:'<canvas class="res">O45</canvas> O45: domed building.<ul><li>Log. or det. <span class="egytransl">jpAt</span>, "harem". </li><li>Mnemonics: ipt.</li></ul>',
O46:'<canvas class="res">O46</canvas> O46: domed building.<ul><li> Use as <canvas class="res">O45</canvas> O45. </li></ul>',
O47:'<canvas class="res">O47</canvas> O47: enclosed mound.<ul><li>Log. <span class="egytransl">^nxn</span>, "Hieraconpolis". </li><li>Mnemonics: nxn.</li></ul>',
O48:'<canvas class="res">O48</canvas> O48: enclosed mound.<ul><li> Use as <canvas class="res">O47</canvas> O47. </li></ul>',
O49:'<canvas class="res">O49</canvas> O49: village.<ul><li>Log. <span class="egytransl">njwt</span>, "city". </li><li>Det. inhabited area. </li><li>Mnemonics: niwt.</li></ul>',
O50:'<canvas class="res">O50</canvas> O50: threshing floor.<ul><li>Log. or det. <span class="egytransl">spt</span>, "threshing floor". </li><li>Phon. <span class="egytransl">sp</span>. </li><li><canvas class="res">O50:.*Z1*Z1*.</canvas> , <canvas class="res">O50:Z4</canvas> Log. <span class="egytransl">sp sn</span>, "(two times)". </li><li><canvas class="res">O50:.*Z1*Z1*.</canvas> , <canvas class="res">O50:Z4</canvas> Typ. repetition of the preceding sequence of consonants. </li><li>Mnemonics: zp.</li></ul>',
O50a:'<canvas class="res">O50a</canvas> O50a: hieratic threshing floor.<ul><li> Use as <canvas class="res">O50</canvas> O50. </li></ul>',
O50b:'<canvas class="res">O50b</canvas> O50b: <canvas class="res">O50a</canvas> O50a reversed.<ul><li> Use as <canvas class="res">O50</canvas> O50. </li></ul>',
O51:'<canvas class="res">O51</canvas> O51: pile of grain.<ul><li>Log. or det. <span class="egytransl">Snwt</span>, "granary". </li><li>Mnemonics: Snwt.</li></ul>',
P1:'<canvas class="res">P1</canvas> P1: boat.<ul><li>Log. or det. <span class="egytransl">dpt</span>, "ship". </li><li>Log. or det. <span class="egytransl">jmw</span>, "ship". </li><li>Log. or det. <span class="egytransl">aHa</span>, "ship". </li><li>Log. or det. <span class="egytransl">qAqAw</span>, "ship". </li><li>Det. boat, ship, travel by water. </li><li>Do not confuse with: <canvas class="res">P1a</canvas> P1a. </li></ul>',
P1a:'<canvas class="res">P1a</canvas> P1a: boat upside down.<ul><li>Det. <span class="egytransl">pna</span>, "overturn". Ex. <canvas class="res">p:n:a-P1a</canvas> . </li><li>Do not confuse with: <canvas class="res">P1</canvas> P1. </li></ul>',
P2:'<canvas class="res">P2</canvas> P2: ship under sail.<ul><li>Det. <span class="egytransl">xntj</span>, "sail upstream". Ex. <canvas class="res">xnt-n:t-P2</canvas> . </li></ul>',
P3:'<canvas class="res">P3</canvas> P3: sacred barque.<ul><li>Log. or det. <span class="egytransl">wjA</span>, "sacred bark". </li><li>Det. divine boats, divine journeys. </li></ul>',
P3a:'<canvas class="res">P3a</canvas> P3a: sacred barque without steering oar.<ul><li> Use as <canvas class="res">P3</canvas> P3. </li></ul>',
P4:'<canvas class="res">P4</canvas> P4: boat with net.<ul><li>Log. <span class="egytransl">wHa</span>, "fisherman". </li><li>Mnemonics: wHa.</li></ul>',
P5:'<canvas class="res">P5</canvas> P5: sail.<ul><li>Log. or det. <span class="egytransl">TAw</span>, "breath". </li><li>Det. wind, sail. </li><li>Log. or det. <span class="egytransl">nfw</span>, "skipper". </li><li>Mnemonics: nfw, TAw.</li></ul>',
P6:'<canvas class="res">P6</canvas> P6: mast.<ul><li>Phon. <span class="egytransl">aHa</span>. </li><li>Mnemonics: aHa.</li></ul>',
P7:'<canvas class="res">P7</canvas> P7: combination of <canvas class="res">P6</canvas> P6 and <canvas class="res">D36</canvas> D36.<ul><li> Use as <canvas class="res">P6</canvas> P6. </li></ul>',
P8:'<canvas class="res">P8</canvas> P8: oar.<ul><li>Log. or det. <span class="egytransl">wsr</span>, "oar". </li><li>Log. or det. <span class="egytransl">Hpt</span>, "oar". </li><li>Det. oar. </li><li>Phon. <span class="egytransl">xrw</span>. </li><li>Mnemonics: xrw.</li></ul>',
P9:'<canvas class="res">P9</canvas> P9: combination of <canvas class="res">P8</canvas> P8 and <canvas class="res">I9</canvas> I9.<ul><li>Log. <span class="egytransl">xrwj=fj</span>, "he says". Ex. <canvas class="res">P9-.:Z4</canvas> . </li></ul>',
P10:'<canvas class="res">P10</canvas> P10: steering oar.<ul><li>Log. or det. <span class="egytransl">Hmw</span>, "steering oar". </li></ul>',
P11:'<canvas class="res">P11</canvas> P11: mooring post.<ul><li>Log. or det. <span class="egytransl">mnjt</span>, "mooring post". </li><li>Do not confuse with: <canvas class="res">D16</canvas> D16, <canvas class="res">Aa28</canvas> Aa28. </li></ul>',
Q1:'<canvas class="res">Q1</canvas> Q1: seat.<ul><li>Log. <span class="egytransl">st</span>, "seat". </li><li>Phon. <span class="egytransl">st</span>. </li><li>Phon. <span class="egytransl">ws</span>. </li><li>Phon. <span class="egytransl">As</span>. </li><li>Phon. <span class="egytransl">Htm</span>. </li><li>Mnemonics: st.</li></ul>',
Q2:'<canvas class="res">Q2</canvas> Q2: portable seat.<ul><li>Log. <span class="egytransl">st</span>, "seat". </li><li>Phon. <span class="egytransl">ws</span>. </li><li>Mnemonics: wz.</li></ul>',
Q3:'<canvas class="res">Q3</canvas> Q3: stool.<ul><li>Log. <span class="egytransl">p</span>, "base". </li><li>Phon. <span class="egytransl">p</span>. </li><li>Mnemonics: p.</li></ul>',
Q4:'<canvas class="res">Q4</canvas> Q4: head-rest.<ul><li>Log. or det. <span class="egytransl">wrs</span>, "head-rest". </li></ul>',
Q5:'<canvas class="res">Q5</canvas> Q5: chest.<ul><li>Det. box, chest. </li></ul>',
Q6:'<canvas class="res">Q6</canvas> Q6: coffin.<ul><li>Log. or det. <span class="egytransl">qrsw</span>, "coffin". </li><li>Det. burial. </li><li>Mnemonics: qrsw.</li></ul>',
Q7:'<canvas class="res">Q7</canvas> Q7: brazier.<ul><li>Det. fire, flame, cook. </li><li>Log. or det. <span class="egytransl">srf</span>, "temperature". </li><li><canvas class="res">Q7*Q7</canvas> Log. <span class="egytransl">nsrsr</span>, "Fire-Island". Ex. <canvas class="res">N18:Z1*N21-Q7*Q7-O49</canvas> , <span class="egytransl">jw nsrsr</span>, "Fire-Island". </li></ul>',
R1:'<canvas class="res">R1</canvas> R1: high table with offerings.<ul><li>Log. or det. <span class="egytransl">xAwt</span>, "table of offerings". </li><li>Mnemonics: xAwt, xAt.</li></ul>',
R2:'<canvas class="res">R2</canvas> R2: table with slices of bread.<ul><li> Use as <canvas class="res">R1</canvas> R1. </li></ul>',
R2a:'<canvas class="res">R2a</canvas> R2a: high table with offerings.<ul><li> Use as <canvas class="res">R1</canvas> R1. </li></ul>',
R3:'<canvas class="res">R3</canvas> R3: low table with offerings.<ul><li>Log. or det. <span class="egytransl">wdHw</span>, "table of offerings". </li></ul>',
R3a:'<canvas class="res">R3a</canvas> R3a: low table.<ul><li> Use as <canvas class="res">R3</canvas> R3. </li></ul>',
R3b:'<canvas class="res">R3b</canvas> R3b: low table with offerings (simplified).<ul><li> Use as <canvas class="res">R3</canvas> R3. </li></ul>',
R4:'<canvas class="res">R4</canvas> R4: loaf on mat.<ul><li>Log. <span class="egytransl">Htp</span>, "altar". </li><li>Phon. <span class="egytransl">Htp</span>. </li><li>Mnemonics: Htp.</li></ul>',
R5:'<canvas class="res">R5</canvas> R5: narrow censer.<ul><li>Log. or det. <span class="egytransl">kAp</span>, "fumigate". </li><li>Phon. <span class="egytransl">kAp</span>, <span class="egytransl">kp</span>. </li><li>Mnemonics: kAp, kp.</li></ul>',
R6:'<canvas class="res">R6</canvas> R6: broad censer.<ul><li> Use as <canvas class="res">R5</canvas> R5. </li></ul>',
R7:'<canvas class="res">R7</canvas> R7: bowl with smoke.<ul><li>Log. or det. <span class="egytransl">snTr</span>, "incense". </li><li> Use as <canvas class="res">W10a</canvas> W10a. </li><li>Mnemonics: snTr.</li></ul>',
R8:'<canvas class="res">R8</canvas> R8: cloth on pole.<ul><li>Log. <span class="egytransl">nTr</span>, "god". </li><li>Det. god. </li><li>Mnemonics: nTr.</li></ul>',
R9:'<canvas class="res">R9</canvas> R9: combination of <canvas class="res">R8</canvas> R8 and <canvas class="res">V33</canvas> V33.<ul><li>Log. or det. <span class="egytransl">bd</span>, "natron". </li><li>Mnemonics: bd.</li></ul>',
R10:'<canvas class="res">R10</canvas> R10: combination of <canvas class="res">R8</canvas> R8, <canvas class="res">T28</canvas> T28 and <canvas class="res">N29</canvas> N29.<ul><li>Log. <span class="egytransl">Xrt-nTr</span>, "necropolis". </li></ul>',
R10a:'<canvas class="res">R10a</canvas> R10a: combination of <canvas class="res">R8</canvas> R8 and <canvas class="res">T28</canvas> T28.<ul><li> Use as <canvas class="res">R10</canvas> R10. </li></ul>',
R11:'<canvas class="res">R11</canvas> R11: reed column.<ul><li>Log. <span class="egytransl">Dd</span>, "djed-column". </li><li>Phon. <span class="egytransl">Dd</span>. </li><li>Mnemonics: dd, Dd.</li></ul>',
R12:'<canvas class="res">R12</canvas> R12: standard.<ul><li>Det. <span class="egytransl">jAt</span>, "standard". Ex. <canvas class="res">i*A-t:R12</canvas> . </li><li>Det. god. </li></ul>',
R13:'<canvas class="res">R13</canvas> R13: falcon and feather on standard.<ul><li>Log. or det. <span class="egytransl">jmnt</span>, "west", "right". </li></ul>',
R14:'<canvas class="res">R14</canvas> R14: feather on standard.<ul><li>Log. <span class="egytransl">jmnt</span>, "west". </li><li>Log. <span class="egytransl">wnmj</span>, "right". </li><li>Mnemonics: imnt.</li></ul>',
R15:'<canvas class="res">R15</canvas> R15: spear emblem.<ul><li>Log. <span class="egytransl">jAbt</span>, "east". </li><li>Phon. <span class="egytransl">Ab</span>. </li><li>Mnemonics: iAb.</li></ul>',
R16:'<canvas class="res">R16</canvas> R16: sceptre with feathers and string.<ul><li>Log. or det. <span class="egytransl">wx</span>, "ukh-fetish". </li><li>Do not confuse with: <canvas class="res">R16a</canvas> R16a. </li><li>Mnemonics: wx.</li></ul>',
R16a:'<canvas class="res">R16a</canvas> R16a: sceptre with feathers.<ul><li>Log. or det. <span class="egytransl">^nfr-tm</span>, "Nefertem". </li><li>Do not confuse with: <canvas class="res">R16</canvas> R16. </li></ul>',
R17:'<canvas class="res">R17</canvas> R17: wig on pole.<ul><li> Use as <canvas class="res">NU8</canvas> NU8. </li></ul>',
R18:'<canvas class="res">R18</canvas> R18: combination of <canvas class="res">R17</canvas> R17 and <canvas class="res">N24</canvas> N24.<ul><li> Use as <canvas class="res">NU8</canvas> NU8. </li></ul>',
R19:'<canvas class="res">R19</canvas> R19: <canvas class="res">S40</canvas> S40 with feather.<ul><li>Log. <span class="egytransl">^wAst</span>, "Thebes". </li><li> Use as <canvas class="res">S40</canvas> S40 [Phon. <span class="egytransl">jAtt</span>]. </li></ul>',
R20:'<canvas class="res">R20</canvas> R20: flower with horns.<ul><li>Log. <span class="egytransl">^sSAt</span>, "Seshat". </li></ul>',
R21:'<canvas class="res">R21</canvas> R21: flower with horns.<ul><li> Use as <canvas class="res">R20</canvas> R20. </li></ul>',
R22:'<canvas class="res">R22</canvas> R22: two narrow belemnites.<ul><li>Log. <span class="egytransl">^mnw</span>, "Min". </li><li>Log. <span class="egytransl">^xm</span>, "Ausim". </li><li>Phon. <span class="egytransl">xm</span>. </li><li>Mnemonics: xm.</li></ul>',
R23:'<canvas class="res">R23</canvas> R23: two broad belemnites.<ul><li> Use as <canvas class="res">R22</canvas> R22. </li></ul>',
R24:'<canvas class="res">R24</canvas> R24: two bows tied horizontally.<ul><li>Log. <span class="egytransl">^njt</span>, "Neith". </li></ul>',
R25:'<canvas class="res">R25</canvas> R25: two bows tied vertically.<ul><li> Use as <canvas class="res">R24</canvas> R24. </li></ul>',
R26:'<canvas class="res">R26</canvas> R26: combination of <canvas class="res">N17</canvas> N17, <canvas class="res">F36</canvas> F36, <canvas class="res">M24a</canvas> M24a and <canvas class="res">M13</canvas> M13.<ul><li>Log. <span class="egytransl">smA</span>, "unite". </li></ul>',
R27:'<canvas class="res">R27</canvas> R27: two arrows crossed over a shield.<ul><li>Log. <span class="egytransl">^njt</span>, "Neith". </li></ul>',
R28:'<canvas class="res">R28</canvas> R28: Bat.<ul><li>Log. or det. <span class="egytransl">bAt</span>, "Bat (symbol of Hathor)". </li></ul>',
R29:'<canvas class="res">R29</canvas> R29: niche with serpent.<ul><li>Log. <span class="egytransl">jtrt</span>, "niche (for statues)". </li></ul>',
S1:'<canvas class="res">S1</canvas> S1: white crown.<ul><li>Log. or det. <span class="egytransl">HDt</span>, "white crown". </li><li>Det. white crown. </li><li>Mnemonics: HDt.</li></ul>',
S2:'<canvas class="res">S2</canvas> S2: combination of <canvas class="res">S1</canvas> S1 and <canvas class="res">V30</canvas> V30.<ul><li> Use as <canvas class="res">S1</canvas> S1. </li></ul>',
S2a:'<canvas class="res">S2a</canvas> S2a: combination of <canvas class="res">S1</canvas> S1 and <canvas class="res">O49</canvas> O49.<ul><li>Log. <span class="egytransl">Sma=s</span>, "crown of Upper Egypt". </li></ul>',
S3:'<canvas class="res">S3</canvas> S3: red crown.<ul><li>Log. or det. <span class="egytransl">dSrt</span>, "red crown". </li><li>Det. red crown. </li><li>Phon. <span class="egytransl">n</span>. </li><li>Mnemonics: dSrt, N.</li></ul>',
S4:'<canvas class="res">S4</canvas> S4: combination of <canvas class="res">S3</canvas> S3 and <canvas class="res">V30</canvas> V30.<ul><li>Log. or det. <span class="egytransl">nt</span>, "net-crown". </li><li>Det. red crown. </li><li>Phon. <span class="egytransl">n</span>. </li></ul>',
S5:'<canvas class="res">S5</canvas> S5: double crown.<ul><li>Log. or det. <span class="egytransl">sxmtj</span>, "double crown". </li></ul>',
S6:'<canvas class="res">S6</canvas> S6: combination of <canvas class="res">S5</canvas> S5 and <canvas class="res">V30</canvas> V30.<ul><li> Use as <canvas class="res">S5</canvas> S5. </li><li>Det. double crown. </li><li>Mnemonics: sxmty.</li></ul>',
S6a:'<canvas class="res">S6a</canvas> S6a: combination of <canvas class="res">S3</canvas> S3 and <canvas class="res">O49</canvas> O49.<ul><li>Log. <span class="egytransl">mHw=s</span>, "crown of Lower Egypt". </li></ul>',
S7:'<canvas class="res">S7</canvas> S7: blue crown.<ul><li>Log. or det. <span class="egytransl">xprS</span>, "blue crown". </li><li>Mnemonics: xprS.</li></ul>',
S8:'<canvas class="res">S8</canvas> S8: <span class="egytransl">Atf</span>-crown.<ul><li>Log. or det. <span class="egytransl">Atf</span>, "atef-crown". </li><li>Mnemonics: Atf.</li></ul>',
S9:'<canvas class="res">S9</canvas> S9: two plumes.<ul><li>Log. or det. <span class="egytransl">Swtj</span>, "double plumes". </li><li>Mnemonics: Swty.</li></ul>',
S10:'<canvas class="res">S10</canvas> S10: headband.<ul><li>Log. or det. <span class="egytransl">wAH</span>, "wreath". </li><li>Phon. <span class="egytransl">mDH</span>. </li><li>Log. <span class="egytransl">mDH</span>, "carpenter". </li><li>Mnemonics: mDH.</li></ul>',
S11:'<canvas class="res">S11</canvas> S11: broad collar.<ul><li>Log. or det. <span class="egytransl">wsx</span>, "collar". </li><li>Phon. or phon. det. <span class="egytransl">wsx</span>. </li><li>Mnemonics: wsx.</li></ul>',
S12:'<canvas class="res">S12</canvas> S12: collar of beads.<ul><li>Log. <span class="egytransl">nbw</span>, "gold". </li><li>Det. precious metal. </li><li>Mnemonics: nbw.</li></ul>',
S13:'<canvas class="res">S13</canvas> S13: combination of <canvas class="res">S12</canvas> S12 and <canvas class="res">D58</canvas> D58.<ul><li>Log. <span class="egytransl">nbj</span>, "gild". </li></ul>',
S14:'<canvas class="res">S14</canvas> S14: combination of <canvas class="res">S12</canvas> S12 and <canvas class="res">T3</canvas> T3.<ul><li>Log. <span class="egytransl">HD</span>, "silver". </li></ul>',
S14a:'<canvas class="res">S14a</canvas> S14a: combination of <canvas class="res">S12</canvas> S12 and <canvas class="res">S40</canvas> S40.<ul><li>Log. <span class="egytransl">Dam</span>, "electrum". </li></ul>',
S14b:'<canvas class="res">S14b</canvas> S14b: combination of <canvas class="res">S12</canvas> S12 and <canvas class="res">S40</canvas> S40.<ul><li> Use as <canvas class="res">S14a</canvas> S14a. </li></ul>',
S15:'<canvas class="res">S15</canvas> S15: pectoral.<ul><li>Log. or det. <span class="egytransl">THnt</span>, "fayence". </li><li>Mnemonics: tHn, THn.</li></ul>',
S16:'<canvas class="res">S16</canvas> S16: pectoral.<ul><li> Use as <canvas class="res">S15</canvas> S15. </li></ul>',
S17:'<canvas class="res">S17</canvas> S17: pectoral.<ul><li> Use as <canvas class="res">S15</canvas> S15. </li></ul>',
S17a:'<canvas class="res">S17a</canvas> S17a: girdle.<ul><li>Log. or det. <span class="egytransl">^Ssmtt</span>, "Shesmetet". </li><li>Phon. <span class="egytransl">Ssm</span>. </li></ul>',
S18:'<canvas class="res">S18</canvas> S18: necklace with counterpoise.<ul><li>Log. or det. <span class="egytransl">mnjt</span>, "bead-necklace". </li><li>Mnemonics: mnit.</li></ul>',
S19:'<canvas class="res">S19</canvas> S19: necklace with seal from side.<ul><li>Log. * <span class="egytransl">xtmw</span>, "treasurer". </li><li>Mnemonics: sDAw.</li></ul>',
S20:'<canvas class="res">S20</canvas> S20: necklace with seal from front.<ul><li>Log. or det. <span class="egytransl">xtm</span>, "seal". </li><li>Det. seal. </li><li>Log. or det. <span class="egytransl">Snatj</span>, "shenoti". </li><li> Use as <canvas class="res">S19</canvas> S19. </li><li> Use as <canvas class="res">E31</canvas> E31. </li><li>Mnemonics: xtm.</li></ul>',
S21:'<canvas class="res">S21</canvas> S21: ring.<ul><li>Det. ring. </li><li>Do not confuse with: <canvas class="res">D12</canvas> D12, <canvas class="res">D67</canvas> D67, <canvas class="res">N5</canvas> N5, <canvas class="res">N33</canvas> N33, <canvas class="res">Z13</canvas> Z13. </li></ul>',
S22:'<canvas class="res">S22</canvas> S22: shoulder-knot.<ul><li>Phon. <span class="egytransl">sT</span>. </li><li>Log. or det. <span class="egytransl">tA-wr</span>, "larboard". </li><li>Mnemonics: sT.</li></ul>',
S23:'<canvas class="res">S23</canvas> S23: knotted cloth.<ul><li>Log. or det. <span class="egytransl">dmD</span>, "unite". </li><li>Phon. <span class="egytransl">dmD</span>. </li><li>Do not confuse with: <canvas class="res">Aa6</canvas> Aa6. </li><li>Mnemonics: dmD.</li></ul>',
S24:'<canvas class="res">S24</canvas> S24: girdle knot.<ul><li>Log. or det. <span class="egytransl">Tst</span>, "knot". </li><li>Log. or det. <span class="egytransl">Ts</span>, "vertebra". </li><li>Phon. <span class="egytransl">Ts</span>. </li><li>Do not confuse with: <canvas class="res">O34</canvas> O34. </li><li>Mnemonics: Tz.</li></ul>',
S25:'<canvas class="res">S25</canvas> S25: garment with ties.<ul><li>Det. apron. </li><li>Log. or det. <span class="egytransl">aAw</span>, "interpreter". </li></ul>',
S26:'<canvas class="res">S26</canvas> S26: apron.<ul><li>Log. or det. <span class="egytransl">SnDwt</span>, "apron". </li><li>Mnemonics: Sndyt.</li></ul>',
S26a:'<canvas class="res">S26a</canvas> S26a: apron.<ul><li>Log. or det. <span class="egytransl">dAjw</span>, "* apron". </li><li>Do not confuse with: <canvas class="res">N18</canvas> N18, <canvas class="res">X4b</canvas> X4b, <canvas class="res">Z8</canvas> Z8. </li></ul>',
S26b:'<canvas class="res">S26b</canvas> S26b: apron.<ul><li> Use as <canvas class="res">S26a</canvas> S26a. </li><li>Do not confuse with: <canvas class="res">N37a</canvas> N37a. </li></ul>',
S27:'<canvas class="res">S27</canvas> S27: cloth with two strands.<ul><li>Log. or det. <span class="egytransl">mnxt</span>, "clothing". </li><li>Mnemonics: mnxt.</li></ul>',
S28:'<canvas class="res">S28</canvas> S28: cloth with fringe on top and <canvas class="res">S29</canvas> S29.<ul><li>Det. clothing. </li></ul>',
S29:'<canvas class="res">S29</canvas> S29: folded cloth.<ul><li>Phon. <span class="egytransl">s</span>. </li><li><canvas class="res">S34*U28*S29</canvas> Log. <span class="egytransl">a.w.s.</span>, "l.p.h.!". </li><li>Mnemonics: s.</li></ul>',
S30:'<canvas class="res">S30</canvas> S30: combination of <canvas class="res">S29</canvas> S29 and <canvas class="res">I9</canvas> I9.<ul><li>Phon. <span class="egytransl">sf</span>. </li><li>Mnemonics: sf.</li></ul>',
S31:'<canvas class="res">S31</canvas> S31: combination of <canvas class="res">S29</canvas> S29 and <canvas class="res">U1</canvas> U1.<ul><li>Phon. <span class="egytransl">smA</span>. </li></ul>',
S32:'<canvas class="res">S32</canvas> S32: cloth with fringe on the side.<ul><li>Log. or det. <span class="egytransl">sjAt</span>, "piece of cloth". </li><li>Phon. <span class="egytransl">sjA</span>. </li><li>Mnemonics: siA.</li></ul>',
S33:'<canvas class="res">S33</canvas> S33: sandle.<ul><li>Log. or det. <span class="egytransl">Tbt</span>, "sandal". </li><li>Mnemonics: Tb.</li></ul>',
S34:'<canvas class="res">S34</canvas> S34: sandle-strap.<ul><li>Log. <span class="egytransl">anx</span>, "sandal-strap". </li><li>Log. <span class="egytransl">anx</span>, "life". </li><li>Phon. <span class="egytransl">anx</span>. </li><li><canvas class="res">S34*U28*S29</canvas> Log. <span class="egytransl">a.w.s.</span>, "l.p.h.!". </li><li>Mnemonics: anx.</li></ul>',
S35:'<canvas class="res">S35</canvas> S35: sunshade.<ul><li>Log. or det. <span class="egytransl">Swt</span>, "shade". </li><li>Log. or det. <span class="egytransl">sryt</span>, "standard". </li><li>Mnemonics: Swt.</li></ul>',
S35a:'<canvas class="res">S35a</canvas> S35a: sunshade.<ul><li> Use as <canvas class="res">S35</canvas> S35. </li></ul>',
S36:'<canvas class="res">S36</canvas> S36: sunshade.<ul><li> Use as <canvas class="res">S35</canvas> S35. </li><li><canvas class="res">S36*(.:Q3)*S36</canvas> Log. <span class="egytransl">^Hpwj</span>, "Hepui". </li></ul>',
S37:'<canvas class="res">S37</canvas> S37: fan.<ul><li>Log. or det. <span class="egytransl">xw</span>, "fan". </li><li>Mnemonics: xw.</li></ul>',
S38:'<canvas class="res">S38</canvas> S38: crook.<ul><li>Log. or det. <span class="egytransl">HqAt</span>, "sceptre". </li><li>Phon. <span class="egytransl">HqA</span>. </li><li><canvas class="res">S38*[fit]N29*S29</canvas> Log. <span class="egytransl">Aqs</span>, "Akes". </li><li> Use as <canvas class="res">S39</canvas> S39. </li><li>Mnemonics: HqA.</li></ul>',
S39:'<canvas class="res">S39</canvas> S39: shepherd&amp;apos;s crook.<ul><li>Phon. <span class="egytransl">awt</span>. </li><li>Mnemonics: awt.</li></ul>',
S40:'<canvas class="res">S40</canvas> S40: sceptre.<ul><li>Log. or det. <span class="egytransl">wAs</span>, "uas-sceptre". </li><li>Phon. or phon. det. <span class="egytransl">wAs</span>. </li><li>Phon. <span class="egytransl">wAb</span>. </li><li>Phon. <span class="egytransl">jAtt</span>. </li><li> Use as <canvas class="res">S41</canvas> S41. </li><li>Mnemonics: wAs.</li></ul>',
S41:'<canvas class="res">S41</canvas> S41: sceptre with spiral shaft.<ul><li>Phon. <span class="egytransl">Dam</span>. </li><li>Mnemonics: Dam.</li></ul>',
S42:'<canvas class="res">S42</canvas> S42: sceptre of authority.<ul><li>Log. or det. <span class="egytransl">abA</span>, "aba-sceptre". </li><li>Phon. or phon. det. <span class="egytransl">abA</span>. </li><li>Log. <span class="egytransl">sxm</span>, "sistrum". </li><li>Phon. <span class="egytransl">sxm</span>. </li><li>Log. or det. <span class="egytransl">xrp</span>, "control". </li><li>Mnemonics: abA, xrp, sxm.</li></ul>',
S43:'<canvas class="res">S43</canvas> S43: walking stick.<ul><li>Log. <span class="egytransl">mdw</span>, "staff". </li><li>Phon. <span class="egytransl">mdw</span>. </li><li>Mnemonics: md.</li></ul>',
S44:'<canvas class="res">S44</canvas> S44: walking stick with <canvas class="res">S45</canvas> S45.<ul><li>Log. or det. <span class="egytransl">Ams</span>, "ames-sceptre". </li><li>Mnemonics: Ams.</li></ul>',
S45:'<canvas class="res">S45</canvas> S45: flagellum.<ul><li>Log. or det. <span class="egytransl">nxAxA</span>, "flagellum". </li><li>Mnemonics: nxxw.</li></ul>',
S46:'<canvas class="res">S46</canvas> S46: covering for head and neck.<ul><li>Phon. <span class="egytransl">k</span>. </li><li>Log. or det. <span class="egytransl">afnt</span>, "head-cloth". </li></ul>',
T1:'<canvas class="res">T1</canvas> T1: mace with flat head.<ul><li>Phon. <span class="egytransl">mnw</span>. </li></ul>',
T2:'<canvas class="res">T2</canvas> T2: mace with round head diagonally.<ul><li>Det. <span class="egytransl">sqr</span>, "smite". Ex. <canvas class="res">s-Aa7:T2</canvas> . </li></ul>',
T3:'<canvas class="res">T3</canvas> T3: mace with round head vertically.<ul><li>Log. <span class="egytransl">HD</span>, "mace". </li><li>Phon. <span class="egytransl">HD</span>. </li><li>Mnemonics: HD.</li></ul>',
T3a:'<canvas class="res">T3a</canvas> T3a: combination of <canvas class="res">T3</canvas> T3 and <canvas class="res">N26</canvas> N26.<ul><li>Phon. <span class="egytransl">HDw</span>. </li></ul>',
T4:'<canvas class="res">T4</canvas> T4: mace with strap.<ul><li> Use as <canvas class="res">T3</canvas> T3. </li></ul>',
T5:'<canvas class="res">T5</canvas> T5: combination of <canvas class="res">T3</canvas> T3 and <canvas class="res">I10</canvas> I10.<ul><li> Use as <canvas class="res">T3</canvas> T3. </li></ul>',
T6:'<canvas class="res">T6</canvas> T6: combination of <canvas class="res">T3</canvas> T3 and two <canvas class="res">I10</canvas> I10.<ul><li>Phon. <span class="egytransl">HDD</span>. </li><li>Mnemonics: HDD.</li></ul>',
T7:'<canvas class="res">T7</canvas> T7: axe.<ul><li>Log. or det. <span class="egytransl">mjbt</span>, "axe". </li><li>Log. or det. <span class="egytransl">mDH</span>, "carpenter". </li></ul>',
T7a:'<canvas class="res">T7a</canvas> T7a: axe.<ul><li>Log. or det. <span class="egytransl">jqHw</span>, "axe". </li></ul>',
T8:'<canvas class="res">T8</canvas> T8: dagger.<ul><li>Phon. <span class="egytransl">tp</span>. </li></ul>',
T8a:'<canvas class="res">T8a</canvas> T8a: dagger.<ul><li>Log. or det. <span class="egytransl">bAgsw</span>, "dagger". </li></ul>',
T9:'<canvas class="res">T9</canvas> T9: bow.<ul><li>Log. or det. <span class="egytransl">pDt</span>, "bow". </li><li>Phon. or phon. det. <span class="egytransl">pD</span>. </li><li>Mnemonics: pd.</li></ul>',
T9a:'<canvas class="res">T9a</canvas> T9a: bow.<ul><li> Use as <canvas class="res">T9</canvas> T9. </li></ul>',
T10:'<canvas class="res">T10</canvas> T10: composite bow.<ul><li>Log. or det. <span class="egytransl">jwnt</span>, "bow". </li><li> Use as <canvas class="res">T9</canvas> T9. </li><li>Mnemonics: pD.</li></ul>',
T11:'<canvas class="res">T11</canvas> T11: arrow.<ul><li>Log. or det. <span class="egytransl">Ssr</span>, "arrow". </li><li>Phon. det. <span class="egytransl">sXr</span>. </li><li>Phon. det. <span class="egytransl">sSr</span>. </li><li>Phon. det. <span class="egytransl">sjn</span>. </li><li>Phon. or phon. det. <span class="egytransl">swn</span>. </li><li>Mnemonics: zin, zwn, sXr.</li></ul>',
T11a:'<canvas class="res">T11a</canvas> T11a: two crossed arrows.<ul><li>Det. Neith. Ex. <canvas class="res">R24[rotate=90]*T11a</canvas> , <span class="egytransl">^njt</span>, "Neith". </li></ul>',
T12:'<canvas class="res">T12</canvas> T12: bow-string.<ul><li>Log. or det. <span class="egytransl">rwD</span>, "bow-string". </li><li>Phon. or phon. det. <span class="egytransl">rwD</span>. </li><li>Det. <span class="egytransl">Ar</span>, "restrain". Ex. <canvas class="res">A-r:T12</canvas> . </li><li>Phon. det. <span class="egytransl">Ar</span>, <span class="egytransl">Aj</span>. </li><li>Mnemonics: Ai, Ar, rwd, rwD.</li></ul>',
T13:'<canvas class="res">T13</canvas> T13: joined pieces of wood.<ul><li>Phon. or phon. det. <span class="egytransl">rs</span>. </li><li>Mnemonics: rs.</li></ul>',
T14:'<canvas class="res">T14</canvas> T14: throw stick vertically.<ul><li>Log. or det. <span class="egytransl">amaAt</span>, "throw-stick". </li><li>Log. or det. <span class="egytransl">qmA</span>, "throw", "create". </li><li><canvas class="res">T14*[sep=0.2]G41</canvas> Phon. det. <span class="egytransl">Tn</span>. </li><li>Log. <span class="egytransl">^THnw</span>, "Libia". </li><li>Log. <span class="egytransl">aAm</span>, "Asian". </li><li>Log. <span class="egytransl">nHsj</span>, "Nubian". </li><li>Det. foreign peoples and countries. </li><li> Use as <canvas class="res">Aa26</canvas> Aa26. </li><li> Use as <canvas class="res">M3</canvas> M3 [Phon. det. <span class="egytransl">Da</span>]. </li><li> Use as <canvas class="res">P11</canvas> P11. </li><li> Use as <canvas class="res">T13</canvas> T13. </li><li> Use as <canvas class="res">D50</canvas> D50 [Det. accurate]. </li><li>Mnemonics: qmA.</li></ul>',
T15:'<canvas class="res">T15</canvas> T15: throw stick slanted.<ul><li> Use as <canvas class="res">T14</canvas> T14. </li></ul>',
T16:'<canvas class="res">T16</canvas> T16: scimitar.<ul><li>Log. or det. <span class="egytransl">xpS</span>, "scimitar". </li></ul>',
T16a:'<canvas class="res">T16a</canvas> T16a: scimitar.<ul><li> Use as <canvas class="res">T16</canvas> T16. </li></ul>',
T17:'<canvas class="res">T17</canvas> T17: chariot.<ul><li>Log. or det. <span class="egytransl">wrryt</span>, "chariot". </li><li>Mnemonics: wrrt.</li></ul>',
T18:'<canvas class="res">T18</canvas> T18: crook with package attached.<ul><li>Log. or det. <span class="egytransl">Sms</span>, "follow". </li><li>Mnemonics: Sms.</li></ul>',
T19:'<canvas class="res">T19</canvas> T19: harpoon head.<ul><li>Log. or det. <span class="egytransl">qs</span>, "bone". </li><li>Phon. or phon. det. <span class="egytransl">qs</span>. </li><li>Phon. or phon. det. <span class="egytransl">qrs</span>. </li><li>Phon. or phon. det. <span class="egytransl">gn</span>. </li><li>Phon. det. <span class="egytransl">twr</span>. </li><li>Det. bone, tubular. </li><li>Mnemonics: qs.</li></ul>',
T20:'<canvas class="res">T20</canvas> T20: harpoon head.<ul><li> Use as <canvas class="res">T19</canvas> T19. </li></ul>',
T21:'<canvas class="res">T21</canvas> T21: harpoon.<ul><li>Log. or det. <span class="egytransl">wa</span>, "one". </li></ul>',
T22:'<canvas class="res">T22</canvas> T22: arrowhead.<ul><li>Log. <span class="egytransl">snw</span>, "two". </li><li>Phon. <span class="egytransl">sn</span>. </li><li>Mnemonics: sn.</li></ul>',
T23:'<canvas class="res">T23</canvas> T23: arrowhead.<ul><li> Use as <canvas class="res">T22</canvas> T22. </li></ul>',
T24:'<canvas class="res">T24</canvas> T24: fishing-net.<ul><li>Log. or det. <span class="egytransl">aH</span>, "net (verb)". </li><li>Phon. <span class="egytransl">aH</span>. </li><li>Mnemonics: iH.</li></ul>',
T25:'<canvas class="res">T25</canvas> T25: floats.<ul><li>Log. or det. <span class="egytransl">DbA</span>, "float (noun)". </li><li>Phon. <span class="egytransl">DbA</span>. </li><li>Mnemonics: DbA.</li></ul>',
T26:'<canvas class="res">T26</canvas> T26: bird-trap.<ul><li>Log. or det. <span class="egytransl">sxt</span>, "trap". </li></ul>',
T27:'<canvas class="res">T27</canvas> T27: bird-trap.<ul><li> Use as <canvas class="res">T26</canvas> T26. </li></ul>',
T28:'<canvas class="res">T28</canvas> T28: butcher&amp;apos;s block.<ul><li>Log. <span class="egytransl">Xr</span>, "under". </li><li>Phon. <span class="egytransl">Xr</span>. </li><li>Mnemonics: Xr.</li></ul>',
T29:'<canvas class="res">T29</canvas> T29: combination of <canvas class="res">T30</canvas> T30 and <canvas class="res">T28</canvas> T28.<ul><li>Log. or det. <span class="egytransl">nmt</span>, "place of slaughter". </li><li>Mnemonics: nmt.</li></ul>',
T30:'<canvas class="res">T30</canvas> T30: knife.<ul><li>Det. knife, sharp. </li><li>Log. or det. <span class="egytransl">dmt</span>, "knife". </li></ul>',
T31:'<canvas class="res">T31</canvas> T31: knife-sharpener.<ul><li>Phon. <span class="egytransl">sSm</span>. </li><li>Mnemonics: sSm.</li></ul>',
T32:'<canvas class="res">T32</canvas> T32: combination of <canvas class="res">T31</canvas> T31 and <canvas class="res">D54</canvas> D54.<ul><li> Use as <canvas class="res">T31</canvas> T31. </li></ul>',
T32a:'<canvas class="res">T32a</canvas> T32a: combination of <canvas class="res">T31</canvas> T31 and <canvas class="res">S29</canvas> S29.<ul><li> Use as <canvas class="res">T31</canvas> T31. </li></ul>',
T33:'<canvas class="res">T33</canvas> T33: knife-sharpener of butcher.<ul><li>Log. <span class="egytransl">sSm</span>, "butcher". </li></ul>',
T33a:'<canvas class="res">T33a</canvas> T33a: combination of <canvas class="res">T33</canvas> T33 and <canvas class="res">S29</canvas> S29.<ul><li> Use as <canvas class="res">T33</canvas> T33. </li></ul>',
T34:'<canvas class="res">T34</canvas> T34: butcher&amp;apos;s knife.<ul><li>Log. or det. <span class="egytransl">nm</span>, "knife". </li><li>Phon. <span class="egytransl">nm</span>. </li><li>Mnemonics: nm.</li></ul>',
T35:'<canvas class="res">T35</canvas> T35: butcher&amp;apos;s knife.<ul><li> Use as <canvas class="res">T34</canvas> T34. </li></ul>',
T36:'<canvas class="res">T36</canvas> T36: shield.<ul><li>Det. <span class="egytransl">jkm</span>, "shield". </li></ul>',
U1:'<canvas class="res">U1</canvas> U1: sickle.<ul><li>Log. <span class="egytransl">mA</span>, "sickle-shaped end of boat". </li><li>Phon. <span class="egytransl">mA</span>. </li><li>(group-writing) <canvas class="res">U1-G1</canvas> Phon. <span class="egytransl">m</span>. </li><li>Det. reap. </li><li>Det. crooked. </li><li>Mnemonics: mA.</li></ul>',
U2:'<canvas class="res">U2</canvas> U2: sickle (low).<ul><li> Use as <canvas class="res">U1</canvas> U1. </li></ul>',
U3:'<canvas class="res">U3</canvas> U3: combination of <canvas class="res">U1</canvas> U1 and <canvas class="res">D4</canvas> D4.<ul><li>Log. <span class="egytransl">mAA</span>, "see". </li></ul>',
U4:'<canvas class="res">U4</canvas> U4: combination of <canvas class="res">U1</canvas> U1 and <canvas class="res">Aa11</canvas> Aa11.<ul><li>Log. <span class="egytransl">mAat</span>, "truth". </li></ul>',
U5:'<canvas class="res">U5</canvas> U5: combination of <canvas class="res">U2</canvas> U2 and <canvas class="res">Aa11</canvas> Aa11.<ul><li> Use as <canvas class="res">U4</canvas> U4. </li></ul>',
U6:'<canvas class="res">U6</canvas> U6: diagonal hoe.<ul><li>Det. cultivate. </li><li>Phon. <span class="egytransl">mr</span>. </li><li> Use as <canvas class="res">U8</canvas> U8 [Phon. <span class="egytransl">Hn</span>]. </li><li>Mnemonics: mr.</li></ul>',
U6a:'<canvas class="res">U6a</canvas> U6a: vertical hoe.<ul><li> Use as <canvas class="res">U6</canvas> U6. </li></ul>',
U6b:'<canvas class="res">U6b</canvas> U6b: <canvas class="res">U6a</canvas> U6a reversed.<ul><li> Use as <canvas class="res">U6</canvas> U6. </li></ul>',
U7:'<canvas class="res">U7</canvas> U7: horizontal hoe.<ul><li> Use as <canvas class="res">U6</canvas> U6. </li></ul>',
U8:'<canvas class="res">U8</canvas> U8: hoe without connecting rope.<ul><li>Log. or det. <span class="egytransl">Hnn</span>, "hoe". </li><li>Phon. <span class="egytransl">Hn</span>. </li></ul>',
U9:'<canvas class="res">U9</canvas> U9: grain-measure with grain.<ul><li>Det. grain. </li><li>Log. or det. <span class="egytransl">HqAt</span>, "heqat". </li></ul>',
U10:'<canvas class="res">U10</canvas> U10: <canvas class="res">U9</canvas> U9 beneath <canvas class="res">M33</canvas> M33.<ul><li>Log. <span class="egytransl">jt</span>, "barley". </li><li> Use as <canvas class="res">U9</canvas> U9 [Det. grain]. </li><li>Mnemonics: it.</li></ul>',
U11:'<canvas class="res">U11</canvas> U11: combination of <canvas class="res">S38</canvas> S38 and <canvas class="res">U9</canvas> U9.<ul><li>Log. <span class="egytransl">HqAt</span>, "heqat". </li><li>Mnemonics: HqAt.</li></ul>',
U12:'<canvas class="res">U12</canvas> U12: combination of <canvas class="res">D50</canvas> D50 and <canvas class="res">U9</canvas> U9.<ul><li> Use as <canvas class="res">U11</canvas> U11. </li></ul>',
U13:'<canvas class="res">U13</canvas> U13: plough.<ul><li>Det. plough. </li><li>Log. or det. <span class="egytransl">hb</span>, "plough". </li><li>Phon. <span class="egytransl">hb</span>. </li><li>Log. or det. <span class="egytransl">prt</span>, "seed". </li><li> Use as <canvas class="res">U14</canvas> U14. </li><li>Mnemonics: hb, Sna.</li></ul>',
U14:'<canvas class="res">U14</canvas> U14: two joined branches.<ul><li>Phon. or phon. det. <span class="egytransl">Sna</span>. </li></ul>',
U15:'<canvas class="res">U15</canvas> U15: sledge.<ul><li>Phon. <span class="egytransl">tm</span>. </li><li>Mnemonics: tm.</li></ul>',
U16:'<canvas class="res">U16</canvas> U16: sledge with head of jackal.<ul><li>Log. or det. <span class="egytransl">wnS</span>, "sledge". </li><li>Phon. or phon. det. <span class="egytransl">bjA</span>. </li><li>Mnemonics: biA.</li></ul>',
U17:'<canvas class="res">U17</canvas> U17: pick in ground.<ul><li>Log. or det. <span class="egytransl">grg</span>, "establish". </li><li>Phon. or phon. det. <span class="egytransl">grg</span>. </li><li>Mnemonics: grg.</li></ul>',
U18:'<canvas class="res">U18</canvas> U18: pick in basin.<ul><li> Use as <canvas class="res">U17</canvas> U17. </li></ul>',
U19:'<canvas class="res">U19</canvas> U19: adze.<ul><li>Log. <span class="egytransl">nwtj</span>, "the two adzes". </li><li>Phon. <span class="egytransl">nw</span>. </li><li>(group-writing) <canvas class="res">N35:[sep=0.2]U19:[fit,sep=0.2]W24[scale=0.6]</canvas> Phon. <span class="egytransl">n</span>. </li></ul>',
U20:'<canvas class="res">U20</canvas> U20: adze.<ul><li> Use as <canvas class="res">U19</canvas> U19. </li></ul>',
U21:'<canvas class="res">U21</canvas> U21: adze on wood.<ul><li>Log. or det. <span class="egytransl">stp</span>, "cut up". </li><li>Phon. or phon. det. <span class="egytransl">stp</span>. </li><li>Phon. det. <span class="egytransl">sTp</span>. </li><li>Mnemonics: stp.</li></ul>',
U22:'<canvas class="res">U22</canvas> U22: chisel.<ul><li>Log. or det. <span class="egytransl">mnx</span>, "carve". </li><li>Phon. det. <span class="egytransl">mnx</span>. </li><li>Mnemonics: mnx.</li></ul>',
U23:'<canvas class="res">U23</canvas> U23: chisel.<ul><li>Phon. <span class="egytransl">mr</span>. </li><li>Phon. <span class="egytransl">Ab</span>. </li><li>Mnemonics: Ab.</li></ul>',
U23a:'<canvas class="res">U23a</canvas> U23a: chisel.<ul><li> Use as <canvas class="res">U23</canvas> U23. </li></ul>',
U24:'<canvas class="res">U24</canvas> U24: drill for stone.<ul><li>Log. or det. <span class="egytransl">Hmt</span>, "craft". </li><li>Mnemonics: Hmt.</li></ul>',
U25:'<canvas class="res">U25</canvas> U25: drill for stone.<ul><li> Use as <canvas class="res">U24</canvas> U24. </li></ul>',
U26:'<canvas class="res">U26</canvas> U26: drill for beads.<ul><li>Log. or det. <span class="egytransl">wbA</span>, "open up". </li><li>Mnemonics: wbA.</li></ul>',
U27:'<canvas class="res">U27</canvas> U27: drill for beads.<ul><li> Use as <canvas class="res">U26</canvas> U26. </li></ul>',
U28:'<canvas class="res">U28</canvas> U28: fire-drill.<ul><li>Log. or det. <span class="egytransl">DA</span>, "fire-drill". </li><li>Phon. <span class="egytransl">DA</span>. </li><li><canvas class="res">S34*U28*S29</canvas> Log. <span class="egytransl">a.w.s.</span>, "l.p.h.!". </li><li>(group-writing) <canvas class="res">U28*G1</canvas> , <canvas class="res">U28</canvas> Phon. <span class="egytransl">D</span>. </li><li>Do not confuse with: <canvas class="res">U32</canvas> U32. </li><li>Mnemonics: DA.</li></ul>',
U29:'<canvas class="res">U29</canvas> U29: fire-drill.<ul><li> Use as <canvas class="res">U28</canvas> U28. </li></ul>',
U29a:'<canvas class="res">U29a</canvas> U29a: fire-drill with string.<ul><li> Use as <canvas class="res">U28</canvas> U28. </li></ul>',
U30:'<canvas class="res">U30</canvas> U30: kiln.<ul><li>Log. <span class="egytransl">tA</span>, "kiln". </li><li>Phon. <span class="egytransl">tA</span>. </li></ul>',
U31:'<canvas class="res">U31</canvas> U31: baker&amp;apos;s rake.<ul><li>Log. or det. <span class="egytransl">rtHtj</span>, "baker". </li><li>Phon. det. <span class="egytransl">rtH</span>. </li><li>Phon. det. <span class="egytransl">jtH</span>. </li><li>Log. or det. <span class="egytransl">xnr</span>, "restrain". </li><li> Use as <canvas class="res">D19</canvas> D19. </li><li>Mnemonics: rtH.</li></ul>',
U32:'<canvas class="res">U32</canvas> U32: pestle and mortar.<ul><li>Log. or det. <span class="egytransl">sHm</span>, "pound". </li><li>Phon. or phon. det. <span class="egytransl">smn</span>. </li><li>Phon. <span class="egytransl">Hsmn</span>. </li><li>Det. pound, press down, heavy. </li><li>Det. <span class="egytransl">HmAyt</span>, "salt". </li><li>Do not confuse with: <canvas class="res">U28</canvas> U28, <canvas class="res">U33</canvas> U33. </li><li>Mnemonics: zmn.</li></ul>',
U32a:'<canvas class="res">U32a</canvas> U32a: hieratic pestle and mortar.<ul><li> Use as <canvas class="res">U32</canvas> U32. </li></ul>',
U33:'<canvas class="res">U33</canvas> U33: pestle.<ul><li>Log. <span class="egytransl">tjt</span>, "pestle". </li><li>Phon. <span class="egytransl">tj</span>. </li><li>Phon. <span class="egytransl">t</span>. </li><li>(group-writing) <canvas class="res">U33</canvas> , <canvas class="res">U33*M17</canvas> , <canvas class="res">U33-M17*M17</canvas> Phon. <span class="egytransl">t</span>. </li><li>Do not confuse with: <canvas class="res">U32</canvas> U32. </li><li>Mnemonics: ti.</li></ul>',
U34:'<canvas class="res">U34</canvas> U34: spindle.<ul><li>Log. or det. <span class="egytransl">xsf</span>, "spin". </li><li>Phon. <span class="egytransl">xsf</span>. </li><li>Mnemonics: xsf.</li></ul>',
U35:'<canvas class="res">U35</canvas> U35: combination of <canvas class="res">U34</canvas> U34 and <canvas class="res">I9</canvas> I9.<ul><li> Use as <canvas class="res">U34</canvas> U34. </li></ul>',
U36:'<canvas class="res">U36</canvas> U36: club.<ul><li>Log. <span class="egytransl">Hmww</span>, "fuller". </li><li>Phon. <span class="egytransl">Hm</span>. </li><li>Mnemonics: Hm.</li></ul>',
U37:'<canvas class="res">U37</canvas> U37: razor.<ul><li>Log. or det. <span class="egytransl">Xaq</span>, "shave". </li></ul>',
U38:'<canvas class="res">U38</canvas> U38: balance.<ul><li>Log. or det. <span class="egytransl">mxAt</span>, "balance". </li><li>Mnemonics: mxAt.</li></ul>',
U39:'<canvas class="res">U39</canvas> U39: post of balance.<ul><li>Log. or det. <span class="egytransl">wTst</span>, "post (of balance)". </li><li>Log. or det. <span class="egytransl">Tsj</span>, "raise". </li></ul>',
U40:'<canvas class="res">U40</canvas> U40: hieratic post of balance.<ul><li> Use as <canvas class="res">U39</canvas> U39. </li><li> Use as <canvas class="res">T13</canvas> T13. </li></ul>',
U41:'<canvas class="res">U41</canvas> U41: plummet.<ul><li>Log. or det. <span class="egytransl">tx</span>, "plummet". </li></ul>',
U42:'<canvas class="res">U42</canvas> U42: pitchfork.<ul><li>Log. or det. <span class="egytransl">abwt</span>, "pitchfork". </li><li>Phon. <span class="egytransl">sDb</span>. </li><li>Phon. det. <span class="egytransl">sDb</span>. </li><li>Do not confuse with: <canvas class="res">O30</canvas> O30. </li></ul>',
V1:'<canvas class="res">V1</canvas> V1: coil of rope.<ul><li>Det. rope. </li><li>Phon. or phon. det. <span class="egytransl">Sn</span>. </li><li>Log. <span class="egytransl">Snt</span>, "100". </li><li>Do not confuse with: <canvas class="res">Z7</canvas> Z7. </li><li>Mnemonics: 100.</li></ul>',
V1a:'<canvas class="res">V1a</canvas> V1a: ....<ul><li> Use as 2* <canvas class="res">V1</canvas> V1. </li></ul>',
V1b:'<canvas class="res">V1b</canvas> V1b: ....<ul><li> Use as 3* <canvas class="res">V1</canvas> V1. </li></ul>',
V1c:'<canvas class="res">V1c</canvas> V1c: ....<ul><li> Use as 4* <canvas class="res">V1</canvas> V1. </li></ul>',
V1d:'<canvas class="res">V1d</canvas> V1d: ....<ul><li> Use as 5* <canvas class="res">V1</canvas> V1. </li></ul>',
V1e:'<canvas class="res">V1e</canvas> V1e: ....<ul><li> Use as 6* <canvas class="res">V1</canvas> V1. </li></ul>',
V1f:'<canvas class="res">V1f</canvas> V1f: ....<ul><li> Use as 7* <canvas class="res">V1</canvas> V1. </li></ul>',
V1g:'<canvas class="res">V1g</canvas> V1g: ....<ul><li> Use as 8* <canvas class="res">V1</canvas> V1. </li></ul>',
V1h:'<canvas class="res">V1h</canvas> V1h: ....<ul><li> Use as 9* <canvas class="res">V1</canvas> V1. </li></ul>',
V1i:'<canvas class="res">V1i</canvas> V1i: ....<ul><li> Use as 5* <canvas class="res">V1</canvas> V1. </li></ul>',
V2:'<canvas class="res">V2</canvas> V2: combination of <canvas class="res">O34</canvas> O34 and <canvas class="res">V1</canvas> V1.<ul><li>Log. or det. <span class="egytransl">sTA</span>, "drag". </li><li>Phon. <span class="egytransl">sTA</span>. </li><li>Det. <span class="egytransl">As</span>, "hasten". Ex. <canvas class="res">A-s*(V2:D54)</canvas> . </li><li>Mnemonics: sTA.</li></ul>',
V2a:'<canvas class="res">V2a</canvas> V2a: hieratic form of <canvas class="res">V2</canvas> V2.<ul><li> Use as <canvas class="res">V2</canvas> V2. </li></ul>',
V3:'<canvas class="res">V3</canvas> V3: combination of <canvas class="res">O34</canvas> O34 and three <canvas class="res">V1</canvas> V1.<ul><li>Phon. <span class="egytransl">sTAw</span>. </li><li>Mnemonics: sTAw.</li></ul>',
V4:'<canvas class="res">V4</canvas> V4: lasso.<ul><li>Phon. <span class="egytransl">wA</span>. </li><li>Mnemonics: wA.</li></ul>',
V5:'<canvas class="res">V5</canvas> V5: looped rope.<ul><li>Det. <span class="egytransl">snT</span>, "plan". Ex. <canvas class="res">s-n:T-V5</canvas> . </li><li>Mnemonics: snT.</li></ul>',
V6:'<canvas class="res">V6</canvas> V6: cord with ends upward.<ul><li>Log. or det. <span class="egytransl">Ss</span>, "rope". </li><li>Phon. <span class="egytransl">Ss</span>. </li><li> Use as <canvas class="res">V33</canvas> V33. </li><li> Use as <canvas class="res">S28</canvas> S28. </li><li>Mnemonics: Ss.</li></ul>',
V7:'<canvas class="res">V7</canvas> V7: cord with ends downward.<ul><li>Log. or det. <span class="egytransl">Snj</span>, "enclose". </li><li>Phon. <span class="egytransl">Sn</span>. </li><li>Mnemonics: Sn.</li></ul>',
V7a:'<canvas class="res">V7a</canvas> V7a: cord with ends downward.<ul><li> Use as <canvas class="res">V7</canvas> V7. </li></ul>',
V7b:'<canvas class="res">V7b</canvas> V7b: hieratic cord with ends downward.<ul><li> Use as <canvas class="res">V7</canvas> V7. </li></ul>',
V8:'<canvas class="res">V8</canvas> V8: cord downward.<ul><li> Use as <canvas class="res">V7</canvas> V7. </li></ul>',
V9:'<canvas class="res">V9</canvas> V9: round cartouche.<ul><li>Log. or det. <span class="egytransl">Snw</span>, "cartouche". </li></ul>',
V10:'<canvas class="res">V10</canvas> V10: oval cartouche.<ul><li>Log. or det. <span class="egytransl">Snw</span>, "cartouche". </li><li>Det. name. </li></ul>',
V11:'<canvas class="res">V11</canvas> V11: end of cartouche.<ul><li>Det. <span class="egytransl">dnj</span>, "restrain". Ex. <canvas class="res">d:n-i*V11</canvas> . </li><li>Det. <span class="egytransl">pxA</span>, "split". Ex. <canvas class="res">p:x-xA-A-V11:mDAt</canvas> . </li></ul>',
V11a:'<canvas class="res">V11a</canvas> V11a: opening of cartouche.<ul><li>Typ. hieratic opening of cartouche. </li></ul>',
V11b:'<canvas class="res">V11b</canvas> V11b: closing of cartouche.<ul><li>Typ. hieratic closing of cartouche. </li></ul>',
V11c:'<canvas class="res">V11c</canvas> V11c: closing of knotless cartouche.<ul><li>Typ. hieratic closing of knotless cartouche. </li></ul>',
V12:'<canvas class="res">V12</canvas> V12: string.<ul><li>Det. bind. </li><li>Phon. or phon. det. <span class="egytransl">fx</span>. </li><li>Phon. or phon. det. <span class="egytransl">arq</span>. </li><li>Det. papyrus. </li><li>Mnemonics: arq.</li></ul>',
V12a:'<canvas class="res">V12a</canvas> V12a: string.<ul><li> Use as <canvas class="res">V12</canvas> V12. </li></ul>',
V12b:'<canvas class="res">V12b</canvas> V12b: string.<ul><li> Use as <canvas class="res">V12</canvas> V12. </li></ul>',
V13:'<canvas class="res">V13</canvas> V13: rope.<ul><li>Phon. <span class="egytransl">T</span>. </li><li>Mnemonics: T.</li></ul>',
V14:'<canvas class="res">V14</canvas> V14: rope with tick.<ul><li>Phon. <span class="egytransl">T</span>. </li></ul>',
V15:'<canvas class="res">V15</canvas> V15: combination of <canvas class="res">V13</canvas> V13 and <canvas class="res">D54</canvas> D54.<ul><li>Log. <span class="egytransl">jTj</span>, "seize". </li><li>Mnemonics: iTi.</li></ul>',
V16:'<canvas class="res">V16</canvas> V16: looped cord.<ul><li>Log. <span class="egytransl">sA</span>, "hobble". </li><li>Phon. <span class="egytransl">sA</span>. </li></ul>',
V17:'<canvas class="res">V17</canvas> V17: shelter of papyrus.<ul><li>Log. or det. <span class="egytransl">sA</span>, "protection". </li></ul>',
V18:'<canvas class="res">V18</canvas> V18: shelter of papyrus.<ul><li> Use as <canvas class="res">V17</canvas> V17. </li></ul>',
V19:'<canvas class="res">V19</canvas> V19: hobble with cross-bar.<ul><li>Log. or det. <span class="egytransl">mDt</span>, "stable". </li><li>Phon. or phon. det. <span class="egytransl">tmA</span>. </li><li>Log. or det. <span class="egytransl">XAr</span>, "sack". </li><li>Det. palanquin, portable shrine. </li><li>Do not confuse with: <canvas class="res">Aa19</canvas> Aa19. </li><li>Mnemonics: mDt, XAr, TmA.</li></ul>',
V20:'<canvas class="res">V20</canvas> V20: hobble.<ul><li>Phon. <span class="egytransl">mD</span>. </li><li>Log. <span class="egytransl">mD</span>, "10". </li><li>Mnemonics: 10, mD.</li></ul>',
V20a:'<canvas class="res">V20a</canvas> V20a: ....<ul><li> Use as 2* <canvas class="res">V20</canvas> V20. </li></ul>',
V20b:'<canvas class="res">V20b</canvas> V20b: ....<ul><li> Use as 3* <canvas class="res">V20</canvas> V20. </li></ul>',
V20c:'<canvas class="res">V20c</canvas> V20c: ....<ul><li> Use as 4* <canvas class="res">V20</canvas> V20. </li></ul>',
V20d:'<canvas class="res">V20d</canvas> V20d: ....<ul><li> Use as 5* <canvas class="res">V20</canvas> V20. </li></ul>',
V20e:'<canvas class="res">V20e</canvas> V20e: ....<ul><li> Use as 6* <canvas class="res">V20</canvas> V20. </li></ul>',
V20f:'<canvas class="res">V20f</canvas> V20f: ....<ul><li> Use as 7* <canvas class="res">V20</canvas> V20. </li></ul>',
V20g:'<canvas class="res">V20g</canvas> V20g: ....<ul><li> Use as 8* <canvas class="res">V20</canvas> V20. </li></ul>',
V20h:'<canvas class="res">V20h</canvas> V20h: ....<ul><li> Use as 9* <canvas class="res">V20</canvas> V20. </li></ul>',
V20i:'<canvas class="res">V20i</canvas> V20i: ....<ul><li> Use as 2* <canvas class="res">V20</canvas> V20. </li></ul>',
V20j:'<canvas class="res">V20j</canvas> V20j: ....<ul><li> Use as 3* <canvas class="res">V20</canvas> V20. </li></ul>',
V20k:'<canvas class="res">V20k</canvas> V20k: ....<ul><li> Use as 4* <canvas class="res">V20</canvas> V20. </li></ul>',
V20l:'<canvas class="res">V20l</canvas> V20l: ....<ul><li> Use as 5* <canvas class="res">V20</canvas> V20. </li></ul>',
V21:'<canvas class="res">V21</canvas> V21: combination of <canvas class="res">V20</canvas> V20 and <canvas class="res">I10</canvas> I10.<ul><li>Log. <span class="egytransl">mDt</span>, "stable". </li><li>Phon. <span class="egytransl">mD</span>. </li></ul>',
V22:'<canvas class="res">V22</canvas> V22: whip.<ul><li>Phon. <span class="egytransl">mH</span>. </li><li>Mnemonics: mH.</li></ul>',
V23:'<canvas class="res">V23</canvas> V23: whip.<ul><li> Use as <canvas class="res">V22</canvas> V22. </li></ul>',
V23a:'<canvas class="res">V23a</canvas> V23a: whip.<ul><li> Use as <canvas class="res">V22</canvas> V22. </li></ul>',
V24:'<canvas class="res">V24</canvas> V24: cord on stick.<ul><li>Phon. <span class="egytransl">wD</span>. </li><li>Mnemonics: wD.</li></ul>',
V25:'<canvas class="res">V25</canvas> V25: cord on stick with tick.<ul><li> Use as <canvas class="res">V24</canvas> V24. </li></ul>',
V26:'<canvas class="res">V26</canvas> V26: netting needle.<ul><li>Log. or det. <span class="egytransl">aD</span>, "spool". </li><li>Phon. or phon. det. <span class="egytransl">aD</span>. </li><li>Mnemonics: aD.</li></ul>',
V27:'<canvas class="res">V27</canvas> V27: netting needle.<ul><li> Use as <canvas class="res">V26</canvas> V26. </li></ul>',
V28:'<canvas class="res">V28</canvas> V28: wick.<ul><li>Phon. <span class="egytransl">H</span>. </li><li>Mnemonics: H.</li></ul>',
V28a:'<canvas class="res">V28a</canvas> V28a: combination of <canvas class="res">V28</canvas> V28 and <canvas class="res">D36</canvas> D36.<ul><li>Phon. <span class="egytransl">Ha</span>. </li></ul>',
V29:'<canvas class="res">V29</canvas> V29: swab.<ul><li>Log. or det. <span class="egytransl">sk</span>, "wipe". </li><li>Phon. <span class="egytransl">sk</span>. </li><li>Phon. or phon. det. <span class="egytransl">wAH</span>. </li><li>Det. <span class="egytransl">xsr</span>, "ward off". Ex. <canvas class="res">x:z:r-V29-D40</canvas> . </li><li>Det. <span class="egytransl">mar</span>, "fortunate". </li><li>Mnemonics: wAH, sk.</li></ul>',
V29a:'<canvas class="res">V29a</canvas> V29a: combination of <canvas class="res">V29</canvas> V29 and <canvas class="res">V31</canvas> V31.<ul><li>Phon. <span class="egytransl">sk</span>. </li></ul>',
V30:'<canvas class="res">V30</canvas> V30: basket.<ul><li>Log. or det. <span class="egytransl">nbt</span>, "basket". </li><li>Phon. <span class="egytransl">nb</span>. </li><li>Mnemonics: nb.</li></ul>',
V30a:'<canvas class="res">V30a</canvas> V30a: basket (low).<ul><li> Use as <canvas class="res">V30</canvas> V30. </li></ul>',
V31:'<canvas class="res">V31</canvas> V31: basket with right handle.<ul><li>Phon. <span class="egytransl">k</span>. </li><li>Mnemonics: k.</li></ul>',
V31a:'<canvas class="res">V31a</canvas> V31a: basket with left handle.<ul><li> Use as <canvas class="res">V31</canvas> V31. </li><li>Do not confuse with: <canvas class="res">V37a</canvas> V37a. </li></ul>',
V32:'<canvas class="res">V32</canvas> V32: frail.<ul><li>Log. or det. <span class="egytransl">msnw</span>, "harpooner". </li><li>Phon. <span class="egytransl">msn</span>. </li><li>Log. or det. <span class="egytransl">gAwt</span>, "tribute". </li><li>Phon. det. <span class="egytransl">gAw</span>, <span class="egytransl">gAy</span>. </li><li>Mnemonics: msn.</li></ul>',
V33:'<canvas class="res">V33</canvas> V33: bag.<ul><li>Log. or det. <span class="egytransl">sSr</span>, "linen". </li><li>Phon. <span class="egytransl">sSr</span>. </li><li>Phon. <span class="egytransl">g</span>. </li><li>Det. tie up, envelop, perfume. </li><li> Use as <canvas class="res">V6</canvas> V6. </li><li>Mnemonics: sSr.</li></ul>',
V33a:'<canvas class="res">V33a</canvas> V33a: bundle.<ul><li>Log. or det. <span class="egytransl">qAr</span>, "bundle". Ex. <canvas class="res">q*A-r:V33a</canvas> , <span class="egytransl">^qAr</span>, "Kar". </li></ul>',
V34:'<canvas class="res">V34</canvas> V34: bag.<ul><li> Use as <canvas class="res">V33</canvas> V33. </li></ul>',
V35:'<canvas class="res">V35</canvas> V35: bag.<ul><li> Use as <canvas class="res">V33</canvas> V33. </li></ul>',
V36:'<canvas class="res">V36</canvas> V36: receptacle.<ul><li>Log. or det. <span class="egytransl">Hn</span>, "receptacle". </li><li>Phon. or phon. det. <span class="egytransl">Hn</span>. </li><li><canvas class="res">V36*[sep=0.2]V36</canvas> Log. <span class="egytransl">Hntj</span>, "end". </li></ul>',
V37:'<canvas class="res">V37</canvas> V37: bandage.<ul><li>Log. or det. <span class="egytransl">jdr</span>, "bandage". </li><li>Phon. or phon. det. <span class="egytransl">jdr</span>. </li><li>Do not confuse with: <canvas class="res">N41</canvas> N41. </li><li>Mnemonics: idr.</li></ul>',
V37a:'<canvas class="res">V37a</canvas> V37a: bandage.<ul><li> Use as <canvas class="res">V37</canvas> V37. </li><li>Do not confuse with: <canvas class="res">V31a</canvas> V31a. </li></ul>',
V38:'<canvas class="res">V38</canvas> V38: bandage.<ul><li>Log. or det. <span class="egytransl">wt</span>, "bandage". </li><li>Do not confuse with: <canvas class="res">D21</canvas> D21. </li></ul>',
V39:'<canvas class="res">V39</canvas> V39: knot-amulet.<ul><li>Log. or det. <span class="egytransl">tjt</span>, "knot-amulet". </li></ul>',
V40:'<canvas class="res">V40</canvas> V40: hobble on its side.<ul><li>Log. <span class="egytransl">mD</span>, "10 (in days of the month)". </li></ul>',
V40a:'<canvas class="res">V40a</canvas> V40a: two hobbles on their side.<ul><li> Use as 2* <canvas class="res">V40</canvas> V40. </li></ul>',
W1:'<canvas class="res">W1</canvas> W1: oil jar with ties.<ul><li>Log. or det. <span class="egytransl">mrHt</span>, "unguent". </li><li>Det. oil, unguent. </li></ul>',
W2:'<canvas class="res">W2</canvas> W2: oil jar.<ul><li>Log. or det. <span class="egytransl">bAs</span>, "jar". </li><li>Phon. <span class="egytransl">bAs</span>. </li><li>Mnemonics: bAs.</li></ul>',
W3:'<canvas class="res">W3</canvas> W3: alabaster basin.<ul><li>Log. or det. <span class="egytransl">Ss</span>, "alabaster". </li><li>Det. feast. </li><li>Phon. or phon. det. <span class="egytransl">Hb</span>. </li><li>Log. <span class="egytransl">Hbt</span>, "ritual book". </li><li>Mnemonics: Hb.</li></ul>',
W3a:'<canvas class="res">W3a</canvas> W3a: alabaster basin (low).<ul><li> Use as <canvas class="res">W3</canvas> W3. </li></ul>',
W4:'<canvas class="res">W4</canvas> W4: combination of <canvas class="res">O22</canvas> O22 and <canvas class="res">W3</canvas> W3.<ul><li>Log. or det. <span class="egytransl">Hb</span>, "feast". </li><li>Det. feast. </li></ul>',
W5:'<canvas class="res">W5</canvas> W5: combination of <canvas class="res">T28</canvas> T28 and <canvas class="res">W3</canvas> W3.<ul><li>Log. <span class="egytransl">Xrj-Hbt</span>, "lector priest". </li></ul>',
W6:'<canvas class="res">W6</canvas> W6: metal vessel.<ul><li>Log. or det. <span class="egytransl">wHAt</span>, "cauldron". </li></ul>',
W7:'<canvas class="res">W7</canvas> W7: granite bowl.<ul><li>Log. or det. <span class="egytransl">mAT</span>, "granite". </li><li>Phon. det. <span class="egytransl">mAT</span>. </li><li>Det. <span class="egytransl">^Abw</span>, "Elephantine". Ex. <canvas class="res">Ab*w-W7:xAst</canvas> . </li><li>Phon. det. <span class="egytransl">Ab</span>. </li></ul>',
W8:'<canvas class="res">W8</canvas> W8: deformed granite bowl.<ul><li> Use as <canvas class="res">W7</canvas> W7. </li></ul>',
W9:'<canvas class="res">W9</canvas> W9: jug with left handle.<ul><li>Log. or det. <span class="egytransl">nXnm</span>, "nechnem-vase". </li><li>Phon. <span class="egytransl">Xnm</span>. </li><li>Mnemonics: Xnm.</li></ul>',
W9a:'<canvas class="res">W9a</canvas> W9a: jug with right handle.<ul><li> Use as <canvas class="res">W9</canvas> W9. </li></ul>',
W10:'<canvas class="res">W10</canvas> W10: cup.<ul><li>Det. cup. </li><li>Log. or det. <span class="egytransl">jab</span>, "cup". </li><li>Phon. or phon. det. <span class="egytransl">jab</span>. </li><li>Phon. or phon. det. <span class="egytransl">ab</span>. </li><li>Log. or det. <span class="egytransl">wsx</span>, "cup". </li><li>Phon. or phon. det. <span class="egytransl">wsx</span>. </li><li>Phon. det. <span class="egytransl">sxw</span>. </li><li>Log. or det. <span class="egytransl">Hnwt</span>, "cup". </li><li>Phon. <span class="egytransl">Hnt</span>. </li><li> Use as <canvas class="res">N41</canvas> N41 [Phon. <span class="egytransl">bjA</span>]. </li><li>Mnemonics: iab.</li></ul>',
W10a:'<canvas class="res">W10a</canvas> W10a: pot with tick.<ul><li>Phon. or phon. det. <span class="egytransl">bA</span>. </li></ul>',
W11:'<canvas class="res">W11</canvas> W11: round ring stand.<ul><li>Log. or det. <span class="egytransl">nst</span>, "seat". </li><li>Phon. <span class="egytransl">g</span>. </li><li> Use as <canvas class="res">W13</canvas> W13 [Log. or det. <span class="egytransl">dSrt</span>, "earthenware pot"]. </li><li> Use as <canvas class="res">O45</canvas> O45. </li><li>Mnemonics: nzt, g.</li></ul>',
W12:'<canvas class="res">W12</canvas> W12: square ring stand.<ul><li> Use as <canvas class="res">W11</canvas> W11. </li></ul>',
W13:'<canvas class="res">W13</canvas> W13: earthenware pot.<ul><li>Log. or det. <span class="egytransl">dSrt</span>, "earthenware pot". </li><li> Use as <canvas class="res">N34</canvas> N34. </li></ul>',
W14:'<canvas class="res">W14</canvas> W14: water jar.<ul><li>Log. or det. <span class="egytransl">Hst</span>, "water jar". </li><li>Phon. <span class="egytransl">Hs</span>. </li><li>Det. jar. </li><li>Mnemonics: Hz.</li></ul>',
W14a:'<canvas class="res">W14a</canvas> W14a: combination of <canvas class="res">V28</canvas> V28, <canvas class="res">W14</canvas> W14 and <canvas class="res">O34</canvas> O34 .<ul><li>Phon. <span class="egytransl">Hs</span>. </li></ul>',
W15:'<canvas class="res">W15</canvas> W15: water jar with water.<ul><li>Det. <span class="egytransl">qbb</span>, "cool". </li><li>Log. or det. <span class="egytransl">qbH</span>, "cool". </li></ul>',
W16:'<canvas class="res">W16</canvas> W16: water jar with water in ring stand.<ul><li>Log. or det. <span class="egytransl">qbH</span>, "cool". </li><li>Det. <span class="egytransl">qbb</span>, "cool". </li></ul>',
W17:'<canvas class="res">W17</canvas> W17: three water jars in rack.<ul><li>Log. <span class="egytransl">xnt</span>, "rack". </li><li>Phon. <span class="egytransl">xnt</span>. </li><li>Mnemonics: xnt.</li></ul>',
W17a:'<canvas class="res">W17a</canvas> W17a: three water jars in rack (simplified).<ul><li> Use as <canvas class="res">W17</canvas> W17. </li></ul>',
W18:'<canvas class="res">W18</canvas> W18: four water jars in rack.<ul><li> Use as <canvas class="res">W17</canvas> W17. </li></ul>',
W18a:'<canvas class="res">W18a</canvas> W18a: four water jars in rack (simplified).<ul><li> Use as <canvas class="res">W17</canvas> W17. </li></ul>',
W19:'<canvas class="res">W19</canvas> W19: milk jug in net.<ul><li>Log. or det. <span class="egytransl">mhr</span>, "milk jug". </li><li>Phon. <span class="egytransl">mr</span>, <span class="egytransl">mj</span>. </li><li>Mnemonics: mi.</li></ul>',
W20:'<canvas class="res">W20</canvas> W20: milk jug with leaf.<ul><li>Log. or det. <span class="egytransl">jrTt</span>, "milk". </li></ul>',
W21:'<canvas class="res">W21</canvas> W21: twin wine jars.<ul><li>Log. or det. <span class="egytransl">jrp</span>, "wine". </li></ul>',
W22:'<canvas class="res">W22</canvas> W22: beer jug.<ul><li>Log. or det. <span class="egytransl">Hnqt</span>, "beer". </li><li>Det. pot, fluid, measure, tribute. </li><li>Log. or det. <span class="egytransl">wdpw</span>, "butler". </li><li>Mnemonics: Hnqt.</li></ul>',
W23:'<canvas class="res">W23</canvas> W23: jar with handles.<ul><li> Use as <canvas class="res">W22</canvas> W22. </li></ul>',
W24:'<canvas class="res">W24</canvas> W24: bowl.<ul><li>Phon. <span class="egytransl">nw</span>. </li><li><canvas class="res">W24a</canvas> Phon. <span class="egytransl">nw</span>. </li><li>Phon. <span class="egytransl">jn</span>. </li><li><canvas class="res">Aa27-W24</canvas> Phon. <span class="egytransl">nD</span>. </li><li><canvas class="res">W24:N35a</canvas> Log. <span class="egytransl">m-Xnw</span>, "inside". </li><li>Det. <span class="egytransl">DADAt</span>, "council". Ex. <canvas class="res">DA*DA-W24*t:Aa8-A1:Z2</canvas> . </li><li>Det. <span class="egytransl">^nxbt</span>, "Nekhbet". Ex. <canvas class="res">M22*[fit]b-nw:t</canvas> . </li><li> Use as <canvas class="res">Z13</canvas> Z13 [Phon. det. <span class="egytransl">qd</span>]. </li><li> Use as <canvas class="res">W22</canvas> W22. </li><li>Mnemonics: nw.</li></ul>',
W24a:'<canvas class="res">W24a</canvas> W24a: three bowls.<ul><li> Use as 3* <canvas class="res">W24</canvas> W24. </li></ul>',
W25:'<canvas class="res">W25</canvas> W25: combination of <canvas class="res">W24</canvas> W24 and <canvas class="res">D54</canvas> D54.<ul><li>Log. <span class="egytransl">jnj</span>, "bring". </li><li>Mnemonics: ini.</li></ul>',
X1:'<canvas class="res">X1</canvas> X1: flat loaf.<ul><li>Log. <span class="egytransl">t</span>, "bread". </li><li>Phon. <span class="egytransl">t</span>. </li><li><canvas class="res">.:X1-[fit]R8</canvas> , <canvas class="res">R8-X1</canvas> Log. <span class="egytransl">jt-nTr</span>, "god&amp;apos;s father (title)". </li><li>(group-writing) <canvas class="res">X1:X2-X4b:Z2</canvas> , <canvas class="res">X1*X2:X4b</canvas> Phon. <span class="egytransl">t</span>. </li><li>Mnemonics: t.</li></ul>',
X2:'<canvas class="res">X2</canvas> X2: tall loaf.<ul><li>Det. bread. </li><li><canvas class="res">X2*W22</canvas> , <canvas class="res">X2*W22:X4b</canvas> Det. food. </li><li>Log. <span class="egytransl">^DHwtj</span>, "Thoth". Ex. <canvas class="res">X2-A40</canvas> . </li><li>Log. <span class="egytransl">^gb</span>, "Geb". Ex. <canvas class="res">X2-A40</canvas> . </li><li>Log. <span class="egytransl">^jnpw</span>, "Anubis". Ex. <canvas class="res">X2-A40</canvas> . </li><li><canvas class="res">.:X2-[fit]R8</canvas> Log. <span class="egytransl">jt-nTr</span>, "god&amp;apos;s father (title)". </li></ul>',
X3:'<canvas class="res">X3</canvas> X3: tall loaf.<ul><li> Use as <canvas class="res">X2</canvas> X2. </li><li> Use as <canvas class="res">N34</canvas> N34. </li></ul>',
X4:'<canvas class="res">X4</canvas> X4: roll of bread.<ul><li>Det. bread, food. </li><li>Phon. det. <span class="egytransl">sn</span>. </li><li>Log. or det. <span class="egytransl">fqA</span>, "cake". </li><li>Phon. det. <span class="egytransl">fqA</span>. </li><li> Use as <canvas class="res">W3</canvas> W3 [Det. feast]. </li></ul>',
X4a:'<canvas class="res">X4a</canvas> X4a: roll of bread.<ul><li> Use as <canvas class="res">X4</canvas> X4. </li></ul>',
X4b:'<canvas class="res">X4b</canvas> X4b: roll of bread.<ul><li> Use as <canvas class="res">X4</canvas> X4. </li><li>Do not confuse with: <canvas class="res">N18</canvas> N18, <canvas class="res">S26a</canvas> S26a, <canvas class="res">Z8</canvas> Z8. </li></ul>',
X5:'<canvas class="res">X5</canvas> X5: hieratic roll of bread.<ul><li> Use as <canvas class="res">X4</canvas> X4 [Det. bread, food]. </li><li> Use as <canvas class="res">X4</canvas> X4 [Phon. det. <span class="egytransl">sn</span>]. </li></ul>',
X6:'<canvas class="res">X6</canvas> X6: round loaf.<ul><li>Log. or det. <span class="egytransl">pAt</span>, "loaf". </li><li>Phon. det. <span class="egytransl">pAt</span>. </li></ul>',
X6a:'<canvas class="res">X6a</canvas> X6a: round loaf.<ul><li> Use as <canvas class="res">X6</canvas> X6. </li></ul>',
X7:'<canvas class="res">X7</canvas> X7: half-loaf.<ul><li><canvas class="res">X7:X7-A2</canvas> , <canvas class="res">X7:X7</canvas> Log. or det. <span class="egytransl">wnm</span>, "eat". </li><li><canvas class="res">X7:X7-A2</canvas> , <canvas class="res">X7:X7</canvas> Det. eat. </li><li>Det. <span class="egytransl">snw</span>, "food offerings". </li><li>Do not confuse with: <canvas class="res">N29</canvas> N29. </li></ul>',
X8:'<canvas class="res">X8</canvas> X8: conical loaf.<ul><li>Log. <span class="egytransl">Dj</span>, "give". </li><li><canvas class="res">D21-X8</canvas> Log. <span class="egytransl">rDj</span>, "give". </li><li>Log. <span class="egytransl">jmj</span>, "give!". Ex. <canvas class="res">X8</canvas> , <canvas class="res">X8-G17-D37</canvas> , <canvas class="res">M17*X8</canvas> . </li><li>Phon. <span class="egytransl">d</span>. </li><li>Log. * <span class="egytransl">djw</span>, "provisions". Ex. <canvas class="res">X8-U9:[sep=0.2]Z2</canvas> . </li><li>Mnemonics: rdi, di.</li></ul>',
X8a:'<canvas class="res">X8a</canvas> X8a: hieratic conical loaf.<ul><li> Use as <canvas class="res">X8</canvas> X8. </li><li>Do not confuse with: <canvas class="res">M44</canvas> M44. </li></ul>',
Y1:'<canvas class="res">Y1</canvas> Y1: scroll with ties.<ul><li>Log. or det. <span class="egytransl">mDAt</span>, "papyrus roll". </li><li>Phon. <span class="egytransl">mDAt</span>. </li><li>Det. writing and what is written, abstract notions. </li><li>Log. <span class="egytransl">dmD</span>, "total". </li><li>Mnemonics: mDAt.</li></ul>',
Y1a:'<canvas class="res">Y1a</canvas> Y1a: vertical scroll with ties.<ul><li> Use as <canvas class="res">Y1</canvas> Y1. </li></ul>',
Y2:'<canvas class="res">Y2</canvas> Y2: scroll.<ul><li> Use as <canvas class="res">Y1</canvas> Y1. </li><li>Do not confuse with: <canvas class="res">Aa29</canvas> Aa29. </li></ul>',
Y3:'<canvas class="res">Y3</canvas> Y3: scribe&amp;apos;s outfit with palette on left.<ul><li>Log. or det. <span class="egytransl">mnhD</span>, "scribe&amp;apos;s outfit". </li><li>Log. or det. <span class="egytransl">sS</span>, "writing". </li><li>Det. <span class="egytransl">naa</span>, "smooth". Ex. <canvas class="res">n:a:a-Y3-Y1a</canvas> . </li><li>Log. <span class="egytransl">snaa</span>, "made smooth". Ex. <canvas class="res">Y3-Y1a</canvas> . </li><li>Det. <span class="egytransl">Tms</span>, "red". Ex. <canvas class="res">T-m*s-Y3</canvas> . </li><li>Phon. det. <span class="egytransl">Tms</span>. </li><li>Mnemonics: mnhd, zS.</li></ul>',
Y4:'<canvas class="res">Y4</canvas> Y4: scribe&amp;apos;s outfit with palette on right.<ul><li> Use as <canvas class="res">Y3</canvas> Y3. </li></ul>',
Y5:'<canvas class="res">Y5</canvas> Y5: game board.<ul><li>Phon. <span class="egytransl">mn</span>. </li><li>Mnemonics: mn.</li></ul>',
Y6:'<canvas class="res">Y6</canvas> Y6: game piece.<ul><li>Log. or det. <span class="egytransl">jbA</span>, "game piece". </li><li>Phon. or phon. det. <span class="egytransl">jbA</span>. </li><li>Mnemonics: ibA.</li></ul>',
Y7:'<canvas class="res">Y7</canvas> Y7: harp.<ul><li>Log. or det. <span class="egytransl">bnt</span>, "harp". </li></ul>',
Y8:'<canvas class="res">Y8</canvas> Y8: sistrum.<ul><li>Log. or det. <span class="egytransl">sSSt</span>, "sistrum". </li><li>Phon. <span class="egytransl">sxm</span>. </li><li>Mnemonics: zSSt.</li></ul>',
Z1:'<canvas class="res">Z1</canvas> Z1: stroke.<ul><li>Typ. semogram marker. </li><li>Typ. space filler. </li><li>Log. <span class="egytransl">=j</span>, "I". </li><li> Use as <canvas class="res">Z5</canvas> Z5. </li><li><canvas class="res">Z1*Z1</canvas>  Use as <canvas class="res">Z4</canvas> Z4. </li><li><canvas class="res">Z1*Z1*Z1</canvas> Typ. plurality or collectivity. </li><li><canvas class="res">Z1*Z1*Z1</canvas> Phon. <span class="egytransl">w</span>. </li><li>Do not confuse with: <canvas class="res">Z15</canvas> Z15, <canvas class="res">Z16</canvas> Z16. </li></ul>',
Z2:'<canvas class="res">Z2</canvas> Z2: three <canvas class="res">Z1</canvas> Z1 horizontally.<ul><li> Use as 3* <canvas class="res">Z1</canvas> Z1. </li></ul>',
Z2a:'<canvas class="res">Z2a</canvas> Z2a: three <canvas class="res">Z1</canvas> Z1 horizontally.<ul><li> Use as 3* <canvas class="res">Z1</canvas> Z1. </li></ul>',
Z2b:'<canvas class="res">Z2b</canvas> Z2b: three <canvas class="res">D67</canvas> D67 horizontally.<ul><li> Use as 3* <canvas class="res">Z1</canvas> Z1. </li></ul>',
Z2c:'<canvas class="res">Z2c</canvas> Z2c: three <canvas class="res">Z1</canvas> Z1 in triangular arrangement.<ul><li> Use as 3* <canvas class="res">Z1</canvas> Z1. </li></ul>',
Z2d:'<canvas class="res">Z2d</canvas> Z2d: three <canvas class="res">Z1</canvas> Z1 in triangular arrangement.<ul><li> Use as 3* <canvas class="res">Z1</canvas> Z1. </li></ul>',
Z3:'<canvas class="res">Z3</canvas> Z3: three <canvas class="res">Z1</canvas> Z1 vertically.<ul><li> Use as 3* <canvas class="res">Z1</canvas> Z1. </li></ul>',
Z3a:'<canvas class="res">Z3a</canvas> Z3a: three lying <canvas class="res">Z1</canvas> Z1 vertically.<ul><li> Use as 3* <canvas class="res">Z1</canvas> Z1. </li></ul>',
Z3b:'<canvas class="res">Z3b</canvas> Z3b: three <canvas class="res">D67</canvas> D67 vertically.<ul><li> Use as 3* <canvas class="res">Z1</canvas> Z1. </li></ul>',
Z4:'<canvas class="res">Z4</canvas> Z4: two diagonal strokes.<ul><li>Typ. duality. </li><li>Phon. <span class="egytransl">j</span>. </li><li>Typ. replaces two human figures, or signs difficult to draw. </li><li>Mnemonics: y.</li></ul>',
Z4a:'<canvas class="res">Z4a</canvas> Z4a: two <canvas class="res">Z1</canvas> Z1 horizontally.<ul><li> Use as 2* <canvas class="res">Z1</canvas> Z1. </li></ul>',
Z5:'<canvas class="res">Z5</canvas> Z5: curved diagonal stroke.<ul><li>Typ. replaces human figure, or sign difficult to draw. </li></ul>',
Z5a:'<canvas class="res">Z5a</canvas> Z5a: diagonal stroke.<ul><li> Use as <canvas class="res">Z5</canvas> Z5. </li></ul>',
Z6:'<canvas class="res">Z6</canvas> Z6: hieratic substitute for <canvas class="res">A13</canvas> A13 or <canvas class="res">A14</canvas> A14.<ul><li> Use as <canvas class="res">A13</canvas> A13. </li><li> Use as <canvas class="res">A14</canvas> A14. </li></ul>',
Z7:'<canvas class="res">Z7</canvas> Z7: hieratic quail chick.<ul><li> Use as <canvas class="res">G43</canvas> G43. </li><li>Do not confuse with: <canvas class="res">V1</canvas> V1. </li><li>Mnemonics: W.</li></ul>',
Z8:'<canvas class="res">Z8</canvas> Z8: oval.<ul><li>Det. round. </li><li>Do not confuse with: <canvas class="res">N18</canvas> N18, <canvas class="res">S26a</canvas> S26a, <canvas class="res">X4b</canvas> X4b. </li></ul>',
Z9:'<canvas class="res">Z9</canvas> Z9: diagonal cross.<ul><li>Det. break, divide, cross, answer. </li><li>Log. <span class="egytransl">Hsb</span>, "1/4". </li><li>Phon. or phon. det. <span class="egytransl">swA</span>. </li><li>Phon. or phon. det. <span class="egytransl">sD</span>. </li><li>Phon. or phon. det. <span class="egytransl">xbs</span>. </li><li>Phon. or phon. det. <span class="egytransl">Sbn</span>. </li><li>Phon. or phon. det. <span class="egytransl">wp</span>. </li><li>Phon. or phon. det. <span class="egytransl">wr</span>. </li></ul>',
Z10:'<canvas class="res">Z10</canvas> Z10: wide diagonal cross.<ul><li> Use as <canvas class="res">Z9</canvas> Z9. </li></ul>',
Z11:'<canvas class="res">Z11</canvas> Z11: cross.<ul><li>Phon. <span class="egytransl">jmj</span>. </li><li> Use as <canvas class="res">M42</canvas> M42. </li><li>Mnemonics: imi.</li></ul>',
Z12:'<canvas class="res">Z12</canvas> Z12: hieratic striking man.<ul><li>Phon. det. <span class="egytransl">Hw</span>. </li></ul>',
Z13:'<canvas class="res">Z13</canvas> Z13: circle.<ul><li>Det. round. </li><li>Phon. det. <span class="egytransl">qd</span>. </li><li>Do not confuse with: <canvas class="res">D12</canvas> D12, <canvas class="res">D67</canvas> D67, <canvas class="res">N5</canvas> N5, <canvas class="res">N33</canvas> N33, <canvas class="res">S21</canvas> S21. </li></ul>',
Z14:'<canvas class="res">Z14</canvas> Z14: indeterminable hieratic tick.<ul><li> Use as <canvas class="res">Z7</canvas> Z7. </li><li> Use as <canvas class="res">X1</canvas> X1. </li></ul>',
Z15:'<canvas class="res">Z15</canvas> Z15: long vertical stroke.<ul><li>Log. <span class="egytransl">wa</span>, "1". </li><li>Do not confuse with: <canvas class="res">Z1</canvas> Z1. </li></ul>',
Z15a:'<canvas class="res">Z15a</canvas> Z15a: ....<ul><li> Use as 2* <canvas class="res">Z15</canvas> Z15. </li></ul>',
Z15b:'<canvas class="res">Z15b</canvas> Z15b: ....<ul><li> Use as 3* <canvas class="res">Z15</canvas> Z15. </li></ul>',
Z15c:'<canvas class="res">Z15c</canvas> Z15c: ....<ul><li> Use as 4* <canvas class="res">Z15</canvas> Z15. </li></ul>',
Z15d:'<canvas class="res">Z15d</canvas> Z15d: ....<ul><li> Use as 5* <canvas class="res">Z15</canvas> Z15. </li></ul>',
Z15e:'<canvas class="res">Z15e</canvas> Z15e: ....<ul><li> Use as 6* <canvas class="res">Z15</canvas> Z15. </li></ul>',
Z15f:'<canvas class="res">Z15f</canvas> Z15f: ....<ul><li> Use as 7* <canvas class="res">Z15</canvas> Z15. </li></ul>',
Z15g:'<canvas class="res">Z15g</canvas> Z15g: ....<ul><li> Use as 8* <canvas class="res">Z15</canvas> Z15. </li></ul>',
Z15h:'<canvas class="res">Z15h</canvas> Z15h: ....<ul><li> Use as 9* <canvas class="res">Z15</canvas> Z15. </li></ul>',
Z15i:'<canvas class="res">Z15i</canvas> Z15i: ....<ul><li> Use as 5* <canvas class="res">Z15</canvas> Z15. </li></ul>',
Z16:'<canvas class="res">Z16</canvas> Z16: long horizontal stroke.<ul><li>Log. <span class="egytransl">wa</span>, "1 (in days of the month)". </li><li>Do not confuse with: <canvas class="res">Z1</canvas> Z1. </li></ul>',
Z16a:'<canvas class="res">Z16a</canvas> Z16a: ....<ul><li> Use as 2* <canvas class="res">Z16</canvas> Z16. </li></ul>',
Z16b:'<canvas class="res">Z16b</canvas> Z16b: ....<ul><li> Use as 3* <canvas class="res">Z16</canvas> Z16. </li></ul>',
Z16c:'<canvas class="res">Z16c</canvas> Z16c: ....<ul><li> Use as 4* <canvas class="res">Z16</canvas> Z16. </li></ul>',
Z16d:'<canvas class="res">Z16d</canvas> Z16d: ....<ul><li> Use as 5* <canvas class="res">Z16</canvas> Z16. </li></ul>',
Z16e:'<canvas class="res">Z16e</canvas> Z16e: ....<ul><li> Use as 6* <canvas class="res">Z16</canvas> Z16. </li></ul>',
Z16f:'<canvas class="res">Z16f</canvas> Z16f: ....<ul><li> Use as 7* <canvas class="res">Z16</canvas> Z16. </li></ul>',
Z16g:'<canvas class="res">Z16g</canvas> Z16g: ....<ul><li> Use as 8* <canvas class="res">Z16</canvas> Z16. </li></ul>',
Z16h:'<canvas class="res">Z16h</canvas> Z16h: ....<ul><li> Use as 9* <canvas class="res">Z16</canvas> Z16. </li></ul>',
Aa1:'<canvas class="res">Aa1</canvas> Aa1: basket from above.<ul><li>Phon. <span class="egytransl">x</span>. </li><li>Mnemonics: x.</li></ul>',
Aa2:'<canvas class="res">Aa2</canvas> Aa2: pustule.<ul><li>Det. bodily growths or conditions. </li><li>Log. or det. <span class="egytransl">Xpw</span>, "sculptured reliefs". </li><li>Log. or det. <span class="egytransl">Hsb</span>, "reckon". </li><li>Phon. <span class="egytransl">wHA</span>. </li><li>Log. or det. <span class="egytransl">gAwt</span>, "tribute". </li><li>Phon. det. <span class="egytransl">gAw</span>. </li><li> Use as <canvas class="res">V38</canvas> V38. </li><li> Use as <canvas class="res">F52</canvas> F52. </li><li> Use as <canvas class="res">N32</canvas> N32. </li><li> Use as <canvas class="res">W6</canvas> W6. </li><li> Use as <canvas class="res">W7</canvas> W7 [Log. or det. <span class="egytransl">mAT</span>, "granite"]. </li><li> Use as <canvas class="res">W7</canvas> W7 [Det. <span class="egytransl">^Abw</span>, "Elephantine"]. </li><li> Use as <canvas class="res">M41</canvas> M41. </li></ul>',
Aa3:'<canvas class="res">Aa3</canvas> Aa3: pustule with liquid.<ul><li>Det. soft body tissues and fluids. </li></ul>',
Aa4:'<canvas class="res">Aa4</canvas> Aa4: pot with two ticks.<ul><li> Use as <canvas class="res">W10a</canvas> W10a. </li></ul>',
Aa5:'<canvas class="res">Aa5</canvas> Aa5: navigation instrument.<ul><li>Log. or det. <span class="egytransl">Hpt</span>, "helm". </li><li>Phon. <span class="egytransl">Hp</span>. </li><li>Mnemonics: Hp.</li></ul>',
Aa6:'<canvas class="res">Aa6</canvas> Aa6: instrument.<ul><li>Det. <span class="egytransl">tmA</span>, "mat". </li><li>Phon. det. <span class="egytransl">TmA</span>. </li><li>Do not confuse with: <canvas class="res">S23</canvas> S23. </li></ul>',
Aa7:'<canvas class="res">Aa7</canvas> Aa7: instrument.<ul><li>Log. or det. <span class="egytransl">sqr</span>, "smite". </li></ul>',
Aa7a:'<canvas class="res">Aa7a</canvas> Aa7a: <canvas class="res">Aa7</canvas> Aa7 reversed.<ul><li> Use as <canvas class="res">Aa7</canvas> Aa7. </li></ul>',
Aa7b:'<canvas class="res">Aa7b</canvas> Aa7b: later equivalent of <canvas class="res">Aa7</canvas> Aa7.<ul><li> Use as <canvas class="res">Aa7</canvas> Aa7. </li></ul>',
Aa8:'<canvas class="res">Aa8</canvas> Aa8: irrigation canal.<ul><li>Log. or det. * <span class="egytransl">DAtt</span>, "estate". </li><li>Phon. det. <span class="egytransl">DAt</span>. </li><li>Phon. <span class="egytransl">qn</span>. </li><li> Use as <canvas class="res">N24</canvas> N24 [Log. or det. <span class="egytransl">spAt</span>, "district"]. </li><li> Use as <canvas class="res">V26</canvas> V26 [Phon. or phon. det. <span class="egytransl">aD</span>]. </li><li> Use as <canvas class="res">O34</canvas> O34 [Phon. <span class="egytransl">s</span>]. </li><li>Mnemonics: qn.</li></ul>',
Aa9:'<canvas class="res">Aa9</canvas> Aa9: instrument.<ul><li>Det. <span class="egytransl">xwd</span>, "rich". </li></ul>',
Aa10:'<canvas class="res">Aa10</canvas> Aa10: unknown.<ul><li>Det. <span class="egytransl">drf</span>, "writing". </li></ul>',
Aa11:'<canvas class="res">Aa11</canvas> Aa11: platform.<ul><li>Phon. <span class="egytransl">mAa</span>. </li><li><canvas class="res">Aa11:P8[rotate=270]</canvas> Log. <span class="egytransl">mAa-xrw</span>, "true of voice". </li><li>Det. <span class="egytransl">TnTAt</span>, "platform". </li><li>Mnemonics: mAa.</li></ul>',
Aa12:'<canvas class="res">Aa12</canvas> Aa12: platform.<ul><li> Use as <canvas class="res">Aa11</canvas> Aa11. </li><li>Do not confuse with: <canvas class="res">N37</canvas> N37. </li></ul>',
Aa13:'<canvas class="res">Aa13</canvas> Aa13: sharp half.<ul><li>Log. or det. <span class="egytransl">jm</span>, "rib". </li><li>Phon. <span class="egytransl">jm</span>. </li><li>Phon. <span class="egytransl">m</span>. </li><li> Use as <canvas class="res">Aa16</canvas> Aa16. </li><li>Mnemonics: im, gs, M.</li></ul>',
Aa14:'<canvas class="res">Aa14</canvas> Aa14: bent half.<ul><li> Use as <canvas class="res">Aa13</canvas> Aa13. </li></ul>',
Aa15:'<canvas class="res">Aa15</canvas> Aa15: blunt half.<ul><li> Use as <canvas class="res">Aa13</canvas> Aa13. </li></ul>',
Aa16:'<canvas class="res">Aa16</canvas> Aa16: short half.<ul><li>Log. or det. <span class="egytransl">gs</span>, "side". </li><li>Log. <span class="egytransl">1/2</span>, "half". </li><li>Phon. <span class="egytransl">gs</span>. </li></ul>',
Aa17:'<canvas class="res">Aa17</canvas> Aa17: lid.<ul><li>Log. <span class="egytransl">sA</span>, "back". </li><li>Phon. <span class="egytransl">sA</span>. </li><li>Mnemonics: sA.</li></ul>',
Aa18:'<canvas class="res">Aa18</canvas> Aa18: square lid.<ul><li> Use as <canvas class="res">Aa17</canvas> Aa17. </li><li>(group-writing) <canvas class="res">Aa18</canvas> , <canvas class="res">Aa18:Z1</canvas> Phon. <span class="egytransl">s</span>. </li></ul>',
Aa19:'<canvas class="res">Aa19</canvas> Aa19: instrument.<ul><li>Phon. det. <span class="egytransl">Hr</span>. </li><li>Det. <span class="egytransl">TAr</span>, "fasten". </li><li>Do not confuse with: <canvas class="res">V19</canvas> V19. </li></ul>',
Aa20:'<canvas class="res">Aa20</canvas> Aa20: bag.<ul><li>Phon. or phon. det. <span class="egytransl">apr</span>. </li><li>Mnemonics: apr.</li></ul>',
Aa21:'<canvas class="res">Aa21</canvas> Aa21: instrument.<ul><li>Log. or det. <span class="egytransl">wDa</span>, "sever". </li><li>Log. <span class="egytransl">^stx</span>, "Seth". </li><li>Mnemonics: wDa.</li></ul>',
Aa22:'<canvas class="res">Aa22</canvas> Aa22: combination of <canvas class="res">Aa21</canvas> Aa21 and <canvas class="res">D36</canvas> D36.<ul><li> Use as <canvas class="res">Aa21</canvas> Aa21 [Log. or det. <span class="egytransl">wDa</span>, "sever"]. </li></ul>',
Aa23:'<canvas class="res">Aa23</canvas> Aa23: high warp between stakes.<ul><li>Log. or det. <span class="egytransl">mDd</span>, "hit". </li></ul>',
Aa24:'<canvas class="res">Aa24</canvas> Aa24: low warp between stakes.<ul><li> Use as <canvas class="res">Aa23</canvas> Aa23. </li></ul>',
Aa25:'<canvas class="res">Aa25</canvas> Aa25: unknown.<ul><li>Log. <span class="egytransl">smA</span>, "clothing priest". </li></ul>',
Aa26:'<canvas class="res">Aa26</canvas> Aa26: unknown.<ul><li>Phon. det. <span class="egytransl">sbj</span>. </li></ul>',
Aa27:'<canvas class="res">Aa27</canvas> Aa27: spindle.<ul><li>Phon. <span class="egytransl">nD</span>. </li><li>Mnemonics: nD.</li></ul>',
Aa28:'<canvas class="res">Aa28</canvas> Aa28: level.<ul><li>Phon. or phon. det. <span class="egytransl">qd</span>. </li><li>Do not confuse with: <canvas class="res">D16</canvas> D16, <canvas class="res">M40</canvas> M40, <canvas class="res">M40a</canvas> M40a, <canvas class="res">P11</canvas> P11. </li><li>Mnemonics: qd.</li></ul>',
Aa29:'<canvas class="res">Aa29</canvas> Aa29: instrument.<ul><li> Use as <canvas class="res">Aa28</canvas> Aa28. </li><li>Do not confuse with: <canvas class="res">Y2</canvas> Y2. </li></ul>',
Aa30:'<canvas class="res">Aa30</canvas> Aa30: frieze.<ul><li>Log. or det. <span class="egytransl">Xkr</span>, "adorn". </li><li>Mnemonics: Xkr.</li></ul>',
Aa31:'<canvas class="res">Aa31</canvas> Aa31: frieze.<ul><li> Use as <canvas class="res">Aa30</canvas> Aa30. </li></ul>',
Aa32:'<canvas class="res">Aa32</canvas> Aa32: archaic bow.<ul><li>Log. <span class="egytransl">stj</span>, "Nubian". Ex. <canvas class="res">N17-Aa32-X1:N25</canvas> , <span class="egytransl">^tA-stj</span>, "Nubia". </li><li>Log. <span class="egytransl">stj</span>, "some mineral". </li></ul>'
};

/* uni_edit.js */

/////////////////////////////////////////////////////////////////////////////
// Edit Unicode in a web page.

// Prepare page for editing.
function ResEdit() {
	ResEdit.history = [];
	ResEdit.historySize = 0;
	ResEdit.makeFromTextSometime();
	ResEdit.makeSignMenu();
}

// Make page, from RES string, as soon as possible.
ResEdit.makeFromTextSometime =
function() {
	ResWeb.waitForFonts(function(){ ResEdit.makeFromText(); }, 0);
};
ResEdit.initText =
function(text) {
	ResEdit.history = [];
	ResEdit.historySize = 0;
	ResEdit.setUndoButtons();
	ResEdit.setValue('uni', text);
	ResEdit.makeFromText();
};
ResEdit.makeFromText =
function() {
	var uni = ResEdit.getValue('uni');
	uni.replace(/\s/, '');
	uni = Uni.SMPtoBMP(Uni.digitsToBMP(uni));
	ResEdit.makeFromUni(uni);
	ResEdit.setDirFromFragment();
	ResEdit.setPreview();
	ResEdit.setTree();
	ResEdit.setFocus();
	ResEdit.resetChars();
};
ResEdit.makeWithAddress =
function(res, address) {
	ResEdit.makeFromRes(res);
	ResEdit.setDirFromFragment();
	ResEdit.setPreview();
	ResEdit.setTree();
	ResEdit.frag.setFocusAddress(address);
	ResEdit.setFocus();
	ResEdit.resetText();
	ResEdit.treeFocus();
};
ResEdit.remake =
function() {
	ResEdit.frag.connectTree();
	var address = ResEdit.frag.getFocusAddress();
	ResEdit.makeFromRes(ResEdit.frag.toString());
	ResEdit.setPreview();
	ResEdit.setTree();
	ResEdit.frag.setFocusAddress(address);
	ResEdit.setFocus();
	ResEdit.resetText();
};
ResEdit.makeFromUni =
function(uni) {
	try {
		ResEdit.frag = uni_syntax.parse(uni);
		var error = '';
	} catch(err) {
		ResEdit.frag = res_syntax.parse('\"?\"');
		var error = 'Parsing error';
	}
	ResEdit.fragFine = ResEdit.frag.finetuneUni();
	ResEdit.setError(error);
};
ResEdit.makeFromRes =
function(res) {
	try {
		ResEdit.frag = res_syntax.parse(res);
		var error = '';
	} catch(err) {
		ResEdit.frag = res_syntax.parse('\"?\"');
		var error = 'Parsing error';
	}
	ResEdit.fragFine = ResEdit.frag.finetuneUni();
	ResEdit.setError(error);
};
ResEdit.treeFocus =
function() {
	ResEdit.getElem('tree_panel').focus();
};
ResEdit.stringFocus =
function() {
	if (ResEdit.frag.editFocus instanceof ResNote)
		ResEdit.getTextElem('string_param').focus();
};
ResEdit.nameFocus =
function() {
	if (ResEdit.frag.editFocus instanceof ResNamedglyph)
		ResEdit.getTextElem('name_param').focus();
};

// Do tree focus upon entering space, or do operation.
ResEdit.isNonName =
function(name) {
	var str = ResEdit.getValue(name);
	if (str.match(/.*\s.*/)) {
		ResEdit.setRawValue(name, str.replace(/\s/, ''));
		setTimeout(function() {ResEdit.treeFocus();}, 10); // needed for rekonq
		return true;
	} else if (str.match(/.*[\-\*\+\:\;\.\!\^]$/)) {
		ResEdit.setRawValue(name, str.replace(/.$/, ''));
		switch (str.slice(-1)) {
			case '*': ResEdit.doStar(); break;
			case '+': ResEdit.doPlus(); break;
			case ':': ResEdit.doColon(); break;
			case ';': ResEdit.doSemicolon(); break;
			case '-': ResEdit.doHyphen(); break;
		}
		return true;
	} else
		return false;
};
// As above, but just for spaces.
ResEdit.isTreeFocus =
function(name) {
	var str = ResEdit.getValue(name);
	if (str.match(/.*\s.*/)) {
		ResEdit.setRawValue(name, str.replace(/\s/, ''));
		setTimeout(function() {ResEdit.treeFocus();}, 10); // needed for rekonq
		return true;
	} else
		return false;
};

// If there is a save button in an embedded editor, set it up for
// callback.
ResEdit.prepareSave =
function() {
	const but = ResEdit.getButtonElem('save');
	if (but) {
		but.addEventListener('click', 
			function(event) { 
				if (ResEdit.saveCallBack) {
					ResEdit.saveCallBack(ResEdit.getTextElem('chars').value);
				}
			}
		);
	}
};
// Let application assign to this a function of one argument (the saved string).
ResEdit.saveCallBack = null;

window.addEventListener('DOMContentLoaded', ResEdit);
window.addEventListener('DOMContentLoaded', ResEdit.prepareSave);


///////////////////////////////////
// Undo/redo.

ResEdit.remember =
function() {
	var res = ResEdit.frag.toString();
	var address = ResEdit.frag.getFocusAddress();
	ResEdit.history = ResEdit.history.slice(0, ResEdit.historySize);
	ResEdit.history.push({res: res, address: address});
	ResEdit.historySize++;
	ResEdit.setUndoButtons();
};
ResEdit.undo =
function() {
	if (ResEdit.historySize > 0) {
		if (ResEdit.historySize === ResEdit.history.length) {
			var res = ResEdit.frag.toString();
			var address = ResEdit.frag.getFocusAddress();
			ResEdit.history.push({res: res, address: address});
		}
		var item = ResEdit.history[--ResEdit.historySize];
		ResEdit.setUndoButtons();
		var oldRes = item.res;
		var oldAddress = item.address;
		ResEdit.makeWithAddress(oldRes, oldAddress);
	}
};
ResEdit.redo =
function() {
	if (ResEdit.historySize < ResEdit.history.length-1) {
		var item = ResEdit.history[++ResEdit.historySize];
		ResEdit.setUndoButtons();
		var res = item.res;
		var address = item.address;
		ResEdit.makeWithAddress(res, address);
	}
};

///////////////////////////////////
// Common page elements.

ResEdit.getElem =                                                                       
function(property) {                                                                    
    return document.getElementById('uni_edit_' + property);                             
};                                                                                      
                                                                                        
ResEdit.getTextElem =                                                                   
function(property) {                                                                    
    return document.getElementById('uni_edit_' + property + '_text');                   
};                                                                                      
                                                                                        
ResEdit.getCheckElem =                                                                  
function(property) {                                                                    
    return document.getElementById('uni_edit_' + property + '_check');                  
};                                                                                      
                                                                                        
ResEdit.getSelectElem =                                                                 
function(property) {                                                                    
    return document.getElementById('uni_edit_' + property + '_select');                 
};                                                                                      
                                                                                        
ResEdit.getButtonElem =                                                                 
function(property) {                                                                    
    return document.getElementById('uni_edit_' + property + '_button');                 
};                                                                                      
                                                                                        
ResEdit.getParamElem =                                                                  
function(property) {                                                                    
    return document.getElementById('uni_edit_' + property + '_param');                  
};                                                                                      
                                                                                        
ResEdit.getRadioElem =                                                                  
function(property, val) {                                                               
    return document.getElementById('uni_edit_' + property + '_radio_' + val);           
};

///////////////////////////////////
// Page elements.

ResEdit.setUndoButtons =
function() {
	var undo = ResEdit.getButtonElem('undo');
	undo.disabled = ResEdit.historySize <= 0;
	var redo = ResEdit.getButtonElem('redo');
	redo.disabled = ResEdit.historySize >= ResEdit.history.length-1;
};
ResEdit.getPreviewSize =
function() {
	var elem = ResEdit.getElem('preview_size');
	return elem.options[elem.selectedIndex].text;
};
ResEdit.getTreeSize =
function() {
	var elem = ResEdit.getElem('tree_size');
	return elem.options[elem.selectedIndex].text;
};
ResEdit.getDir =
function() {
	var dirs = ['hlr', 'hrl', 'vlr', 'vrl'];
	for (var i = 0; i < dirs.length; i++)
		if (ResEdit.getElem(dirs[i]).className === 'common_edit_button_selected')
			return dirs[i];
	return 'hlr';
};
ResEdit.setDir =
function(dir) {
	if (dir === ResEdit.getDir())
		return false;
	var dirs = ['hlr', 'hrl', 'vlr', 'vrl'];
	for (var i = 0; i < dirs.length; i++)
		if (dirs[i] !== dir)
			ResEdit.getElem(dirs[i]).className = 'common_edit_button_unselected';
	ResEdit.getElem(dir).className = 'common_edit_button_selected';
	var layoutDir = 'uni_edit_' + dir;
	ResEdit.getElem('header_panel').className = layoutDir;
	ResEdit.getElem('dir_panel').className = layoutDir;
	ResEdit.getElem('tree_panel').className = layoutDir;
	ResEdit.getElem('preview_panel').className = layoutDir;
	ResEdit.getElem('res_preview').className = layoutDir;
	return true;
};
ResEdit.setDirFromFragment =
function() {
	ResEdit.setDir(ResEdit.frag.direction === null ? 'hlr' : ResEdit.frag.direction);
};
ResEdit.setPreview =
function() {
	var canvas = ResEdit.getElem('res_canvas');
	var focus = ResEdit.getElem('res_focus');
	var preview = ResEdit.getElem('res_preview');
	ResCanvas.clear(canvas);
	ResCanvas.clear(focus);
	ResCanvas.clear(preview);
	ResEdit.fragFine = ResEdit.frag.finetuneUni();
	ResEdit.rects = ResEdit.fragFine.render(canvas, ResEdit.getPreviewSize());
	focus.width = canvas.width;
	focus.height = canvas.height;
	preview.width = canvas.width;
	preview.height = canvas.height;
};
ResEdit.setFocus =
function() {
	var canvas = ResEdit.getElem('res_canvas');
	var focus = ResEdit.getElem('res_focus');
	var preview = ResEdit.getElem('res_preview');
	var focusCtx = focus.getContext('2d');
	var previewCtx = preview.getContext('2d');
	ResCanvas.clear(focus);
	ResCanvas.clear(preview);
	var address = ResEdit.frag.getFocusTopAddress();
	var rect = ResEdit.rects[address];
	focusCtx.beginPath();
	focusCtx.lineWidth = '2';
	focusCtx.strokeStyle = 'blue';
	focusCtx.rect(rect.x, rect.y, rect.width, rect.height);
	focusCtx.stroke();
	previewCtx.drawImage(canvas, 0, 0);
	previewCtx.drawImage(focus, 0, 0);
	var container = ResEdit.getElem('preview_panel');
	var containerRect = container.getBoundingClientRect();
	if (ResEdit.frag.globals.isH()) {
		var containerMiddle = containerRect.width/2;
		var rectMiddle = rect.x + rect.width/2;
		container.scrollLeft = rectMiddle - containerMiddle;
	} else {
		var containerMiddle = containerRect.height/2;
		var rectMiddle = rect.y + rect.height/2;
		container.scrollTop = rectMiddle - containerMiddle;
	}
};
ResEdit.setTree =
function() {
	var treeDiv = ResEdit.getElem('res_tree');
	new ResTree(ResEdit.frag, treeDiv, ResEdit.getTreeSize());
};
ResEdit.remakeTreeUpwardsFrom =
function(elem) {
	ResEdit.frag.prepareFocusToElem(elem);
	ResEdit.frag.connectTree();
	var treeDiv = ResEdit.getElem('res_tree');
	ResTree.remakeTreeUpwardsFrom(ResEdit.frag, treeDiv, elem);
	ResEdit.frag.finalizeFocus();
};
ResEdit.setText =
function(val) {
	ResEdit.getTextElem('uni').value = Uni.intsToHex(val);
};
ResEdit.setCharsText =
function(val) {
	ResEdit.getTextElem('chars').value = Uni.intsToSMP(val);
};
ResEdit.resetText =
function() {
	ResEdit.setText(ResEdit.frag.toUni());
	ResEdit.resetChars();
};
ResEdit.resetChars =
function() {
	ResEdit.setCharsText(ResEdit.frag.toUni());
};
ResEdit.setError =
function(message) {
	var errorField = ResEdit.getElem('uni_error');
	errorField.innerHTML = message;
};

ResEdit.getValue =
function(name) {
	return ResEdit.getTextElem(name).value;
};
ResEdit.getNameValue =
function(name, def) {
	var text = ResEdit.getTextElem(name);
	var val = text.value;
	if (!ResContext.catNameStructure.exec(val) &&
			!ResContext.nonCatNameStructure.exec(val) &&
			!ResContext.mnemonicStructure.exec(val)) {
		text.className = 'common_edit_error_text';
		val = def;
		throw 'wrong input';
	} else
		text.className = 'common_edit_input_text';
	return val;
};
ResEdit.getStringValue =
function(name, def) {
	var text = ResEdit.getTextElem(name);
	var val = text.value;
	if (/[^\t\n\r\f\b]+/.test(val)) {
		text.className = 'common_edit_input_text';
		val = ResNote.escapeString(val);
	} else {
		text.className = 'common_edit_error_text';
		val = def;
		throw 'wrong input';
	}
	return val;
};
ResEdit.getIntValue =
function(name, def) {
	var text = ResEdit.getTextElem(name);
	var val = parseInt(text.value);
	if (isNaN(val) || val < 0) {
		text.className = 'common_edit_error_text';
		val = def;
		throw 'wrong input';
	} else
		text.className = 'common_edit_input_text';
	return val;
};
ResEdit.setValue =
function(name, val) {
	var text = ResEdit.getTextElem(name);
	text.value = val;
	text.className = 'common_edit_input_text';
};
ResEdit.setRawValue =
function(name, val) {
	var text = ResEdit.getTextElem(name);
	text.value = val;
};

ResEdit.getTestedRealValue =
function(name, def, wrong) {
	var check = ResEdit.getCheckElem(name);
	var text = ResEdit.getTextElem(name);
	text.disabled = !check.checked;
	var val = parseFloat(text.value);
	if (wrong(val)) {
		text.className = 'common_edit_error_text';
		val = def;
		throw 'wrong input';
	} else
		text.className = 'common_edit_input_text';
	return check.checked ? val : def;
};
ResEdit.getRealValue =
function(name, def) {
	var wrong = function(val) { return isNaN(val) || val < 0 || val >= 10 };
	return ResEdit.getTestedRealValue(name, def, wrong);
};
ResEdit.getNonzeroRealValue =
function(name, def) {
	var wrong = function(val) { return isNaN(val) || val <= 0 || val >= 10 };
	return ResEdit.getTestedRealValue(name, def, wrong);
};
ResEdit.getLowRealValue =
function(name, def) {
	var wrong = function(val) { return isNaN(val) || val < 0 || val > 1 }
	return ResEdit.getTestedRealValue(name, def, wrong);
};
ResEdit.setRealValue =
function(name, val, unval, def) {
	var check = ResEdit.getCheckElem(name);
	var text = ResEdit.getTextElem(name);
	if (val === unval) {
		text.value = def;
		text.disabled = true;
		check.checked = false;
	} else {
		text.disabled = false;
		text.value = val;
		check.checked = true;
	}
	text.className = 'common_edit_input_text';
};

ResEdit.getRealValueWithInf =
function(name, val, def) {
	var text = ResEdit.getTextElem(name);
	if (val === null || val === 'inf')
		text.disabled = true;
	else {
		text.disabled = false;
		val = parseFloat(text.value);
		if (isNaN(val) || val <= 0 || val >= 10) {
			text.className = 'common_edit_error_text';
			val = def;
		} else
			text.className = 'common_edit_input_text';
	}
	return val;
};
ResEdit.setRealValueWithInf =
function(name, val) {
	var text = ResEdit.getTextElem(name);
	if (val === null || val === 'inf') {
		var check = ResEdit.getRadioElem(name, val);
		text.value = 1;
		text.disabled = true;
	} else {
		var check = ResEdit.getRadioElem(name, 'text');
		text.value = val;
		text.disabled = false;
	}
	check.checked = true;
};
ResEdit.getCheck =
function(name) {
	return ResEdit.getCheckElem(name).checked;
};
ResEdit.setCheck =
function(name, val) {
	var check = ResEdit.getCheckElem(name);
	check.checked = val;
};
ResEdit.getSelected =
function(name) {
	return ResEdit.getSelectElem(name).value;
};
ResEdit.setSelected =
function(name, val, def) {
	var sel = ResEdit.getSelectElem(name);
	var found = false;
	for (var i = 0; i < sel.length; i++)
		if (sel.options[i].value === val)
			found = true;
	if (found)
		sel.value = val;
	else
		sel.value = def;
};
ResEdit.getSelectedWithCheck =
function(name) {
	var check = ResEdit.getCheckElem(name);
	var sel = ResEdit.getSelectElem(name);
	sel.disabled = !check.checked;
	return check.checked ? sel.value : null;
};
ResEdit.setSelectedWithCheck =
function(name, val, def) {
	var check = ResEdit.getCheckElem(name);
	var sel = ResEdit.getSelectElem(name);
	if (val === null) {
		sel.value = def;
		sel.disabled = true;
		check.checked = false;
	} else {
		sel.disabled = false;
		sel.value = val;
		check.checked = true;
	}
};
ResEdit.setRadio =
function(name, val) {
	ResEdit.getRadioElem(name, val).checked = true;
};

///////////////////////////////////
// Parameter edits.

ResEdit.adjustName =
function(e) {
	if (ResEdit.isNonName('name_param'))
		return;
	else if (ResEdit.getValue('name_param') === 'u') {
		ResEdit.setValue('name_param', '');
		ResEdit.showSignMenu(true);
		return;
	}
	try {
		ResEdit.adjustOf('name', ResEdit.getNameValue('name_param', '\"?\"'));
	} catch(err) {};
};
ResEdit.adjustString =
function() {
	if (ResEdit.isTreeFocus('string_param'))
		return;
	try {
		ResEdit.adjustOf('str', ResEdit.getStringValue('string_param', '\"?\"'));
	} catch(err) {};
};
ResEdit.adjustType =
function() {
	ResEdit.adjustOf('type', ResEdit.getSelected('type_param'));
};
ResEdit.adjustDirection =
function(dir) {
	ResEdit.adjustOf('direction', dir);
};
ResEdit.adjustRotate =
function() {
	if (ResEdit.isTreeFocus('rotate_param'))
		return;
	try {
		var rot = ResEdit.getIntValue('rotate_param', 0) % 360;
		ResEdit.adjustOf('rotate', rot);
	} catch(err) {};
};
ResEdit.adjustScale =
function() {
	if (ResEdit.isTreeFocus('scale_param'))
		return;
	try {
		ResEdit.adjustOf('scale', ResEdit.getNonzeroRealValue('scale_param', 1));
	} catch(err) {};
};
ResEdit.adjustXscale =
function() {
	if (ResEdit.isTreeFocus('xscale_param'))
		return;
	try {
		ResEdit.adjustOf('xscale', ResEdit.getNonzeroRealValue('xscale_param', 1));
	} catch(err) {};
};
ResEdit.adjustYscale =
function() {
	if (ResEdit.isTreeFocus('yscale_param'))
		return;
	try {
		ResEdit.adjustOf('yscale', ResEdit.getNonzeroRealValue('yscale_param', 1));
	} catch(err) {};
};
ResEdit.adjustWidth =
function() {
	if (ResEdit.isTreeFocus('width_param'))
		return;
	if (ResEdit.frag.editFocus === null)
		return;
	try {
		var val = ResEdit.frag.editFocus instanceof ResModify ?
			ResEdit.getNonzeroRealValue('width_param', null) : ResEdit.getRealValue('width_param', 1);
		ResEdit.adjustOf('width', val);
	} catch(err) {};
};
ResEdit.adjustHeight =
function() {
	if (ResEdit.isTreeFocus('height_param'))
		return;
	if (ResEdit.frag.editFocus === null)
		return;
	try {
		var val = ResEdit.frag.editFocus instanceof ResModify ?
			ResEdit.getNonzeroRealValue('height_param', null) : ResEdit.getRealValue('height_param', 1);
		ResEdit.adjustOf('height', val);
	} catch(err) {};
};
ResEdit.adjustSize =
function() {
	if (ResEdit.isTreeFocus('size_param'))
		return;
	try {
		ResEdit.adjustOf('size', ResEdit.getNonzeroRealValue('size_param', 1));
	} catch(err) {};
};
ResEdit.adjustSizeInf =
function(val) {
	if (ResEdit.isTreeFocus('size_inf_param'))
		return;
	try {
		ResEdit.adjustOfOpsSize(ResEdit.getRealValueWithInf('size_inf_param', val, null));
	} catch(err) {};
};
ResEdit.adjustX =
function() {
	if (ResEdit.isTreeFocus('x_param'))
		return;
	try {
		ResEdit.adjustOf('x', ResEdit.getLowRealValue('x_param', 0.5));
	} catch(err) {};
};
ResEdit.adjustY =
function() {
	if (ResEdit.isTreeFocus('y_param'))
		return;
	try {
		ResEdit.adjustOf('y', ResEdit.getLowRealValue('y_param', 0.5));
	} catch(err) {};
};
ResEdit.adjustSep =
function() {
	if (ResEdit.isTreeFocus('sep_param'))
		return;
	try {
		ResEdit.adjustOf('sep', ResEdit.getRealValue('sep_param', null));
	} catch(err) {};
};
ResEdit.adjustAbove =
function() {
	if (ResEdit.isTreeFocus('above_param'))
		return;
	try {
		ResEdit.adjustOf('above', ResEdit.getRealValue('above_param', 0));
	} catch(err) {};
};
ResEdit.adjustBelow =
function() {
	if (ResEdit.isTreeFocus('below_param'))
		return;
	try {
		ResEdit.adjustOf('below', ResEdit.getRealValue('below_param', 0));
	} catch(err) {};
};
ResEdit.adjustBefore =
function() {
	if (ResEdit.isTreeFocus('before_param'))
		return;
	try {
		ResEdit.adjustOf('before', ResEdit.getRealValue('before_param', 0));
	} catch(err) {};
};
ResEdit.adjustAfter =
function() {
	if (ResEdit.isTreeFocus('after_param'))
		return;
	try {
		ResEdit.adjustOf('after', ResEdit.getRealValue('after_param', 0));
	} catch(err) {};
};
ResEdit.adjustColor =
function() {
	ResEdit.adjustOf('color', ResEdit.getSelectedWithCheck('color_param'));
};
ResEdit.adjustMirror =
function(val) {
	ResEdit.adjustOf('mirror', val);
};
ResEdit.adjustFit =
function(val) {
	ResEdit.adjustOf('fit', val);
};
ResEdit.adjustFirm =
function() {
	ResEdit.adjustOf('firm', ResEdit.getCheck('firm_param'));
};
ResEdit.adjustFix =
function() {
	ResEdit.adjustOf('fix', ResEdit.getCheck('fix_param'));
};
ResEdit.adjustOmit =
function() {
	ResEdit.adjustOf('omit', ResEdit.getCheck('omit_param'));
};
ResEdit.adjustCover =
function(val) {
	ResEdit.adjustOf('onunder', val);
};
ResEdit.adjustOpensep =
function() {
	if (ResEdit.isTreeFocus('opensep_param'))
		return;
	try {
		ResEdit.adjustOf('opensep', ResEdit.getRealValue('opensep_param', null));
	} catch(err) {};
};
ResEdit.adjustClosesep =
function() {
	if (ResEdit.isTreeFocus('closesep_param'))
		return;
	try {
		ResEdit.adjustOf('closesep', ResEdit.getRealValue('closesep_param', null));
	} catch(err) {};
};
ResEdit.adjustUndersep =
function() {
	if (ResEdit.isTreeFocus('undersep_param'))
		return;
	try {
		ResEdit.adjustOf('undersep', ResEdit.getRealValue('undersep_param', null));
	} catch(err) {};
};
ResEdit.adjustOversep =
function() {
	if (ResEdit.isTreeFocus('oversep_param'))
		return;
	try {
		ResEdit.adjustOf('oversep', ResEdit.getRealValue('oversep_param', null));
	} catch(err) {};
};
ResEdit.adjustPlace =
function(val) {
	ResEdit.adjustOf('place', val);
};
ResEdit.adjustShade =
function(val) {
	ResEdit.adjustOf('shade', val);
};

ResEdit.adjustFragmentDir =
function(dir) {
	var changed = ResEdit.setDir(dir);
	if (!changed)
		return;
	ResEdit.remember();
	ResEdit.frag.direction = dir;
	ResEdit.remake();
	ResEdit.treeFocus();
};

ResEdit.adjustFragmentSize =
function() {
	if (ResEdit.isTreeFocus('size'))
		return;
	try {
		var newSize = ResEdit.getNonzeroRealValue('size', null);
		if (newSize === ResEdit.frag.size)
			return;
		ResEdit.remember();
		ResEdit.frag.size = newSize;
		ResEdit.remake();
	} catch(err) {};
};

ResEdit.adjustOf =
function(prop, val) {
	if (ResEdit.frag.editFocus === null ||
				ResEdit.frag.editFocus[prop] === undefined)
		return;
	var oldVal = ResEdit.frag.editFocus[prop];
	if (val === oldVal)
		return;
	ResEdit.remember();
	ResEdit.frag.editFocus[prop] = val;
	if (ResEdit.frag.editFocus instanceof ResSwitch)
		ResEdit.frag.propagate();
	ResEdit.setPreview();
	ResEdit.setFocus();
	ResEdit.frag.redrawNodesUpwards();
	ResEdit.resetText();
};
ResEdit.adjustOfOpsSize =
function(val) {
	if (ResEdit.frag.editFocus === null ||
				ResEdit.frag.editFocus.ops === undefined ||
				ResEdit.frag.editFocus.ops[0].size === undefined)
		return;
	var oldVal = ResEdit.frag.editFocus.ops[0].size;
	if (val === oldVal)
		return;
	ResEdit.remember();
	ResEdit.frag.editFocus.ops[0].size = val;
	ResEdit.setPreview();
	ResEdit.setFocus();
	ResEdit.frag.redrawNodesUpwards();
	ResEdit.resetText();
};

// Replace the names in the two named glyphs.
// named1, named2: ResNamedglyph
ResEdit.swapNames =
function(named1, named2) {
	ResEdit.remember();
	var tmpName = named2.name;
	ResEdit.setValue('name_param', tmpName === '\"?\"' ? "" : tmpName);
	named2.name = named1.name;
	named1.name = tmpName;
	ResEdit.setPreview();
	ResEdit.setFocus();
	ResEdit.frag.redrawNodesUpwardsFrom(named2);
	ResEdit.frag.redrawNodesUpwardsFrom(named1);
	ResEdit.resetText();
};

///////////////////////////////////
// Events.

ResEdit.openHelp =
function(e) {
	window.open('res_edit_help.html', '_blank');
};
ResEdit.changeText =
function(e) {
	ResEdit.remember();
	ResEdit.makeFromText();
};
ResEdit.clearText =
function(e) {
	ResEdit.remember();
	ResEdit.setText('');
	ResEdit.setCharsText('');
	ResEdit.makeFromText();
};

///////////////////////////////////
// Events from preview and tree.

ResEdit.handlePreviewClick =
function(e) {
	var preview = ResEdit.getElem('res_preview');
	var rect = preview.getBoundingClientRect();
	var x = e.clientX - rect.left;
	var y = e.clientY - rect.top;
	for (var i = 0; i < ResEdit.rects.length; i++)
		if (ResEdit.rects[i].includes(x, y)) {
			ResEdit.frag.setFocusTopElement(i);
			ResEdit.setFocus();
			break;
		}
};

ResEdit.handleNodeClick =
function(id) {
	ResEdit.frag.setEditFocusToId(id);
	ResEdit.setFocus();
};

ResEdit.processKeyDown =
function(e) {
	switch (e.keyCode) {
		case 35: ResEdit.moveEnd(); break; // End
		case 36: ResEdit.moveStart(); break; // Home
		case 37: ResEdit.moveLeft(); break; // left
		case 38: ResEdit.moveUp(); break; // up
		case 39: ResEdit.moveRight(); break; // right
		case 40: ResEdit.moveDown(); break; // down
		case 46: ResEdit.doDelete(); break; // delete
		default: return;
	}
	e.preventDefault();
};
ResEdit.processKeyPress =
function(e) {
	switch (String.fromCharCode(e.charCode)) {
		case 'b': ResEdit.doBottom(); break;
		case 'e': ResEdit.doEnd(); break;
		case 'i': ResEdit.doInsert(); break;
		case 'n': ResEdit.doNamed(); break;
		case 'o': ResEdit.doStack(); break;
		case 's': ResEdit.doStart(); break;
		case 't': ResEdit.doTop(); break;
		case 'u': ResEdit.doSignMenu(); break;
		case 'w': ResEdit.doSwap(); break;
		case '*': ResEdit.doStar(); break;
		case '+': ResEdit.doPlus(); break;
		case ':': ResEdit.doColon(); break;
		case ';': ResEdit.doSemicolon(); break;
		case '-': ResEdit.doHyphen(); break;
		case ' ': ResEdit.nameFocus(); ResEdit.stringFocus(); break;
		default: return;
	}
	e.preventDefault();
};
ResEdit.moveEnd =
function() {
	ResEdit.frag.moveEnd();
	ResEdit.setFocus();
};
ResEdit.moveStart =
function() {
	ResEdit.frag.moveStart();
	ResEdit.setFocus();
};
ResEdit.moveLeft =
function() {
	if (ResGlobals.isRL(ResEdit.frag.direction))
		ResEdit.frag.moveRight();
	else
		ResEdit.frag.moveLeft();
	ResEdit.setFocus();
};
ResEdit.moveUp =
function() {
	ResEdit.frag.moveUp();
	ResEdit.setFocus();
};
ResEdit.moveRight =
function() {
	if (ResGlobals.isRL(ResEdit.frag.direction))
		ResEdit.frag.moveLeft();
	else
		ResEdit.frag.moveRight();
	ResEdit.setFocus();
};
ResEdit.moveDown =
function() {
	ResEdit.frag.moveDown();
	ResEdit.setFocus();
};

///////////////////////////////////
// Structural edits.

ResEdit.enableStructureButton =
function(name, b) {
	ResEdit.getButtonElem(name).disabled = b;
};
ResEdit.disableStructureButtons =
function() {
	var names = ['named', 'star', 'plus', 'colon', 'semicolon',
		'hyphen', 'stack', 'insert',
		'delete', 'swap'];
	for (var i = 0; i < names.length; i++)
		ResEdit.enableStructureButton(names[i], true);
};
ResEdit.enableStructureButtons =
function(names) {
	for (var i = 0; i < names.length; i++)
		ResEdit.enableStructureButton(names[i], false);
};

ResEdit.setParamType =
function(name) {
	ResEdit.getElem('param_type').innerHTML = name;
};
ResEdit.enableParam =
function(name, b) {
	var cl = b ? 'common_edit_hide' : 'common_edit_param_row';
	ResEdit.getParamElem(name).className = cl;
};
ResEdit.enableParamChunk =
function(name, b) {
	var cl = b ? 'common_edit_hide' : 'common_edit_param_chunk';
	ResEdit.getParamElem(name).className = cl;
};
ResEdit.disableParams =
function() {
	var names = ['name'];
	for (var i = 0; i < names.length; i++)
		ResEdit.enableParam(names[i], true);
	ResEdit.enableParamChunk('place', true);
};
ResEdit.enableParams =
function(names) {
	for (var i = 0; i < names.length; i++)
		ResEdit.enableParam(names[i], false);
};

ResEdit.doNamed =
function() {
	var foc = ResEdit.frag.editFocus;
	if (ResTree.objInClasses(foc, [null])) {
		ResEdit.remember();
		var parent = foc === null ? ResEdit.frag : foc;
		var named = new ResNamedglyph(null);
		ResTree.insertAt(parent, 0, named);
		ResEdit.frag.editFocus = named;
		ResEdit.remake();
		ResEdit.nameFocus();
	}
};

ResEdit.doStar =
function() {
	var foc = ResEdit.frag.editFocus;
	var par = foc ? foc.editParent : null;
	if (ResTree.objInClasses(foc, [ResInsert, ResNamedglyph, ResStack, ResVertgroup])) {
		if (!(par instanceof ResInsert && foc === par.group1) &&
				!ResEdit.shouldBeFlatVertgroup(foc)) {
			ResEdit.remember();
			ResEdit.frag.editFocus = ResTree.appendNamedHor(foc);
			ResEdit.remake();
			ResEdit.nameFocus();
		}
	} else if (foc instanceof ResHorgroup) {
		ResEdit.remember();
		ResEdit.frag.editFocus = ResTree.appendNamedHor(foc.groups[foc.groups.length-1].group);
		ResEdit.remake();
		ResEdit.nameFocus();
	} else if (foc instanceof ResOp) {
		if (par instanceof ResHorgroup) {
			ResEdit.remember();
			ResEdit.frag.editFocus = ResTree.appendNamedBehindOp(foc);
			ResEdit.remake();
			ResEdit.nameFocus();
		} else if (!ResEdit.shouldBeFlatVertgroup(par)) {
			ResEdit.remember();
			ResEdit.frag.editFocus = ResTree.joinGroupsIntoHor(foc);
			ResEdit.remake();
			ResEdit.treeFocus();
		}
	}
};
ResEdit.doPlus =
function() {
	var foc = ResEdit.frag.editFocus;
	var par = foc ? foc.editParent : null;
	if (ResTree.objInClasses(foc, [ResInsert, ResNamedglyph, ResStack, ResVertgroup])) {
		if (!(par instanceof ResInsert && foc === par.group1) &&
				!ResEdit.shouldBeFlatVertgroup(foc)) {
			ResEdit.remember();
			ResEdit.frag.editFocus = ResTree.prependNamedHor(foc);
			ResEdit.remake();
			ResEdit.nameFocus();
		}
	} else if (foc instanceof ResHorgroup) {
		ResEdit.remember();
		ResEdit.frag.editFocus = ResTree.prependNamedHor(foc.groups[0].group);
		ResEdit.remake();
		ResEdit.nameFocus();
	}
};
ResEdit.doColon =
function() {
	var foc = ResEdit.frag.editFocus;
	var par = foc ? foc.editParent : null;
	if (ResTree.objInClasses(foc, [ResHorgroup, ResInsert, ResNamedglyph, ResStack])) {
		if (!(par instanceof ResInsert && foc === par.group1) &&
				!ResEdit.shouldBeFlatHorgroup(foc)) {
			ResEdit.remember();
			ResEdit.frag.editFocus = ResTree.appendNamedVert(foc);
			ResEdit.remake();
			ResEdit.nameFocus();
		}
	} else if (foc instanceof ResOp) {
		if (par instanceof ResVertgroup) {
			ResEdit.remember();
			ResEdit.frag.editFocus = ResTree.appendNamedBehindOp(foc);
			ResEdit.remake();
			ResEdit.nameFocus();
		} else if (!ResEdit.shouldBeFlatHorgroup(par)) {
			ResEdit.remember();
			ResEdit.frag.editFocus = ResTree.joinGroupsIntoVert(foc);
			ResEdit.remake();
			ResEdit.treeFocus();
		}
	} else if (foc instanceof ResVertgroup) {
		ResEdit.remember();
		ResEdit.frag.editFocus = ResTree.appendNamedVert(foc.groups[foc.groups.length-1].group);
		ResEdit.remake();
		ResEdit.nameFocus();
	}
};
ResEdit.doSemicolon =
function() {
	var foc = ResEdit.frag.editFocus;
	var par = foc ? foc.editParent : null;
	if (ResTree.objInClasses(foc, [ResHorgroup, ResInsert, ResNamedglyph, ResStack])) {
		if (!(par instanceof ResInsert && foc === par.group1) &&
				!ResEdit.shouldBeFlatHorgroup(foc)) {
			ResEdit.remember();
			ResEdit.frag.editFocus = ResTree.prependNamedVert(foc);
			ResEdit.remake();
			ResEdit.nameFocus();
		}
	} else if (foc instanceof ResVertgroup) {
		ResEdit.remember();
		ResEdit.frag.editFocus = ResTree.prependNamedVert(foc.groups[0].group);
		ResEdit.remake();
		ResEdit.nameFocus();
	}
};
ResEdit.doHyphen =
function() {
	var foc = ResEdit.frag.editFocus;
	if (ResTree.objInClasses(foc, [ResHorgroup, ResInsert, ResNamedglyph, ResStack, ResVertgroup])) {
		ResEdit.remember();
		ResEdit.frag.editFocus = ResTree.appendNamedHiero(foc);
		ResEdit.remake();
		ResEdit.nameFocus();
	} else if (foc instanceof ResOp) {
		ResEdit.remember();
		ResEdit.frag.editFocus = ResTree.appendNamedBehindOpHiero(foc);
		ResEdit.remake();
		ResEdit.nameFocus();
	}
};
ResEdit.doStack =
function() {
	var foc = ResEdit.frag.editFocus;
	var par = foc ? foc.editParent : null;
	if (ResTree.objInClasses(foc, [ResHorgroup, ResNamedglyph])) {
		if (UniFragment.isFlatHorizontalGroup(foc) &&
				!ResEdit.shouldBeFlatGroup(foc)) {
			ResEdit.remember();
			ResEdit.frag.editFocus = ResTree.placeInStack(foc);
			ResEdit.remake();
			ResEdit.nameFocus();
		}
	} else if (foc instanceof ResOp) {
		if (UniFragment.isBetweenFlatGroups(foc) &&
				!ResEdit.shouldBeFlatGroup(par)) {
			ResEdit.remember();
			ResEdit.frag.editFocus = ResTree.joinGroupsIntoStack(foc);
			ResEdit.remake();
			ResEdit.treeFocus();
		}
	}
};
ResEdit.doInsert =
function() {
	var foc = ResEdit.frag.editFocus;
	var par = foc ? foc.editParent : null;
	if (ResTree.objInClasses(foc, [ResInsert, ResNamedglyph, ResStack])) {
		if (!ResEdit.shouldBeFlatGroup(foc)) {
			ResEdit.remember();
			ResEdit.frag.editFocus = ResTree.placeInInsert(foc);
			ResEdit.remake();
			ResEdit.nameFocus();
		}
	} else if (foc instanceof ResOp) {
		if (UniFragment.isAfterInsertable(foc) &&
				!ResEdit.shouldBeFlatGroup(par)) {
			ResEdit.remember();
			ResEdit.frag.editFocus = ResTree.joinGroupsIntoInsert(foc);
			ResEdit.remake();
			ResEdit.treeFocus();
		}
	}
};

ResEdit.doBottom =
function() {
	var foc = ResEdit.frag.editFocus;
	if (ResTree.objInClasses(foc, [ResInsert])) {
		if (foc.place === "ts") {
			ResEdit.remember();
			foc.place = "bs";
			ResEdit.remake();
		} else if (foc.place === "te") {
			ResEdit.remember();
			foc.place = "be";
			ResEdit.remake();
		}
	}
};
ResEdit.doEnd =
function() {
	var foc = ResEdit.frag.editFocus;
	if (ResTree.objInClasses(foc, [ResInsert])) {
		if (foc.place === "ts") {
			ResEdit.remember();
			foc.place = "te";
			ResEdit.remake();
		} else if (foc.place === "bs") {
			ResEdit.remember();
			foc.place = "be";
			ResEdit.remake();
		}
	}
};
ResEdit.doStart =
function() {
	var foc = ResEdit.frag.editFocus;
	if (ResTree.objInClasses(foc, [ResInsert])) {
		if (foc.place === "te") {
			ResEdit.remember();
			foc.place = "ts";
			ResEdit.remake();
		} else if (foc.place === "be") {
			ResEdit.remember();
			foc.place = "bs";
			ResEdit.remake();
		}
	}
};
ResEdit.doTop =
function() {
	var foc = ResEdit.frag.editFocus;
	if (ResTree.objInClasses(foc, [ResInsert])) {
		if (foc.place === "bs") {
			ResEdit.remember();
			foc.place = "ts";
			ResEdit.remake();
		} else if (foc.place === "be") {
			ResEdit.remember();
			foc.place = "te";
			ResEdit.remake();
		}
	}
};

ResEdit.doDelete =
function() {
	var foc = ResEdit.frag.editFocus;
	var par = foc ? foc.editParent : null;
	if (foc instanceof ResNamedglyph) {
		if (ResTree.objInClasses(par, [ResFragment, ResHorgroup, ResVertgroup])) {
			ResEdit.remember();
			ResEdit.frag.editFocus = ResTree.removeNode(foc)
			ResEdit.remake();
		}
	} else if (ResTree.objInClasses(foc, [ResInsert, ResStack])) {
		if (foc.group1 instanceof ResNamedglyph) {
			ResEdit.remember();
			ResEdit.frag.editFocus = ResTree.removeNode(foc)
			ResEdit.remake();
		}
	} else if (ResTree.objInClasses(foc, [ResHorgroup, ResVertgroup])) {
		if (ResTree.objInClasses(par, [ResFragment, ResHorgroup, ResVertgroup])) {
			ResEdit.remember();
			ResEdit.frag.editFocus = ResTree.removeNode(foc);
			ResEdit.remake();
		}
	}
	ResEdit.treeFocus();
};
ResEdit.doSwap =
function() {
	var foc = ResEdit.frag.editFocus;
	if (foc instanceof ResNamedglyph) {
		var named = foc.editRoot.namedGlyphs();
		var i = named.indexOf(foc);
		if (i < named.length-1)
			ResEdit.swapNames(foc, named[i+1]);
	}
	ResEdit.treeFocus();
};

ResEdit.doSignMenu =
function() {
	var foc = ResEdit.frag.editFocus;
	if (foc instanceof ResNamedglyph)
		ResEdit.showSignMenu(true);
};

ResEdit.shouldBeFlatHorgroup =
function(g) {
	var par = g ? g.editParent : null;
	var parpar = par ? par.editParent : null;
	if (g instanceof ResNamedglyph) {
		return par instanceof ResStack && g === par.group1 ||
			parpar instanceof ResStack && par === parpar.group1;
	} else if (g instanceof ResHorgroup) {
		return par instanceof ResStack && g === par.group1;
	} else
		return false;
};
ResEdit.shouldBeFlatVertgroup =
function(g) {
	var par = g ? g.editParent : null;
	var parpar = par ? par.editParent : null;
	if (g instanceof ResNamedglyph) {
		return par instanceof ResStack && g === par.group2 ||
			parpar instanceof ResStack && par === parpar.group2;
	} else if (g instanceof ResVertgroup) {
		return par instanceof ResStack && g === par.group2;
	} else
		return false;
};
ResEdit.shouldBeFlatGroup =
function(g) {
	return ResEdit.shouldBeFlatHorgroup(g) || ResEdit.shouldBeFlatVertgroup(g);
};

///////////////////////////////////
// Sign menu.

// Maps category to link in sign menu.
ResEdit.catLinks = {};
// Maps category to section in sign menu.
ResEdit.catSecs = {};
// Make sign menu.
ResEdit.makeSignMenu =
function() {
	ResContext.makeCatToNames();
	var panel = ResEdit.getElem('cats_panel');
	var menu = ResEdit.getElem('cats');
	var sections = ResEdit.getElem('cat_sections');
	var cats = ResContext.categories;
	for (var i = 0; i < cats.length; i++) {
		var cat = cats[i];
		ResEdit.makeCatMenu(menu, sections, cat);
		if (i === 0)
			var first = cat;
	}
	var extraMenu = ResEdit.getElem('extra_cats');
	cats = ResContext.extraCategories;
	for (var i = 0; i < cats.length; i++) {
		var cat = cats[i];
		ResEdit.makeCatMenu(extraMenu, sections, cat);
	}
	panel.addEventListener('keydown', function(e) { ResEdit.processMenuKey(e); }, false);
	ResEdit.showCat(first);
	ResEdit.showSignMenu(false);
	ResEdit.showSignInfo(false);
};
ResEdit.makeCatMenu =
function(menu, sections, cat) {
	var tab = document.createElement('li');
	menu.appendChild(tab);
	var link = document.createElement('a');
	tab.appendChild(link);
	link.setAttribute('href', '#');
	ResEdit.catLinks[cat] = link;
	var text = document.createTextNode(cat);
	link.appendChild(text);
	link.addEventListener('click',
		function(c) { return function(e) {
			e.preventDefault();
			ResEdit.showCat(c); }; }(cat) );
	link.addEventListener('mouseover',
		function() { ResEdit.processSignInfo('', link); } );

	var section = document.createElement('div');
	sections.appendChild(section);
	section.className = 'common_edit_cat_section';
	var names = ResContext.catToNames[cat];
	for (var j = 0; j < names.length; j++) {
		var name = names[j];
		var signLink = document.createElement('a');
		section.appendChild(signLink);
		signLink.className = 'common_edit_sign_button_link';
		signLink.setAttribute('href', '#');
		var sign = document.createElement('div');
		signLink.appendChild(sign);
		sign.className = 'common_edit_sign_button';
		var glyph = document.createElement('span');
		sign.appendChild(glyph);
		glyph.className = 'common_edit_sign_button_hi';
		var key = ResContext.hieroPoints[name];
		glyph.innerHTML = String.fromCharCode(key);
		var label = document.createElement('span');
		sign.appendChild(label);
		label.className = 'common_edit_sign_button_label';
		label.innerHTML = name;
		signLink.addEventListener('mouseover', function(n,g) {
			return function() { ResEdit.processSignInfo(n,g); }; }(name,glyph) );
		signLink.addEventListener('click', function(n,g) {
			return function(e) { e.preventDefault(); ResEdit.chooseSign(n); }; }(name) );
	}
	ResEdit.catSecs[cat] = section;
	return section;
};
// Show sign menu.
ResEdit.showSignMenu =
function(b) {
	var menu = ResEdit.getElem('cats_panel');
	menu.className = b ? 'common_edit_show' : 'common_edit_hide';
	ResEdit.signMenuShown = b;
	if (b) {
		menu.focus();
		var name = ResEdit.getValue('name_param');
		var parts = ResContext.catNameStructure.exec(name);
		if (parts)
			ResEdit.showCat(parts[1])
	} else
		ResEdit.treeFocus();
};
// Select category.
ResEdit.showCat =
function(cat) {
	var cats = ResContext.categoriesAndExtra;
	for (var i = 0; i < cats.length; i++)
		if (cats[i] === cat) {
			ResEdit.catLinks[cats[i]].className = 'common_edit_selected';
			ResEdit.catSecs[cats[i]].className = 'common_edit_cat_section';
		} else {
			ResEdit.catLinks[cats[i]].className = '';
			ResEdit.catSecs[cats[i]].className = 'common_edit_hide';
		}
	var chosen = ResEdit.getElem('chosen_sign');
	chosen.value = ResContext.categories.indexOf(cat) >= 0 ? cat : '';
};
ResEdit.shownCat =
function() {
	var cats = ResContext.categoriesAndExtra;
	for (var i = 0; i < cats.length; i++)
		if (ResEdit.catLinks[cats[i]].className === 'common_edit_selected')
			return cats[i];
	return -1;
};
ResEdit.showCatLeft =
function() {
	var cat = ResEdit.shownCat();
	var i = ResContext.categories.indexOf(cat);
	if (i === 0)
		return;
	else if (i > 0)
		ResEdit.showCat(ResContext.categories[i-1]);
	else {
		i = ResContext.extraCategories.indexOf(cat);
		if (i >= 1)
			ResEdit.showCat(ResContext.extraCategories[i-1]);
	}
};
ResEdit.showCatRight =
function() {
	var cat = ResEdit.shownCat();
	var i = ResContext.categories.indexOf(cat);
	if (i === ResContext.categories.length-1)
		return;
	else if (i >= 0)
		ResEdit.showCat(ResContext.categories[i+1]);
	else {
		i = ResContext.extraCategories.indexOf(cat);
		if (i >= 0 && i < ResContext.extraCategories.length-1)
			ResEdit.showCat(ResContext.extraCategories[i+1]);
	}
};
ResEdit.showCatDown =
function() {
	var cat = ResEdit.shownCat();
	var i = ResContext.categories.indexOf(cat);
	if (i >= 0)
		return;
	else
		ResEdit.showCat(ResContext.categories[0]);
};
ResEdit.showCatUp =
function() {
	var cat = ResEdit.shownCat();
	var i = ResContext.extraCategories.indexOf(cat);
	if (i >= 0)
		return;
	else
		ResEdit.showCat(ResContext.extraCategories[0]);
};
ResEdit.backspaceSign =
function() {
	var chosen = ResEdit.getElem('chosen_sign');
	chosen.value.length > 0;
	chosen.value = chosen.value.substring(0, chosen.value.length-1);
};
ResEdit.chooseTypedSign =
function() {
	var chosen = ResEdit.getElem('chosen_sign');
	if (ResContext.hieroPoints[chosen.value] !== undefined)
		ResEdit.chooseSign(chosen.value);
};
ResEdit.chooseSign =
function(name) {
	ResEdit.setValue('name_param', name);
	ResEdit.showSignMenu(false);
	ResEdit.adjustName();
};

// Show information on sign.
ResEdit.showSignInfo =
function(b) {
	var infoButton = ResEdit.getButtonElem('sign_info');
	var info = ResEdit.getElem('sign_info');
	info.className = b ? 'common_edit_show' : 'common_edit_hide';
	ResEdit.signInfoShown = b;
	infoButton.innerHTML = 'info ' + (b ? 'off' : 'on');
};
ResEdit.toggleSignInfo =
function() {
	ResEdit.showSignInfo(!ResEdit.signInfoShown);
};
// Process mouse move over menu.
ResEdit.processSignInfo =
function(name, elem) {
	if (!ResEdit.signInfoShown || !ResEdit.signMenuShown)
		return;
	var menu = ResEdit.getElem('cats_panel');
	var info = ResEdit.getElem('sign_info');
	var menuX = menu.offsetWidth / 2;
	var linkX = elem.offsetLeft + elem.offsetWidth / 2;
	if (linkX > menuX)
		info.style.left = '3%';
	else
		info.style.left = '55%';
	if (name !== '') {
		var text = ResContext.signInfo[name];
		if (text !== undefined) {
			text = text.replace('&amp;', '&');
			info.innerHTML = text;
			ResWeb.makeIn(info);
			ResWeb.mapSignsIn(info);
			ResWeb.mapTransIn(info);
		} else
			info.innerHTML = name;
	}
};

// Process key stroke in menu.
ResEdit.processMenuKey =
function(e) {
	if (ResEdit.tryProcessMenuKey(e))
		e.preventDefault();
};
ResEdit.tryProcessMenuKey =
function(e) {
	var c = e.keyCode;
	switch (c) {
		case 8: ResEdit.backspaceSign(); return true; // backspace
		case 13: ResEdit.chooseTypedSign(); return true; // enter
		case 27: ResEdit.showSignMenu(false); return true; // escape
		case 32: ResEdit.toggleSignInfo(); return true; // space
		case 37: ResEdit.showCatLeft(); return true; // left
		case 38: ResEdit.showCatUp(); return true; // up
		case 39: ResEdit.showCatRight(); return true; // right
		case 40: ResEdit.showCatDown(); return true; // down
	}
	c = String.fromCharCode(c);
	var chosen = ResEdit.getElem('chosen_sign');
	if (/^[A-Z]$/.test(c)) {
		if (chosen.value === 'N' && /^[LU]$/.test(c))
			ResEdit.showCat('N' + c);
		else if (chosen.value === 'A' && c === 'A')
			ResEdit.showCat('Aa');
		else if (/^([A-IK-Z]?|NL|NU|Aa)$/.test(chosen.value) && /^[A-IK-Z]$/.test(c))
			ResEdit.showCat(c);
		else if (/^[a-zA-Z]+[0-9]+$/.test(chosen.value))
			chosen.value = chosen.value + c.toLowerCase();
		return true;
	} else if (/^[0-9]$/.test(c)) {
		if (/^[a-zA-Z]+[0-9]*$/.test(chosen.value))
			chosen.value = chosen.value + c;
		return true;
	}
	return false;
};
