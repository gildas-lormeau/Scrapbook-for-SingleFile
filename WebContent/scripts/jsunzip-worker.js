/*
 * Copyright 2011 Gildas Lormeau
 * contact : gildas.lormeau <at> gmail.com
 * 
 * This file is part of ZipTabs.
 *
 *   ZipTabs is free software: you can redistribute it and/or modify
 *   it under the terms of the GNU Lesser General Public License as published by
 *   the Free Software Foundation, either version 3 of the License, or
 *   (at your option) any later version.
 *
 *   ZipTabs is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU Lesser General Public License for more details.
 *
 *   You should have received a copy of the GNU Lesser General Public License
 *   along with ZipTabs.  If not, see <http://www.gnu.org/licenses/>.
 */

importScripts('jsunzip.js');

(function() {

	var index, unzipper = new JSUnzip();

	onmessage = function(event) {
		var data = event.data, isZipFile;

		if (data.message == "setContent") {
			unzipper.setContent(data.content);
			postMessage({
				message : "setContent",
				isZipFile : unzipper.isZipFile()
			});
		}

		if (data.message == "getEntries") {
			var entries = [];
			if (unzipper.isZipFile()) {
				unzipper.getEntries();
				unzipper.entries.forEach(function(entry) {
					entries.push({
						bitFlag : entry.bitFlag,
						compressedSize : entry.compressedSize,
						compressionMethod : entry.compressionMethod,
						crc32 : entry.crc32,
						extra : entry.extra,
						filename : entry.fileName,
						signature : entry.signature,
						timeBlob : entry.timeBlob,
						uncompressedSize : entry.uncompressedSize,
						versionNeeded : entry.versionNeeded
					});
				});
			}
			postMessage({
				message : "getEntries",
				entries : entries
			});
		}

		if (data.message == "getEntryData") {
			var zipEntry = unzipper.entries[data.index], zipData, uncompressedData, blobBuilder = this.BlobBuilder ? new BlobBuilder()
					: new WebKitBlobBuilder();
			if (zipEntry) {
				zipData = zipEntry.getData(zipEntry.compressionMethod == 0);
				blobBuilder.append(zipEntry.compressionMethod == 0 ? zipData : zipEntry.compressionMethod == 8 ? JSInflate.inflate(zipData,
						zipEntry.uncompressedSize) : null);
				uncompressedData = blobBuilder.getBlob();
				/*
				 * uncompressedData = zipEntry.compressionMethod == 0 ? zipData : zipEntry.compressionMethod == 8 ?
				 * JSInflate.inflate(zipData, zipEntry.uncompressedSize) : null;
				 */
			}
			postMessage({
				message : "getEntryData",
				index : data.index,
				/* data : uncompressedData */
				blob : uncompressedData
			});
		}

	};

})();