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
	: horizontal_group
		{$$ = $horizontal_group;}
	| group VERT horizontal_group
		{$$ = UniFragment.addHorizontalGroup($group, $horizontal_group);}
	;

horizontal_group
	: basic_group
		{$$ = $basic_group;}
	| horizontal_group HOR basic_group
		{$$ = UniFragment.addBasicGroup($horizontal_group, $basic_group);}
	;

basic_group
	: sub_group opt_insertion_st opt_insertion_sb opt_insertion_et opt_insertion_eb
		{$$ = UniFragment.makeBasicGroup($sub_group,
			$opt_insertion_st, $opt_insertion_sb, $opt_insertion_et, $opt_insertion_eb);}
	;

opt_insertion_st
	:
		{$$ = null;}
	| ST sub_group
		{$$ = $sub_group;}
	;

opt_insertion_sb
	:
		{$$ = null;}
	| SB sub_group
		{$$ = $sub_group;}
	;

opt_insertion_et
	:
		{$$ = null;}
	| ET sub_group
		{$$ = $sub_group;}
	;

opt_insertion_eb
	:
		{$$ = null;}
	| EB sub_group
		{$$ = $sub_group;}
	;

sub_group
	: core_group
		{$$ = $core_group;}
	| core_group OVERLAY core_group
		{$$ = UniFragment.makeStack($core_group1, $core_group2);}
	;

core_group
	: SIGN
		{$$ = UniFragment.makeSign(yytext);}
	| BEGIN group END
		{$$ = $group;}
	;
