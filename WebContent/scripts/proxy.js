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

(function() {
	var bgPage = chrome.extension.getBackgroundPage(), archiveId = Number(location.search.split('?')[1]);

	/*
	function getLink(element) {
		while (element && (!(element.nodeName.toLowerCase() == "a" && element.href)))
			element = element.parentElement;
		return element;
	}

	function navigate(event, newWindow) {
		var currLink = getLink(event.target), href;
		if (currLink && currLink.getAttribute("href").indexOf("#") != 0) {
			event.preventDefault();
			if (event.shiftKey) {
				bgPage.setLinkedElement({
					link : currLink,
					archiveId : archiveId,
					archiveDoc : document
				});
				return;
			}
			bgPage.storage.getPage(currLink.href, function(id) {
				bgPage.popupState.newPages[id] = false;
				href = id ? "/pages/stub.html?" + id : currLink.href;
				if (newWindow)
					bgPage.openURL(href, false);
				else if (currLink.target)
					bgPage.openURL(href, true);
				else
					location.href = href;
			});
		}
	}

	function mouseclick(event) {
		if (bgPage.linkedElement && bgPage.linkedElement.archiveId == archiveId) {
			bgPage.resetLinkedElement();
			event.preventDefault();
			return;
		}
		if (event.button == 0)
			navigate(event);
		// chrome or chromium bug ?
		if (event.button == 1)
			event.preventDefault();
	}

	function mouseup(event) {
		if (event.button == 1)
			navigate(event, true);
	}

	function keyup() {
		if (event.keyCode == 27 && bgPage.linkedElement && bgPage.linkedElement.archiveId == archiveId)
			bgPage.resetLinkedElement();
	}
	*/

	/*
	chrome.extension.getBackgroundPage().storage.getContent(archiveId, function(content, title) {
		try {
			// TODO : annuler tte modif dans la page via events
			window.chrome = null;
			window.webkitRequestFileSystem = null;
			window.openDatabase = null;
			window.__defineGetter__("localStorage", function() {
			});
		} catch (e) {
		}
		bgPage.popupState.newPages[archiveId] = false;
		document.open();
		document.write(content);
		document.close();
		document.title = title;
		document.addEventListener("click", mouseclick, true);
		document.addEventListener("mouseup", mouseup, true);
		document.addEventListener("keyup", keyup, true);
		window.onunload = function() {
			if (bgPage.linkedElement && bgPage.linkedElement.archiveId == archiveId)
				bgPage.linkedElement = null;
		};
	});
	*/

	bgPage.storage.getContent(archiveId, function(content, title) {			
		var BBuilder = window.BlobBuilder || window.WebKitBlobBuilder, blobBuilder = new BBuilder(), BOM = new ArrayBuffer(3), v = new Uint8Array(BOM);
		v.set([ 0xEF, 0xBB, 0xBF ]);
		blobBuilder.append(BOM);
		blobBuilder.append(content);
		blobBuilder.append("<link rel='stylesheet' class='scrapbook-editor' href='" + chrome.extension.getURL("pages/proxy-page.css") + "'></link>");
		blobBuilder.append("<script class='scrapbook-editor'>var _SCRAPBOOK_PATH = \"" + chrome.extension.getURL("") + "\";</script>");
		blobBuilder.append("<iframe id='scrapbook-background' class='scrapbook-editor' hidden src='" + chrome.extension.getURL("pages/proxy-content.html"  + "?" + archiveId) + "'></iframe>");
		blobBuilder.append("<script class='scrapbook-editor' src='" + chrome.extension.getURL("scripts/color-picker.js") + "'></script>");
		blobBuilder.append("<script class='scrapbook-editor' src='" + chrome.extension.getURL("scripts/proxy-page.js") + "'></script>");
		blobBuilder.append("<script class='scrapbook-editor'>document.title = \"" + title + "\";</script>");		
		location.href = webkitURL.createObjectURL(blobBuilder.getBlob("text/html"));
	});
		
})();
