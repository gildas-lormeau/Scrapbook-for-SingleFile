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
