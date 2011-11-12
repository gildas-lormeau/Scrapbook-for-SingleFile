/*
 * Copyright 2011 Gildas Lormeau
 * contact : gildas.lormeau <at> gmail.com
 * 
 * This file is part of PageArchiver.
 *
 *   PageArchiver is free software: you can redistribute it and/or modify
 *   it under the terms of the GNU Lesser General Public License as published by
 *   the Free Software Foundation, either version 3 of the License, or
 *   (at your option) any later version.
 *
 *   PageArchiver is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU Lesser General Public License for more details.
 *
 *   You should have received a copy of the GNU Lesser General Public License
 *   along with PageArchiver.  If not, see <http://www.gnu.org/licenses/>.
 */

var dev = false;

var DEFAULT_SEARCH_FILTERS = {
	sortBy : {
		field : "date",
		value : "desc"
	},
	limit : 20
};

var SINGLE_FILE_ID = dev ? "onlinihoegnbbcmeeocfeplgbkmoidla" : "jemlklgaibiijojffihnhieihhagocma";

var options = localStorage.options ? JSON.parse(localStorage.options) : {
	askConfirmation : "yes",
	expandNewArchive : "",
	filesystemEnabled : "",
	searchInTitle : "",
	compress : "yes",
	openInBackground : ""
};

options.save = function() {
	localStorage.options = JSON.stringify(options);
};

var notificationArchiving, timeoutNoResponse, timeoutSearch;

var popupState = {
	firstUse : !localStorage.defautSearchFilters,
	searchFilters : JSON.parse(JSON.stringify(localStorage.defautSearchFilters ? JSON.parse(localStorage.defautSearchFilters) : DEFAULT_SEARCH_FILTERS)),
	searchedTabs : "",
	searchedTags : "",
	expandedPages : {},
	expandedTags : {},
	newPages : {}
};

var process = {
	importing : null,
	exporting : null,
	exportingToZip : false,
	importingFromZip : false
};

var tabs = {
	length : 0
};

function resetDatabase(callback) {
	storage.reset(function(succeed) {
		localStorage.clear();
		callback(succeed);
	});
}

function getArchiveURL(id, callback) {
	storage.getContent(id, function(content, title) {
		var BlobBuilder = window.WebKitBlobBuilder, blobBuilder = new BlobBuilder(), BOM = new ArrayBuffer(3), v = new Uint8Array(BOM);
		v.set([ 0xEF, 0xBB, 0xBF ]);
		blobBuilder.append(BOM);
		blobBuilder.append(content);
		blobBuilder.append("<link rel='stylesheet' class='scrapbook-editor' href='" + chrome.extension.getURL("pages/proxy-page.css") + "'></link>");
		blobBuilder.append("<script class='scrapbook-editor'>var scrapbook_path = \"" + chrome.extension.getURL("") + "\";</script>");
		blobBuilder.append("<iframe id='scrapbook-background' class='scrapbook-editor' hidden src='"
				+ chrome.extension.getURL("pages/proxy-content.html?" + id) + "'></iframe>");
		blobBuilder.append("<script class='scrapbook-editor' src='" + chrome.extension.getURL("scripts/color-picker.js") + "'></script>");
		blobBuilder.append("<script class='scrapbook-editor' src='" + chrome.extension.getURL("scripts/proxy-page.js") + "'></script>");
		blobBuilder.append("<script class='scrapbook-editor'>history.pushState({}, \"" + title + "\", \"" + chrome.extension.getURL("pages/view.html") + "?"
				+ id + "\");</script>");
		callback(webkitURL.createObjectURL(blobBuilder.getBlob("text/html")));
	});
}

function open(id, selected) {
	if (popupState.newPages[id])
		popupState.newPages[id] = false;
	getArchiveURL(id, function(url) {
		chrome.tabs.create({
			url : url,
			selected : selected
		});
	});
}

function openPages(ids) {
	ids.forEach(function(id, index) {
		open(id, (!index && options.openInBackground != "yes"));
	});
}

function openLink(url) {
	chrome.tabs.create({
		url : url
	});
}

function getSelectedTab(callback) {
	chrome.tabs.getSelected(null, function(tab) {
		callback(tab);
	});
}

function detectSingleFile(callback) {
	var img = new Image();
	img.src = "chrome-extension://" + SINGLE_FILE_ID + "/resources/icon_16.png";
	img.onload = function() {
		callback(true);
	};
	img.onerror = function() {
		callback(false);
	};
}

