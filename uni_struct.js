ResContext.hieroReversePoints = {};
for (var code in ResContext.hieroPoints)
    ResContext.hieroReversePoints[ResContext.hieroPoints[code]] = code;

function UniFragment() {
}

UniFragment.vertCode = 0x13430;
UniFragment.horCode = 0x13431;
UniFragment.stCode = 0x13432;
UniFragment.sbCode = 0x13433;
UniFragment.etCode = 0x13434;
UniFragment.ebCode = 0x13435;
UniFragment.overlayCode = 0x13436;
UniFragment.beginCode = 0x13437;
UniFragment.endCode = 0x13438;
UniFragment.openCode = 0x13379;
UniFragment.closeCode = 0x1337A;

UniFragment.vertStr = "&#" + UniFragment.vertCode + ";";
UniFragment.horStr = "&#" + UniFragment.horCode + ";";
UniFragment.stStr = "&#" + UniFragment.stCode + ";";
UniFragment.sbStr = "&#" + UniFragment.sbCode + ";";
UniFragment.etStr = "&#" + UniFragment.etCode + ";";
UniFragment.ebStr = "&#" + UniFragment.ebCode + ";";
UniFragment.overlayStr = "&#" + UniFragment.overlayCode + ";";
UniFragment.beginStr = "&#" + UniFragment.beginCode + ";";
UniFragment.endStr = "&#" + UniFragment.endCode + ";";
UniFragment.openStr = "&#" + UniFragment.openCode + ";";
UniFragment.closeStr = "&#" + UniFragment.closeCode + ";";

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
	if (!UniFragment.isSign(g1) && !UniFragment.isFlatHorizontalGroup(g1))
		throw new Error("Wrong first argument of stack");
	if (!UniFragment.isSign(g2) && !UniFragment.isFlatVerticalGroup(g2))
		throw new Error("Wrong second argument of stack");
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
	if (!(g instanceof ResHorgroup))
		return false;
	else {
		for (var i = 0; i < g.groups.length; i++)
			if (!(g.groups[i] instanceof ResNamedglyph))
				return false;
		return true;
	}
};

UniFragment.isFlatVerticalGroup =
function(g) { 
	if (!(g instanceof ResVertgroup))
		return false;
	else {
		for (var i = 0; i < g.groups.length; i++)
			if (!(g.groups[i] instanceof ResNamedglyph))
				return false;
		return true;
	}
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
		return "";
};
ResHieroglyphic.prototype.toUni =
function() {
	var s = this.groups[0].toUni();
	for (var i = 0; i < this.ops.length; i++)
		s += this.groups[i+1].toUni();
	return s;
};
ResVertgroup.prototype.toUni =
function() {
	var s = this.groups[0].toUni();
	for (var i = 0; i < this.ops.length; i++)
		s += UniFragment.vertStr + this.groups[i+1].toUni();
	return s;
};
ResVertsubgroup.prototype.toUni =
function() {
	return this.group.toUni();
};
ResHorgroup.prototype.toUni =
function() {
	var s = this.groups[0].toUni();
	for (var i = 0; i < this.ops.length; i++)
		s += UniFragment.horStr + this.groups[i+1].toUni();
	return s;
};
ResHorsubgroup.prototype.toUni =
function() {
	if (this.group instanceof ResVertgroup)
		return UniFragment.beginStr + this.group.toUni() + UniFragment.endStr;
	else
		return this.group.toUni();
};
ResNamedglyph.prototype.toUni =
function() {
	var context = new ResContext();
	var key = context.mnemonics[this.name];
	key = key ? key : this.name;
	key = context.hieroPoints[key];
	key = key - 0xE000 + 0x13000; // 
    return "&#" + key + ";";
};
ResEmptyglyph.prototype.toUni =
function() {
	throw new Error("Cannot translate empty");
};
ResBox.prototype.toUni =
function() {
	return UniFragment.openStr + (this.hiero ? this.hiero.toUni() : "") + UniFragment.closeStr;
};
ResStack.prototype.toUni =
function() {
	var arg1 = this.group1 instanceof ResNamedglyph ?
		this.group1.toUni() :
		UniFragment.beginStr + this.group1.toUni() + UniFragment.endStr;
	var arg2 = this.group2 instanceof ResNamedglyph ?
		this.group2.toUni() :
		UniFragment.beginStr + this.group2.toUni() + UniFragment.endStr;
	return arg1 + UniFragment.overlayStr + arg2;
};
ResInsert.prototype.toUni =
function() {
	var arg2 = this.group2 instanceof ResNamedglyph ?
		this.group2.toUni() :
		UniFragment.beginStr + this.group2.toUni() + UniFragment.endStr;
	if (this.place === "ts")
		return this.group1.toUni() + UniFragment.stStr + arg2;
	else if (this.place === "bs")
		return this.group1.toUni() + UniFragment.sbStr + arg2;
	else if (this.place === "te")
		return this.group1.toUni() + UniFragment.etStr + arg2;
	else 
		return this.group1.toUni() + UniFragment.ebStr + arg2;
};
ResModify.prototype.toUni =
function() {
	return this.group.toUni();
};

