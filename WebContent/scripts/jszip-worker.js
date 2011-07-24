importScripts('jszip.js');
importScripts('jszip-deflate.js');

/*
 * Worker API
 * 
 * author: Gildas Lormeau
 */
onmessage = function(event) {
	var data = event.data;
	if (data.message == "new")
		JSZip.instance = new JSZip(data.compress ? "DEFLATE" : "STORE");
	if (data.message == "add") {
		postMessage({
			message : "add",
			name : data.name,
			arrayBuffer : JSZip.instance.add(data.name, data.content)
		});
	}
	if (data.message == "generateEndFile") {
		postMessage({
			message : "generateEndFile",
			arrayBuffer : JSZip.instance.generateEndFile()
		});
	}
};