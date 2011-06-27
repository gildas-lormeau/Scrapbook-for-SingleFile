// --- migration code from version 0.0.91 to 0.0.92+
if (localStorage.defaultArgs) {
	localStorage.defautSearchFilters = localStorage.defaultArgs;
	delete localStorage.defaultArgs;
}
// ---