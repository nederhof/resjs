/* lexer */

%lex

%%

"empty"                 return 'EMPTY'
"stack"                 return 'STACK'
"insert"                return 'INSERT'
"modify"                return 'MODIFY'

([A-I]|[K-Z]|(Aa)|(NL)|(NU))([1-9]([0-9][0-9]?)?)[a-z]?  return 'GLYPH_NAME'
[a-zA-Z]+               return 'NAME'
\"([^\t\n\r\f\b\"\\]|(\\\")|(\\\\))+\"  return 'STRING'
[0-9]?\.[0-9][0-9]?     return 'REAL'
(0|([1-9]([0-9][0-9]?)?))  return 'NAT_NUM'

"-"                     return 'MINUS'
":"                     return 'COLON'
"("                     return 'OPEN'
")"                     return 'CLOSE'
"*"                     return 'ASTERISK'
"."                     return 'PERIOD'
","                     return 'COMMA'
"^"                     return 'CARET'
"!"                     return 'EXCLAM'
"["                     return 'SQ_OPEN'
"]"                     return 'SQ_CLOSE'
"="                     return 'EQUALS'
[ \t\n\r\f]             return 'WHITESPACE'

<<EOF>>                 return 'EOF';

/lex

%start fragment

%% /* parser */

fragment
    : whitespaces optional_header switches optional_hieroglyphic EOF
        {return new ResFragment(
	    {l:$optional_header,sw:$switches,h:$optional_hieroglyphic});}
    ;

optional_header
    :   
	{$$ = [];}
    | header
	{$$ = $header;}
    ;

header
    : arg_bracket_list whitespaces
	{$$ = $arg_bracket_list;}
    ;

optional_hieroglyphic
    :   
	{$$ = null;}
    | hieroglyphic
	{$$ = $hieroglyphic;}
    ;

hieroglyphic
    : top_group
        {$$ = new ResHieroglyphic({g:$top_group});}
    | top_group MINUS optional_arg_bracket_list ws hieroglyphic
        {$$ = $hieroglyphic.addGroup($top_group,$optional_arg_bracket_list,$ws);}
    ;

top_group
    : vert_group
        {$$ = $vert_group;}
    | hor_group
        {$$ = $hor_group;}
    | basic_group
        {$$ = $basic_group;}
    ;

vert_group
    : vert_sub_group COLON optional_arg_bracket_list ws vert_sub_group
        {$$ = new ResVertgroup(
	    {g1:$vert_sub_group1,l:$optional_arg_bracket_list,sw:$ws,g2:$vert_sub_group2});}
    | vert_group COLON optional_arg_bracket_list ws vert_sub_group
        {$$ = $vert_group.addGroup($optional_arg_bracket_list,$ws,$vert_sub_group);}
    ;

vert_sub_group 
    : hor_group
	{$$ = new ResVertsubgroup({sw1:new ResSwitch.plain(),g:$hor_group,sw2:new ResSwitch.plain()});}
    | OPEN ws hor_group CLOSE ws
	{$$ = new ResVertsubgroup({sw1:$ws1,g:$hor_group,sw2:$ws2});}
    | basic_group
	{$$ = new ResVertsubgroup({b:$basic_group});}
    ;

hor_group
    : hor_sub_group ASTERISK optional_arg_bracket_list ws hor_sub_group
        {$$ = new ResHorgroup(
	    {g1:$hor_sub_group1,l:$optional_arg_bracket_list,sw:$ws,g2:$hor_sub_group2});}
    | hor_group ASTERISK optional_arg_bracket_list ws hor_sub_group
        {$$ = $hor_group.addGroup($optional_arg_bracket_list,$ws,$hor_sub_group);}
    ;

hor_sub_group 
    : OPEN ws vert_group CLOSE ws
	{$$ = new ResHorsubgroup({sw1:$ws1,g:$vert_group,sw2:$ws2});}
    | basic_group
	{$$ = new ResHorsubgroup({b:$basic_group});}
    ;

basic_group
    : named_glyph
        {$$ = $named_glyph;}
    | empty_glyph
        {$$ = $empty_glyph;}
    | box
        {$$ = $box;}
    | stack
        {$$ = $stack;}
    | insert
        {$$ = $insert;}
    | modify
        {$$ = $modify;}
    ;

