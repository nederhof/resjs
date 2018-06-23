/////////////////////////////////////////////////////////////////////////////
// Edit RES in a web page.

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
	document.getElementById('tree_panel').focus();
};
ResEdit.stringFocus =
function() {
	if (ResEdit.frag.editFocus instanceof ResNote)
		document.getElementById('string_param_text').focus();
};
ResEdit.nameFocus =
function() {
	if (ResEdit.frag.editFocus instanceof ResNamedglyph)
		document.getElementById('name_param_text').focus();
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

window.addEventListener('DOMContentLoaded', ResEdit);

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
// Page elements.

ResEdit.setUndoButtons =
function() {
	var undo = document.getElementById('undo_button');
	undo.disabled = ResEdit.historySize <= 0;
	var redo = document.getElementById('redo_button');
	redo.disabled = ResEdit.historySize >= ResEdit.history.length-1;
};
ResEdit.getPreviewSize =
function() {
	var elem = document.getElementById('preview_size');
	return elem.options[elem.selectedIndex].text;
};
ResEdit.getTreeSize =
function() {
	var elem = document.getElementById('tree_size');
	return elem.options[elem.selectedIndex].text;
};
ResEdit.getDir =
function() {
	var dirs = ['hlr', 'hrl', 'vlr', 'vrl'];
	for (var i = 0; i < dirs.length; i++)
		if (document.getElementById(dirs[i]).className === 'button_selected')
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
			document.getElementById(dirs[i]).className = 'button_unselected';
	document.getElementById(dir).className = 'button_selected';
	var layoutDir = dir;
	document.getElementById('header_panel').className = layoutDir;
	document.getElementById('dir_panel').className = layoutDir;
	document.getElementById('tree_panel').className = layoutDir;
	document.getElementById('preview_panel').className = layoutDir;
	document.getElementById('res_preview').className = layoutDir;
	return true;
};
ResEdit.setDirFromFragment =
function() {
	ResEdit.setDir(ResEdit.frag.direction === null ? 'hlr' : ResEdit.frag.direction);
};
ResEdit.setPreview =
function() {
	var canvas = document.getElementById('res_canvas');
	var focus = document.getElementById('res_focus');
	var preview = document.getElementById('res_preview');
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
	var canvas = document.getElementById('res_canvas');
	var focus = document.getElementById('res_focus');
	var preview = document.getElementById('res_preview');
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
	var container = document.getElementById('preview_panel');
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
	var treeDiv = document.getElementById('res_tree');
	new ResTree(ResEdit.frag, treeDiv, ResEdit.getTreeSize());
};
ResEdit.remakeTreeUpwardsFrom =
function(elem) {
	ResEdit.frag.prepareFocusToElem(elem);
	ResEdit.frag.connectTree();
	var treeDiv = document.getElementById('res_tree');
	ResTree.remakeTreeUpwardsFrom(ResEdit.frag, treeDiv, elem);
	ResEdit.frag.finalizeFocus();
};
ResEdit.setText =
function(val) {
	document.getElementById('uni_text').value = Uni.intsToHex(val);
};
ResEdit.setCharsText =
function(val) {
	document.getElementById('chars_text').value = Uni.intsToSMP(val);
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
	var errorField = document.getElementById('uni_error');
	errorField.innerHTML = message;
};

ResEdit.getValue =
function(name) {
	var text = document.getElementById(name + '_text');
	return text.value;
};
ResEdit.getNameValue =
function(name, def) {
	var text = document.getElementById(name + '_text');
	var val = text.value;
	if (!ResContext.catNameStructure.exec(val) &&
			!ResContext.nonCatNameStructure.exec(val) &&
			!ResContext.mnemonicStructure.exec(val)) {
		text.className = 'error_text';
		val = def;
		throw 'wrong input';
	} else 
		text.className = 'input_text';
	return val;
};
ResEdit.getStringValue =
function(name, def) {
	var text = document.getElementById(name + '_text');
	var val = text.value;
	if (/[^\t\n\r\f\b]+/.test(val)) {
		text.className = 'input_text';
		val = ResNote.escapeString(val);
	} else {
		text.className = 'error_text';
		val = def;
		throw 'wrong input';
	} 
	return val;
};
ResEdit.getIntValue =
function(name, def) {
	var text = document.getElementById(name + '_text');
	var val = parseInt(text.value);
	if (isNaN(val) || val < 0) {
		text.className = 'error_text';
		val = def;
		throw 'wrong input';
	} else 
		text.className = 'input_text';
	return val;
};
ResEdit.setValue =
function(name, val) {
	var text = document.getElementById(name + '_text');
	text.value = val;
	text.className = 'input_text';
};
ResEdit.setRawValue =
function(name, val) {
	var text = document.getElementById(name + '_text');
	text.value = val;
};

ResEdit.getTestedRealValue =
function(name, def, wrong) {
	var check = document.getElementById(name + '_check');
	var text = document.getElementById(name + '_text');
	text.disabled = !check.checked;
	var val = parseFloat(text.value);
	if (wrong(val)) {
		text.className = 'error_text';
		val = def;
		throw 'wrong input';
	} else 
		text.className = 'input_text';
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
	var check = document.getElementById(name + '_check');
	var text = document.getElementById(name + '_text');
	if (val === unval) {
		text.value = def;
		text.disabled = true;
		check.checked = false;
	} else {
		text.disabled = false;
		text.value = val;
		check.checked = true;
	}
	text.className = 'input_text';
};

ResEdit.getRealValueWithInf =
function(name, val, def) {
	var text = document.getElementById(name + '_text');
	if (val === null || val === 'inf') 
		text.disabled = true;
	else {
		text.disabled = false;
		val = parseFloat(text.value);
		if (isNaN(val) || val <= 0 || val >= 10) {
			text.className = 'error_text';
			val = def;
		} else 
			text.className = 'input_text';
	}
	return val;
};
ResEdit.setRealValueWithInf =
function(name, val) {
	var text = document.getElementById(name + '_text');
	if (val === null || val === 'inf') {
		var check = document.getElementById(name + '_radio_' + val);
		text.value = 1;
		text.disabled = true;
	} else {
		var check = document.getElementById(name + '_radio_text');
		text.value = val;
		text.disabled = false;
	}
	check.checked = true;
};
ResEdit.getCheck =
function(name) {
	return document.getElementById(name + '_check').checked;
};
ResEdit.setCheck =
function(name, val) {
	var check = document.getElementById(name + '_check');
	check.checked = val;
};
ResEdit.getSelected =
function(name) {
	return document.getElementById(name + '_select').value;
};
ResEdit.setSelected =
function(name, val, def) {
	var sel = document.getElementById(name + '_select');
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
	var check = document.getElementById(name + '_check');
	var sel = document.getElementById(name + '_select');
	sel.disabled = !check.checked;
	return check.checked ? sel.value : null;
};
ResEdit.setSelectedWithCheck =
function(name, val, def) {
	var check = document.getElementById(name + '_check');
	var sel = document.getElementById(name + '_select');
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
	document.getElementById(name + '_radio_' + val).checked = true;
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
	window.open('edit_help.html', '_blank');
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
	var preview = document.getElementById('res_preview');
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
	document.getElementById(name + '_button').disabled = b;
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
	document.getElementById('param_type').innerHTML = name;
};
ResEdit.enableParam =
function(name, b) { 
	var cl = b ? 'hide' : 'param_row';
	document.getElementById(name + '_param').className = cl;
};
ResEdit.enableParamChunk =
function(name, b) { 
	var cl = b ? 'hide' : 'param_chunk';
	document.getElementById(name + '_param').className = cl;
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
	var panel = document.getElementById('cats_panel');
	var menu = document.getElementById('cats');
	var sections = document.getElementById('cat_sections');
	var cats = ResContext.categories;
	for (var i = 0; i < cats.length; i++) {
		var cat = cats[i];
		ResEdit.makeCatMenu(menu, sections, cat);
		if (i === 0)
			var first = cat;
	}
	var extraMenu = document.getElementById('extra_cats');
	cats = ResContext.extraCategories;
	for (var i = 0; i < cats.length; i++) {
		var cat = cats[i];
		ResEdit.makeCatMenu(extraMenu, sections, cat);
	}
	cats_panel.addEventListener('keydown', function(e) { ResEdit.processMenuKey(e); }, false);
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
	section.className = 'cat_section';
	var names = ResContext.catToNames[cat];
	for (var j = 0; j < names.length; j++) {
		var name = names[j];
		var signLink = document.createElement('a');
		section.appendChild(signLink);
		signLink.className = 'sign_button_link';
		signLink.setAttribute('href', '#');
		var sign = document.createElement('div');
		signLink.appendChild(sign);
		sign.className = 'sign_button';
		var glyph = document.createElement('span');
		sign.appendChild(glyph);
		glyph.className = 'sign_button_hi';
		var key = ResContext.hieroPoints[name];
		glyph.innerHTML = String.fromCharCode(key);
		var label = document.createElement('span');
		sign.appendChild(label);
		label.className = 'sign_button_label';
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
	var menu = document.getElementById('cats_panel');
	menu.className = b ? 'show' : 'hide';
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
			ResEdit.catLinks[cats[i]].className = 'selected';
			ResEdit.catSecs[cats[i]].className = 'cat_section';
		} else {
			ResEdit.catLinks[cats[i]].className = '';
			ResEdit.catSecs[cats[i]].className = 'hide';
		}
	var chosen = document.getElementById('chosen_sign');
	chosen.value = ResContext.categories.indexOf(cat) >= 0 ? cat : '';
};
ResEdit.shownCat =
function() {
	var cats = ResContext.categoriesAndExtra;
	for (var i = 0; i < cats.length; i++) 
		if (ResEdit.catLinks[cats[i]].className === 'selected')
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
	var chosen = document.getElementById('chosen_sign');
	chosen.value.length > 0;
	chosen.value = chosen.value.substring(0, chosen.value.length-1);
};
ResEdit.chooseTypedSign =
function() {
	var chosen = document.getElementById('chosen_sign');
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
	var infoButton = document.getElementById('sign_info_button');
	var info = document.getElementById('sign_info');
	info.className = b ? 'show' : 'hide';
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
	var menu = document.getElementById('cats_panel');
	var info = document.getElementById('sign_info');
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
	var chosen = document.getElementById('chosen_sign');
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

