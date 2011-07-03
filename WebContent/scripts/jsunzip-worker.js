importScripts('jsunzip.js');

/*
 * Worker API
 * 
 * author: Gildas Lormeau
 */
(function() {

	var index;

	onmessage = function(event) {
		var data = event.data, instance, isZipFile;

		if (data.message == "parse") {
			JSUnzip.instance = instance = new JSUnzip(data.content);
			index = 0;
			isZipFile = instance.isZipFile();
			if (isZipFile)
				instance.readEntries(data.name, data.content);
			postMessage({
				message : "parse",
				entriesLength : isZipFile ? instance.entries.length : 0,
				isZipFile : isZipFile
			});
		}
		if (data.message == "getNextEntry") {
			var zipEntry, uncompressedData, utf8ArrayBuffer, uint8Array, blobBuilder = WebKitBlobBuilder ? new WebKitBlobBuilder()
					: BlobBuilder ? new BlobBuilder() : null;
			zipEntry = JSUnzip.instance.entries[index];
			if (zipEntry) {
				var zipData = zipEntry.getData();
				uncompressedData = zipEntry.compressionMethod == 0 ? zipData : zipEntry.compressionMethod == 8 ? JSInflate.inflate(zipData) : null;
				utf8ArrayBuffer = new ArrayBuffer(uncompressedData.length);
				uint8Array = new Uint8Array(utf8ArrayBuffer);
				uint8Array.set(uncompressedData);
				blobBuilder.append(utf8ArrayBuffer);
				postMessage({
					message : "getNextEntry",
					index : index,
					filename : zipEntry.fileName,
					file : blobBuilder.getBlob()
				});
				index++;
			} else
				JSUnzip.instance = null;
		}
	};

})();