named_glyph
    : glyph_name optional_arg_bracket_list whitespaces notes switches
	{$$ = new ResNamedglyph(
	    {na:$glyph_name,l:$optional_arg_bracket_list,no:$notes,sw:$switches});}
    | name optional_arg_bracket_list whitespaces notes switches
	{$$ = new ResNamedglyph(
	    {na:$name,l:$optional_arg_bracket_list,no:$notes,sw:$switches});}
    | nat_num optional_arg_bracket_list whitespaces notes switches
	{$$ = new ResNamedglyph(
	    {na:String($nat_num),l:$optional_arg_bracket_list,no:$notes,sw:$switches});}
    | string optional_arg_bracket_list whitespaces notes switches
	{$$ = new ResNamedglyph(
	    {na:$string,l:$optional_arg_bracket_list,no:$notes,sw:$switches});}
    ;

empty_glyph
    : EMPTY optional_arg_bracket_list whitespaces optional_note switches
	{$$ = new ResEmptyglyph(
	    {l:$optional_arg_bracket_list,n:$optional_note,sw:$switches});}
    | PERIOD whitespaces optional_note switches
	{$$ = new ResEmptyglyph({l:ResEmptyglyph.pointArgs(),n:$optional_note,sw:$switches});}
    ;

box
    : name optional_arg_bracket_list whitespaces 
		OPEN ws optional_hieroglyphic CLOSE 
		whitespaces notes switches
	{$$ = new ResBox({na:$name,l:$optional_arg_bracket_list,
	    sw1:$ws,h:$optional_hieroglyphic,no:$notes,sw2:$switches});}
    ;

stack
    : STACK optional_arg_bracket_list whitespaces
		OPEN ws top_group COMMA ws top_group CLOSE ws
        {$$ = new ResStack({l:$optional_arg_bracket_list,sw1:$ws1,
	    g1:$top_group1,sw2:$ws2,g2:$top_group2,sw3:$ws3});}
    ;
    
insert
    : INSERT optional_arg_bracket_list whitespaces
		OPEN ws top_group COMMA ws top_group CLOSE ws
        {$$ = new ResInsert({l:$optional_arg_bracket_list,sw1:$ws1,
	    g1:$top_group1,sw2:$ws2,g2:$top_group2,sw3:$ws3});}
    ;

modify
    : MODIFY optional_arg_bracket_list whitespaces
		OPEN ws top_group CLOSE ws
        {$$ = new ResModify({l:$optional_arg_bracket_list,sw1:$ws1,
	    g:$top_group,sw2:$ws2});}
    ;

optional_note
    :   
	{$$ = null;}
    | note
	{$$ = $note;}
    ;

notes 
    :   
	{$$ = [];}
    | note notes
	{$$ = [$note].concat($notes);}
    ;

note 
    : CARET string optional_arg_bracket_list whitespaces
	{$$ = new ResNote({s:$string,l:$optional_arg_bracket_list});}
    ;

ws 
    : whitespaces switches
	{$$ = $switches;}
    ;

switches 
    :  
	{$$ = new ResSwitch.plain();}
    | switch switches
	{$$ = $switch.join($switches);}
    ;

switch 
    : EXCLAM optional_arg_bracket_list whitespaces
	{$$ = new ResSwitch({l:$optional_arg_bracket_list});}
    ;

optional_arg_bracket_list
    : 
        {$$ = [];}
    | arg_bracket_list
        {$$ = $arg_bracket_list;}
    ;

arg_bracket_list
    : SQ_OPEN whitespaces arg_list SQ_CLOSE
	{$$ = $arg_list;}
    | SQ_OPEN whitespaces SQ_CLOSE
	{$$ = [];}
    ;

arg_list
    : arg whitespaces
        {$$ = [$arg];}
    | arg whitespaces COMMA whitespaces arg_list
        {$$ = [$arg].concat($arg_list);}
    ;

arg
    : name EQUALS name
        {$$ = new ResArg($name1,$name2);}
    | name EQUALS nat_num
        {$$ = new ResArg($name,$nat_num);}
    | name EQUALS real
        {$$ = new ResArg($name,$real);}
    | name
        {$$ = new ResArg($name,null);}
    | nat_num
        {$$ = new ResArg($nat_num,null);}
    | real
        {$$ = new ResArg($real,null);}
    ;

whitespaces 
    :
    | whitespaces WHITESPACE
    ;

glyph_name
    : GLYPH_NAME
        {$$ = yytext;}
    ;

name
    : NAME
        {$$ = yytext;}
    ;

string
    : STRING
        {$$ = yytext;}
    ;

real
    : REAL
        {$$ = parseFloat(yytext);}
    ;

nat_num
    : NAT_NUM
        {$$ = parseInt(yytext);}
    ;
