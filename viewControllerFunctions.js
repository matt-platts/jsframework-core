/*  viewControllerFunctions.js  */

/* Function: makePageCalls
 * Gives access to the page class via a function in the global namespace
*/
function makePageCalls(pageIdentifier, dataToSend) {

	var newPage = new page;
	newPage.pageIdentifier = pageIdentifier;
	newPage.dataToSend = dataToSend;

	// init onjects and arrays
	newPage.currentPageData = new Object();
	newPage.currentPageSections = new Array();
	newPage.currentPageBlocks = new Array();
	newPage.sectionsRendered = new Array();
	newPage.readyForRender = new Array();
	newPage.currentPageAjaxCalls = new Object();

	newPage.load();
}


/* Page class init */
function page(){}

/* currentPageData variable init
 * Used to place ajax response data back into the global scope to be picked up by the EJS templates 
 * until full oo conversion is complete
*/
var currentPageData = null; 

/* 
 * Function: load
 * This is a wrapper for makePageCallsInner which does the real work of loading a page. 
 * If a page call is currently in operation, it's added to the queue
 * If not, it calls this.makePageCallsInner that does the main work, and checks the queue before it exists.
 * Note that if the page register contains an entry for 'alternateMobileContent' the page identifier is replaced with this
*/
page.prototype.load = function() {

	var _page = this;

	if (pageRegister[this.pageIdentifier]==undefined){ this.pageIdentifier=_homePage; }

	if (is_mobile && pageRegister[this.pageIdentifier].alternateMobileContent){
		this.pageIdentifier=pageRegister[this.pageIdentifier].alternateMobileContent;
	}

	if (pageCallInOp){
		pageLoadQueue.push(this.pageIdentifier);
	} else {
		this.makePageCallsInner();
	}

}

