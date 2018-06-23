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

