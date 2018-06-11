/* lexer */

%lex

%%

[\uE000-\uE42E]	return 'SIGN'

"\uE430"		return 'VERT'
"\uE431"		return 'HOR'
"\uE432"		return 'ST'
"\uE433"		return 'SB'
"\uE434"		return 'ET'
"\uE435"		return 'EB'
"\uE436"		return 'OVERLAY'
"\uE437"		return 'BEGIN'
"\uE438"		return 'END'

<<EOF>>			return 'EOF';

/lex

%start fragment

%% /* parser */

fragment
	: EOF
		{return UniFragment.makeFragment(null);}
	| groups EOF
		{return UniFragment.makeFragment($groups);}
	;

groups
	: group 
		{$$ = $group;}
	| group groups
		{$$ = UniFragment.addGroup($group, $groups);}
	;

group
	: vertical_group
		{$$ = $vertical_group;}
	| horizontal_group
		{$$ = $horizontal_group;}
	| basic_group
		{$$ = $basic_group;}
	| sign
		{$$ = $sign;}
	;

vertical_group
	: vert_subgroup rest_vert_group
		{$$ = UniFragment.makeVerticalGroup([$vert_subgroup].concat($rest_vert_group));}
	;

rest_vert_group
	: VERT vert_subgroup rest_vert_group
		{$$ = [$vert_subgroup].concat($rest_vert_group);}
	| VERT vert_subgroup
		{$$ = [$vert_subgroup];}
	;

br_vertical_group
	: BEGIN vert_subgroup rest_br_vert_group
		{$$ = UniFragment.makeVerticalGroup([$vert_subgroup].concat($rest_br_vert_group));}
	;

rest_br_vert_group
	: VERT vert_subgroup rest_br_vert_group
		{$$ = [$vert_subgroup].concat($rest_br_vert_group);}
	| VERT vert_subgroup END
		{$$ = [$vert_subgroup];}
	;

br_flat_vertical_group
	: BEGIN sign rest_br_flat_vert_group
		{$$ = UniFragment.makeVerticalGroup([$sign].concat($rest_br_flat_vert_group));}
	;

rest_br_flat_vert_group
	: VERT sign rest_br_flat_vert_group
		{$$ = [$sign].concat($rest_br_flat_vert_group);}
	| VERT sign END
		{$$ = [$sign];}
	;

vert_subgroup
	: horizontal_group
		{$$ = $horizontal_group;}
	| basic_group
		{$$ = $basic_group;}
	| sign
		{$$ = $sign;}
	;

horizontal_group
	: hor_subgroup rest_hor_group
		{$$ = UniFragment.makeHorizontalGroup([$hor_subgroup].concat($rest_hor_group));}
	| sign rest_hor_group
		{$$ = UniFragment.makeHorizontalGroup([$sign].concat($rest_hor_group));}
	;

rest_hor_group
	: HOR hor_subgroup rest_hor_group
		{$$ = [$hor_subgroup].concat($rest_hor_group);}
	| HOR sign rest_hor_group
		{$$ = [$sign].concat($rest_hor_group);}
	| HOR hor_subgroup
		{$$ = [$hor_subgroup];}
	| HOR sign
		{$$ = [$sign];}
	;

br_horizontal_group
	: BEGIN hor_subgroup rest_br_hor_group
		{$$ = UniFragment.makeHorizontalGroup([$hor_subgroup].concat($rest_br_hor_group));}
	| BEGIN sign rest_br_hor_group
		{$$ = UniFragment.makeHorizontalGroup([$sign].concat($rest_br_hor_group));}
	;

rest_br_hor_group
	: HOR hor_subgroup rest_br_hor_group
		{$$ = [$hor_subgroup].concat($rest_br_hor_group);}
	| HOR sign rest_br_hor_group
		{$$ = [$sign].concat($rest_br_hor_group);}
	| HOR hor_subgroup END
		{$$ = [$hor_subgroup];}
	| HOR sign END
		{$$ = [$sign];}
	;

br_flat_horizontal_group
	: BEGIN sign rest_br_flat_hor_group
		{$$ = UniFragment.makeHorizontalGroup([$sign].concat($rest_br_flat_hor_group));}
	;

rest_br_flat_hor_group
	: HOR sign rest_br_flat_hor_group
		{$$ = [$sign].concat($rest_br_flat_hor_group);}
	| HOR sign END
		{$$ = [$sign];}
	;

hor_subgroup
	: br_vertical_group
		{$$ = $br_vertical_group;}
	| basic_group
		{$$ = $basic_group;}
	;

basic_group
	: core_group
		{$$ = $core_group;}
	| insertion_group
		{$$ = $insertion_group;}
	;

insertion_group
	: core_group insertion
		{$$ = UniFragment.makeInsertionGroup($core_group, $insertion);}
	| sign insertion
		{$$ = UniFragment.makeInsertionGroup($sign, $insertion);}
	;

br_insertion_group
	: BEGIN core_group insertion END
		{$$ = UniFragment.makeInsertionGroup($core_group, $insertion);}
	| BEGIN sign insertion END
		{$$ = UniFragment.makeInsertionGroup($sign, $insertion);}
	;

insertion
	: ST in_subgroup opt_sb_insertion opt_et_insertion opt_eb_insertion
		{$$ = [$in_subgroup, $opt_sb_insertion, $opt_et_insertion, $opt_eb_insertion];}
	| SB in_subgroup opt_et_insertion opt_eb_insertion
		{$$ = [null, $in_subgroup, $opt_et_insertion, $opt_eb_insertion];}
	| ET in_subgroup opt_eb_insertion
		{$$ = [null, null, $in_subgroup, $opt_eb_insertion];}
	| EB in_subgroup 
		{$$ = [null, null, null, $in_subgroup];}
	;

opt_sb_insertion
	:
		{$$ = null;}
	| SB in_subgroup
		{$$ = $in_subgroup;}
	;

opt_et_insertion
	:
		{$$ = null;}
	| ET in_subgroup
		{$$ = $in_subgroup;}
	;

opt_eb_insertion
	:
		{$$ = null;}
	| EB in_subgroup
		{$$ = $in_subgroup;}
	;

in_subgroup
	: br_vertical_group
		{$$ = $br_vertical_group;}
	| br_horizontal_group
		{$$ = $br_horizontal_group;}
	| br_insertion_group
		{$$ = $br_insertion_group;}
	| core_group
		{$$ = $core_group;}
	| sign
		{$$ = $sign;}
	;

core_group
	: flat_horizontal_group OVERLAY flat_vertical_group
		{$$ = UniFragment.makeCoreGroup($flat_horizontal_group, $flat_vertical_group);}
	;

flat_horizontal_group
	: br_flat_horizontal_group
		{$$ = $br_flat_horizontal_group;}
	| sign
		{$$ = $sign;}
	;

flat_vertical_group
	: br_flat_vertical_group
		{$$ = $br_flat_vertical_group;}
	| sign
		{$$ = $sign;}
	;

sign
	: SIGN
		{$$ = UniFragment.makeSign(yytext);}
	;