function getTabsInfo(callback) {
	chrome.tabs.getAllInWindow(null, function(tabs) {
		if (popupState.searchedTabs)
			tabs = tabs.filter(function(tab) {
				var i, test = true;
				for (i = 0; i < popupState.searchedTabs.length && test; i++)
					test = test && tab.title.toLowerCase().indexOf(popupState.searchedTabs[i].toLowerCase()) != -1;
				return test;
			});
		callback(tabs);
	});
}

function onProcessEnd() {
	var notification = webkitNotifications.createHTMLNotification('notificationOK.html');
	if (notificationArchiving)
		notificationArchiving.cancel();
	if (timeoutNoResponse)
		clearTimeout(timeoutNoResponse);
	timeoutNoResponse = null;
	notification.show();
	setTimeout(function() {
		notification.cancel();
	}, 3000);
}

function setTimeoutNoResponse() {
	if (timeoutNoResponse)
		clearTimeout(timeoutNoResponse);
	timeoutNoResponse = setTimeout(function() {
		var notificationNoResponse = webkitNotifications.createHTMLNotification('notificationTimeout.html');
		tabs = {
			length : 0
		};
		notificationNoResponse.show();
		setTimeout(function() {
			notificationNoResponse.cancel();
		}, 3000);
		timeoutNoResponse = null;
	}, 60000);
}

function saveTabs(tabIds) {
	notificationArchiving = webkitNotifications.createHTMLNotification('notificationArchiving.html');
	notificationArchiving.show();
	setTimeout(function() {
		notificationArchiving.cancel();
	}, 3000);
	setTimeoutNoResponse();
	tabIds.forEach(function(tabId) {
		notifyTabProgress(tabId, 0, 0, 100);
	});
	chrome.extension.sendRequest(SINGLE_FILE_ID, {
		tabIds : tabIds
	}, function() {
	});
}

function selectTab(tabId) {
	chrome.tabs.update(tabId, {
		selected : true
	});
}

function setDefaultFilters() {
	localStorage.defautSearchFilters = JSON.stringify(popupState.searchFilters);
}

function resetDefaultFilters() {
	popupState.searchFilters = DEFAULT_SEARCH_FILTERS;
	setDefaultFilters();
}

function notifyViews(notifyHandler) {
	var views = chrome.extension.getViews(), popups = chrome.extension.getViews({
		type : "popup"
	}), extensionPages = [];
	if (popups.length)
		extensionPages = popups;
	views.forEach(function(view) {
		if (view.location.href.indexOf("chrome-extension://" + location.host + "/pages/popup.html") == 0)
			extensionPages.push(view);
	});
	extensionPages.forEach(function(extensionPage) {
		if (extensionPage != this)
			notifyHandler(extensionPage);
	});
}

function importDB() {
	process.importing = {
		index : 0,
		max : 0,
		cancel : storage.importDB(function(index, max) {
			process.importing.index = index;
			process.importing.max = max;
			notifyViews(function(extensionPage) {
				if (extensionPage.notifyImportProgress)
					extensionPage.notifyImportProgress();
			});
		}, function() {
			process.importing = null;
			notifyViews(function(extensionPage) {
				if (extensionPage.notifyImportProgress)
					extensionPage.notifyImportProgress();
			});
		})
	};
}

function cancelImportDB() {
	process.importing.cancel();
	process.importing = null;
}

function exportDB() {
	process.exporting = {
		index : 0,
		max : 0,
		cancel : storage.exportDB(function(index, max) {
			process.exporting.index = index;
			process.exporting.max = max;
			notifyViews(function(extensionPage) {
				if (extensionPage.notifyExportProgress)
					extensionPage.notifyExportProgress();
			});
		}, function() {
			process.exporting = null;
			notifyViews(function(extensionPage) {
				if (extensionPage.notifyExportProgress)
					extensionPage.notifyExportProgress();
			});
		})
	};
}

function cancelExportDB() {
	process.exporting.cancel();
	process.exporting = null;
}

function refreshBadge(text, title) {
	chrome.browserAction.setBadgeText({
		text : text
	});
	chrome.browserAction.setTitle({
		title : title
	});
}

function exportToZip(checkedPages, filename) {
	var notificationExporting, pctIndex = 0;
	if (process.exportingToZip || process.importingFromZip)
		return;
	process.exportingToZip = true;
	refreshBadge("0%", "exporting to zip...");
	notificationExporting = webkitNotifications.createHTMLNotification('notificationExporting.html');
	notificationExporting.show();
	setTimeout(function() {
		notificationExporting.cancel();
	}, 3000);
	storage.exportToZip(checkedPages, filename, options.compress == "yes", function(index, max) {
		var pct = Math.floor((index / max) * 100);
		if (pct != pctIndex) {
			refreshBadge(Math.floor((index / max) * 100) + "%", "exporting to zip...");
			pctIndex = pct;
		}
	}, function(url) {
		var notificationExportOK;
		process.exportingToZip = false;
		refreshBadge("", "");
		notificationExporting.cancel();
		chrome.tabs.create({
			url : url,
			selected : false
		});
		notificationExportOK = webkitNotifications.createHTMLNotification('notificationExportOK.html');
		notificationExporting.cancel();
		notificationExportOK.show();
		setTimeout(function() {
			notificationExportOK.cancel();
		}, 3000);
	});
}

