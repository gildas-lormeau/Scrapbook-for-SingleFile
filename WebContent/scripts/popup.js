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

(function() {

	var bgPage = chrome.extension.getBackgroundPage(), state = bgPage.popupState, displayed = false, pagesLink, tabsLink, tagsLink, tabPages, tabTabs, tabTags, newTabLink, newNoteLink;

	this.showTab = function(tab, callback) {
		var loader = document.getElementById("loader");
		pagesLink.className = tabPages.className = "";
		tabsLink.className = tabTabs.className = "";
		tagsLink.className = tabTags.className = "";
		document.getElementById("firstuse").style.display = "none";
		bgPage.tab = tab;
		switch (tab) {
		case "pages":
			pagesLink.className = tabPages.className = "selected";
			showPagesTab(callback);
			break;
		case "tabs":
			tabsLink.className = tabTabs.className = "selected";
			showTabsTab(callback);
			break;
		case "tags":
			tagsLink.className = tabTags.className = "selected";
			showTagsTab(callback);
			break;
		case "firstUse":
			document.getElementById("main").style.display = "block";
			if (loader)
				loader.style.display = "none";
			document.getElementById("firstuse").style.display = "block";
			break;
		}
	};

	function init() {
		pagesLink.onclick = function() {
			showTab("pages");
		};
		tabsLink.onclick = function() {
			showTab("tabs");
		};
		tagsLink.onclick = function() {
			showTab("tags");
		};
		newNoteLink.onclick = function() {
			bgPage.createNewNote(prompt("title"));
		};
		newTabLink.onclick = function() {
			bgPage.chrome.tabs.create({
				url : location.href.split("#")[0] + "?newtab",
				selected : true
			});
		};
		newTabLink.onkeyup = function(event) {
			if (event.keyIdentifier == "Enter")
				newTabLink.onclick();
		};
		document.getElementById("firstuse-tabs-link").onclick = function() {
			showTab("tabs");
		};
		document.getElementById("firstuse-pages-link").onclick = function() {
			showTab("pages");
		};
		initPagesTab();
		initTabsTab();
		initTagsTab();
		showTab(bgPage.tab || "pages", function() {
			var loader = document.getElementById("loader");
			if (state.firstUse) {
				showTab("firstUse");
				state.firstUse = false;
				return;
			}
			if (!displayed) {
				loader.parentElement.removeChild(loader);
				loader = null;
				document.getElementById("main").style.display = "block";
				displayed = true;
			}
		});
	}

	this.onload = function() {
		pagesLink = document.getElementById("pages-link");
		tabsLink = document.getElementById("tabs-link");
		tagsLink = document.getElementById("tags-link");
		newTabLink = document.getElementById("options-newtab");
		newNoteLink = document.getElementById("new-note-link");
		tabPages = document.getElementById("tab-pages");
		tabTabs = document.getElementById("tab-tabs");
		tabTags = document.getElementById("tab-tags");
		bgPage.detectSingleFile(function(detected) {
			if (detected)
				init();
			else {
				document.getElementById("loader").style.display = "none";
				document.getElementById("error").style.display = "block";
			}
		});
	};

})();
