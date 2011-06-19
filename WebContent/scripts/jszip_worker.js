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
		JSZip.instance = new JSZip("DEFLATE", true);
	if (data.message == "add") {
		JSZip.instance.add(data.name, data.content);
		postMessage({
			message : "add",
			name : data.name
		});
	}
	if (data.message == "generate") {		
		postMessage({
			message : "generate",
			zip : JSZip.instance.generate(true)
		});
	}
};