/* 
 * Function: makePageCallsInner
 * Meta: this function does the main work. It's called from page.load  
*/
page.prototype.makePageCallsInner = function(){

	var __page = this;
	pageIdentifier = this.pageIdentifier;
	dataToSend = this.dataToSend;	

	// any page sections (divs from layout template) set to be hidden during a reload? Hide them.
	for (var i = 0; i < hideSectionDuringPageCalls.length; i++) {
		$("#" + hideSectionDuringPageCalls[i]).hide();
	};

	pageCallInOp = true; // a page call is currently in operation.
	if(!dataToSend) {
		dataToSend = new Object;
	}

	if (pageIdentifier==_loginPage){
		if (typeof(rdc) != 'undefined'){
			rdc.clear(); // clear all stored data on rdc
		}
	}

	if(viewingAsId==currentUserVar || pageIdentifier==_homePage){
		window.location.hash = pageIdentifier;
		viewingAsId==currentUserVar;
	} else {
		window.location.hash = pageIdentifier + "_" + viewingAsId;
	}

	previousPageIdentifier = currentPageIdentifier;
	currentPageIdentifier = pageIdentifier;

	document.title = pageRegister[pageIdentifier].name + " | Js Framework";

	// Google tracking - needs to be set up like this for SPAs.
	trackPageview("#"+pageIdentifier);

	//Set up layout
	if(previousPageIdentifier && previousPageIdentifier!=currentPageIdentifier) {
		logMessage("PPI is different to CPI! Moving from " + previousPageIdentifier + " to " + currentPageIdentifier);
		if(pageRegister[previousPageIdentifier].layout != pageRegister[currentPageIdentifier].layout) {
			logMessage(" LAYOUTS ARE DIFFERENT TOO - previous is " + pageRegister[previousPageIdentifier].layout + " and current is " + pageRegister[currentPageIdentifier].layout);

		    	var clones = new Object();
		    	for(layoutSections in pageRegister[previousPageIdentifier]["blocks"]) {
				var section = $('#'+layoutSections);
				clones[layoutSections] = section.clone(true);
			};

		    	//creates new layout, checks thorugh for any section that have the same sections with the same blocks and re-adds the HTML from previous page.
		    	logMessage("Calling layoutRender for " + pageRegister[pageIdentifier].layout);
			_page.layoutRender(pageRegister[pageIdentifier].layout);

		} else {

			logMessage(" LAYOUTS ARE THE SAME");

		}
		//checks through the sections and if the sections and the blocks are the same it doesnt't re-render it, but will need the update script to run
		layoutSectionsLoop:
		for(layoutSections in pageRegister[currentPageIdentifier]["blocks"]) {

			var blocksInSection = new Array();
			if(pageRegister[previousPageIdentifier]["blocks"].hasOwnProperty(layoutSections)){
				var blockOrderDiffs = false;
			    	var x=0;
				sectionsBlockLoop:
				for(sectionsBlock in pageRegister[currentPageIdentifier]["blocks"][layoutSections]) {

					if(sectionsBlock=="parentSignupAside" || sectionsBlock=="progressBar" || sectionsBlock=="logoHeaders" || sectionsBlock=="mainHeadings" || sectionsBlock=="topAccountDetails" || sectionsBlock=="webapp2014"){
						//this should not be cached as it changes
						blockOrderDiffs=true;
						break sectionsBlockLoop;
					}

				    	var y=0;
					previousSectionsBlockLoop:
					for(previousSectionsBlock in pageRegister[previousPageIdentifier]["blocks"][layoutSections]) {
						//check if same block exists - x and y hold position
						if(previousSectionsBlock==sectionsBlock) {
							break previousSectionsBlockLoop;
						}
						y++;
					}
				        //Check whether the block is in the same position
				        if(x==y){
						//block order is the same
						this.currentPageBlocks.push(sectionsBlock);
						blocksInSection.push(sectionsBlock);
						x++;
						continue;
				        } else {
						//section needs to be re-rendered so remove any HTML - possibly adapt this
						blockOrderDiffs = true;
						// make fadeout and remove - not just remove hmtl?
						$("#"+layoutSections).fadeOut(300, function() {
							//$(this).html("");
						});

						break sectionsBlockLoop;
				        }
				}
			} else {

				blockOrderDiffs=true;

			}

			//call update functions for blocks in the section
			if(pageRegister[previousPageIdentifier].layout != pageRegister[currentPageIdentifier].layout && !blockOrderDiffs) {
		    		$("#"+layoutSections).replaceWith(clones[layoutSections]);
			    	$.each(blocksInSection, function(index, value) {
					if(blockRegister[value].hasOwnProperty("javascriptURL")) {
						if( typeof blockRegister[value].javascriptURL == "object"){

							for(var i=0; i< blockRegister[value].javascriptURL.length; i++){
							    attachJavaScriptFileInitial(blockRegister[value].javascriptURL[i]);
							}

						} else {

							attachJavaScriptFileUpdate(blockRegister[value].javascriptURL);
						}
					}
			    	});
			}

			if(pageRegister[previousPageIdentifier].layout == pageRegister[currentPageIdentifier].layout && !blockOrderDiffs) {
				$.each(blocksInSection, function(index, value) {
					if(blockRegister[value].hasOwnProperty("javascriptURL")) {
						if( typeof blockRegister[value].javascriptURL == "object"){
							for(var i=0; i< blockRegister[value].javascriptURL.length; i++){
							    attachJavaScriptFileInitial(blockRegister[value].javascriptURL[i]);
							}
						} else {
							attachJavaScriptFileUpdate(blockRegister[value].javascriptURL);
						}
					}
			    	});
			}

			if(!blockOrderDiffs) this.sectionsRendered.push(layoutSections);
		}
	} else {
		logMessage("Previous page id and Current page id are the same");
		__page.layoutRender(pageRegister[pageIdentifier].layout);
	}

	//remove stylesheets for previous pages
	for (var i = 0; i < 5; i++) {
		// annoying hack, but had to do it this way, as the removal based on class did not work in some browsers: $(".additionalStylesheet").remove();
		$("#additionalStylesheet"+[i]).remove();
	}

	//add stylesheets for current page
	var default_styles_removed="";
	if(pageRegister[pageIdentifier].hasOwnProperty("replacementStyleSheets")){

		var arrayWithStyleSheets=pageRegister[pageIdentifier]["replacementStyleSheets"];
		arrayWithStyleSheets=arrayWithStyleSheets.split( "," );

		var length = arrayWithStyleSheets.length,
		element = null;
		for (var i = 0; i < length; i++) {
			element = arrayWithStyleSheets[i];
			var linkTag = document.createElement ("link");
			linkTag.href = arrayWithStyleSheets[i] + "?v=" + appVersion;
			linkTag.rel = "stylesheet";
			linkTag.id = "replacementStylesheet"+[i];
			linkTag.className = "replacementStylesheet";

			var head = document.getElementsByTagName ("head")[0];
			if (document.getElementById("replacementStylesheet0")){
				existingReplacementStylesheet=document.getElementById("replacementStylesheet0");
			       	if (existingReplacementStylesheet.href != linkTag.href){
					head.removeChild(existingReplacementStylesheet);
			        }
			}
			if (!document.getElementById("replacementStylesheet0")){
			       head.appendChild (linkTag);
			} 
			if (
				(linkTag.href.indexOf("signup.css")>-1 && document.getElementById("main_screen_stylesheet"))
				||
				(linkTag.href.indexOf("login.css")>-1 && document.getElementById("main_screen_stylesheet"))

			){
				screen_stylesheet=document.getElementById("main_screen_stylesheet");
				print_stylesheet=document.getElementById("main_print_stylesheet");
				if (screen_stylesheet){
					head.removeChild(screen_stylesheet);
				}
				if (print_stylesheet){
					head.removeChild(print_stylesheet);
				}
				default_styles_removed=1;
			}
			if (linkTag.href.indexOf("signup.css")>-1){
				default_styles_removed=1;
			}
		}
		default_styles_removed=1;
	} else {
		var head = document.getElementsByTagName ("head")[0];
		if (document.getElementById("replacementStylesheet0")){
			existingReplacementStylesheet=document.getElementById("replacementStylesheet0");
			head.removeChild(existingReplacementStylesheet);
		}
	}

	if(pageRegister[pageIdentifier].hasOwnProperty("additionalStyleSheets")){

		if (!document.getElementById("main_screen_stylesheet") && !pageRegister[pageIdentifier].hasOwnProperty("replacementStyleSheets")){
		       var linkTag = document.createElement ("link");
		       linkTag.href = "skin/stylesheets/style.css"; /* still need to append version no. */
		       linkTag.rel = "stylesheet";
		       linkTag.id = "main_screen_stylesheet";
		       var head = document.getElementsByTagName ("head")[0];
		       head.appendChild (linkTag);
		}

		var arrayWithStyleSheets=pageRegister[pageIdentifier]["additionalStyleSheets"];
		arrayWithStyleSheets=arrayWithStyleSheets.split( "," );

		var length = arrayWithStyleSheets.length,
		element = null;
			for (var i = 0; i < length; i++) {
				element = arrayWithStyleSheets[i];
				var linkTag = document.createElement ("link");
				linkTag.href = arrayWithStyleSheets[i] + "?v=" + appVersion;
				linkTag.rel = "stylesheet";
				linkTag.id = "additionalStylesheet"+[i];
				linkTag.className = "additionalStylesheet";

				var head = document.getElementsByTagName ("head")[0];
				head.appendChild (linkTag);

		}
	}

	if (!default_styles_removed){

		if (!document.getElementById("main_screen_stylesheet")){

			var linkTag = document.createElement ("link");
			linkTag.href = "skin/stylesheets/style.css"; /* still need to append version no. */
			linkTag.rel = "stylesheet";
			linkTag.id = "main_screen_stylesheet";
			var head = document.getElementsByTagName ("head")[0];
			head.appendChild (linkTag);

			if (!document.getElementById("main_screen_stylesheet")){
			}
		} else {
	}
	} else {
		screen_stylesheet=document.getElementById("main_screen_stylesheet");
		print_stylesheet=document.getElementById("main_print_stylesheet");
		if (screen_stylesheet){
			head.removeChild(screen_stylesheet);
		}
		if (print_stylesheet){
			head.removeChild(print_stylesheet);
		}
	}

	//add body class
	$('body').removeClass();
	if(pageRegister[pageIdentifier].bodyClass) {
		$('body').addClass(pageRegister[pageIdentifier].bodyClass);
	}


	if (navigator.appVersion.indexOf("MSIE 7.") == -1){//Add spinner
		timeout = setTimeout(function() {
			$('body').append('<div class="spinner-container"><img src="skin/images/loader.gif" /></div>');
		},1000);
	}

	//get list of all blocks and all AJAX calls required.
	var section;
	var block;
	var calls;
	var data;
	logMessage("AT POINT 1: pageIdentifier is " + pageIdentifier + ". Blocks are below:");
	logMessage(pageRegister[pageIdentifier].blocks);
	for(section in pageRegister[pageIdentifier].blocks) {
		this.currentPageSections.push(section); // Gives load order for load style 2
		//checks if not already rendered
		if($.inArray(section, this.sectionsRendered) == -1){
			for(block in pageRegister[pageIdentifier].blocks[section]) {

				this.currentPageBlocks.push(block);
				if (blockRegister[block]){

					for(calls in blockRegister[block].AJAXcalls) {
						logMessage(3,"Call is " + blockRegister[block].AJAXcalls[calls]["URL"]);

						this.currentPageAjaxCalls[calls] = new Object();
						this.currentPageAjaxCalls[calls]["data"] = new Object();
						this.currentPageAjaxCalls[calls]["URL"] = globalVariableInject(blockRegister[block].AJAXcalls[calls]["URL"]);
						this.currentPageAjaxCalls[calls]["callType"] = blockRegister[block].AJAXcalls[calls]["callType"]; // eg. use alternate instead of GET

						for(data in blockRegister[block].AJAXcalls[calls]["data"]) {
							this.currentPageAjaxCalls[calls]["data"][data]= globalVariableInject(blockRegister[block].AJAXcalls[calls]["data"][data]);
						}
				    	}

				} else {
					console_log_missing_block(block);
				}
			}
		}
	}
	var callID;
	for (callID in this.currentPageAjaxCalls) {
		logMessage("On ajax call " + callID + ". URL is: " + this.currentPageAjaxCalls[callID]["URL"]);
		callType="GET";
		if (this.currentPageAjaxCalls[callID]["callType"]) {
			callType=this.currentPageAjaxCalls[callID]["callType"];
		}

		var AJAXcall = $.ajax({
			url: apiPath + this.currentPageAjaxCalls[callID]["URL"],
		    	data: this.currentPageAjaxCalls[callID]["data"],
		    	type: callType,
			dataType: 'json',
			timeout: 20000,
			success: function( retrievedData, textStatus, jqXHR ){
				__page.AJAXResponseAggregator(retrievedData, jqXHR.uniqueId);
			},
		    	error: function(jqXHR, textStatus, errorThrown){
			logMessage("AJAX ERROR on " + __page.currentPageAjaxCalls[callID]["URL"] + " - response is " + textStatus);
		        if(textStatus==="timeout"){

				logMessage("got timeout on callID: " + callID + ". URL is: " + __page.currentPageAjaxCalls[callID]["URL"]);
				if ($("#timeout_alert")){
					$("#timeout_alert").fadeIn();
					timeoutMessage = "A timeout has occurred from the following url:\n\n";
					timeoutMessage = timeoutMessage + __page.currentPageAjaxCalls[callID]["URL"];
				}
		        }

			__page.AJAXResponseAggregator("", jqXHR.uniqueId);
			pageCallInOp = false;
			//check if 401 - this means that an authorization is required, the session has timed out, so forward the user to the login page
			if(jqXHR.status==401){
				if(pageIdentifier!="password"){
					//do not do this for the password request -
					makePageCalls(_loginPage);
				}
				if(timeout) clearTimeout(timeout);
			}
		    }
		});
		AJAXcall.uniqueId = callID;
	}
	if(!calls){
		noAJAXRender(pageIdentifier);
	}

	currentPageData = this.currentPageData; // assign variable to the global scope (for now) so that it can be picked up by other scripts

}

