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

	var bgPage = chrome.extension.getBackgroundPage(), allSelected = false, selectAllButton, saveButton, ulElement, searchInput;

	function selectAllButtonOnclick() {
		allSelected = !allSelected;
		Array.prototype.forEach.call(document.querySelectorAll("#tab-tabs input[type=checkbox]"), function(inputElement) {
			inputElement.checked = allSelected;
			selectAllButton.value = allSelected ? "Unselect all" : "Select All";
		});
	}

	function saveButtonOnclick() {
		var selectedIds = [];
		Array.prototype.forEach.call(document.querySelectorAll("#tab-tabs input[type=checkbox]"), function(inputElement) {
			if (inputElement.checked)
				selectedIds.push(Number(inputElement.parentElement.id.split("tab.")[1]));
		});
		if (selectedIds.length)
			bgPage.saveTabs(selectedIds);
	}

	function display(tabs) {
		var tempElement = document.createElement("ul");

		tabs.forEach(function(tab) {
			var liElement, cbElement, aElement, favicoElement;
			if (tab.url.indexOf("https://chrome.google.com") == 0 || !(tab.url.indexOf("http://") == 0 || tab.url.indexOf("https://") == 0))
				return;
			aElement = document.createElement("a");
			favicoElement = document.createElement("img");
			liElement = document.createElement("li");
			cbElement = document.createElement("input");
			liElement.appendChild(cbElement);
			liElement.appendChild(favicoElement);
			liElement.appendChild(aElement);
			tempElement.appendChild(liElement);
			aElement.className = "tabs-tab-title";
			aElement.href = "#";
			aElement.title = "view the tab\n\n" + tab.title;
			aElement.onclick = function() {
				bgPage.selectTab(tab.id);
			};
			favicoElement.src = tab.favIconUrl ? tab.favIconUrl : "../resources/default_favico.gif";
			favicoElement.className = "row-favico";
			liElement.id = "tab." + tab.id;
			cbElement.type = "checkbox";
			cbElement.title = "select a tab to archive";
			aElement.textContent = tab.title;
		});
		tempElement.id = ulElement.id;
		tempElement.className = ulElement.className;
		ulElement.parentElement.replaceChild(tempElement, ulElement);
		ulElement = tempElement;
		allSelected = false;
		selectAllButton.value = "Select All";
		for (tabId in bgPage.tabs) {
			tab = bgPage.tabs[tabId];
			notifyTabProgress(tabId, tab.state, tab.index, tab.max);
		}
	}

	function search(callback) {
		bgPage.searchedTabs = searchInput.value ? searchInput.value.split(/\s+/) : null;
		bgPage.getTabsInfo(function(tabs) {
			display(tabs);
			if (callback)
				callback();
		});
	}

	function showTabs() {
		search();
		return false;
	}

	function getElements() {
		selectAllButton = document.getElementById("tabs-select-button");
		saveButton = document.getElementById("tabs-save-button");
		ulElement = document.getElementById("tabs-list");
		searchInput = document.getElementById("tabs-search-input");
	}

	this.initTabsTab = function() {
		var tabId, tab;
		getElements();
		selectAllButton.onclick = selectAllButtonOnclick;
		saveButton.onclick = saveButtonOnclick;
		searchInput.onchange = showTabs;
		document.getElementById("tabs-form").onsubmit = showTabs;
		searchInput.value = bgPage.searchedTabs ? bgPage.searchedTabs.join(" ") : "";
	};

	this.notifyTabProgress = function(tabId, state, index, max) {
		var progressElement, checkboxElement, titleElement, tabElement = document.getElementById("tab." + tabId);
		if (tabElement) {
			progressElement = tabElement.querySelector("progress");
			checkboxElement = tabElement.querySelector("input[type=checkbox]");
			titleElement = tabElement.querySelector(".tabs-tab-title");
			checkboxElement.checked = false;
			allSelected = false;
			selectAllButton.value = "Select All";
			if (!progressElement) {
				progressElement = document.createElement("progress");
				progressElement.className = "tabs-tab-progress";
				tabElement.appendChild(progressElement);
			}
			if (state != 2) {
				checkboxElement.disabled = true;
				titleElement.className = "tabs-tab-title saving";
				progressElement.value = index;
				progressElement.max = max;
				progressElement.title = "progress: " + Math.floor((index * 100) / max) + "%";
			} else {
				checkboxElement.disabled = false;
				titleElement.className = "tabs-tab-title";
				progressElement.parentElement.removeChild(progressElement);
			}
		}
	};

	this.showTabsTab = function(callback) {
		search(function() {
			bgPage.getSelectedTab(function(tab) {
				var tabElement = document.getElementById("tab." + tab.id);
				if (tabElement)
					tabElement.querySelector("input[type=checkbox]").checked = true;
				if (callback)
					callback();
			});
		});
	};

})();