importScripts('jszip.js');
importScripts('jszip-deflate.js');

/*
 * Worker API
 * 
 * author: Gildas Lormeau
 */
onmessage = function(event) {
	var data = event.data, blobBuilder = this.BlobBuilder ? new BlobBuilder() : new WebKitBlobBuilder();
	if (data.message == "new")
		JSZip.instance = new JSZip(data.compress ? "DEFLATE" : "STORE");
	if (data.message == "add") {
		blobBuilder.append(JSZip.instance.add(data.name, data.content));
		postMessage({
			message : "add",
			name : data.name,
			/* arrayBuffer : JSZip.instance.add(data.name, data.content) */
			blob : blobBuilder.getBlob()
		});
	}
	if (data.message == "generateEndFile") {
		blobBuilder.append(JSZip.instance.generateEndFile());
		postMessage({
			message : "generateEndFile",
			/* arrayBuffer : JSZip.instance.generateEndFile() */
			blob : blobBuilder.getBlob()
		});
	}
};