/* 
  Function: checkCallStatus
  A debugging only function to check on the status of a page call
*/
page.prototype.checkCallStatus = function (){
	logMessage(2,"Status: " + pageCallInOp);
	return pageCallInOp;
}

/* 
 * Function c_log
 * Another debugging function
 */
window.c_log = function(){
	c_log.history = c_log.history || [];   // store logs to an array for reference
      	c_log.history.push(arguments);
      	if(this.console){
		logMessage( Array.prototype.slice.call(arguments) );
        }
};

/* 
 * Function: AJAXResponseAggregator
*/
page.prototype.AJAXResponseAggregator = function (retrievedData, AJAXCallID) {
	var __page = this;

    	logMessage("On ajax response aggregator for " + AJAXCallID);

	var pageIdentifier = currentPageIdentifier;
	var section;
	var block;
	var calls;
	var blockComplete = 0;
	var sectionComplete = 0;

	this.currentPageData[AJAXCallID] = retrievedData;
    	//cycle through all blocks and if all data is there for section then render it in position
	for(section in pageRegister[pageIdentifier].blocks) {
		if($.inArray(section, this.sectionsRendered) == -1){

			sectionComplete=0;
			for(block in pageRegister[pageIdentifier].blocks[section]) {
				blockComplete=0;

				if (blockRegister[block]){
					for(calls in blockRegister[block].AJAXcalls) {
						if(!this.currentPageData.hasOwnProperty(calls)) {
						    blockComplete++;
						    sectionComplete++;
						};
					}
				} else {
					console_log_missing_block(block);
				}
			}

			//if a block is complete run checks as to what to render
			if(sectionComplete==0 && $.inArray(section, this.sectionsRendered) == -1) {
				if($.inArray(section, this.readyForRender) == -1) {
				    __page.readyToLoadController(section);
				}
			}
		}
	}
}

