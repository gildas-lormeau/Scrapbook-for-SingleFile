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

	var bgPage = chrome.extension.getBackgroundPage(), askConfirmButton, expandArchivesButton, saveOnDiskButton, importButton, exportButton, exportToZipButton, importFromZipButton, openBgTabButton;

	var requestFS = window.requestFileSystem || window.webkitRequestFileSystem;

	function setButtonOnclick() {
		bgPage.setDefaultFilters();
	}

	function resetButtonOnclick() {
		bgPage.resetDefaultFilters();
	}

	function openBgTabButtonOnclick() {
		bgPage.openBgTab(openBgTabButton.value);
	}

	function askConfirmButtonOnclick() {
		bgPage.askConfirm(askConfirmButton.value);
	}

	function expandArchivesButtonOnclick() {
		bgPage.expandArchives(expandArchivesButton.value);
	}

	function saveOnDiskButtonOnclick() {
		bgPage.setFilesystemEnabled(saveOnDiskButton.value);
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
		saveOnDiskButton = document.getElementById("options-save-archives-button");
		importButton = document.getElementById("options-import-button");
		openBgTabButton = document.getElementById("options-open-bgtab-button");
		exportButton = document.getElementById("options-export-button");
		exportToZipButton = document.getElementById("options-export-tozip-button");
		importFromZipButton = document.getElementById("options-import-fromzip-button");
		document.getElementById("options-set-button").onclick = setButtonOnclick;
		document.getElementById("options-reset-button").onclick = resetButtonOnclick;
		importButton.onclick = importButtonOnclick;
		exportButton.onclick = exportButtonOnclick;
		expandArchivesButton.onclick = resetButtonOnclick;
		askConfirmButton.onchange = askConfirmButtonOnclick;
		importFromZipButton.onchange = importFromZipButtonOnclick;
		askConfirmButton.value = bgPage.getAskConfirm();
		openBgTabButton.onchange = openBgTabButtonOnclick;
		openBgTabButton.value = bgPage.getOpenBgTab();
		expandArchivesButton.onchange = expandArchivesButtonOnclick;
		expandArchivesButton.value = bgPage.getExpandArchives();
		saveOnDiskButton.onchange = saveOnDiskButtonOnclick;
		saveOnDiskButton.value = bgPage.getFilesystemEnabled();
		if (typeof requestFS == "undefined") {
			document.getElementById("options-save-archives-container").style.display = "none";
			document.getElementById("options-import-container").style.display = "none";
			document.getElementById("options-export-container").style.display = "none";
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