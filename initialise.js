// User editable configuration 
var apiPath = "http://www.mattplatts.com/git/jsframework/api/";
var loadStyle = 1; // 1 - As sections become ready, 2 - In order of listing in pageRegister, 3 - All at once
var currentUserVar = "$$_current_$$";
var _homePage = "home";
var _loginPage = "home";
var homeURL = "http://www.mattplatts.com";

// when reloading areas of the page, good to hide things like footers so they don't appear to spring up the screen and down again as the middle section loads..
var hideSectionDuringLoad = ["mainRightAlt", "mainLeftAlt", "computer-image", "mainInner", "top_text", "progress_bar", "footer", "pre_footer"];
var hideSectionDuringPageCalls = ["footer", "pre_footer"];

// Cache and minify
cachingOnOff = true;
minifiedJS = false;
if(minifiedJS){
    minifiedDir="production/";
} else{
    minifiedDir="";
}

//LOAD REGISTERS
pageRegister = new Object();
$.ajax({
    url: 'templates/register/pages.json',
    type: 'GET',
    async: false,
    dataType: 'json',
    success: function(data){
        pageRegister = data;
    }
});

blockRegister = new Object();
$.ajax({
    url: 'templates/register/blocks.json',
    type: 'GET',
    async: false,
    dataType: 'json',
    success: function(data){
        blockRegister = data;
    }
});

// Set up vars for makePageCalls
var currentPage=new Object();
var updateTimers = new Object();
var pageCallInOp=false;
var timeout= new Object();
var timeoutIncrementer=0;
var pageLoadQueue=Array();

var currentPageIdentifier;
var previousPageIdentifier;
var viewingAsId;
var currentFamilyId;
var PageCallInOp = false;

// mobile detect
is_mobile=0;
windowWidth=screen.width;
mobileDevices = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/;
if (navigator.userAgent.match(mobileDevices) || windowWidth<640){
    is_mobile=1;
}

// READ REQUEST VARIABLES (FOR PASSWORD RESET)
var resetToken = null;
var resetUser = null;
if (location.search){
    queryString=(location.search.replace("?",""));
    queryArray=queryString.split("&");
    for (i=0;i<queryArray.length;i++){
        queryPair=queryArray[i].split("=");
        if (queryPair[0]=="user"){
            resetUser=queryPair[1];
        } else if (queryPair[0]=="token"){
            resetToken=queryPair[1];
        }
    }
}


//INIT
var hash;
var referral =  window.location.hash.match(/ref_[\w]{2,4}_[\d]+_[a-zA-Z]{2}/) ? window.location.hash : null;


if(!!referral){
    createCookie('referralLink',referral.substr(1),30);
    window.location.href= '/referrals';
}

hash = window.location.hash.substring(1).split("_");



/* The original way of getting query strings from the url was to split the url after the hash at the underscore.
 * This does not allow any url paramaters to contain underscores however. This is basically legacy code but some parts of the system still use it */

var preventHashChange=0;
if (hash[0]=="password" && resetUser && resetToken){
    preventHashChange=1;
}

//Render default page - login
if(hash[0]=="invite") {

    fixedHash = new Array();
    // fix to allow emails with underscores
    fixedHash[0] = hash[0];
    fixedHash[2] = hash[hash.length- 1];
    var midHash= new Array();
    for(var i=1; i<=hash.length-2; i++){
        midHash[midHash.length] = hash[i];
    }
    fixedHash[1] = midHash.join("_");
    hash = fixedHash;
    makePageCalls("inviteUser");

} else if (hash[0]=="friendRef")  {// a referral included

    createCookie('pktmnyRefSrc',hash[1],30);
    createCookie('pktmnyRefId',hash[2],30);
    window.location.href= '/#signupBegin';

} else if (hash[0]=="ref") {   // a referral included

    createCookie('pktmnyRefSrc',hash[1],30);
    createCookie('pktmnyRefId',hash[2],30);
    window.location.href= '/referrals';

} else if (typeof(hash[0]) != "undefined" && hash[0]!="" && hash[0]!="login" && hash[0] != "undefined") {

    userType=getUserTypes();
    var allowedAccess = false;
    if (pageRegister[hash[0]] == undefined){
	alert("Default page");
        makePageCalls(_homePage);
    }
    for (var i = 0; i < userType.length; i++) {
        if($.inArray(userType[i], pageRegister[hash[0]].allowedUserTypes) != -1){
            if(hash.length<2) {
                hash[1]="$$_current_$$";
            }
            viewingAsId = hash[1];
            if (hash[2]){
                storedTokenValue=hash[2];
            }

            // 3 lines below are a copy of the above, using the reset token instead..
            if (resetToken){
                storedTokenValue=resetToken;
            }
            makePageCalls(hash[0]);
            allowedAccess = true;
            break;
        }
    }
    if(!allowedAccess) {
        viewingAsId = currentUserVar;
        makePageCalls("login");
    }

} else {

    isLoggedInRedirect();

}

/* This code below is about removing url paramaters (the type wwhich are separated by underscores) once the framework has gotten hold of the value */
$(window).bind('hashchange', function() {
    if(pageCallInOp != true && !preventHashChange){
        hash = window.location.hash.substring(1).split("_");
        if (typeof(hash[0]) == "undefined" || hash[0]=="login") {
            isLoggedInRedirect();
        } else {
            if(hash.length<2) {
                hash[1]="$$_current_$$";
            }
            viewingAsId = hash[1];

            userType=getUserTypes();

            var allowedAccess = false;
            for (var i = 0; i < userType.length; i++) {
                if($.inArray(userType[i], pageRegister[hash[0]].allowedUserTypes) != -1){
                    makePageCalls(hash[0]);
                    allowedAccess = true;
                    break;
                }
            }
            if(!allowedAccess) {
                viewingAsId = currentUserVar;
                if (window.location.hostname.match(/cuser/)){
                    top.location="/#login"; // by not doing make page calls we force a redirect if the user is signed up
                } else {
                    top.location="#login"; // by not doing make page calls we force a redirect if the user is signed up
                }
            }
        }
    }
});