/* 
 Function : noAJAXRender
*/
function noAJAXRender(pageIdentifier) {
	var section;
	for(section in pageRegister[pageIdentifier].blocks) {
		if($.inArray(section, this.sectionsRendered) == -1){
			readyToLoadController(section);
		}
	}
}

/* 
 * Function : readyToLoadController
 * Params: section
*/
page.prototype.readyToLoadController = function (section) {
	this.readyForRender.push(section);
	if(loadStyle==1) {
		this.sectionRender(section);
	} else if(loadStyle==2) {
		//loop through this.currentPageSections if section is ready to render
		for (var i = 0; i < this.currentPageSections.length; i++) {
			if($.inArray(this.currentPageSections[i], this.sectionsRendered)==-1 && $.inArray(this.currentPageSections[i], this.readyForRender)!=-1) {
				sectionRender(this.currentPageSections[i]);
			} else {
				if($.inArray(this.currentPageSections[i], this.sectionsRendered)!=-1) continue;
				break;
			}
		}
	} else if(loadStyle==3) {
		//check if all sections calls are complete then loop through this.readyForRender and render all
		if(this.currentPageSections.length == (this.readyForRender.length + this.sectionsRendered.length)) {
		    for (var i = 0; i < this.readyForRender.length; i++) {
			sectionRender(this.readyForRender[i]);
		    }
		}
	}
}

