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

	var bgPage = chrome.extension.getBackgroundPage(), /*disableButton, */askConfirmButton, expandArchivesButton, saveOnDiskButton;

	function setButtonOnclick() {
		bgPage.setDefaultFilters();
	}

	function resetButtonOnclick() {
		bgPage.resetDefaultFilters();
	}

	// function disableButtonOnclick() {
	//	bgPage.disableSingleFile(disableButton.value);
	// }

	function askConfirmButtonOnclick() {
		bgPage.askConfirm(askConfirmButton.value);
	}

	function expandArchivesButtonOnclick() {
		bgPage.expandArchives(expandArchivesButton.value);
	}

	function saveOnDiskButtonOnclick() {
		bgPage.setFilesystemEnabled(saveOnDiskButton.value);
	}

	this.initOptionsTab = function() {
		// disableButton = document.getElementById("options-disable-sf-button");
		askConfirmButton = document.getElementById("options-ask-confirm-button");
		expandArchivesButton = document.getElementById("options-expand-archives-button");
		saveOnDiskButton = document.getElementById("options-save-archives-button");
		document.getElementById("options-set-button").onclick = setButtonOnclick;
		document.getElementById("options-reset-button").onclick = resetButtonOnclick;
		expandArchivesButton.onclick = resetButtonOnclick;
		// disableButton.onchange = disableButtonOnclick;
		// disableButton.value = bgPage.getDisableSingleFile();
		askConfirmButton.onchange = askConfirmButtonOnclick;
		askConfirmButton.value = bgPage.getAskConfirm();
		expandArchivesButton.onchange = expandArchivesButtonOnclick;
		expandArchivesButton.value = bgPage.getExpandArchives();
		saveOnDiskButton.onchange = saveOnDiskButtonOnclick;
		saveOnDiskButton.value = bgPage.isFilesystemEnabled() || "";
		if (typeof requestFileSystem == "undefined")
			document.getElementById("options-save-archives-container").style.display = "none";
	};

	this.showOptionsTab = function(callback) {
		if (callback)
			callback();
	};

})();