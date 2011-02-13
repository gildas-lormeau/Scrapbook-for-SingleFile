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

	var bgPage = chrome.extension.getBackgroundPage(), displayed = false, pagesLink, tabsLink, tagsLink, optionsLink, tabPages, tabTabs, tabTags, tabOptions, newTabLink;

	this.showTab = function(tab, callback) {
		var loader = document.getElementById("loader");
		lastArgs = null;
		pagesLink.className = tabPages.className = "";
		tabsLink.className = tabTabs.className = "";
		tagsLink.className = tabTags.className = "";
		optionsLink.className = tabOptions.className = "";
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
		case "options":
			optionsLink.className = tabOptions.className = "selected";
			showOptionsTab(callback);
			break;
		case "firstUse":
			document.getElementById("main").style.height = "auto";
			if (loader)
				loader.style.display = "none";
			document.getElementById("firstuse").style.display = "block";
			break;
		}
	};
	
	this.onload = function() {
		pagesLink = document.getElementById("pages-link");
		tabsLink = document.getElementById("tabs-link");
		tagsLink = document.getElementById("tags-link");
		optionsLink = document.getElementById("options-link");
		newTabLink = document.getElementById("options-newtab");
		tabPages = document.getElementById("tab-pages");
		tabTabs = document.getElementById("tab-tabs");
		tabTags = document.getElementById("tab-tags");
		tabOptions = document.getElementById("tab-options");		
		bgPage.detectSingleFile(function(detected) {
			if (!detected) {
				document.getElementById("loader").style.display = "none";
				document.getElementById("error").style.display = "block";
				return;
			}
			pagesLink.onclick = function() {
				showTab("pages");
			};
			tabsLink.onclick = function() {
				showTab("tabs");
			};
			tagsLink.onclick = function() {
				showTab("tags");
			};
			optionsLink.onclick = function() {
				showTab("options");
			};
			newTabLink.onclick = function() {
				bgPage.chrome.tabs.create({
					url : location.href.split("#")[0] + "?newtab",
					selected : true
				});
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
			initOptionsTab();
			showTab(bgPage.tab || "pages", function() {
				var loader = document.getElementById("loader");
				if (bgPage.firstUse) {
					showTab("firstUse");
					bgPage.firstUse = false;
					return;
				}
				if (!displayed) {
					loader.parentElement.removeChild(loader);
					loader = null;
					document.getElementById("main").style.height = "auto";
					displayed = true;
				}
			});
		});
	};

	// if (location.search.indexOf("newtab") != -1)
	//	document.documentElement.className = "newtab";
	
})();