/* 
 * Function: sectionRender 
 * Params: section
*/
page.prototype.sectionRender = function (section) {
	var pageIdentifier = currentPageIdentifier;
	var block;
	$('#' + section).html('');
	var position = 1;

	for (block in pageRegister[pageIdentifier].blocks[section]) {
		logMessage(" --------------- ON BLOCK " + block + " section " + section + " PRS: " + pageRegister[pageIdentifier].blocks[section] + "!!");

		//if is external produce function
		if(blockRegister[block].hasOwnProperty("type") && blockRegister[block]["type"] == "external" ) {
			var calls;
			for(calls in blockRegister[block].AJAXcalls) {
				if (!this.currentPageData[calls]){ 
					logMessage("THERE ARE NO CALLS! ******************************************************************************************");
					logMessage(this.currentPageData);
				}
				if (this.currentPageData[calls]){
					if(this.currentPageData[calls].hasOwnProperty("content")) {
						logMessage("Appending content to " + section);
						$('#' + section).append(this.currentPageData[calls].content);
					} else if(this.currentPageData[calls].hasOwnProperty("url")) {
						logMessage("Appending IFRAME content to " + section);
						$('#' + section).append("<iframe class=\"cms-block\"  id=\""+ calls +"\" src=\"" + this.currentPageData[calls].url + "\"></iframe>");
						$('#' + block).attr('src', this.currentPageData[calls].url);
					}
				}
			}

		} else {

			EJS.config({
				cache: cachingOnOff
			});

		    	logMessage("Rendering " + section + "using the following: templates/blocks/" + pageRegister[pageIdentifier].blocks[section][block] + "/" + block + ".ejs");

		    	$('#' + section).append(new EJS({
				url: 'templates/blocks/' + pageRegister[pageIdentifier].blocks[section][block] + '/' + block + '.ejs'
			}).render(this.currentPageData));
			logMessage("Heres the page date for " + section);
			logMessage(this.currentPageData);
			logMessage("Just rendered " + section);
		    	position++;

		    	// Call associated JS if exists for block
			if(blockRegister[block].hasOwnProperty("javascriptURL")) {
				if( typeof blockRegister[block].javascriptURL == "object"){
					for(var i=0; i< blockRegister[block].javascriptURL.length; i++){
						attachJavaScriptFileInitial(blockRegister[block].javascriptURL[i]);
					}
				} else {
					attachJavaScriptFileInitial(blockRegister[block].javascriptURL);
				}
				logMessage("Attached javascript of " + blockRegister[block].javascriptURL);
			}
		}
	}

	this.sectionsRendered.push(section);
	isInArray= $.inArray(section,hideSectionDuringPageCalls);
	if (section != "footer" ){
		$('#' + section).fadeIn();
	}
	logMessage("Section " + section + " Has been displayed. Rendered " + this.sectionsRendered.length  + " vs  total " + this.currentPageSections.length);

	//Page has finished loading
	if(this.sectionsRendered.length==this.currentPageSections.length) {
		logMessage("Sections rendered length = pageSections length");
		if(timeout) clearTimeout(timeout);
		$(".spinner-container").remove();

		for (var i = 0; i < hideSectionDuringPageCalls.length; i++) {
			$("#" + hideSectionDuringPageCalls[i]).fadeIn();
		};

		pageCallInOp = false;
		var fade_footer_last=0;
		for (var i = 0; i < hideSectionDuringLoad.length; i++) {
			if (hideSectionDuringLoad[i]=="footer"){
				//$("#" + hideSectionDuringLoad[i]).hide();
				fade_footer_last=1;
			} else {
				$("#" + hideSectionDuringLoad[i]).fadeIn();
			}
			if (fade_footer_last==1){
				//$("#footer").delay(3000).fadeIn(2500);
			}
		};
		//triggerTimedEvents
		triggerTimedEvents(this.currentPageBlocks);
		//
		logMessage(3,"its equal so finishing - length is " + pageLoadQueue.length);
		logMessage(3,this.currentPageBlocks);
		if (pageLoadQueue.length){
			nextPage=pageLoadQueue.shift();
		    	this.sectionsRendered=0;
		    	pageCallInOp=0;
		    	this.currentPageData = new Object();
		    	this.currentPageSections = new Array();
		    	this.currentPageBlocks = new Array();
		    	this.sectionsRendered = new Array();
		    	this.readyForRender = new Array();
		    	this.currentPageAjaxCalls = new Object();

			makePageCalls(nextPage);
		}
	} else if (this.sectionsRendered.length>this.currentPageSections.length){
		logMessage(2,"Too big");
		locString=pageIdentifier;
		logMessage(2,"Confused - redirect put in place");
		top.location.reload();
	} else {
		logMessage("Continuing as rendered length of " + this.sectionsRendered.length + " != " + this.currentPageSections.length);
	}
}

