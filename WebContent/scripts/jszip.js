/*

JSZip - A Javascript class for generating Zip files
<http://jszip.stuartk.co.uk>

(c) 2009 Stuart Knightley <stuart [at] stuartk.co.uk>
Licenced under the GPLv3 and the MIT licences


Modifications from Gildas Lormeau <gildas.lormeau [at] gmail.com>:
- removed unused code to match extension needs: removed methods should be handled by a upper layer
- major code refactoring
- compatible only with Webkit (because of WebKitBlobBuilder function use)
- added utf8 support for filenames
- get zip content in a Blob object

Usage:
   zip = new JSZip();
   zip.add("hello.txt", "Hello, World!").add("tempfile", "nothing");   
   binaryZip = zip.generate();

 */
var JSZip;

(function() {

	JSZip = function(compression) {
		if (!JSZip.compressions[compression])
			throw compression + " is not a valid compression method";
		this.compression = (compression || "STORE").toUpperCase();
		this.files = [];
		this.fileNames = [];
		this.blobBuilder = new WebKitBlobBuilder();
		this.datalength = 0;
	};

	/**
	 * Add a file to the zip file
	 * 
	 * @param name The name of the file
	 * @param data The file data (raw encoded)
	 * @param options Object with optional binary (boolean), directory (boolean) and compressionLevel (Number) attributes
	 * @return this JSZip object
	 */
	JSZip.prototype.add = function(name, data, options) {
		var dosTime, dosDate, compression, compressedData, utf8Name, header, contentHeader, date = new Date();
		if (this.files[name])
			throw name + " file already exists";
		options = options || {};
		dosTime = date.getHours();
		dosTime = dosTime << 6;
		dosTime = dosTime | date.getMinutes();
		dosTime = dosTime << 5;
		dosTime = dosTime | date.getSeconds() / 2;
		dosDate = date.getFullYear() - 1980;
		dosDate = dosDate << 4;
		dosDate = dosDate | (date.getMonth() + 1);
		dosDate = dosDate << 5;
		dosDate = dosDate | date.getDate();
		if (!options.binary)
			data = "\xEF\xBB\xBF" + utf8encode(data);
		compression = JSZip.compressions[this.compression];
		compressedData = compression.compress(data, options.compressionLevel || 6);
		utf8Name = utf8encode(name);
		header = "\x0A\x00\x00\x08" + compression.magic + decToHex(dosTime, 2) + decToHex(dosDate, 2) + decToHex(crc32(data), 4)
				+ decToHex(compressedData.length, 4) + decToHex(data.length, 4) + decToHex(utf8Name.length, 2) + "\x00\x00";
		this.fileNames.push(name);
		this.files[name] = {
			header : header,
			directory : options.directory,
			utf8Name : utf8Name,
			offset : this.datalength
		};
		contentHeader = "\x50\x4b\x03\x04" + header + utf8Name;
		appendString(this, contentHeader);
		appendString(this, compressedData);
		this.datalength += contentHeader.length + compressedData.length;
		return this;
	};

	/**
	 * Generate the zip file
	 * 
	 * @return the Blob object
	 */
	JSZip.prototype.generate = function() {
		var i, name, file, dirRecord, centralDirectorySize = 0, fileNamesLength = this.fileNames.length, zipLength = this.datalength;
		for (i = 0; i < fileNamesLength; i++) {
			name = this.fileNames[i], file = this.files[name];
			dirRecord = "\x50\x4b\x01\x02" +
			// version made by (00: DOS)
			"\x14\x00" + file.header +
			// file comment length
			"\x00\x00" +
			// disk number start
			"\x00\x00" +
			// internal file attributes
			"\x00\x00" + (file.directory ? "\x10\x00\x00\x00" : "\x00\x00\x00\x00") + decToHex(file.offset, 4) + file.utf8Name;
			centralDirectorySize += dirRecord.length;
			appendString(this, dirRecord);
		}
		// end of central dir signature
		centralDirSignature = "\x50\x4b\x05\x06" +
		// number of this disk
		"\x00\x00" +
		// number of the disk with the start of the central directory
		"\x00\x00" + decToHex(fileNamesLength, 2) + decToHex(fileNamesLength, 2) + decToHex(centralDirectorySize, 4) + decToHex(zipLength, 4) + "\x00\x00";
		appendString(this, centralDirSignature);
		return this.blobBuilder.getBlob();
	};

	JSZip.compressions = {
		"STORE" : {
			magic : "\x00\x00", // 2 bytes indentifying the compression method compress
			compress : function(content) { // return compressed content
				return content; // no compression
			}
		}
	};

	var table = [ 0, 1996959894, 3993919788, 2567524794, 124634137, 1886057615, 3915621685, 2657392035, 249268274, 2044508324, 3772115230, 2547177864,
			162941995, 2125561021, 3887607047, 2428444049, 498536548, 1789927666, 4089016648, 2227061214, 450548861, 1843258603, 4107580753, 2211677639,
			325883990, 1684777152, 4251122042, 2321926636, 335633487, 1661365465, 4195302755, 2366115317, 997073096, 1281953886, 3579855332, 2724688242,
			1006888145, 1258607687, 3524101629, 2768942443, 901097722, 1119000684, 3686517206, 2898065728, 853044451, 1172266101, 3705015759, 2882616665,
			651767980, 1373503546, 3369554304, 3218104598, 565507253, 1454621731, 3485111705, 3099436303, 671266974, 1594198024, 3322730930, 2970347812,
			795835527, 1483230225, 3244367275, 3060149565, 1994146192, 31158534, 2563907772, 4023717930, 1907459465, 112637215, 2680153253, 3904427059,
			2013776290, 251722036, 2517215374, 3775830040, 2137656763, 141376813, 2439277719, 3865271297, 1802195444, 476864866, 2238001368, 4066508878,
			1812370925, 453092731, 2181625025, 4111451223, 1706088902, 314042704, 2344532202, 4240017532, 1658658271, 366619977, 2362670323, 4224994405,
			1303535960, 984961486, 2747007092, 3569037538, 1256170817, 1037604311, 2765210733, 3554079995, 1131014506, 879679996, 2909243462, 3663771856,
			1141124467, 855842277, 2852801631, 3708648649, 1342533948, 654459306, 3188396048, 3373015174, 1466479909, 544179635, 3110523913, 3462522015,
			1591671054, 702138776, 2966460450, 3352799412, 1504918807, 783551873, 3082640443, 3233442989, 3988292384, 2596254646, 62317068, 1957810842,
			3939845945, 2647816111, 81470997, 1943803523, 3814918930, 2489596804, 225274430, 2053790376, 3826175755, 2466906013, 167816743, 2097651377,
			4027552580, 2265490386, 503444072, 1762050814, 4150417245, 2154129355, 426522225, 1852507879, 4275313526, 2312317920, 282753626, 1742555852,
			4189708143, 2394877945, 397917763, 1622183637, 3604390888, 2714866558, 953729732, 1340076626, 3518719985, 2797360999, 1068828381, 1219638859,
			3624741850, 2936675148, 906185462, 1090812512, 3747672003, 2825379669, 829329135, 1181335161, 3412177804, 3160834842, 628085408, 1382605366,
			3423369109, 3138078467, 570562233, 1426400815, 3317316542, 2998733608, 733239954, 1555261956, 3268935591, 3050360625, 752459403, 1541320221,
			2607071920, 3965973030, 1969922972, 40735498, 2617837225, 3943577151, 1913087877, 83908371, 2512341634, 3803740692, 2075208622, 213261112,
			2463272603, 3855990285, 2094854071, 198958881, 2262029012, 4057260610, 1759359992, 534414190, 2176718541, 4139329115, 1873836001, 414664567,
			2282248934, 4279200368, 1711684554, 285281116, 2405801727, 4167216745, 1634467795, 376229701, 2685067896, 3608007406, 1308918612, 956543938,
			2808555105, 3495958263, 1231636301, 1047427035, 2932959818, 3654703836, 1088359270, 936918000, 2847714899, 3736837829, 1202900863, 817233897,
			3183342108, 3401237130, 1404277552, 615818150, 3134207493, 3453421203, 1423857449, 601450431, 3009837614, 3294710456, 1567103746, 711928724,
			3020668471, 3272380065, 1510334235, 755167117 ];

	// Utility functions
	function appendString(self, data) {
		var i, length, arrayBuffer, uint8;
		length = data.length;
		arrayBuffer = new ArrayBuffer(length);
		uint8 = new Uint8Array(arrayBuffer);
		for (i = 0; i < length; i++)
			uint8[i] = data.charCodeAt(i) & 0xFF;
		self.blobBuilder.append(arrayBuffer);
	}

	function decToHex(dec, bytes) {
		var i, hex = "";
		for (i = 0; i < bytes; i++) {
			hex += String.fromCharCode(dec & 0xff);
			dec = dec >>> 8;
		}
		return hex;
	}

	function crc32(str) { // inspired from http://www.webtoolkit.info/
		var i, length = str.length, crc = -1;
		if (length) {
			for (i = 0; i < length; i++)
				crc = (crc >>> 8) ^ table[(crc ^ str.charCodeAt(i)) & 0xFF];
			return crc ^ (-1);
		} else
			return "\x00\x00\x00\x00";
	}

	function utf8encode(input) {
		input = encodeURIComponent(input);
		input = input.replace(/%.{2,2}/g, function(m) {
			return String.fromCharCode(parseInt(m.substring(1), 16));
		});
		return input;
	}

})();
