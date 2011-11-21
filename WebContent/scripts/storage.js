/*
 * Copyright 2011 Gildas Lormeau
 * contact : gildas.lormeau <at> gmail.com
 * 
 * This file is part of PageArchiver.
 *
 *   PageArchiver is free software: you can redistribute it and/or modify
 *   it under the terms of the GNU Lesser General Public License as published by
 *   the Free Software Foundation, either version 3 of the License, or
 *   (at your option) any later version.
 *
 *   PageArchiver is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU Lesser General Public License for more details.
 *
 *   You should have received a copy of the GNU Lesser General Public License
 *   along with PageArchiver.  If not, see <http://www.gnu.org/licenses/>.
 */

var storage = {};

(function() {

	var DATA_SIZE = 1073741824;
	var TMP_DATA_SIZE = 1024 * 1024 * 1024;

	var reqPages = "create table if not exists pages (id integer primary key asc autoincrement, title varchar(2048), url varchar(2048), timestamp integer, read_timestamp integer, idx integer, favico blob, size integer)";
	var reqTags = "create table if not exists tags (id integer primary key asc autoincrement, tag varchar(128))";
	var reqPagesTags = "create table if not exists pages_tags (page_id integer, tag_id integer)";
	var reqPagesContents = "create table if not exists pages_contents (id integer, content blob)";
	var reqPagesTexts = "create table if not exists pages_texts (id integer, text blob)";

	var db, fs, tmpfs, BBuilder = window.BlobBuilder || window.WebKitBlobBuilder, requestFS = window.requestFileSystem || window.webkitRequestFileSystem;

	function useFilesystem() {
		return options.filesystemEnabled == "yes" && typeof requestFS != "undefined";
	}

	function createDatabase() {
		db.transaction(function(tx) {
			tx.executeSql(reqPages);
			tx.executeSql(reqTags);
			tx.executeSql(reqPagesTags);
			tx.executeSql(reqPagesContents);
			tx.executeSql(reqPagesTexts);
		});
	}

	function init() {
		db = openDatabase("ScrapBook for SingleFile", "1.0", "scrapbook", DATA_SIZE);
		createDatabase();
		if (typeof requestFS != "undefined") {
			requestFS(true, DATA_SIZE, function(filesystem) {
				fs = filesystem;
			}, function() {
				options.filesystemEnabled = "";
			});
			requestFS(TEMPORARY, TMP_DATA_SIZE, function(filesystem) {
				tmpfs = filesystem;
			}, function() {
				options.filesystemEnabled = "";
			});
		}
		// --- fix for regression introduced in version 0.1.3 ---
		db.transaction(function(tx) {
			tx.executeSql("update pages set idx = null where idx = \"\"", [], function() {
				tx.executeSql("update pages set read_timestamp = null where read_timestamp = \"\"", []);
			});
		});
		// ---
	}

	storage.importDB = function(onprogress, onfinish) {
		var cancelImport = false;

		function importContent(rows, index) {
			var id, content;

			function importNextContent() {
				importContent(rows, index + 1);
			}

			if (index == rows.length || cancelImport) {
				cancelImport = false;
				onfinish();
			} else {
				onprogress(index, rows.length);
				id = rows.item(index).id;
				fs.root.getFile(id + ".html", null, function(fileEntry) {
					var fileReader = new FileReader();
					fileReader.onload = function(evt) {
						content = removeNullChar(evt.target.result);
						db.transaction(function(tx) {
							tx.executeSql("insert into pages_contents (id, content) values (?,?)", [ id, content ], function() {
								fileEntry.remove(importNextContent, importNextContent);
							}, importNextContent);
						}, importNextContent);
					};
					fileReader.onerror = importNextContent;
					fileEntry.file(function(file) {
						fileReader.readAsText(file, "UTF-8");
					});
				}, importNextContent);
			}
		}
		db.transaction(function(tx) {
			tx.executeSql("select id from pages where id not in (select id from pages_contents)", [], function(cbTx, result) {
				importContent(result.rows, 0);
			}, function() {
				onfinish();
			});
		});
		return function() {
			cancelImport = true;
		};
	};

	function getValidFileName(fileName) {
		return fileName.replace(/[\\\/:\*\?\"><|]/gi, "").trim();
	}

	storage.exportToZip = function(pageIds, filename, compress, onprogress, onfinish) {
		var zipWriter, file, exportIndex = 0;

		function cleanFilesystem(callback) {
			rootReader = tmpfs.root.createReader("/");
			rootReader.readEntries(function(entries) {
				var i = 0;

				function removeNextEntry() {
					function next() {
						i++;
						removeNextEntry();
					}

					if (i < entries.length)
						entries[i].remove(next, next);
					else
						callback();
				}

				removeNextEntry();
			}, callback);
		}

		function exportContent(pageIds) {
			var id = pageIds[exportIndex];
			storage.getContent(id, function(content, title) {
				var newDoc, commentNode, name;
				name = (title.replace(/[\\\/:\*\?\"><|]/gi, "").trim() || "Untitled") + " (" + id + ").html";
				newDoc = document.implementation.createHTMLDocument();
				newDoc.open();
				newDoc.writeln(content);
				newDoc.close();
				commentNode = newDoc.documentElement.firstChild;
				if (!commentNode || commentNode.nodeType != Node.COMMENT_NODE || commentNode.textContent.indexOf("SingleFile") == -1) {
					commentNode = document.createComment("");
					newDoc.documentElement.insertBefore(commentNode, newDoc.documentElement.firstChild);
				}
				db.transaction(function(tx) {
					var query = "select title, timestamp, read_timestamp, idx from pages where id=?";
					tx.executeSql(query, [ id ], function(cbTx, result) {
						var pageMetadata, tags = [], query = "select tag from tags, pages_tags where pages_tags.tag_id = tags.id and pages_tags.page_id=?";
						if (result.rows.length)
							pageMetadata = result.rows.item(0);
						tx.executeSql(query, [ id ], function(cbTx, result) {
							var i, blobBuilder = new BBuilder(), fileReader;
							if (result.rows.length)
								for (i = 0; i < result.rows.length; i++)
									tags.push(result.rows.item(i).tag);
							if (pageMetadata)
								commentNode.textContent += " page info: " + JSON.stringify(pageMetadata) + "\n";
							if (tags.length)
								commentNode.textContent += " tags: " + JSON.stringify(tags) + "\n";
							blobBuilder.append((new Uint8Array([ 0xEF, 0xBB, 0xBF ])).buffer);
							blobBuilder.append(getDoctype(newDoc));
							blobBuilder.append(newDoc.documentElement.outerHTML);
							zipWriter.add(name, new zip.BlobReader(blobBuilder.getBlob()), null, function() {
								exportIndex++;
								if (exportIndex == pageIds.length)
									zipWriter.close(function() {
										onfinish(file.toURL());
									});
								else
									exportContent(pageIds);
								onprogress(exportIndex * 100, pageIds.length * 100);
							}, function(current, total) {
								onprogress((exportIndex * 100) + Math.floor((current / total) * 100), pageIds.length * 100);
							});
						}, function() {
							// TODO
						});
					}, function() {
						// TODO
					});
				});
			}, false, true);
		}
		cleanFilesystem(function() {
			tmpfs.root.getFile(getValidFileName(filename), {
				create : true
			}, function(zipfile) {
				file = zipfile;
				zip.createWriter(new zip.FileWriter(file), !compress, function(writer) {
					zipWriter = writer;
					exportContent(pageIds, 0);
					onprogress(exportIndex, pageIds.length);
				});
			});
		});
	};

	storage.importFromZip = function(file, onprogress, onfinish) {
		var importIndex = 0, zipReader;
		zip.createReader(new zip.BlobReader(file), function(reader) {
			var zipReader = reader;
			zipReader.getEntries(function(entries) {
				function nextFile() {
					if (importIndex < entries.length) {
						var entry = entries[importIndex];
						onprogress(importIndex * 100, entries.length * 100);
						if (/\.html$|\.htm$/i.test(entry.filename)) {
							var blobWriter = new zip.BlobWriter();
							entry.getData(blobWriter, function(data) {
								var fileReader = new FileReader();
								fileReader.onloadend = function(event) {
									var archiveFilename, archiveIdMatch, archiveId, archiveTitle;
									archiveFilename = entry.filename.replace(/.html?$/, "");
									archiveIdMatch = archiveFilename.match(/ \((\d*)\)$/);
									if (archiveIdMatch)
										archiveId = archiveIdMatch[1];
									archiveFilename = archiveFilename.replace(/ \(\d*\)$/, "");
									archiveTitle = entry.filename.replace(/.html?$/, "").replace(/ \(\d*\)$/, "");
									storage.addContent(event.target.result, archiveTitle, null, null, function() {
										importIndex++;
										nextFile();
									}, function() {
										// TODO error handling...
									});
								};
								fileReader.readAsText(data, "UTF-8");
							}, function(current, total) {
								onprogress((importIndex * 100) + Math.floor((current / total) * 100), entries.length * 100);
							});
						} else {
							importIndex++;
							nextFile();
						}
					} else
						zipReader.close(onfinish);
				}

				nextFile();
			});
		});

	};

	storage.exportDB = function(onprogress, onfinish) {
		var cancelExport = false;

		function exportContent(rows, index) {
			var id, content;

			function exportNextContent() {
				exportContent(rows, index + 1);
			}

			if (index == rows.length || cancelExport) {
				cancelExport = false;
				onfinish();
			} else {
				onprogress(index, rows.length);
				id = rows.item(index).id;
				db.transaction(function(tx) {
					tx.executeSql("select content from pages_contents where id = ?", [ id ], function(cbTx, result) {
						content = result.rows.item(0).content;
						fs.root.getFile(id + ".html", {
							create : true
						}, function(fileEntry) {
							fileEntry.createWriter(function(fileWriter) {
								var blobBuilder = new BBuilder();
								blobBuilder.append((new Uint8Array([ 0xEF, 0xBB, 0xBF ])).buffer);
								blobBuilder.append(content || "");
								fileWriter.onwrite = function(e) {
									db.transaction(function(tx) {
										tx.executeSql("delete from pages_contents where id = ?", [ id ], exportNextContent, exportNextContent);
									}, exportNextContent);
								};
								fileWriter.write(blobBuilder.getBlob());
							}, exportNextContent);
						}, exportNextContent);
					}, exportNextContent);
				}, exportNextContent);
			}
		}

		db.transaction(function(tx) {
			tx.executeSql("select id from pages_contents", [], function(cbTx, result) {
				exportContent(result.rows, 0);
			}, function() {
				onfinish();
			});
		});
		return function() {
			cancelExport = true;
		};
	};

	storage.getContent = function(id, callback, forceUseDatabase, dontSetReadDate) {
		db.transaction(function(tx) {
			var date = new Date();

			function getContent() {
				if (fs && !forceUseDatabase)
					fs.root.getFile(id + ".html", null, function(fileEntry) {
						var fileReader = new FileReader();
						fileReader.onload = function(evt) {
							db.transaction(function(tx) {
								tx.executeSql("select title from pages where pages.id = ?", [ id ], function(cbTx, result) {
									if (callback)
										callback(evt.target.result, result.rows.item(0).title);
								});
							});
						};
						fileReader.onerror = function(e) {
							if (callback)
								callback("Error while reading the file archive", "error");
						};
						fileEntry.file(function(file) {
							fileReader.readAsText(file, "UTF-8");
						});
					}, function() {
						storage.getContent(id, callback, true, dontSetReadDate);
					});
				else
					tx.executeSql("select pages_contents.content, title from pages, pages_contents where pages_contents.id = pages.id and pages.id = ?",
							[ id ], function(cbTx, result) {
								if (callback)
									callback(result.rows.item(0).content, result.rows.item(0).title);
							});
			}

			if (dontSetReadDate)
				getContent();
			else
				tx.executeSql("update pages set read_timestamp = ? where id = ?", [ date.getTime(), id ], getContent);
		});
	};

	storage.getPage = function(url, callback) {
		db.transaction(function(tx) {
			tx.executeSql("select id from pages where url = ? or url = ? order by id desc", [ url, url + '/' ], function(cbTx, result) {
				var search, searchFilters = [], urls = [], match, i, query, params = [];
				if (result.rows.length) {
					if (callback)
						callback(result.rows.item(0).id);
				} else {
					search = url.split("?")[1];
					if (search) {
						searchFilters = search.split("&");
						for (i = 0; i < searchFilters.length; i++) {
							match = decodeURIComponent(searchFilters[i]).match(/https?:\/\/.*/);
							if (match)
								urls.push(match[0]);
						}
					}
					if (urls.length) {
						query = "select id from pages where";
						for (i = 0; i < urls.length; i++) {
							query += " url = ? or url = ?";
							params.push(urls[i]);
							params.push(urls[i] + '/');
							if (i < urls.length - 1)
								query += " or";
						}
						query += " order by id desc";
						tx.executeSql(query, params, function(cbTx, result) {
							if (callback)
								callback(result.rows.length ? result.rows.item(0).id : null);
						});
					} else
						callback();
				}
			});
		});
	};

	function getDoctype(doc) {
		var docType = doc.doctype, docTypeStr;
		if (docType) {
			docTypeStr = "<!DOCTYPE " + docType.nodeName;
			if (docType.publicId) {
				docTypeStr += " PUBLIC \"" + docType.publicId + "\"";
				if (docType.systemId)
					docTypeStr += " \"" + docType.systemId + "\"";
			} else if (docType.systemId)
				docTypeStr += " SYSTEM \"" + docType.systemId + "\"";
			if (docType.internalSubset)
				docTypeStr += " [" + docType.internalSubset + "]";
			return docTypeStr + ">\n";
		}
		return "";
	}

	storage.updatePage = function(id, content, forceUseDatabase) {
		if (fs && !forceUseDatabase) {
			fs.root.getFile(id + ".html", null, function(fileEntry) {
				fileEntry.createWriter(function(fileWriter) {
					var blobBuilder = new BBuilder();
					blobBuilder.append((new Uint8Array([ 0xEF, 0xBB, 0xBF ])).buffer);
					blobBuilder.append(content);
					fileWriter.onerror = function(e) {
						storage.updatePage(id, content, true);
					};
					fileWriter.write(blobBuilder.getBlob());
				});
			}, function() {
				storage.updatePage(id, content, true);
			});
		} else {
			db.transaction(function(tx) {
				tx.executeSql("update pages_contents set content = ? where id = ?", [ content, id ]);
			});
		}
	};

	storage.addTag = function(pageId, tag, callback) {
		var tagId;
		db.transaction(function(tx) {
			tx.executeSql("select id from tags where tag = ?", [ tag ], function(cbTx, result) {
				if (!result.rows.length) {
					tx.executeSql("insert into tags (tag) values (?)", [ tag ], function(cbTx, result) {
						tagId = result.insertId;
						tx.executeSql("insert into pages_tags (page_id, tag_id) values (?, ?)", [ pageId, tagId ]);
						if (callback)
							callback();
					});
				} else {
					tagId = result.rows.item(0).id;
					tx.executeSql("select page_id from pages_tags where page_id = ? and tag_id = ? ", [ pageId, tagId ], function(cbTx, result) {
						if (!result.rows.length) {
							tx.executeSql("insert into pages_tags (page_id, tag_id) values (?, ?)", [ pageId, tagId ], function() {
								if (callback)
									callback();
							});
						} else if (callback)
							callback();
					});
				}
			});
		});
	};

	storage.addTags = function(initTags, tags, pageIds, callback) {
		var tagIndex = 0, pageIndex = 0, toAdd = diff(tags, initTags), toRemove = diff(initTags, tags);

		function diff(arr1, arr2) {
			return arr1.filter(function(item) {
				return !(arr2.indexOf(item) > -1);
			});
		}

		function iterateAdd() {
			if (tagIndex == toAdd.length) {
				tagIndex = 0;
				pageIndex++;
				if (pageIndex == pageIds.length && callback)
					callback();
				else
					iterateAdd();
				return;
			} else {
				storage.addTag(pageIds[pageIndex], toAdd[tagIndex], iterateAdd);
				tagIndex++;
			}
		}

		function iterateRemove() {
			if (tagIndex == toRemove.length) {
				tagIndex = 0;
				pageIndex++;
				if (pageIndex == pageIds.length) {
					pageIndex = 0;
					iterateAdd();
				} else
					iterateRemove();
			} else {
				storage.removeTag(pageIds[pageIndex], toRemove[tagIndex], iterateRemove);
				tagIndex++;
			}
		}

		iterateRemove();
	};

	storage.removeTag = function(pageId, tagValue, callback) {
		db.transaction(function(tx) {
			tx.executeSql("select id from pages_tags, tags where tag_id = id and tag = ?", [ tagValue ], function(cbTx, result) {
				tx.executeSql("delete from pages_tags where page_id = ? and tag_id = ?", [ pageId, result.rows.item(0).id ], function() {
					if (callback)
						callback();
				});
			});
		});
	};

	storage.updateTagValue = function(oldValue, newValue, callback) {
		db.transaction(function(tx) {
			tx.executeSql("update tags set tag = ? where tag = ?", [ newValue, oldValue ], function() {
				if (callback)
					callback();
			});
		});
	};

	storage.deleteTags = function(tagIds, callback) {
		db.transaction(function(tx) {
			var i, query, params = [];
			if (tagIds.length) {
				query = "delete from tags where";
				for (i = 0; i < tagIds.length; i++) {
					query += " id=?";
					params.push(tagIds[i]);
					if (i < tagIds.length - 1)
						query += " or";
				}
				tx.executeSql(query, params, function(cbTx, result) {
					var i, query, params = [];
					query = "delete from pages_tags where";
					for (i = 0; i < tagIds.length; i++) {
						query += " tag_id=?";
						params.push(tagIds[i]);
						if (i < tagIds.length - 1)
							query += " or";
					}
					tx.executeSql(query, params, function(cbTx, result) {
						if (callback)
							callback();
					});
				});
			} else if (callback)
				callback();
		});
	};

	storage.getTags = function(tags, callback) {
		var requestUsed, requestUnused;
		requestUsed = "select tag, tags.id, page_id, title from tags, pages_tags, pages where tags.id = tag_id and pages.id = page_id";
		requestUnused = "select tag, id from tags where 1 = 1";
		if (tags)
			tags.forEach(function(tag) {
				requestUsed += " and tag like '%" + tag.replace(/'/g, "\\'") + "%'";
				requestUnused += " and tag like '%" + tag.replace(/'/g, "\\'") + "%'";
			});
		requestUsed += " order by lower(tag)";
		requestUnused += " except select tag, tags.id from tags, pages_tags, pages where tags.id = tag_id and pages.id = page_id order by tag";
		db.transaction(function(tx) {
			tx.executeSql(requestUsed, [], function(cbTx, result) {
				var i, used = {}, row, req;
				for (i = 0; i < result.rows.length; i++) {
					row = result.rows.item(i);
					used[row.tag] = used[row.tag] || {};
					used[row.tag].pages = used[row.tag].pages || [];
					used[row.tag].pages.push({
						id : row.page_id,
						title : row.title
					});
					used[row.tag].id = row.id;
				}
				tx.executeSql(requestUnused, [], function(cbTx, result) {
					var i, unused = {}, row;
					for (i = 0; i < result.rows.length; i++) {
						row = result.rows.item(i);
						unused[row.tag] = unused[row.tag] || {};
						unused[row.tag].id = row.id;
					}
					if (callback)
						callback(used, unused);
				});
			});
		});
	};

	storage.getTagsCompletion = function(filteredTags, tag, callback) {
		db.transaction(function(tx) {
			var i, query, params = [], excludeTag;
			if (tag) {
				excludeTag = tag.indexOf("-") == 0;
				if (excludeTag)
					tag = tag.substring(1);
				if (tag.length) {
					query = "select tag from tags where tag like '";
					query += tag.replace(/'/g, "\\'") + "%' ";
				}
			} else
				query = "select tag from tags where 1=1 ";
			if (filteredTags.length) {
				query += "and id in (";
				query += "select tag_id from pages_tags where page_id in (";
				for (i = 0; i < filteredTags.length; i++) {
					query += "select page_id from pages_tags, tags where tags.id = pages_tags.tag_id and ";
					query += "tag=?";
					params.push(filteredTags[i].replace(/^-/g, ""));
					if (i < filteredTags.length - 1)
						query += " intersect ";
				}
				query += ") ";
				for (i = 0; i < filteredTags.length; i++) {
					query += "and tag<>? ";
					params.push(filteredTags[i].replace(/^-/g, ""));
				}
				query += ")";
			}
			tx.executeSql(query, params, function(cbTx, result) {
				var i, ret = [];
				for (i = 0; i < result.rows.length; i++)
					ret.push({
						content : result.rows.item(i).tag,
						value : filteredTags.join(",") + (filteredTags.length ? "," : "") + (excludeTag ? "-" : "") + result.rows.item(i).tag
					});
				callback(ret);
			});
		});
	};

	storage.getSharedTags = function(pageIds, callback) {
		db.transaction(function(tx) {
			var i, query, params = [];
			if (pageIds.length) {
				query = "select tag from tags where id in (";
				for (i = 0; i < pageIds.length; i++) {
					query += "select tag_id from pages_tags where page_id=?";
					params.push(pageIds[i]);
					if (i < pageIds.length - 1)
						query += " intersect ";
				}
				query += ") order by lower(tag)";
				tx.executeSql(query, params, function(cbTx, result) {
					var i, ret = [];
					for (i = 0; i < result.rows.length; i++)
						ret.push(result.rows.item(i).tag);
					callback(ret);
				});
			} else
				callback([]);
		});
	};

	storage.getFilteredTagCompletion = function(filteredTags, tag, callback) {
		db.transaction(function(tx) {
			var i, query = "select tag from tags where 1=1", params = [];
			if (tag && tag.length)
				query += " and like '" + tag.replace(/'/g, "\\'") + "%'";
			for (i = 0; i < filteredTags.length; i++) {
				query += " and tag <> ?";
				params.push(filteredTags[i]);
			}
			tx.executeSql(query, params, function(cbTx, result) {
				var i, ret = [];
				for (i = 0; i < result.rows.length; i++)
					ret.push(result.rows.item(i).tag);
				callback(ret);
			});
		});
	};

	storage.getTagCompletion = function(searchTag, pageId, callback) {
		db.transaction(function(tx) {
			var query = "select tag from tags where 1=1", params = [];
			if (searchTag)
				query += " and tag like '" + searchTag.replace(/'/g, "\\'") + "%'";
			query += " and tag not in (select tag from tags, pages_tags where tags.id = tag_id and page_id = ?)";
			params.push(pageId);
			tx.executeSql(query, params, function(cbTx, result) {
				var i, ret = [];
				for (i = 0; i < result.rows.length; i++)
					ret.push(result.rows.item(i).tag);
				callback(ret);
			});
		});
	};

	function getDates(period, fromDateUser, toDateUser) {
		var dates = {}, fromDate, toDate;
		switch (period) {
		case "today":
			fromDate = new Date();
			toDate = new Date(fromDate.getTime());
			break;
		case "week":
			fromDate = new Date();
			fromDate.setDate(fromDate.getDate() - fromDate.getDay());
			toDate = new Date();
			toDate.setDate(toDate.getDate() + 7 - toDate.getDay());
			break;
		case "month":
			fromDate = new Date();
			fromDate.setDate(1);
			toDate = new Date();
			toDate.setMonth(toDate.getMonth() + 1, 1);
			toDate.setDate(toDate.getDate() - 1);
			break;
		case "all":
			fromDate = null;
			toDate = new Date();
			break;
		case "empty":
			fromDate = toDate = null;
			break;
		case "user":
			fromDate = fromDateUser ? new Date(fromDateUser) : null;
			toDate = toDateUser ? new Date(toDateUser) : new Date();
			break;
		}
		if (fromDate)
			fromDate.setHours(0, 0, 0, 0);
		if (toDate)
			toDate.setHours(23, 59, 59, 999);
		dates.from = fromDate ? fromDate.getTime() : null;
		dates.to = toDate ? toDate.getTime() : null;
		return dates;
	}

	function buildSearchPagesQuery(searchFilters, searchInTitle, params, tags, tagIndex) {
		var i, dates, query = "select pages.id as id from pages";
		if (tags)
			query += ", pages_tags, tags";
		if (searchFilters.text && !searchInTitle)
			query += ", pages_texts";
		query += " where 1 = 1";
		if (searchFilters.savedPeriod) {
			dates = getDates(searchFilters.savedPeriod.period, searchFilters.savedPeriod.from, searchFilters.savedPeriod.to);
			if (dates.from || dates.to) {
				query += " and ((";
				if (dates.from) {
					query += " timestamp >= ?";
					params.push(dates.from);
				}
				if (dates.to) {
					if (dates.from)
						query += " and";
					query += " timestamp <= ?";
					params.push(dates.to);
				}
				query += ") or timestamp is null)";
			}
		}
		if (searchFilters.readPeriod) {
			dates = getDates(searchFilters.readPeriod.period, searchFilters.readPeriod.from, searchFilters.readPeriod.to);
			query += " and (";
			if (dates.from || dates.to)
				query += "(";
			if (dates.from) {
				query += " read_timestamp >= ?";
				params.push(dates.from);
			}
			if (dates.to) {
				if (dates.from)
					query += " and";
				query += " read_timestamp <= ?";
				params.push(dates.to);
			}
			if (dates.from || dates.to)
				query += ")";
			if (!dates.from || !dates.to) {
				if (dates.from || dates.to)
					query += " or";
				query += " read_timestamp is null";
			}
			query += ")";
		}
		if (searchFilters.misc) {
			query += " and ((idx >= ? and idx <= ?)" + (searchFilters.misc.rating.from == 0 ? " or idx is null" : "") + ")";
			params.push(searchFilters.misc.rating.from);
			params.push(searchFilters.misc.rating.to);
			if (searchFilters.misc.size.from != null || searchFilters.misc.size.to != null) {
				query += " and (";
				if (searchFilters.misc.size.from != null) {
					query += "size >= ?";
					params.push(searchFilters.misc.size.from);
				}
				if (searchFilters.misc.size.to != null) {
					if (searchFilters.misc.size.from != null)
						query += " and";
					query += " size <= ?";
					params.push(searchFilters.misc.size.to);
				}
				query += ")";
			}
			if (searchFilters.misc.other) {
				query += " and";
				if (searchFilters.misc.other == "dupURL")
					query += " url in (select url from pages group by url having (count(url) > 1))";
				if (searchFilters.misc.other == "dupTitle")
					query += " title in (select title from pages group by title having (count(title) > 1))";
				if (searchFilters.misc.other == "emptyTitle")
					query += " title = ''";
			}
		}
		if (tags) {
			var tagValue = tags[tagIndex];
			query += " and tag = ?";
			params.push(tagValue);
			query += " and tags.id = tag_id and page_id = pages.id";
		}
		if (searchFilters.text) {
			if (!searchInTitle)
				query += " and pages_texts.id = pages.id";
			for (i = 0; i < searchFilters.text.length; i++) {
				query += " and";
				if (!searchInTitle)
					query += " (pages_texts.text like '%" + searchFilters.text[i].replace(/'/g, "\\'") + "%' or";
				query += " title like '%" + searchFilters.text[i].replace(/'/g, "\\'") + "%'";
				if (!searchInTitle)
					query += ")";
			}
		}
		if (searchFilters.url && searchFilters.url.value)
			query += " and url like '%" + searchFilters.url.value.replace(/'/g, "\\'") + "%'";
		return query;
	}

	function buildFullSearchPagesQuery(searchFilters, searchInTitle, params, count) {
		var query, tagIndex, queries = [], excludeTags, includeTags;
		if (searchFilters.tags && searchFilters.tags.values) {
			excludeTags = searchFilters.tags.values.filter(function(tagValue) {
				return (tagValue.indexOf("-") == 0);
			}).map(function(tagValue) {
				return tagValue.substring(1);
			});
			includeTags = searchFilters.tags.values.filter(function(tagValue) {
				return (tagValue.indexOf("-") != 0);
			});
			for (tagIndex = 0; tagIndex < includeTags.length; tagIndex++)
				queries.push(buildSearchPagesQuery(searchFilters, searchInTitle, params, includeTags, tagIndex));
			query = queries.join(" intersect ");
			if (excludeTags.length) {
				queries = [];
				for (tagIndex = 0; tagIndex < excludeTags.length; tagIndex++)
					queries.push(buildSearchPagesQuery(searchFilters, searchInTitle, params, excludeTags, tagIndex));
				if (!query)
					query = "select pages.id as id from pages";
				query += " except " + queries.join(" except ");
			}
		} else
			query = buildSearchPagesQuery(searchFilters, searchInTitle, params);
		if (count)
			query = "select count(id) as count from (" + query + ")";
		else
			query = "select pages.id as id, favico, title, url, idx, timestamp, read_timestamp, size from pages where id in (" + query + ")";
		return query;
	}

	storage.search = function(searchFilters, searchInTitle, callback) {
		db.transaction(function(tx) {
			var params = [], query = buildFullSearchPagesQuery(searchFilters, searchInTitle, params);
			query += " order by";
			if (searchFilters.sortBy) {
				switch (searchFilters.sortBy.field) {
				case "title":
					query += " lower(title) " + searchFilters.sortBy.value;
					break;
				case "date":
					query += " timestamp " + searchFilters.sortBy.value;
					break;
				case "readDate":
					query += " read_timestamp " + searchFilters.sortBy.value;
					break;
				case "rating":
					query += " idx " + searchFilters.sortBy.value;
					break;
				case "size":
					query += " size " + searchFilters.sortBy.value;
					break;
				case "url":
					query += " lower(replace(replace(url, 'www.', ''), 'https://', 'http://')) " + searchFilters.sortBy.value;
					break;
				}
			} else
				query += " pages.id desc";
			var currentPage = searchFilters.currentPage || 0;
			if (searchFilters.limit && searchFilters.limit != "all")
				query += " limit " + (searchFilters.limit * currentPage) + ", " + searchFilters.limit;
			// console.log(query, params);
			tx.executeSql(query, params, function(cbTx, result) {
				var i, rows = [], item, count;
				for (i = 0; i < result.rows.length; i++) {
					item = result.rows.item(i);
					rows.push({
						favico : item.favico,
						id : item.id,
						title : item.title,
						url : item.url,
						idx : item.idx,
						timestamp : item.timestamp,
						read_timestamp : item.read_timestamp,
						size : item.size
					});
				}
				params = [];
				tx.executeSql(buildFullSearchPagesQuery(searchFilters, searchInTitle, params, true), params, function(cbTx, result) {
					count = result.rows.item(0).count;
					tx.executeSql("select page_id, tag from tags, pages_tags where id = tag_id order by lower(tag)", [], function(cbTx, result) {
						var i, item, ret = [], tags = [];
						for (i = 0; i < result.rows.length; i++) {
							item = result.rows.item(i);
							ret[item.page_id] = ret[item.page_id] || [];
							ret[item.page_id].push(item.tag);
						}
						for (i = 0; i < rows.length; i++)
							tags.push(ret[rows[i].id]);
						if (callback)
							callback(rows, tags, searchFilters.limit != "all" ? Math.ceil(count / searchFilters.limit) : 1);
					});
				});
			});
		});
	};

	storage.setTitle = function(id, title) {
		db.transaction(function(tx) {
			tx.executeSql("update pages set title = ? where id = ?", [ title, id ]);
		});
	};

	storage.deletePages = function(pageIds, callback) {
		db.transaction(function(tx) {
			var i, query, params = [];
			if (pageIds.length) {
				query = "delete from pages where";
				for (i = 0; i < pageIds.length; i++) {
					query += " id=?";
					params.push(pageIds[i]);
					if (i < pageIds.length - 1)
						query += " or";
				}
				tx.executeSql(query, params, function(cbTx, result) {
					var i, query, params = [];
					query = "delete from pages_tags where";
					for (i = 0; i < pageIds.length; i++) {
						query += " page_id=?";
						params.push(pageIds[i]);
						if (i < pageIds.length - 1)
							query += " or";
					}
					tx.executeSql(query, params, function(cbTx, result) {
						var i, query, params = [];
						query = "delete from pages_contents where";
						for (i = 0; i < pageIds.length; i++) {
							query += " id=?";
							params.push(pageIds[i]);
							if (i < pageIds.length - 1)
								query += " or";
						}
						tx.executeSql(query, params, function(cbTx, result) {
							var i, query, params = [];
							query = "delete from pages_texts where";
							for (i = 0; i < pageIds.length; i++) {
								query += " id=?";
								params.push(pageIds[i]);
								if (i < pageIds.length - 1)
									query += " or";
							}
							tx.executeSql(query, params, function(cbTx, result) {
								if (fs) {
									var i, rootReader;
									for (i = 0; i < pageIds.length; i++) {
										fs.root.getFile(pageIds[i] + ".html", null, function(fileEntry) {
											fileEntry.remove();
										});
									}
								}
								if (callback)
									callback();
							});
						});
					});
				});
			} else if (callback)
				callback();
		});
	};

	function removeNullChar(content) {
		return content.replace(/(\x00)/g, "");
	}

	function addContent(favicoData, url, title, content, text, timestamp, readDateTs, idx, tags, callback, onFileErrorCallback, forceUseDatabase) {
		var query = "insert into pages (favico, url, title, timestamp, size, read_timestamp, idx) values (?, ?, ?, ?, ?, ?, ?)";
		content = removeNullChar(content);
		db.transaction(function(tx) {
			var today = new Date();
			tx.executeSql(query, [ favicoData, url, title, timestamp || today.getTime(), content.length, readDateTs || null, idx || null ], function(cbTx,
					result) {
				var id = result.insertId;

				function onFileError(e) {
					if (onFileErrorCallback)
						onFileErrorCallback(id);
					db.transaction(function(tx) {
						tx.executeSql("delete from pages where id = ?", [ id ], function() {
							addContent(favicoData, url, title, content, text, timestamp, readDateTs, idx, tags, callback, onFileErrorCallback, true);
						});
					});
				}

				function finishUpdate() {
					storage.addTags([], tags, [ id ], function() {
						db.transaction(function(tx) {
							tx.executeSql("insert into pages_texts (id, text) values (?, ?)", [ id, text ], function() {
								if (callback)
									callback(id);
							});
						});
					});
				}

				if (useFilesystem() && !forceUseDatabase) {
					fs.root.getFile(id + ".html", {
						create : true
					}, function(fileEntry) {
						fileEntry.createWriter(function(fileWriter) {
							var blobBuilder = new BBuilder();
							blobBuilder.append((new Uint8Array([ 0xEF, 0xBB, 0xBF ])).buffer);
							blobBuilder.append(content);
							fileWriter.onerror = onFileError;
							fileWriter.onwrite = finishUpdate;
							fileWriter.write(blobBuilder.getBlob());
						});
					}, onFileError);
				} else
					tx.executeSql("insert into pages_contents (id, content) values (?, ?)", [ id, content ], finishUpdate);
			});
		});
	}

	storage.addContent = function(content, title, url, favicoData, callback, onFileErrorCallback) {
		var titleLength, domain, domainArray, node, urlArray, timestamp, readDateTs, idx, tags = [], pageInfo, pageInfoArray, tagsArray, newDoc = document.implementation
				.createHTMLDocument();
		newDoc.open();
		newDoc.writeln(content);
		newDoc.close();
		if (!favicoData) {
			favicoData = newDoc.querySelector('link[href][rel="shortcut icon"], link[href][rel="icon"], link[href][rel="apple-touch-icon"]');
			favicoData = favicoData ? favicoData.href : null;
		}
		node = newDoc.documentElement.childNodes[0];
		if (node && node.nodeType == Node.COMMENT_NODE && node.textContent.indexOf("SingleFile") != -1) {
			if (!url) {
				urlArray = node.textContent.match(/url:(.*)/);
				if (urlArray)
					url = urlArray[1].trim();
			}
			pageInfoArray = node.textContent.match(/ page info: (.*)/);
			if (pageInfoArray) {
				var pageInfo = JSON.parse(pageInfoArray[1]);
				node.textContent = node.textContent.replace(/ page info: (.*)\n/, "");
				timestamp = pageInfo.timestamp;
				title = pageInfo.title;
				if (pageInfo.read_date_timestamp)
					readDateTs = pageInfo.read_date_timestamp;
				if (pageInfo.idx)
					idx = pageInfo.idx;
			}

			tagsArray = node.textContent.match(/ tags: (.*)/);
			if (tagsArray) {
				tags = JSON.parse(tagsArray[1]);
				node.textContent = node.textContent.replace(/ tags: (.*)\n/, "");
			}
		}

		title = (title || "").trim();
		titleLength = title.length;
		url = url ? url.match(/[^#]*/)[0] : "about:blank";
		domainArray = url.match(/\/\/([^\/]*)/);
		if (domainArray)
			domain = domainArray[1];
		if (!titleLength)
			title = url.match(/\/\/(.*)/)[1];
		else if (title.indexOf(" ") == -1 && domain) {
			if (titleLength)
				title += " (";
			title += domain;
			if (titleLength)
				title += ")";
		}
		addContent(favicoData, url, title, getDoctype(newDoc) + newDoc.documentElement.outerHTML, newDoc.body.innerText.replace(/\s+/g, " "), timestamp,
				readDateTs, idx, tags, callback, onFileErrorCallback);
	};

	storage.setRating = function(id, rating) {
		if (rating)
			db.transaction(function(tx) {
				tx.executeSql("update pages set idx = ? where id = ?", [ Number(rating), id ]);
			});
	};

	storage.reset = function(callback) {
		db.transaction(function(tx) {
			function initCallback() {
				createDatabase();
				callback();
			}

			function dropPagesTexts() {
				tx.executeSql("drop table pages_texts", dropPagesContents, dropPagesContents);
			}

			function dropPagesContents() {
				tx.executeSql("drop table pages_contents", dropPagesTags, dropPagesTags);
			}

			function dropPagesTags() {
				tx.executeSql("drop table pages_tags", dropTags, dropTags);
			}

			function dropTags() {
				tx.executeSql("drop table tags", dropPages, dropPages);
			}

			function dropPages() {
				tx.executeSql("drop table pages", deleteFS, deleteFS);
			}

			function deleteFS() {
				var rootReader;
				if (fs) {
					rootReader = fs.root.createReader("/");
					rootReader.readEntries(function(entries) {
						var i = 0;

						function removeNextEntry() {
							function next() {
								i++;
								removeNextEntry();
							}

							if (i < entries.length)
								entries[i].remove(next, next);
							else
								initCallback();
						}

						removeNextEntry();
					}, initCallback);
				} else
					initCallback();
			}

			dropPagesTexts();
		});
	};

	init();

})();