/*
 * Function: layoutRender
 *
*/
page.prototype.layoutRender = function(layoutIdentifier) {
	$(("#view-container")).hide();
	EJS.config({
		cache: cachingOnOff
	});
	document.getElementById("view-container").innerHTML = new EJS({
		url: 'templates/layout/' + layoutIdentifier + '.ejs'
	}).render();
	for (var i = 0; i < hideSectionDuringLoad.length; i++) {
		$("#" + hideSectionDuringLoad[i]).hide()
	};
	$(("#view-container")).show();
}

/* Function: getParameterByName
 * Params: name
*/
function getParameterByName(name) {
    var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}

/*
 * Function : isLoggedInRedirect
 * If the user is already logged in when the login page is called, this function is called to redirect the user to where they should be..
 */
function isLoggedInRedirect(){
	// GET USER TYPE FOR REDIRECT
	$.ajax({
		url: apiPath + 'user/details/'+ currentUserVar,
		async: false,
		data: {
			"type" : "basic",
			"debug" : "true2"
		},
		type: 'GET',
		dataType: 'json',
		statusCode:{
			200: function(data, textStatus, XMLHttpRequest) {
				createCookie("PM-UserId",data["user"]["userId"],2);
				if(data["user"]["userType"]["CHILD"] == true) {
					viewingAsId = currentUserVar;
				    	if(data["user"]["status"]=="PENDING") {
						makePageCalls("childFirstSecurity");
					} else {
						makePageCalls("childSummary");
					}
				};
				if(data["user"]["userType"]["RELATIVE"] == true && data["user"]["userType"]["PARENT"] == false) {
					viewingAsId = currentUserVar;
					makePageCalls("relativeSummary");
				};
				if(data["user"]["userType"]["PARENT"] == true) {
					if (data["user"].joinFormStatus=="YOUR_CHILDREN"){
						makePageCallsMobile("signupTwo", "signupTwoM");
					} else if (data["user"].joinFormStatus=="YOUR_SECURITY"){
					      makePageCallsMobile("signupConfirmID", "signupConfirmIDM");
					} else if (data["user"].joinFormStatus=="FUND_ACCOUNT"){

						joinFromDataArray=Array;
						joinFromDataArray["userId"]=this.currentPageData.getUser["userId"];
						joinFromDataArray["joinFormStatus"]=3;

						$.ajax({
							url: apiPath + 'user/user/api-update-join-form-status',
							data: joinFromDataArray,
							type: 'POST',
							success: function ( joinFromData) {
							}
						});

						makePageCallsMobile("signupConfirmID", "signupConfirmIDM");
					} else {
						makePageCalls("home");
					}
				};

			},
			401: function() {
				makePageCalls("login");
			}
		}
	});
};

