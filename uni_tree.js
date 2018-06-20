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
		div.className = 'node_label';
		var labelText = document.createTextNode(label);
		div.appendChild(labelText);
		a.appendChild(div);
	} else if (res !== null) {
		res = root.headerString() + res;
		var div = document.createElement('div');
		div.className = 'node_label';
		var canvas = document.createElement('canvas');
		try {
			var frag = res_syntax.parse(res).finetuneUni();
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
		var frag = res_syntax.parse(res).finetuneUni();
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
			child.className = isFoc ? 'focus' : "";
			if (isFoc) {
				var container = document.getElementById('tree_panel');
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
	ResEdit.enableStructureButtons(['named']);
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
	ResEdit.setParamType('stack');
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
    // var node = ResTree.makeNode(this, '!', null);
    // this.editNode = node.li;
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
	insert.place = "te";
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
	if (ResTree.objInClasses(elem, [ResNamedglyph]))
		return ResTree.removeGroup(elem);
	else if (ResTree.objInClasses(elem, [ResHorgroup, ResVertgroup]))
		return ResTree.replaceGroups(elem, elem.subGroups(), elem.ops, elem.switches);
	else if (ResTree.objInClasses(elem, [ResInsert, ResStack]))
		return ResTree.replaceGroups(elem, 
			[elem.group1], [], []);
	else if (elem instanceof ResBox) {
		var hiero =  elem.hiero;
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
	insert.place = "te";
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
	if (parent instanceof ResFragment) {
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
	} 
};
