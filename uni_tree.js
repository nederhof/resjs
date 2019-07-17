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
