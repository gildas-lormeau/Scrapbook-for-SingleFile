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

	var bgPage = chrome.extension.getBackgroundPage(), askConfirmButton, expandArchivesButton, searchTitleButton, saveOnDiskButton, importButton, exportButton, exportToZipButton, importFromZipButton, compressButton;

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

	this.notifyExportToZipProgress = function() {
		notifyProgress(bgPage.process.exportingToZip, exportToZipButton);
		if (!bgPage.process.exportingToZip)
			document.getElementById("pages-export-button").disabled = false;
	};

	this.notifyImportFromZipProgress = function() {
		notifyProgress(bgPage.process.importingFromZip, importFromZipButton);
		if (!bgPage.process.importingFromZip)
			importFromZipButton.disabled = false;
		importFromZipButton.hidden = !!bgPage.process.importingFromZip;
	};

	this.initOptionsTab = function() {
		askConfirmButton = document.getElementById("options-ask-confirm-button");
		expandArchivesButton = document.getElementById("options-expand-archives-button");
		searchTitleButton = document.getElementById("options-search-title-button");
		saveOnDiskButton = document.getElementById("options-save-archives-button");
		importButton = document.getElementById("options-import-button");
		exportButton = document.getElementById("options-export-button");
		exportToZipButton = document.getElementById("options-export-tozip-button");
		importFromZipButton = document.getElementById("options-import-fromzip-button");
		compressButton = document.getElementById("options-compress-button");
		document.getElementById("options-set-button").onclick = setButtonOnclick;
		document.getElementById("options-reset-button").onclick = resetButtonOnclick;
		importButton.onclick = importButtonOnclick;
		exportButton.onclick = exportButtonOnclick;
		askConfirmButton.onchange = askConfirmButtonOnclick;
		importFromZipButton.onchange = importFromZipButtonOnclick;
		askConfirmButton.value = bgPage.options.askConfirmation;
		expandArchivesButton.onchange = expandArchivesButtonOnclick;
		expandArchivesButton.value = bgPage.options.expandNewArchive;
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
			document.getElementById("options-export-tozip-container").style.display = "none";
		}
		notifyImportProgress();
		notifyExportProgress();
		notifyExportToZipProgress();
		notifyImportFromZipProgress();
	};

	this.showOptionsTab = function(callback) {
		if (callback)
			callback();
	};

})();