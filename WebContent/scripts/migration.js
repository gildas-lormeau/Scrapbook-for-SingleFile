// --- migration code from version 0.0.91 to 0.0.92+ ---
(function() {
	var options;

	if (localStorage.defaultArgs) {
		localStorage.defautSearchFilters = localStorage.defaultArgs;
		delete localStorage.defaultArgs;
	}
	if (localStorage.askConfirm) {
		options = {
			askConfirmation : localStorage.askConfirm,
			expandNewArchive : localStorage.expandArchives,
			openInBgTab : localStorage.openBgTab,
			filesystemEnabled : localStorage.filesystemEnabled,
			searchInTitle : ""
		};
		delete localStorage.askConfirm;
		delete localStorage.expandArchives;
		delete localStorage.openBgTab;
		delete localStorage.filesystemEnabled;
		localStorage.options = JSON.stringify(options);
	}
})();
// ---

// --- migration code from version 0.1.0 to 0.1.+ ---
(function() {
	var options;

	if (localStorage.options) {
		options = JSON.parse(localStorage.options);
		if (typeof options.compress == "undefined") {
			options.compress = "yes";
			localStorage.options = JSON.stringify(options);
		}
	}
})();
// ---

// --- migration code from version 0.1.1 to 0.1.2+ ---
(function() {
	var options;

	if (localStorage.options) {
		options = JSON.parse(localStorage.options);
		if (typeof options.openInBgTab != "undefined") {
			delete options.openInBgTab;
			localStorage.options = JSON.stringify(options);
		}
	}
})();
// ---

// --- migration code from version 0.1.8 to 0.1.8+ ---
(function() {
	var options;

	if (localStorage.options) {
		options = JSON.parse(localStorage.options);
		if (typeof options.openInBackground == "undefined") {
			options.openInBackground = "";
			localStorage.options = JSON.stringify(options);
		}
	}
})();
// ---
