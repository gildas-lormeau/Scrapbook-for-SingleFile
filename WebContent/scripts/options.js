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

	var bgPage = chrome.extension.getBackgroundPage(), askConfirmButton, expandArchivesButton, searchTitleButton, saveOnDiskButton, importButton, exportButton, exportToZipButton, importFromZipButton, compressButton, openInBackgroundButton;

	var requestFS = window.requestFileSystem || window.webkitRequestFileSystem;

	function setButtonOnclick() {
		bgPage.setDefaultFilters();
	}

	function resetButtonOnclick() {
		bgPage.resetDefaultFilters();
	}

	function askConfirmButtonOnclick() {
		bgPage.options.askConfirmation = askConfirmButton.value;
		bgPage.options.save();
	}

	function expandArchivesButtonOnclick() {
		bgPage.options.expandNewArchive = expandArchivesButton.value;
		bgPage.options.save();
	}

	function openInBackgroundOnclick() {
		bgPage.options.openInBackground = openInBackgroundButton.value;
		bgPage.options.save();
	}

	function saveOnDiskButtonOnclick() {
		bgPage.options.filesystemEnabled = saveOnDiskButton.value;
		bgPage.options.save();
	}

	function searchTitleButtonOnclick() {
		bgPage.options.searchInTitle = searchTitleButton.value;
		bgPage.options.save();
	}

	function importButtonOnclick() {
		if (bgPage.process.importing)
			bgPage.cancelImportDB();
		else
			bgPage.importDB();
	}

	function exportButtonOnclick() {
		if (bgPage.process.exporting)
			bgPage.cancelExportDB();
		else
			bgPage.exportDB();
	}

	function importFromZipButtonOnclick() {
		importFromZipButton.disabled = true;
		bgPage.importFromZip(event.target.files[0]);
	}

	function compressButtonOnclick() {
		bgPage.options.compress = compressButton.value;
		bgPage.options.save();
	}

	function resetDBButtonOnclick() {
		if (confirm("Do you really want to delete the database ? All your archives will be lost!")) {
			bgPage.resetDatabase(function() {
				alert("Database has been reseted");
			});
		}
	}

	function notifyProgress(state, buttonElement, altButtonElement) {
		var progressElement;
		if (buttonElement.previousElementSibling.tagName == "PROGRESS")
			progressElement = buttonElement.previousSibling;
		if (state) {
			if (!progressElement) {
				progressElement = document.createElement("progress");
				progressElement.className = "tabs-options-progress";
				buttonElement.parentElement.insertBefore(progressElement, buttonElement);
			}
			buttonElement.value = "Cancel";
			if (altButtonElement)
				altButtonElement.disabled = true;
			progressElement.style.display = "inline-block";
			progressElement.value = state.index;
			progressElement.max = state.max;
			progressElement.title = "progress: " + Math.floor((state.index * 100) / state.max) + "%";
		} else {
			if (progressElement)
				progressElement.parentElement.removeChild(progressElement);
			buttonElement.value = "OK";
			if (altButtonElement)
				altButtonElement.disabled = false;
		}
	}

	this.notifyImportProgress = function() {
		notifyProgress(bgPage.process.importing, importButton, exportButton);
	};

	this.notifyExportProgress = function() {
		notifyProgress(bgPage.process.exporting, exportButton, importButton);
	};

	this.initOptionsTab = function() {
		askConfirmButton = document.getElementById("options-ask-confirm-button");
		expandArchivesButton = document.getElementById("options-expand-archives-button");
		openInBackgroundButton = document.getElementById("options-open-archives-bg");
		searchTitleButton = document.getElementById("options-search-title-button");
		saveOnDiskButton = document.getElementById("options-save-archives-button");
		importButton = document.getElementById("options-import-button");
		exportButton = document.getElementById("options-export-button");
		importFromZipButton = document.getElementById("options-import-fromzip-button");
		compressButton = document.getElementById("options-compress-button");
		document.getElementById("options-set-button").onclick = setButtonOnclick;
		document.getElementById("options-reset-button").onclick = resetButtonOnclick;
		document.getElementById("options-reset-db-button").onclick = resetDBButtonOnclick;
		importButton.onclick = importButtonOnclick;
		exportButton.onclick = exportButtonOnclick;
		askConfirmButton.onchange = askConfirmButtonOnclick;
		importFromZipButton.onchange = importFromZipButtonOnclick;
		askConfirmButton.value = bgPage.options.askConfirmation;
		expandArchivesButton.onchange = expandArchivesButtonOnclick;
		expandArchivesButton.value = bgPage.options.expandNewArchive;
		openInBackgroundButton.onchange = openInBackgroundOnclick;
		openInBackgroundButton.value = bgPage.options.openInBackground;
		searchTitleButton.onchange = searchTitleButtonOnclick;
		searchTitleButton.value = bgPage.options.searchInTitle;
		saveOnDiskButton.onchange = saveOnDiskButtonOnclick;
		saveOnDiskButton.value = bgPage.options.filesystemEnabled;
		compressButton.onchange = compressButtonOnclick;
		compressButton.value = bgPage.options.compress;
		if (typeof requestFS == "undefined") {
			document.getElementById("options-save-archives-container").style.display = "none";
			document.getElementById("options-import-container").style.display = "none";
			document.getElementById("options-export-container").style.display = "none";
			document.getElementById("options-import-fromzip-container").style.display = "none";
		}
		notifyImportProgress();
		notifyExportProgress();
	};

	this.showOptionsTab = function(callback) {
		if (callback)
			callback();
	};

	this.onload = function() {
		initOptionsTab();
	};

})();