function importFromZip(file) {
	var notificationImporting, pctIndex = 0;
	if (process.exportingToZip || process.importingFromZip)
		return;
	process.importingFromZip = true;
	refreshBadge("0%", "importing from zip...");
	notificationImporting = webkitNotifications.createHTMLNotification('notificationImporting.html');
	notificationImporting.show();
	setTimeout(function() {
		notificationImporting.cancel();
	}, 3000);
	storage.importFromZip(file, function(index, max) {
		var pct = Math.floor((index / max) * 100);
		if (pct != pctIndex) {
			refreshBadge(Math.floor((index / max) * 100) + "%", "importing from zip...");
			pctIndex = pct;
		}
	}, function() {
		var notificationImportOK;
		process.importingFromZip = false;
		refreshBadge("", "");
		notificationImportOK = webkitNotifications.createHTMLNotification('notificationImportOK.html');
		notificationImporting.cancel();
		notificationImportOK.show();
		setTimeout(function() {
			notificationImportOK.cancel();
		}, 3000);
	});
}

function notifyTabProgress(tabId, state, index, max) {
	notifyViews(function(extensionPage) {
		extensionPage.notifyTabProgress(tabId, state, index, max);
	});
	if (state == 2) {
		if (tabs[tabId])
			tabs.length--;
		delete tabs[tabId];
	} else {
		if (!tabs[tabId])
			tabs.length++;
		tabs[tabId] = {
			state : state,
			index : index,
			max : max
		};
	}
}

setDefaultFilters();
popupState.searchFilters.currentPage = 0;
if (!localStorage.options)
	options.save();

chrome.omnibox.setDefaultSuggestion({
	description : "PageArchiver : search an archive"
});

chrome.omnibox.onInputChanged.addListener(function(text, suggestCallback) {
	if (text) {
		if (timeoutSearch)
			clearTimeout(timeoutSearch);
		timeoutSearch = setTimeout(function() {
			storage.search({
				text : text.split(" ")
			}, true, function(rows, tags, count) {
				var description, i, suggestions = [];
				for (i = 0; i < rows.length; i++) {
					description = rows[i].title.replace(/[<>&]/g, "");
					suggestions.push({
						content : description + " (" + rows[i].id + ")",
						description : description
					});
				}
				suggestCallback(suggestions);
			});
			timeoutSearch = null;
		}, 500);
	}
});

chrome.omnibox.onInputEntered.addListener(function(text, suggestCallback) {
	var id, match = text.match(/\(([^)]*)\)$/);
	if (match)
		id = text.match(/\(([^)]*)\)$/)[1];
	if (id)
		open(id, options.openInBackground != "yes");
});

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
	if (request.saveArchive)
		storage.updatePage(request.archiveId, request.content);
	if (request.gefaultStyle) {
		var i, style = getComputedStyle(document.getElementById("basic-div")), divStyle = {};
		for (i = 0; i < style.length; i++)
			divStyle[style[i]] = style[style[i]];
		delete divStyle["width"];
		delete divStyle["-webkit-perspective-origin"];
		delete divStyle["-webkit-transform-origin"];
		sendResponse(JSON.stringify(divStyle));
	}
});

chrome.extension.onRequestExternal.addListener(function(request, sender, sendResponse) {
	setTimeoutNoResponse();
	if (request.processStart)
		notifyTabProgress(request.tabId, 0, 0, 100);
	else if (request.processProgress)
		notifyTabProgress(request.tabId, 1, request.tabIndex, request.tabMaxIndex);
	else if (request.processEnd) {
		notifyTabProgress(request.tabId, 2);
		storage.addContent(request.content, request.title, request.url, request.favicoData, function(id) {
			if (options.expandNewArchive == "yes")
				popupState.newPages[id] = true;
		}, function() {
			webkitNotifications.createHTMLNotification('notificationFileError.html').show();
		});
		sendResponse({});
		if (!tabs.length)
			onProcessEnd();
	}
});

chrome.browserAction.setBadgeBackgroundColor({
	color : [ 4, 229, 36, 255 ]
});
