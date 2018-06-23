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
	var key = context.unMnemonic(safeName);
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
