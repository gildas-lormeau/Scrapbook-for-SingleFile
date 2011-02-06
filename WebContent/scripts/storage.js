/*
 * Copyright 2011 Gildas Lormeau
 * contact : gildas.lormeau <at> gmail.com
 * 
 * This file is part of Scrapbook for SingleFile.
 *
 *   Scrapbook for SingleFile is free software: you can redistribute it and/or modify
 *   it under the terms of the GNU Lesser General Public License as published by
 *   the Free Software Foundation, either version 3 of the License, or
 *   (at your option) any later version.
 *
 *   Scrapbook for SingleFile is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU Lesser General Public License for more details.
 *
 *   You should have received a copy of the GNU Lesser General Public License
 *   along with Scrapbook for SingleFile.  If not, see <http://www.gnu.org/licenses/>.
 */

var storage = {};

(function() {

	var DATA_SIZE = 1073741824;

	var db, fs;

	function useFilesystem() {
		return localStorage.filesystemEnabled != "false" && typeof requestFileSystem != "undefined";
	}

	function openFileSytem() {
		if (!fs)
			requestFileSystem(true, DATA_SIZE, function(filesystem) {
				fs = filesystem;
			}, function() {
				localStorage.filesystemEnabled = "false";
			});
	}

	function init() {
		var reqPages = "create table if not exists pages (id integer primary key asc autoincrement, title varchar(2048), url varchar(2048), date varchar(128), timestamp integer, idx integer, favico blob, read_date varchar(128), read_timestamp integer, size integer)";
		var reqTags = "create table if not exists tags (id integer primary key asc autoincrement, tag varchar(128))";
		var reqPagesTags = "create table if not exists pages_tags (page_id integer, tag_id integer)";
		var reqPagesContents = "create table if not exists pages_contents (id integer, content blob)";
		var reqPagesTexts = "create table if not exists pages_texts (id integer, text blob)";

		db = openDatabase("ScrapBook for SingleFile", "1.0", "scrapbook", DATA_SIZE);
		db.transaction(function(tx) {
			tx.executeSql(reqPages);
			tx.executeSql(reqTags);
			tx.executeSql(reqPagesTags);
			tx.executeSql(reqPagesContents);
			tx.executeSql(reqPagesTexts);
		});

		if (useFilesystem())
			openFileSytem();
	}

	function updateIndexFile() {
		var rootReader, doc = document.implementation.createHTMLDocument();

		function createIndex() {
			fs.root.getFile("index.html", {
				create : true,
				exclusive : true
			}, function(fileEntry) {
				fileEntry.createWriter(function(fileWriter) {
					var blobBuilder = new BlobBuilder(), BOM = new ArrayBuffer(3), v = new Uint8Array(BOM);
					v.set([ 0xEF, 0xBB, 0xBF ]);
					blobBuilder.append(BOM);
					blobBuilder.append("<!DOCTYPE html>\n" + doc.documentElement.outerHTML);
					fileWriter.write(blobBuilder.getBlob());
				});
			});
		}

		doc.title = "Scrapbook archives";
		rootReader = fs.root.createReader("/");
		db.transaction(function(tx) {
			tx.executeSql("select id, title from pages order by id desc", [], function(cbTx, result) {
				var i, item, metaData = {};
				for (i = 0; i < result.rows.length; i++) {
					item = result.rows.item(i);
					metaData[item.id] = {
						title : item.title
					};
				}
				rootReader.readEntries(function(entries) {
					var i, fileEntry, id, link, ul, li, title;
					ul = doc.createElement("ul");
					for (i = 0; i < entries.length; i++) {
						fileEntry = entries[i];
						id = fileEntry.name.split(".html")[0];
						if (id != "index") {
							link = doc.createElement("a");
							link.textContent = metaData[id] ? metaData[id].title : "Empty title - " + id;
							link.href = fileEntry.name;
							li = doc.createElement("li");
							li.appendChild(link);
							ul.appendChild(li);
						}
					}
					title = doc.createElement("h4");
					title.textContent = "Saved archives :";
					doc.body.appendChild(title);
					doc.body.appendChild(ul);
					fs.root.getFile("index.html", null, function(fileEntry) {
						fileEntry.remove(function() {
							createIndex();
						});
					}, function() {
						createIndex();
					});
				});
			});
		});
	}

	storage.openFileSytem = function() {
		openFileSytem();
	};

	storage.getContent = function(id, callback, forceUseDatabase) {
		db.transaction(function(tx) {
			var date = new Date();
			tx.executeSql("update pages set read_date = ?, read_timestamp = ? where id = ?", [ date.toString(), date.getTime(), id ], function() {
				if (useFilesystem() && !forceUseDatabase)
					tx.executeSql("select title from pages where pages.id = ?", [ id ], function(cbTx, result) {
						fs.root.getFile(id + ".html", null, function(fileEntry) {
							var fileReader = new FileReader();
							fileReader.onload = function(evt) {
								if (callback)
									callback(evt.target.result, result.rows.item(0).title);
							};
							fileReader.onerror = function(e) {
								if (callback)
									callback("Error while reading the file archive", "error");
							};
							fileEntry.file(function(file) {
								fileReader.readAsText(file, "UTF-8");
							});
						}, function() {
							storage.getContent(id, callback, true);
						});
					});
				else
					tx.executeSql("select pages_contents.content, title from pages, pages_contents where pages_contents.id = pages.id and pages.id = ?",
							[ id ], function(cbTx, result) {
								if (callback)
									callback(result.rows.item(0).content, result.rows.item(0).title);
							});
			});
		});
	};

	storage.getPage = function(url, callback) {
		db.transaction(function(tx) {
			tx.executeSql("select id from pages where url = ? or url = ? order by id desc", [ url, url + '/' ], function(cbTx, result) {
				var search, args = [], urls = [], match, i, query, params = [];
				if (result.rows.length) {
					if (callback)
						callback(result.rows.item(0).id);
				} else {
					search = url.split("?")[1];
					if (search) {
						args = search.split("&");
						for (i = 0; i < args.length; i++) {
							match = decodeURIComponent(args[i]).match(/https?:\/\/.*/);
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

	storage.updatePage = function(id, content, forceUseDatabase) {
		function updateFile() {
			fs.root.getFile(id + ".html", {
				create : true,
				exclusive : true
			}, function(fileEntry) {
				fileEntry.createWriter(function(fileWriter) {
					var blobBuilder = new BlobBuilder(), BOM = new ArrayBuffer(3), v = new Uint8Array(BOM);
					v.set([ 0xEF, 0xBB, 0xBF ]);
					blobBuilder.append(BOM);
					blobBuilder.append(content);
					fileWriter.onerror = function(e) {
						storage.updatePage(id, content, true);
					};
					fileWriter.write(blobBuilder.getBlob());
				});
			}, function() {
				storage.updatePage(id, content, true);
			});
		}

		if (useFilesystem() && !forceUseDatabase) {
			fs.root.getFile(id + ".html", null, function(fileEntry) {
				fileEntry.remove(function() {
					updateFile();
				}, function() {
					storage.updatePage(id, content, true);
				});
			}, function() {
				updateFile();
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

	storage.addTags = function(tags, pageIds, callback) {
		var tagIndex, pageIndex;
		tagIndex = -1;
		pageIndex = 0;
		function iterate() {
			tagIndex++;
			if (tagIndex == tags.length) {
				tagIndex = 0;
				pageIndex++;
				if (pageIndex == pageIds.length && callback)
					callback();
			}
			storage.addTag(pageIds[pageIndex], tags[tagIndex], iterate);
		}
		;
		iterate();
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
		requestUsed += " order by tag";
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
					var i, unused = [], row;
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

	storage.getTagsCompletion = function(tags, callback) {
		db.transaction(function(tx) {
			var i, query, tag, filteredTags = [], params = [], excludeTag;
			for (i = 0; i < tags.length; i++)
				if (tags[i])
					filteredTags.push(tags[i]);
			tag = filteredTags.pop();
			if (tag) {
				excludeTag = tag.indexOf("-") == 0;
				if (excludeTag)
					tag = tag.substring(1);
				if (tag.length) {
					query = "select tag from tags where tag like '" + tag.replace(/'/g, "\\'") + "%'";
					for (i = 0; i < filteredTags.length; i++) {
						query += " and tag <> ?";
						params.push(filteredTags[i].replace(/^-/g, ""));
					}
					tx.executeSql(query, params, function(cbTx, result) {
						var i, ret = [];
						for (i = 0; i < result.rows.length; i++)
							ret.push(filteredTags.join(",") + (filteredTags.length ? "," : "") + (excludeTag ? "-" : "") + result.rows.item(i).tag);
						callback(ret);
					});
				}
			} else if (callback)
				callback([]);
		});
	};

	storage.getTagCompletion = function(searchTag, pageId, callback) {
		db.transaction(function(tx) {
			var query, params = [];
			if (searchTag) {
				query = "select tag from tags";
				query += " where tag like '" + searchTag.replace(/'/g, "\\'") + "%'";
				query += " and tag not in (select tag from tags, pages_tags where tags.id = tag_id and page_id = ?)";
				params.push(pageId);
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

	function buildSearchPagesQuery(args, params, tags, tagIndex) {
		var i, dates, query = "select pages.id as id from pages";
		if (tags)
			query += ", pages_tags, tags";
		if (args.text)
			query += ", pages_texts";
		query += " where 1 = 1";
		if (args.savedPeriod) {
			dates = getDates(args.savedPeriod.period, args.savedPeriod.from, args.savedPeriod.to);
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
		if (args.readPeriod) {
			dates = getDates(args.readPeriod.period, args.readPeriod.from, args.readPeriod.to);
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
		if (args.misc) {
			query += " and ((idx >= ? and idx <= ?)" + (args.misc.rating.from == 0 ? " or idx is null" : "") + ")";
			params.push(args.misc.rating.from);
			params.push(args.misc.rating.to);
			if (args.misc.size.from != null || args.misc.size.to != null) {
				query += " and (";
				if (args.misc.size.from != null) {
					query += "size >= ?";
					params.push(args.misc.size.from);
				}
				if (args.misc.size.to != null) {
					if (args.misc.size.from != null)
						query += " and";
					query += " size <= ?";
					params.push(args.misc.size.to);
				}
				query += ")";
			}
			if (args.misc.other) {
				query += " and";
				if (args.misc.other == "dupURL")
					query += " url in (select url from pages group by url having (count(url) > 1))";
				if (args.misc.other == "dupTitle")
					query += " title in (select title from pages group by title having (count(title) > 1))";
				if (args.misc.other == "emptyTitle")
					query += " title = ''";
			}
		}
		if (tags) {
			var tagValue = tags[tagIndex];
			query += " and tag = ?";
			params.push(tagValue);
			query += " and tags.id = tag_id and page_id = pages.id";
		}
		if (args.text) {
			query += " and pages_texts.id = pages.id";
			for (i = 0; i < args.text.length; i++) {
				query += " and (pages_texts.text like '%" + args.text[i].replace(/'/g, "\\'") + "%'";
				query += " or title like '%" + args.text[i].replace(/'/g, "\\'") + "%')";
			}
		}
		if (args.url && args.url.value)
			query += " and url like '%" + args.url.value.replace(/'/g, "\\'") + "%'";
		return query;
	}

	function buildFullSearchPagesQuery(args, params, count) {
		var query, tagIndex, queries = [], excludeTags, includeTags;
		if (args.tags && args.tags.values) {
			excludeTags = args.tags.values.filter(function(tagValue) {
				return (tagValue.indexOf("-") == 0);
			}).map(function(tagValue) {
				return tagValue.substring(1);
			});
			includeTags = args.tags.values.filter(function(tagValue) {
				return (tagValue.indexOf("-") != 0);
			});
			for (tagIndex = 0; tagIndex < includeTags.length; tagIndex++)
				queries.push(buildSearchPagesQuery(args, params, includeTags, tagIndex));
			query = queries.join(" intersect ");
			if (excludeTags.length) {
				queries = [];
				for (tagIndex = 0; tagIndex < excludeTags.length; tagIndex++)
					queries.push(buildSearchPagesQuery(args, params, excludeTags, tagIndex));
				if (!query)
					query = "select pages.id as id from pages";
				query += " except " + queries.join(" except ");
			}
		} else
			query = buildSearchPagesQuery(args, params);
		if (count)
			query = "select count(id) as count from (" + query + ")";
		else
			query = "select pages.id as id, favico, title, url, date, idx, timestamp, read_date, read_timestamp, size from pages where id in (" + query + ")";
		return query;
	}

	storage.search = function(args, callback) {
		db.transaction(function(tx) {
			var params = [], query = buildFullSearchPagesQuery(args, params);
			query += " order by";
			if (args.sortBy) {
				switch (args.sortBy.field) {
				case "title":
					query += " lower(title) " + args.sortBy.value;
					break;
				case "date":
					query += " timestamp " + args.sortBy.value;
					break;
				case "readDate":
					query += " read_timestamp " + args.sortBy.value;
					break;
				case "rating":
					query += " idx " + args.sortBy.value;
					break;
				case "size":
					query += " size " + args.sortBy.value;
					break;
				case "url":
					query += " lower(replace(replace(url, 'www.', ''), 'https://', 'http://')) " + args.sortBy.value;
					break;
				}
			} else
				query += " pages.id desc";
			var currentPage = args.currentPage || 0;
			query += " limit " + (args.limit * currentPage) + ", " + args.limit;
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
						date : item.date,
						idx : item.idx,
						timestamp : item.timestamp,
						read_date : item.read_date,
						read_timestamp : item.read_timestamp,
						size : item.size
					});
				}
				params = [];
				tx.executeSql(buildFullSearchPagesQuery(args, params, true), params, function(cbTx, result) {
					count = result.rows.item(0).count;
					tx.executeSql("select page_id, tag from tags, pages_tags where id = tag_id", [], function(cbTx, result) {
						var i, item, ret = [], tags = [];
						for (i = 0; i < result.rows.length; i++) {
							item = result.rows.item(i);
							ret[item.page_id] = ret[item.page_id] || [];
							ret[item.page_id].push(item.tag);
						}
						for (i = 0; i < rows.length; i++)
							tags.push(ret[rows[i].id]);
						if (callback)
							callback(rows, tags, Math.ceil(count / args.limit));
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
								if (useFilesystem()) {
									var i, rootReader;
									for (i = 0; i < pageIds.length; i++) {
										fs.root.getFile(pageIds[i] + ".html", null, function(fileEntry) {
											fileEntry.remove();
										});
									}
									updateIndexFile();
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

	storage.addContent = function(favicoData, url, title, content, text, callback, forceUseDatabase) {
		db.transaction(function(tx) {
			var date = new Date();
			tx.executeSql("insert into pages (favico, url, title, date, timestamp, size) values (?, ?, ?, ?, ?, length(?))", [ favicoData, url, title,
					date.toString(), date.getTime(), content ], function(cbTx, result) {
				var id = result.insertId;
				if (useFilesystem() && !forceUseDatabase) {
					fs.root.getFile(id + ".html", {
						create : true,
						exclusive : true
					}, function(fileEntry) {
						fileEntry.createWriter(function(fileWriter) {
							var blobBuilder = new BlobBuilder(), BOM = new ArrayBuffer(3), v = new Uint8Array(BOM);
							v.set([ 0xEF, 0xBB, 0xBF ]);
							blobBuilder.append(BOM);
							blobBuilder.append(content);
							fileWriter.onerror = function(e) {
								storage.addContent(favicoData, url, title, content, text, callback, true);
							};
							fileWriter.onwrite = function(e) {
								updateIndexFile();
								if (callback)
									callback(id);
							};
							fileWriter.write(blobBuilder.getBlob());
						});
					}, function() {
						storage.addContent(favicoData, url, title, content, text, callback, true);
					});
				} else
					tx.executeSql("insert into pages_contents (id, content) values (?, ?)", [ id, content ], function() {
						tx.executeSql("insert into pages_texts (id, text) values (?, ?)", [ id, text ], function() {
							if (callback)
								callback(id);
						});
					});
			});
		});
	};

	storage.setRating = function(id, rating) {
		db.transaction(function(tx) {
			tx.executeSql("update pages set idx = ? where id = ?", [ rating, id ]);
		});
	};

	storage.reset = function() {
		var rootReader;
		db.transaction(function(tx) {
			tx.executeSql("drop table pages");
			tx.executeSql("drop table tags");
			tx.executeSql("drop table pages_tags");
			tx.executeSql("drop table pages_contents");
			tx.executeSql("drop table pages_texts");
		});
		if (fs) {
			rootReader = fs.root.createReader("/");
			rootReader.readEntries(function(entries) {
				var i;
				for (i = 0; i < entries.length; i++)
					entries[i].remove();
			});
		}
	};

	init();

})();