/* 
 * Function: getUserTypes()
 * Returns: array of user types applicable to the current user - (CHILD,PARENT,RELATIVE)
 * 	    Note that most users will be only one type, but you can be a parent AND a relative
*/
function getUserTypes() {
	userTypes = new Array("all");
	$.ajax({
		url: apiPath + 'user/details/'+ currentUserVar,
		async: false,
		data: {
			"type" : "basic",
			"debug" : "true"
		},
		type: 'GET',
		dataType: 'json',
		statusCode:{
		    200: function(data, textStatus, XMLHttpRequest) {
			if(data["user"]["userType"]["CHILD"] == true) {
			    userTypes.push("child");
			};
			if(data["user"]["userType"]["RELATIVE"] == true) {
			    userTypes.push("relative");
			};
			if(data["user"]["userType"]["PARENT"] == true) {
			    userTypes.push("parent");
			};
		    },
		    401: function() {
		       //if( window.location.hash != "#password" ){
			   userTypes.push("external");
		       //}
		    }
		}
	});
    return userTypes;
}

/* 
 *Function: attachJavaScriptFileInitial
 * paramL fileURL
 */
function attachJavaScriptFileInitial(fileURL) {
	if(minifiedJS) fileURL = fileURL.replace(".js", ".min.js");
	if(cachingOnOff){
		fileURL = fileURL+"?v="+appVersion;
	}
	$.cachedScript("javascripts/"+ minifiedDir + fileURL).done(function(script, textStatus) { });
}

/* Function: attachJavascriptFileUpdate(fileURL)
 * Usage: deprecated - an old function to rid an old caching problem prevelent in mainly IE
*/
function attachJavaScriptFileUpdate(fileURL) {
	if(minifiedJS) fileURL = fileURL.replace(".js", ".min.js");
	if(cachingOnOff) { fileURL = fileURL+"?v="+appVersion;} 
	$.cachedScript("javascripts/renderScripts/update/"+ minifiedDir + fileURL).done(function(script, textStatus) {
	});
}

/* 
 * Function: global VariableInject
 * Returns: replacement value for any var specified in blocks.json in the format %%VARIABLE%%
*/
function globalVariableInject(stringToInject) {
	if(stringToInject.indexOf("%%")!= -1) {
		var stringToReturn = stringToInject;
		while(stringToReturn.indexOf("%%")!= -1){
			var First = stringToInject.indexOf("%%");
			var Next = stringToInject.indexOf("%%", First+2);
			var JSVariable = stringToInject.substring(First+2, Next);
			var evalJS = eval(JSVariable);
			stringToReturn = stringToReturn.split("%%"+JSVariable+"%%").join(evalJS);
		}
		return stringToReturn;
	} else {
		return stringToInject;
	}
}

/* 
 * Function console_log_missing_block
 * Another debugging function, related to when a user tries to load a page before one has already started. 
 * This was already fixed by turning the function makePageCalls into a wrapper for makePageCallsInner
*/
function console_log_missing_block(block) { /* Because the javascript error from this is not enough */
	console.warn("%c Pages And Blocks Error: Block " + block + " does not exist in the blocks object.","background:yellow; color:red");
}
