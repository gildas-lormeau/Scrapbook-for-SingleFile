/*
 * Copyright 2011 Gildas Lormeau
 * contact : gildas.lormeau <at> gmail.com
 * 
 * This file is part of Scrapbook for SingleFile.
 *
 *   Scrapbook for SingleFile is free software: you can redistribute it and/or modify
 *   it under the terms of the GNU Lesser General Public License as published by
 *   the Free Software Foundation, either version 3 of the License, or
 *   (at your option) any later version.
 *
 *   Scrapbook for SingleFile is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU Lesser General Public License for more details.
 *
 *   You should have received a copy of the GNU Lesser General Public License
 *   along with Scrapbook for SingleFile.  If not, see <http://www.gnu.org/licenses/>.
 */

var dev = false;

var DEFAULT_SEARCH_FILTERS = {
	sortBy : {
		field : "date",
		value : "desc"
	},
	limit : 20
};

var SINGLE_FILE_ID = dev ? "onlinihoegnbbcmeeocfeplgbkmoidla" /* "oabofdibacblkhpogjinmdbcekfkikjc" */: "jemlklgaibiijojffihnhieihhagocma";

var options = localStorage.options ? JSON.parse(localStorage.options) : {
	askConfirmation : "yes",
	expandNewArchive : "yes",
	openInBgTab : "yes",
	filesystemEnabled : "",
	searchInTitle : ""
}, linkedElement;



options.save = function() {
	localStorage.options = JSON.stringify(options);
};

var notificationArchiving, timeoutNoResponse;

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
	exportingToZip : null,
	importingFromZip : null
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

function open(id, selected) {
	chrome.tabs.create({
		url : "pages/stub.html?" + id,
		selected : selected
	});
}

function openURL(url, selected) {
	chrome.tabs.create({
		url : url,
		selected : selected
	});
}

function openPages(checkedPages) {
	checkedPages.forEach(function(id, index) {
		if (index)
			open(id, false);
		else
			open(id, options.openInBgTab != "yes");
	});
}

function getDoctype(doc) {
	var docType = doc.doctype, docTypeStr;
	if (docType) {
		docTypeStr = "<!DOCTYPE " + docType.nodeName;
		if (docType.publicId) {
			docTypeStr += " PUBLIC \"" + docType.publicId + "\"";
			if (docType.systemId)
				docTypeStr += " \"" + docType.systemId + "\"";
		} else if (docType.systemId)
			docTypeStr += " SYSTEM \"" + docType.systemId + "\"";
		if (docType.internalSubset)
			docTypeStr += " [" + docType.internalSubset + "]";
		return docTypeStr + ">\n";
	}
	return "";
}

function updatePage() {
	var element = linkedElement;
	resetLinkedElement();
	storage.updatePage(element.archiveId, getDoctype(element.archiveDoc) + element.archiveDoc.documentElement.outerHTML);
}

function resetLinkedElement() {
	linkedElement.link.style.backgroundColor = null;
	linkedElement = null;
}

function setLinkedElement(element) {
	linkedElement = element;
	linkedElement.link.style.backgroundColor = "green";
	tab = "pages";
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
	var img;
	img = new Image();
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
		max : 0
	};
	storage.importDB(function(index, max) {
		process.importing = {
			index : index,
			max : max
		};
		notifyViews(function(extensionPage) {
			extensionPage.notifyImportProgress();
		});
	}, function() {
		process.importing = null;
		notifyViews(function(extensionPage) {
			if (extensionPage.notifyImportProgress)
				extensionPage.notifyImportProgress();
		});
	});
}

function exportDB() {
	process.exporting = {
		index : 0,
		max : 0
	};
	storage.exportDB(function(index, max) {
		process.exporting = {
			index : index,
			max : max
		};
		notifyViews(function(extensionPage) {
			extensionPage.notifyExportProgress();
		});
	}, function() {
		process.exporting = null;
		notifyViews(function(extensionPage) {
			extensionPage.notifyExportProgress();
		});
	});
}

function exportToZip(checkedPages) {
	var notificationExporting;

	process.exportingToZip = {
		index : 0,
		max : 0
	};
	notificationExporting = webkitNotifications.createHTMLNotification('notificationExporting.html');
	notificationExporting.show();
	setTimeout(function() {
		notificationExporting.cancel();
	}, 3000);
	storage.exportToZip(checkedPages, function(index, max) {
		process.exportingToZip = {
			index : index,
			max : max
		};
		notifyViews(function(extensionPage) {
			extensionPage.notifyExportToZipProgress();
		});
	}, function(file) {
		var notificationExportOK;
		process.exportingToZip = null;
		notifyViews(function(extensionPage) {
			extensionPage.notifyExportToZipProgress();
		});
		notificationExporting.cancel();
		chrome.tabs.create({
			url : webkitURL.createObjectURL(file),
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
	var notificationImporting;

	process.importingFromZip = {
		index : 0,
		max : 0
	};
	notificationImporting = webkitNotifications.createHTMLNotification('notificationImporting.html');
	notificationImporting.show();
	setTimeout(function() {
		notificationImporting.cancel();
	}, 3000);
	storage.importFromZip(file, function(index, max) {
		process.importingFromZip = {
			index : index,
			max : max
		};
		notifyViews(function(extensionPage) {
			extensionPage.notifyImportFromZipProgress();
		});
	}, function() {
		var notificationImportOK;
		process.importingFromZip = null;
		notifyViews(function(extensionPage) {
			extensionPage.notifyImportFromZipProgress();
		});
		notificationImportOK = webkitNotifications.createHTMLNotification('notificationImportOK.html');
		notificationImporting.cancel();
		notificationImportOK.show();
		setTimeout(function() {
			notificationImportOK.cancel();
		}, 3000);
	});
}

function cancelImportDB() {
	process.importing = null;
}

function cancelExportDB() {
	process.exporting = null;
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
	description : "Scrapbook for SingleFile : search an archive"
});

chrome.omnibox.onInputChanged.addListener(function(text, suggestCallback) {
	if (text)
		storage.search({
			text : text		
		}, options.searchInTitle, function(rows, tags, count) {
			var i, suggestions = [];
			for (i = 0; i < rows.length; i++)
				suggestions.push({
					content : "page/" + rows[i].id,
					description : rows[i].title.replace(/[<>]/g, "")
				});
			
			suggestCallback(suggestions);
		});
});

chrome.omnibox.onInputEntered.addListener(function(text, suggestCallback) {
	var id = text.split("/")[1];
	if (id)
		open(id);
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