/////////////////////////////////////////////////////////////////////////////
// Edit RES in a web page.

// Prepare page for editing.
function ResEdit() {
	ResEdit.history = [];
	ResEdit.historySize = 0;
	ResEdit.makeFromTextSometime();
	ResEdit.makeSignMenu();
	ResEdit.frag = res_syntax.parse('\"?\"');
}

// Make page, from RES string, as soon as possible.
ResEdit.makeFromTextSometime =
function() {
	ResWeb.waitForFonts(function(){ ResEdit.makeFromText(); }, 0);
};
ResEdit.makeFromText =
function() {
	var res = ResEdit.getValue('res');
	if (res.match(/\s*\$/m)) {
		ResEdit.frag = res_syntax.parse('\"?\"');
		ResEdit.setError('Cannot edit RESlite');
	} else
		ResEdit.makeFromRes(res);
	ResEdit.setDirFromFragment();
	ResEdit.setSizeFromFragment();
	ResEdit.setPreview();
	ResEdit.setTree();
	ResEdit.setFocus();
};
ResEdit.makeWithAddress =
function(res, address) {
	ResEdit.makeFromRes(res);
	ResEdit.setDirFromFragment();
	ResEdit.setSizeFromFragment();
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
ResEdit.makeFromRes =
function(res) {
	try {
		ResEdit.frag = res_syntax.parse(res);
		var error = '';
	} catch(err) {
		ResEdit.frag = res_syntax.parse('\"?\"');
		var error = 'Parsing error';
	}
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
			case '.': ResEdit.doDot(); break;
			case '*': ResEdit.doStar(); break;
			case '+': ResEdit.doPlus(); break;
			case ':': ResEdit.doColon(); break;
			case ';': ResEdit.doSemicolon(); break;
			case '-': ResEdit.doHyphen(); break;
			case '!': ResEdit.doExcl(); break;
			case '^': ResEdit.doCaret(); break;
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
// Common page elements.

ResEdit.getElem =
function(property) {
	return document.getElementById('res_edit_' + property);
};

ResEdit.getTextElem =
function(property) {
	return document.getElementById('res_edit_' + property + '_text');
};

ResEdit.getCheckElem =
function(property) {
	return document.getElementById('res_edit_' + property + '_check');
};

ResEdit.getSelectElem =
function(property) {
	return document.getElementById('res_edit_' + property + '_select');
};

ResEdit.getButtonElem =
function(property) {
	return document.getElementById('res_edit_' + property + '_button');
};

ResEdit.getParamElem =
function(property) {
	return document.getElementById('res_edit_' + property + '_param');
};

ResEdit.getRadioElem =
function(property, val) {
	return document.getElementById('res_edit_' + property + '_radio_' + val);
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
	var dirs = ['none', 'hlr', 'hrl', 'vlr', 'vrl'];
	for (var i = 0; i < dirs.length; i++)
		if (ResEdit.getElem(dirs[i]).className === 'common_edit_button_selected')
			return dirs[i];
	return 'none';
};
ResEdit.setDir =
function(dir) {
	if (dir === ResEdit.getDir())
		return false;
	var dirs = ['none', 'hlr', 'hrl', 'vlr', 'vrl'];
	for (var i = 0; i < dirs.length; i++)
		if (dirs[i] !== dir)
			ResEdit.getElem(dirs[i]).className = 'common_edit_button_unselected';
	ResEdit.getElem(dir).className = 'common_edit_button_selected';
	var layoutDir = 'res_edit_' + (dir === 'none' ? 'hlr' : dir);
	ResEdit.getElem('header_panel').className = layoutDir;
	ResEdit.getElem('dir_panel').className = layoutDir;
	ResEdit.getElem('tree_panel').className = layoutDir;
	ResEdit.getElem('preview_panel').className = layoutDir;
	ResEdit.getElem('res_preview').className = layoutDir;
	return true;
};
ResEdit.setDirFromFragment =
function() {
	ResEdit.setDir(ResEdit.frag.direction === null ? 'none' : ResEdit.frag.direction);
};
ResEdit.setSizeFromFragment =
function() {
	ResEdit.setRealValue('size', ResEdit.frag.size, null, '1');
};
ResEdit.setPreview =
function() {
	var canvas = ResEdit.getElem('res_canvas');
	var focus = ResEdit.getElem('res_focus');
	var preview = ResEdit.getElem('res_preview');
	ResCanvas.clear(canvas);
	ResCanvas.clear(focus);
	ResCanvas.clear(preview);
	ResEdit.rects = ResEdit.frag.render(canvas, ResEdit.getPreviewSize());
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
	ResEdit.getTextElem('res').value = val;
};
ResEdit.resetText =
function() {
	ResEdit.setText(ResEdit.frag.toString());
};
ResEdit.setError =
function(message) {
	var errorField = ResEdit.getElem('res_error');
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
	ResEdit.frag.direction = dir === 'none' ? null : dir;
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
// Shades.

// Last shades that were put in grid.
ResEdit.cachedShades = [];
// Avoid having to create new buttons upon change of resolution.
// Maps id to button.
ResEdit.shadeButtons = {};
ResEdit.getShadeButtonId =
function(x, y) {
	return 'shade_button_' + x + '-' + y;
};
// Create button, unless already exists.
ResEdit.getShadeButton =
function(x, y) {
	var id = ResEdit.getShadeButtonId(x, y);
	var button = ResEdit.shadeButtons[id];
	if (button === undefined) {
		button = document.createElement('a');
		button.setAttribute('href', '#');
		button.addEventListener('click',
			function(x1,y1) { return function(e) {
				e.preventDefault();
				ResEdit.toggleShade(x1, y1); }; }(x, y) );
		button.id = id;
		button.className = 'res_edit_shade_button';
		button.classList.add('res_edit_off');
		ResEdit.shadeButtons[id] = button;
	}
	return button;
};
ResEdit.getShadeButtonValue =
function(x, y) {
	return ResEdit.getShadeButton(x, y).classList.contains('res_edit_on');
};
ResEdit.setShadeButtonValue =
function(x, y, b) {
	var button = ResEdit.getShadeButton(x, y);
	if (b) {
		button.classList.add('res_edit_on');
		button.classList.remove('res_edit_off');
	} else {
		button.classList.add('res_edit_off');
		button.classList.remove('res_edit_on');
	}
};
ResEdit.toggleShadeButtonValue =
function(x, y) {
	ResEdit.setShadeButtonValue(x, y, !ResEdit.getShadeButtonValue(x, y));
};
ResEdit.clearShadeButtonValues =
function(x, y) {
	var resol = ResEdit.getShadesResolution();
	for (var y = 0; y < resol; y++)
		for (var x = 0; x < resol; x++)
			ResEdit.setShadeButtonValue(x, y, false);
};
ResEdit.retrieveShades =
function() {
	var shades = [];
	var resol = ResEdit.getShadesResolution();
	for (var y = 0; y < resol; y++)
		for (var x = 0; x < resol; x++)
			if (ResEdit.getShadeButtonValue(x, y))
				shades.push(ResEdit.coordToShade(x, y));
	return shades;
};
ResEdit.refillShades =
function() {
	var shades = ResEdit.cachedShades;
	ResEdit.clearShadeButtonValues();
	for (var i = 0; i < shades.length; i++)
		ResEdit.fillShade(shades[i]);
};
ResEdit.fillShade =
function(shade) {
	var coords = ResEdit.shadeToCoords(shade);
	for (var i = 0; i < coords.length; i++)
		ResEdit.setShadeButtonValue(coords[i].x, coords[i].y, true)
};

ResEdit.getShadesResolution =
function() {
	var elem = ResEdit.getElem('shades_resolution');
	return elem.options[elem.selectedIndex].text;
};
ResEdit.setShadesResolution =
function(resol) {
	var elem = ResEdit.getElem('shades_resolution');
	elem.value = '' + resol;
	ResEdit.rebuildShadesGrid();
};
ResEdit.rebuildShadesGrid =
function() {
	var resol = ResEdit.getShadesResolution();
	var grid = ResEdit.getElem('shades_grid');
	while (grid.firstChild)
		grid.removeChild(grid.firstChild);
	for (var y = 0; y < resol; y++) {
		var tr = document.createElement('tr');
		grid.appendChild(tr);
		for (var x = 0; x < resol; x++) {
			var td = document.createElement('td');
			tr.appendChild(td);
			td.appendChild(ResEdit.getShadeButton(x,y));
		}
	}
	ResEdit.refillShades();
};

// Triggered directly from user interaction.
ResEdit.changeShadesResolution =
function() {
	ResEdit.rebuildShadesGrid();
};
ResEdit.toggleShade =
function(x, y) {
	ResEdit.toggleShadeButtonValue(x, y);
	ResEdit.remember();
	ResEdit.frag.editFocus.shades = ResEdit.retrieveShades();
	ResEdit.cachedShades = ResEdit.frag.editFocus.shades
	ResEdit.setPreview();
	ResEdit.setFocus();
	ResEdit.frag.redrawNodesUpwards();
	ResEdit.resetText();
};

ResEdit.setShades =
function(shades) {
	ResEdit.cachedShades = shades;
	var resol = ResEdit.shadesRes(shades);
	ResEdit.setShadesResolution(resol);
};
ResEdit.shadesRes =
function(shades) {
	var max = 2;
	for (var i = 0; i < shades.length; i++)
		max = Math.max(max, ResEdit.maxShadeRes(shades[i]));
	return Math.min(max, 16);
};
ResEdit.maxShadeRes =
function(shade) {
	var xMax = 1;
	var yMax = 1;
	for (var i = 0; i < shade.length; i++) {
		var c = shade.charAt(i);
		switch (c) {
			case 't':
			case 'b':
				yMax *= 2;
				break;
			case 's':
			case 'e':
				xMax *= 2;
				break;
		}
	}
	return Math.max(xMax, yMax);
};

ResEdit.shadeToCoords =
function(shade) {
	var xLow = 0;
	var xHigh = ResEdit.getShadesResolution();
	var yLow = 0;
	var yHigh = ResEdit.getShadesResolution();
	for (var i = 0; i < shade.length; i++) {
		var c = shade.charAt(i);
		switch (c) {
			case 't':
				if (yLow < yHigh - 1)
					yHigh -= Math.round((yHigh-yLow) / 2);
				break;
			case 'b':
				if (yLow < yHigh - 1)
					yLow += Math.round((yHigh-yLow) / 2);
				break;
			case 's':
				if (xLow < xHigh - 1)
					xHigh -= Math.round((xHigh-xLow) / 2);
				break;
			case 'e':
				if (xLow < xHigh - 1)
					xLow += Math.round((xHigh-xLow) / 2);
				break;
		}
	}
	var coords = [];
	for (var x = xLow; x < xHigh; x++)
		for (var y = yLow; y < yHigh; y++)
			coords.push({x: x, y: y});
	return coords;
};
ResEdit.coordToShade =
function(x, y) {
	var shade = '';
	var xLow = 0;
	var xHigh = ResEdit.getShadesResolution();
	while (xLow < xHigh-1) {
		xMid = xLow + Math.round((xHigh-xLow) / 2);
		if (x < xMid) {
			shade += 's';
			xHigh = xMid;
		} else {
			shade += 'e';
			xLow = xMid;
		}
	}
	var yLow = 0;
	var yHigh = ResEdit.getShadesResolution();
	while (yLow < yHigh-1) {
		yMid = yLow + Math.round((yHigh-yLow) / 2);
		if (y < yMid) {
			shade += 't';
			yHigh = yMid;
		} else {
			shade += 'b';
			yLow = yMid;
		}
	}
	return shade;
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
		case 'b': ResEdit.doBox(); break;
		case 'e': ResEdit.doEmpty(); break;
		case 'i': ResEdit.doInsert(); break;
		case 'k': ResEdit.doExclBack(); break;
		case 'm': ResEdit.doModify(); break;
		case 'n': ResEdit.doNamed(); break;
		case 's': ResEdit.doStack(); break;
		case 't': ResEdit.doExclFront(); break;
		case 'u': ResEdit.doSignMenu(); break;
		case 'w': ResEdit.doSwap(); break;
		case '.': ResEdit.doDot(); break;
		case '*': ResEdit.doStar(); break;
		case '+': ResEdit.doPlus(); break;
		case ':': ResEdit.doColon(); break;
		case ';': ResEdit.doSemicolon(); break;
		case '-': ResEdit.doHyphen(); break;
		case '!': ResEdit.doExcl(); break;
		case '^': ResEdit.doCaret(); break;
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
	var names = ['named', 'empty', 'dot', 'star', 'plus', 'colon', 'semicolon',
		'hyphen', 'box', 'stack', 'insert', 'modify', 'front', 'back', 'excl',
		'caret', 'delete', 'swap'];
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
	var names = ['name', 'string', 'type', 'mirror', 'direction', 'rotate',
		'scale', 'xscale', 'yscale', 'width', 'height', 'size', 'size_inf',
		'sep', 'opensep', 'closesep', 'undersep', 'oversep',
		'x', 'y', 'above', 'below', 'before', 'after',
		'color', 'shade',
		'fit', 'firm', 'fix', 'omit', 'cover'];
	for (var i = 0; i < names.length; i++)
		ResEdit.enableParam(names[i], true);
	ResEdit.enableParamChunk('shades', true);
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
	if (ResTree.objInClasses(foc, [null, ResBox])) {
		ResEdit.remember();
		var parent = foc === null ? ResEdit.frag : foc;
		var named = new ResNamedglyph(null);
		ResTree.insertAt(parent, 0, named);
		ResEdit.frag.editFocus = named;
		ResEdit.remake();
		ResEdit.nameFocus();
	} else if (foc instanceof ResEmptyglyph) {
		ResEdit.remember();
		var named = new ResNamedglyph(null);
		named.switchs = foc.switchs;
		ResTree.replaceGroup(foc, named);
		ResEdit.frag.editFocus = named;
		ResEdit.remake();
		ResEdit.nameFocus();
	}
};
ResEdit.doEmpty =
function() {
	ResEdit.doEmptyOrDot(1);
};
ResEdit.doDot =
function() {
	ResEdit.doEmptyOrDot(0);
};
ResEdit.doEmptyOrDot =
function(size) {
	var foc = ResEdit.frag.editFocus;
	if (ResTree.objInClasses(foc, [null, ResBox])) {
		ResEdit.remember();
		var parent = foc === null ? ResEdit.frag : foc;
		var empty = new ResEmptyglyph(null);
		empty.width = size;
		empty.height = size;
		ResTree.insertAt(parent, 0, empty);
		ResEdit.frag.editFocus = empty;
		ResEdit.remake();
		ResEdit.treeFocus();
	} else if (foc instanceof ResNamedglyph) {
		ResEdit.remember();
		var empty = new ResEmptyglyph(null);
		empty.width = 0;
		empty.height = 0;
		empty.switchs = foc.switchs;
		ResTree.replaceGroup(foc, empty);
		ResEdit.frag.editFocus = empty;
		ResEdit.remake();
		ResEdit.treeFocus();
	}
};

ResEdit.doStar =
function() {
	var foc = ResEdit.frag.editFocus;
	var par = foc ? foc.editParent : null;
	if (ResTree.objInClasses(foc, [ResBox, ResEmptyglyph, ResInsert, ResModify,
			ResNamedglyph, ResStack, ResVertgroup])) {
		ResEdit.remember();
		ResEdit.frag.editFocus = ResTree.appendNamedHor(foc);
		ResEdit.remake();
		ResEdit.nameFocus();
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
		} else {
			ResEdit.remember();
			ResEdit.frag.editFocus = ResTree.joinGroupsIntoHor(foc);
			ResEdit.remake();
			ResEdit.treeFocus();
		}
	} else if (foc instanceof ResSwitch) {
		if (par instanceof ResHorgroup) {
			ResEdit.remember();
			ResEdit.frag.editFocus = ResTree.appendNamedHorAfterSwitch(foc);
			ResEdit.remake();
			ResEdit.nameFocus();
		}
	}
};
ResEdit.doPlus =
function() {
	var foc = ResEdit.frag.editFocus;
	if (ResTree.objInClasses(foc, [ResBox, ResEmptyglyph, ResInsert, ResModify,
			ResNamedglyph, ResStack, ResVertgroup])) {
		ResEdit.remember();
		ResEdit.frag.editFocus = ResTree.prependNamedHor(foc);
		ResEdit.remake();
		ResEdit.nameFocus();
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
	if (ResTree.objInClasses(foc, [ResBox, ResEmptyglyph, ResHorgroup, ResInsert,
			ResModify, ResNamedglyph, ResStack])) {
		ResEdit.remember();
		ResEdit.frag.editFocus = ResTree.appendNamedVert(foc);
		ResEdit.remake();
		ResEdit.nameFocus();
	} else if (foc instanceof ResOp) {
		if (par instanceof ResVertgroup) {
			ResEdit.remember();
			ResEdit.frag.editFocus = ResTree.appendNamedBehindOp(foc);
			ResEdit.remake();
			ResEdit.nameFocus();
		} else {
			ResEdit.remember();
			ResEdit.frag.editFocus = ResTree.joinGroupsIntoVert(foc);
			ResEdit.remake();
			ResEdit.treeFocus();
		}
	} else if (foc instanceof ResSwitch) {
		if (par instanceof ResVertgroup) {
			ResEdit.remember();
			ResEdit.frag.editFocus = ResTree.appendNamedVertAfterSwitch(foc);
			ResEdit.remake();
			ResEdit.nameFocus();
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
	if (ResTree.objInClasses(foc, [ResBox, ResEmptyglyph, ResHorgroup, ResInsert,
			ResModify, ResNamedglyph, ResStack])) {
		ResEdit.remember();
		ResEdit.frag.editFocus = ResTree.prependNamedVert(foc);
		ResEdit.remake();
		ResEdit.nameFocus();
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
	if (ResTree.objInClasses(foc, [ResBox, ResEmptyglyph, ResHorgroup, ResNote,
				ResInsert, ResModify, ResNamedglyph, ResStack, ResVertgroup])) {
		ResEdit.remember();
		ResEdit.frag.editFocus = ResTree.appendNamedHiero(foc);
		ResEdit.remake();
		ResEdit.nameFocus();
	} else if (foc instanceof ResOp) {
		ResEdit.remember();
		ResEdit.frag.editFocus = ResTree.appendNamedBehindOpHiero(foc);
		ResEdit.remake();
		ResEdit.nameFocus();
	} else if (foc instanceof ResSwitch) {
		ResEdit.remember();
		ResEdit.frag.editFocus = ResTree.appendNamedBehindSwitchHiero(foc);
		ResEdit.remake();
		ResEdit.nameFocus();
	}
};
ResEdit.doBox =
function() {
	var foc = ResEdit.frag.editFocus;
	if (ResTree.objInClasses(foc, [ResBox, ResEmptyglyph, ResHorgroup,
				ResInsert, ResModify, ResNamedglyph, ResStack, ResVertgroup])) {
		ResEdit.remember();
		ResEdit.frag.editFocus = ResTree.placeInBox(foc);
		ResEdit.remake();
		ResEdit.treeFocus();
	}
};
ResEdit.doStack =
function() {
	var foc = ResEdit.frag.editFocus;
	if (ResTree.objInClasses(foc, [ResBox, ResEmptyglyph, ResHorgroup,
				ResInsert, ResModify, ResNamedglyph, ResStack, ResVertgroup])) {
		ResEdit.remember();
		ResEdit.frag.editFocus = ResTree.placeInStack(foc);
		ResEdit.remake();
		ResEdit.nameFocus();
	} else if (foc instanceof ResOp) {
		ResEdit.remember();
		ResEdit.frag.editFocus = ResTree.joinGroupsIntoStack(foc);
		ResEdit.remake();
		ResEdit.treeFocus();
	}
};
ResEdit.doInsert =
function() {
	var foc = ResEdit.frag.editFocus;
	if (ResTree.objInClasses(foc, [ResBox, ResEmptyglyph, ResHorgroup,
				ResInsert, ResModify, ResNamedglyph, ResStack, ResVertgroup])) {
		ResEdit.remember();
		ResEdit.frag.editFocus = ResTree.placeInInsert(foc);
		ResEdit.remake();
		ResEdit.nameFocus();
	} else if (foc instanceof ResOp) {
		ResEdit.remember();
		ResEdit.frag.editFocus = ResTree.joinGroupsIntoInsert(foc);
		ResEdit.remake();
		ResEdit.treeFocus();
	}
};
ResEdit.doModify =
function() {
	var foc = ResEdit.frag.editFocus;
	if (ResTree.objInClasses(foc, [ResBox, ResEmptyglyph, ResHorgroup,
				ResInsert, ResModify, ResNamedglyph, ResStack, ResVertgroup])) {
		ResEdit.remember();
		ResEdit.frag.editFocus = ResTree.placeInModify(foc);
		ResEdit.remake();
		ResEdit.treeFocus();
	}
};

ResEdit.doExcl =
function() {
	var foc = ResEdit.frag.editFocus;
	if (ResTree.objInClasses(foc, [null, ResEmptyglyph, ResNamedglyph])) {
		var sw = foc !== null ? foc.switchs : ResEdit.frag.switchs;
		ResEdit.remakeTreeUpwardsFrom(sw);
		ResEdit.treeFocus();
	} else if (foc instanceof ResOp) {
		var sw = ResTree.getRightSiblingSwitch(foc);
		ResEdit.remakeTreeUpwardsFrom(sw);
		ResEdit.treeFocus();
	}
};
ResEdit.doExclFront =
function() {
	var foc = ResEdit.frag.editFocus;
	if (ResTree.objInClasses(foc, [ResBox, ResInsert, ResModify, ResStack])) {
		ResEdit.remakeTreeUpwardsFrom(foc.switchs1);
		ResEdit.treeFocus();
	}
};
ResEdit.doExclBack =
function() {
	var foc = ResEdit.frag.editFocus;
	if (ResTree.objInClasses(foc, [ResBox, ResInsert, ResModify, ResStack])) {
		var backSwitch = ResTree.objInClasses(foc, [ResBox, ResModify]) ?
			foc.switchs2 : foc.switchs3;
		ResEdit.remakeTreeUpwardsFrom(backSwitch);
		ResEdit.treeFocus();
	}
};

ResEdit.doCaret =
function() {
	var foc = ResEdit.frag.editFocus;
	var par = foc ? foc.editParent : null;
	var note = null;;
	if (ResTree.objInClasses(foc, [ResBox, ResEmptyglyph, ResNamedglyph]))
		if (foc instanceof ResEmptyglyph) {
			if (foc.note !== null) {
				ResEdit.frag.setEditFocusToElem(foc.note);
				ResEdit.stringFocus();
				return;
			} else {
				ResEdit.remember();
				note = ResTree.addNoteIn(foc);
			}
		} else {
			ResEdit.remember();
			note = ResTree.addNoteAtStart(foc);
		}
	else if (foc instanceof ResNote) {
		if (ResTree.objInClasses(par, [ResNamedglyph, ResBox])) {
			ResEdit.remember();
			note = ResTree.appendNote(foc);
		}
	}
	if (note !== null) {
		ResEdit.frag.editFocus = note;
		ResEdit.remake();
		ResEdit.stringFocus();
	}
};

ResEdit.doDelete =
function() {
	var foc = ResEdit.frag.editFocus;
	var par = foc ? foc.editParent : null;
	if (ResTree.objInClasses(foc, [ResBox, ResEmptyglyph, ResNamedglyph,
					ResInsert, ResModify, ResStack])) {
		ResEdit.remember();
		ResEdit.frag.editFocus = ResTree.removeNode(foc)
		ResEdit.remake();
	} else if (ResTree.objInClasses(foc, [ResHorgroup, ResVertgroup]) &&
			ResTree.objInClasses(par, [ResFragment, ResBox, ResHorgroup, ResVertgroup])) {
		ResEdit.remember();
		ResEdit.frag.editFocus = ResTree.removeNode(foc);
		ResEdit.remake();
	} else if (foc instanceof ResNote) {
		ResEdit.remember();
		ResEdit.frag.editFocus = ResTree.removeNote(foc);
		ResEdit.remake();
	} else if (foc instanceof ResSwitch) {
		if (!foc.hasDefaultValues()) {
			ResEdit.remember();
			foc.color = null;
			foc.shade = null;
			foc.sep = null;
			foc.fit = null;
			foc.mirror = null;
			ResEdit.setSelectedWithCheck('color_param', foc.color, 'red');
			ResEdit.setRadio('shade_param', foc.shade);
			ResEdit.setRealValue('sep_param', foc.sep, null, 1);
			ResEdit.setRadio('fit_param', foc.fit);
			ResEdit.setRadio('mirror_param', foc.mirror);
			ResEdit.frag.propagate();
			ResEdit.setPreview();
			ResEdit.setFocus();
			ResEdit.frag.redrawNodesUpwards();
			ResEdit.resetText();
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
