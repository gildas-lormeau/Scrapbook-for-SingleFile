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

(function() {

	var bgPage = chrome.extension.getBackgroundPage(), args = bgPage.args, pageCount, expandButton, sortByReadDateLink, tagsInput, limitInput, searchInput, fromRatingInput, toRatingInput, expandMiscButton, expandReadDateButton, expandSavedDateButton, expandUrlButton, expandTagsButton, savedPeriodInput, readPeriodInput, urlInput, sortByTitleLink, fromSizeInput, toSizeInput, otherInput, sortByDateLink, sortByRatingLink, sortByUrlLink, sortBySizeLink, expandSearchButton, selectAllButton, ulElement, nextLink, previousLink, links, tagInput, tagMask, allSelected = false;

	function tagsInputOninput() {
		var datalist = document.getElementById("pages-tags-filter-data"), select = document.createElement("select");
		datalist.innerHTML = "";
		bgPage.getTagsCompletion(tagsInput.values, function(tags) {
			var i, optionElement;
			datalist.appendChild(select);
			for (i = 0; i < tags.length; i++) {
				optionElement = document.createElement("option");
				optionElement.textContent = optionElement.value = tags[i];
				select.appendChild(optionElement);
			}
		});
	}

	function tagInputOninput() {
		var datalist = document.getElementById("pages-tag-data"), select = document.createElement("select");
		datalist.innerHTML = "";
		bgPage.getTagsCompletion(tagInput.values, function(tags) {
			var i, optionElement;
			datalist.appendChild(select);
			for (i = 0; i < tags.length; i++) {
				optionElement = document.createElement("option");
				optionElement.textContent = optionElement.value = tags[i];
				select.appendChild(optionElement);
			}
		});
	}

	function expandInputOnchange(value) {
		args.moreInfo = expandButton.value;
		search();
	}

	function expandTagsButtonSetArgs() {
		var values;
		if (!expandTagsButton.value)
			args.tags = null;
		else {
			values = tagsInput.values;
			args.tags = {
				values : values.length ? values : null
			};
		}
		updateFilterButtonState();
	}

	function expandSavedDateButtonSetArgs() {
		if (!expandSavedDateButton.value)
			args.savedPeriod = null;
		else
			args.savedPeriod = {
				period : savedPeriodInput.period,
				from : savedPeriodInput.fromDate,
				to : savedPeriodInput.toDate
			};
		updateFilterButtonState();
	}

	function expandReadDateButtonSetArgs() {
		if (!expandReadDateButton.value)
			args.readPeriod = null;
		else
			args.readPeriod = {
				period : readPeriodInput.period,
				from : readPeriodInput.fromDate,
				to : readPeriodInput.toDate
			};
		updateFilterButtonState();
	}

	function expandUrlButtonSetArgs() {
		if (!expandUrlButton.value)
			args.url = null;
		else
			args.url = {
				value : urlInput.value || null
			};
		updateFilterButtonState();
	}

	function expandMiscButtonSetArgs() {
		if (!expandMiscButton.value)
			args.misc = null;
		else
			args.misc = {
				rating : {
					from : fromRatingInput.value,
					to : toRatingInput.value
				},
				size : {
					from : fromSizeInput.value ? fromSizeInput.value * (1024 * 1024) : null,
					to : toSizeInput.value ? toSizeInput.value * (1024 * 1024) : null
				},
				other : otherInput.value ? otherInput.value : null
			};
		updateFilterButtonState();
	}

	function expandTagsButtonOnenter(value) {
		expandTagsButton.setArgs(value);
		if (value)
			tagsInput.focus();
		else
			searchInput.focus();
		if (!value || (args.tags && args.tags.values))
			search();
	}

	function expandDateButtonOnenter(value) {
		expandSavedDateButton.setArgs(value);
		if (value)
			savedPeriodInput.focus();
		else
			searchInput.focus();
		if (!value || (args.savedPeriod && args.savedPeriod.period != "all"))
			search();
	}

	function expandReadDateButtonOnenter(value) {
		expandReadDateButton.setArgs(value);
		if (value)
			readPeriodInput.focus();
		else
			searchInput.focus();
		if (!value || (args.readPeriod && args.readPeriod.period != "all"))
			search();
	}

	function expandUrlButtonOnenter(value) {
		expandUrlButton.setArgs(value);
		if (value)
			urlInput.focus();
		else
			searchInput.focus();
		if (!value || (args.url && args.url.value))
			search();
	}

	function expandMiscButtonOnenter(value) {
		expandMiscButton.setArgs(value);
		if (value)
			fromRatingInput.focus();
		else
			searchInput.focus();
		if (!value || (args.misc && JSON.stringify(args.misc) != '{"rating":{"from":"0","to":"500"},"size":{"from":null,"to":null},"other":null}'))
			search();
	}

	function selectAllButtonOnclick() {
		allSelected = !allSelected;
		Array.prototype.forEach.call(document.querySelectorAll("#tab-pages input[type=checkbox]"), function(inputElement) {
			inputElement.checked = allSelected;
			selectAllButton.value = allSelected ? "Unselect all" : "Select All";
		});
	}

	function getSelectedIds() {
		var selectedIds = [];
		Array.prototype.forEach.call(document.querySelectorAll("#tab-pages input[type=checkbox]"), function(inputElement) {
			if (inputElement.checked)
				selectedIds.push(inputElement.parentElement.id.split("page.")[1]);
		});
		return selectedIds;
	}

	function deleteButtonOnclick() {
		var selectedIds = getSelectedIds();
		if (selectedIds.length) {
			if (!bgPage.getAskConfirm() || confirm("Do you really want to delete selected archives ?"))
				bgPage.deletePages(selectedIds, function() {
					showPagesTab();
				});
		}
	}

	function openButtonOnclick() {
		var selectedIds = getSelectedIds();
		if (selectedIds.length)
			bgPage.openPages(selectedIds);
	}

	function tagButtonOnclick() {
		var selectedIds = getSelectedIds();
		if (selectedIds.length) {
			tagInput.value = "";
			tagMask.style.display = "block";
			tagInput.focus();			
		}
	}

	function expandSearchButtonOnenter(value) {
		args.advancedSearch = value;
		ulElement.className = value;
		if (!value)
			searchInput.focus();
	}

	function nextOnclick() {
		if (args.currentPage < pageCount - 1)
			args.currentPage++;
		search(null, true);
	}

	function previousOnclick() {
		if (args.currentPage)
			args.currentPage--;
		search(null, true);
	}

	function filterTagLinkOnclick() {
		expandTagsButton.value = expandTagsButton.value ? "" : "expanded";
	}

	function filterSavedDateLinkOnclick() {
		expandSavedDateButton.value = expandSavedDateButton.value ? "" : "expanded";
	}
	function filterReadDateLinkOnclick() {
		expandReadDateButton.value = expandReadDateButton.value ? "" : "expanded";
	}
	function filterMiscLinkOnclick() {
		expandMiscButton.value = expandMiscButton.value ? "" : "expanded";
	}
	function filterUrlLinkOnclick() {
		expandUrlButton.value = expandUrlButton.value ? "" : "expanded";
	}

	function updateFilterButtonState() {
		if (args.tags || args.url || args.readPeriod || args.savedPeriod || args.misc
				|| (args.sortBy && (args.sortBy.field != "date" || args.sortBy.value != "desc"))) {
			if (expandSearchButton.className.indexOf(" pages-filter-applied") == -1)
				expandSearchButton.className += " pages-filter-applied";
		} else
			expandSearchButton.className = expandSearchButton.className.replace(/ pages-filter-applied/, "");
	}

	function tagOkButtonOnclick() {
		var values = tagInput.values;
		if (values.length)
			bgPage.addTags(values, getSelectedIds(), function() {
				search(null, true);
			});
		tagMask.style.display = "none";
	}

	function tagCancelButtonOnclick() {
		tagMask.style.display = "none";
	}

	function tagInputOnkeydown(event) {
		if (event.keyIdentifier == "Enter")
			tagOkButtonOnclick();
		if (event.keyIdentifier == "U+001B") {
			tagCancelButtonOnclick();
			event.preventDefault();
		}
	}

	function display(rows, tags) {
		var i, tempElement = document.createElement("ul");
		for (i = 0; i < rows.length; i++) {
			(function(row, rowTags) {
				var liElement, cbElement, aElement, favicoElement, moreElement, moreDivElement, starsElement, linkElement, dateLabelElement, dateLinkElement, readDateLabelElement, readDateLinkElement, sizeLabelElement, infoLine1Element, infoLine2Element, infoLine3Element, stars = row.idx || 0, title = row.title;

				function refreshTitle() {
					aElement.title = "open the archive\n\n- Title : " + title + (row.date ? "\n- Saved date : " + new Date(row.date).toLocaleDateString() : "")
							+ "\n- Last read date : " + (row.read_date ? new Date(row.read_date).toLocaleDateString() : "-") + "\n- Rating : " + (stars / 100)
							+ " star" + (stars > 100 || !stars ? "s" : "") + "\n- Size : " + Math.floor(row.size / (1024 * 1024) * 100) / 100
							+ " MB\n- Tags : " + (rowTags ? rowTags.join(", ") : "-");
				}

				aElement = document.createElement("a");
				favicoElement = document.createElement("img");
				liElement = document.createElement("li");
				cbElement = document.createElement("input");
				moreElement = document.createElement("div");
				moreDivElement = document.createElement("div");
				infoLine1Element = document.createElement("div");
				infoLine2Element = document.createElement("div");
				infoLine3Element = document.createElement("div");
				linkElement = document.createElement("a");
				dateLabelElement = document.createElement("span");
				dateLinkElement = document.createElement("a");
				readDateLabelElement = document.createElement("span");
				readDateLinkElement = document.createElement("a");
				sizeLabelElement = document.createElement("span");
				starsElement = document.createElement("div");
				infoLine1Element.className = "pages-row-link";
				infoLine2Element.className = "pages-row-misc";
				infoLine1Element.appendChild(linkElement);
				infoLine1Element.appendChild(starsElement);
				infoLine2Element.appendChild(dateLabelElement);
				infoLine2Element.appendChild(dateLinkElement);
				infoLine2Element.appendChild(readDateLabelElement);
				infoLine2Element.appendChild(readDateLinkElement);
				infoLine2Element.appendChild(sizeLabelElement);
				moreDivElement.appendChild(infoLine1Element);
				moreDivElement.appendChild(infoLine2Element);
				moreDivElement.appendChild(infoLine3Element);
				liElement.id = "page." + row.id;
				liElement.appendChild(cbElement);
				liElement.appendChild(moreElement);
				liElement.appendChild(favicoElement);
				liElement.appendChild(aElement);
				liElement.appendChild(moreDivElement);
				tempElement.appendChild(liElement);

				new RatingInput(starsElement, stars);
				starsElement.title = "rate this archive";
				starsElement.onenter = function(value) {
					stars = value;
					refreshTitle();
					bgPage.setRating(row.id, value);
				};
				linkElement.href = "#";
				linkElement.onclick = function() {
					bgPage.openLink(row.url);
				};
				linkElement.className = "pages-row-link-input";
				linkElement.title = "open the original URL";
				linkElement.textContent = row.url;
				if (row.timestamp) {
					dateLabelElement.textContent = "saved date: ";
					readDateLabelElement.textContent = ", last read date: ";
					dateLinkElement.href = "#";
					dateLinkElement.className = "pages-date-link-input";
					dateLinkElement.textContent = getDateStr(row.timestamp);
					dateLinkElement.title = "filter this saved date";
					dateLinkElement.onclick = function() {
						var date = new Date(row.timestamp);
						expandSearchButton.value = "expanded";
						expandSavedDateButton.value = "expanded";
						savedPeriodInput.setPeriod("user");
						savedPeriodInput.fromDate = date;
						savedPeriodInput.toDate = date;
						search();
					};
					readDateLinkElement.href = "#";
					readDateLinkElement.className = "pages-date-link-input";
					if (row.read_timestamp) {
						readDateLinkElement.textContent = getDateStr(row.read_timestamp);
						readDateLinkElement.title = "filter this last read date";
						readDateLinkElement.onclick = function() {
							var date = new Date(row.read_timestamp);
							expandSearchButton.value = "expanded";
							expandReadDateButton.value = "expanded";
							readPeriodInput.setPeriod("user");
							readPeriodInput.fromDate = date;
							readPeriodInput.toDate = date;
							search();
						};
					} else {
						readDateLinkElement.textContent = "unread";
						readDateLinkElement.title = "filter all unread archives";
						readDateLinkElement.onclick = function() {
							expandSearchButton.value = "expanded";
							expandReadDateButton.value = "expanded";
							readPeriodInput.period = "empty";
							search();
						};
					}
				}
				sizeLabelElement.textContent = Math.floor(row.size / (1024 * 1024) * 100) / 100 + " MB";
				sizeLabelElement.className = "pages-row-size-label";
				moreElement.className = "clickable";
				new CollapserButton(moreElement, moreDivElement, expandButton.value || bgPage.expandedPages[row.id] || bgPage.newPages[row.id],
						"show only title", "show more info");
				cbElement.type = "checkbox";
				cbElement.title = "select a page to open or delete";
				favicoElement.src = row.favico ? row.favico : "../resources/default_favico.gif";
				favicoElement.className = "row-favico";
				aElement.href = "#";
				new TitleInput(aElement, row.title, "edit title", "delete archive");
				aElement.onclick = function() {
					if (bgPage.linkedElement) {
						bgPage.linkedElement.link.href = row.url;
						bgPage.updatePage();
						window.close();
					} else
						bgPage.open(row.id, false);
				};
				moreElement.onenter = function(value) {
					bgPage.newPages[row.id] = false;
					bgPage.expandedPages[row.id] = value;
				};
				aElement.onenter = function(value) {
					title = value;
					refreshTitle();
					bgPage.setTitle(row.id, value);
				};
				aElement.ondelete = function() {
					if (confirm("Do you really want to delete this archive ?"))
						bgPage.deletePages([ row.id ], function() {
							showPagesTab();
						});
				};
				new KeywordsInput(infoLine3Element, rowTags, "tags: ", "add a tag", "remove this tag", "filter this tag");
				infoLine3Element.oninput = function(event) {
					var input = event.target, data = document.getElementById(event.target.list);
					data.innerHTML = "";
					bgPage.getTagCompletion(input.textContent, row.id, function(tags) {
						var i, optionElement, select = document.createElement("select");
						for (i = 0; i < tags.length; i++) {
							optionElement = document.createElement("option");
							optionElement.textContent = optionElement.value = tags[i];
							select.appendChild(optionElement);
						}
						data.appendChild(select);
					});
				};
				infoLine3Element.onadd = function(value, values) {
					bgPage.addTag(row.id, value, function() {
						if (!rowTags) {
							tags[i] = [];
							rowTags = tags[i];
						}
						rowTags.push(value);
						refreshTitle();
					});
				};
				infoLine3Element.ondelete = function(value, values) {
					bgPage.removeTag(row.id, value, function() {
						rowTags = rowTags.filter(function(v) {
							return v != value;
						});
						refreshTitle();
					});
				};
				infoLine3Element.onselect = function(value) {
					expandSearchButton.value = "expanded";
					expandTagsButton.value = "expanded";
					tagsInput.value = value;
					search();
				};
				if (bgPage.linkedElement)
					aElement.title = "associate the selected link with this archive";
				else
					refreshTitle();
			})(rows[i], tags[i]);
		}
		tempElement.id = ulElement.id;
		tempElement.className = ulElement.className;
		ulElement.parentElement.replaceChild(tempElement, ulElement);
		ulElement = tempElement;
	}

	function search(callback, dontResetCurrentPage) {
		if (!dontResetCurrentPage)
			args.currentPage = 0;
		args.text = searchInput.value ? searchInput.value.split(/\s+/) : null;
		expandTagsButton.setArgs();
		expandSavedDateButton.setArgs();
		expandReadDateButton.setArgs();
		expandUrlButton.setArgs();
		expandMiscButton.setArgs();
		args.limit = limitInput.value;
		args.sortBy = {};
		if (sortByTitleLink.value) {
			args.sortBy.field = "title";
			args.sortBy.value = sortByTitleLink.value == "asc" ? "desc" : sortByTitleLink.value == "desc" ? "asc" : "";
		}
		if (sortByDateLink.value) {
			args.sortBy.field = "date";
			args.sortBy.value = sortByDateLink.value;
		}
		if (sortByRatingLink.value) {
			args.sortBy.field = "rating";
			args.sortBy.value = sortByRatingLink.value;
		}
		if (sortByUrlLink.value) {
			args.sortBy.field = "url";
			args.sortBy.value = sortByUrlLink.value == "asc" ? "desc" : sortByUrlLink.value == "desc" ? "asc" : "";
		}
		if (sortBySizeLink.value) {
			args.sortBy.field = "size";
			args.sortBy.value = sortBySizeLink.value;
		}
		if (sortByReadDateLink.value) {
			args.sortBy.field = "readDate";
			args.sortBy.value = sortByReadDateLink.value;
		}
		updateFilterButtonState();
		allSelected = false;
		selectAllButton.value = "Select All";
		bgPage.search(function(rows, tags, count) {
			var i, link, start;
			pageCount = count;
			display(rows, tags);
			if (pageCount > 1) {
				links.innerHTML = "";
				start = Math.min(Math.max(pageCount - 10, 0), Math.max(args.currentPage - 5, 0));
				for (i = start; i < Math.min(start + 10, pageCount); i++) {
					link = document.createElement("a");
					if (i == args.currentPage)
						link.className = "label";
					else {
						link.className = "clickable";
						link.href = "#";
					}
					link.textContent = i + 1;
					link.onclick = function() {
						args.currentPage = parseInt(this.textContent, 10) - 1;
						search(null, true);
					};
					links.appendChild(link);
				}
				previousLink.style.display = args.currentPage == 0 ? "none" : "";
				nextLink.style.display = args.currentPage == (pageCount - 1) ? "none" : "";
				document.getElementById("pages-navigation").style.display = "";
			} else {
				document.getElementById("pages-navigation").style.display = "none";
			}
			if (callback)
				callback();
		});
	}

	function showPages() {
		search();
		return false;
	}

	function getElements() {
		savedPeriodInput = document.getElementById("pages-saveddate-period-input");
		readPeriodInput = document.getElementById("pages-readdate-period-input");
		urlInput = document.getElementById("pages-url-filter");
		sortByTitleLink = document.getElementById("pages-sortby-title-link");
		sortByDateLink = document.getElementById("pages-sortby-saveddate-link");
		sortByRatingLink = document.getElementById("pages-sortby-rating-link");
		sortByUrlLink = document.getElementById("pages-sortby-url-link");
		sortBySizeLink = document.getElementById("pages-sortby-size-link");
		sortByReadDateLink = document.getElementById("pages-sortby-readdate-link");
		expandSearchButton = document.getElementById("pages-search-expand-button");
		fromSizeInput = document.getElementById("pages-misc-size-from-input");
		toSizeInput = document.getElementById("pages-misc-size-to-input");
		otherInput = document.getElementById("pages-misc-other-input");
		expandTagsButton = document.getElementById("pages-tags-expand-button");
		tagsInput = document.getElementById("pages-tags-filter");
		expandSavedDateButton = document.getElementById("pages-saveddate-expand-button");
		expandReadDateButton = document.getElementById("pages-readdate-expand-button");
		expandUrlButton = document.getElementById("pages-url-expand-button");
		expandMiscButton = document.getElementById("pages-misc-expand-button");
		searchInput = document.getElementById("pages-search-input");
		fromRatingInput = document.getElementById("pages-misc-rating-from-input");
		toRatingInput = document.getElementById("pages-misc-rating-to-input");
		limitInput = document.getElementById("pages-limit-input");
		expandButton = document.getElementById("pages-expand-button");
		selectAllButton = document.getElementById("pages-select-button");
		ulElement = document.getElementById("pages-list");
		nextLink = document.getElementById("pages-next");
		previousLink = document.getElementById("pages-previous");
		links = document.getElementById("pages-links");
		tagInput = document.getElementById("pages-tag-input");
		tagMask = document.getElementById("pages-tag-mask");
	}

	this.initPagesTab = function() {
		var group;
		getElements();
		group = [ sortByTitleLink, sortByDateLink, sortByRatingLink, sortBySizeLink, sortByReadDateLink, sortByUrlLink ];
		new ComboBox(tagsInput, args.tags && args.tags.values ? args.tags.values.join(",") : "");
		tagsInput.oninput = tagsInputOninput;
		if (document.documentElement.className == "newtab")
			args.limit = Math.max(args.limit, 20);		
		if (args.savedPeriod && args.savedPeriod.period)
			new PeriodInput(savedPeriodInput, args.savedPeriod.period, args.savedPeriod.from, args.savedPeriod.to, "from: ", "to: ", "all", "", "today",
					"this week", "this month", "user defined");
		else
			new PeriodInput(savedPeriodInput, "all", null, null, "from: ", "to: ", "all", "", "today", "this week", "this month", "user defined");
		if (args.readPeriod && args.readPeriod.period)
			new PeriodInput(readPeriodInput, args.readPeriod.period, args.readPeriod.from, args.readPeriod.to, "from: ", "to: ", "all", "unread", "today",
					"this week", "this month", "user defined");
		else
			new PeriodInput(readPeriodInput, "all", null, null, "from: ", "to: ", "all", "unread", "today", "this week", "this month", "user defined");
		new SortByLink(sortByTitleLink, args.sortBy && (args.sortBy.field == "title") ? (args.sortBy.value == "asc" ? "desc"
				: args.sortBy.value == "desc" ? "asc" : "") : "", group);
		new SortByLink(sortByDateLink, args.sortBy && (args.sortBy.field == "date") ? args.sortBy.value : "", group);
		new SortByLink(sortByRatingLink, args.sortBy && (args.sortBy.field == "rating") ? args.sortBy.value : "", group);
		new SortByLink(sortByUrlLink, args.sortBy && (args.sortBy.field == "url") ? (args.sortBy.value == "asc" ? "desc" : args.sortBy.value == "desc" ? "asc"
				: "") : "", group);
		new SortByLink(sortBySizeLink, args.sortBy && (args.sortBy.field == "size") ? args.sortBy.value : "", group);
		new SortByLink(sortByReadDateLink, args.sortBy && (args.sortBy.field == "readDate") ? args.sortBy.value : "", group);
		sortByTitleLink.onenter = showPages;
		sortByDateLink.onenter = showPages;
		sortByRatingLink.onenter = showPages;
		sortByUrlLink.onenter = showPages;
		sortBySizeLink.onenter = showPages;
		sortByReadDateLink.onenter = showPages;
		savedPeriodInput.onenter = showPages;
		readPeriodInput.onenter = showPages;
		expandSearchButton.onenter = expandSearchButtonOnenter;
		new CollapserButton(expandSearchButton, document.getElementById("pages-options-container"), args.advancedSearch, "hide search filters",
				"show search filters");
		new CollapserButton(expandTagsButton, document.getElementById("pages-tags-container"), args.tags, "hide tags filter", "show tags filter");
		new CollapserButton(expandSavedDateButton, document.getElementById("pages-saveddate-container"), args.savedPeriod, "hide saved date filter",
				"show saved date filter");
		new CollapserButton(expandReadDateButton, document.getElementById("pages-readdate-container"), args.readPeriod, "hide last read date filter",
				"show last read date filter");
		new CollapserButton(expandUrlButton, document.getElementById("pages-url-container"), args.url, "hide original URL filter", "show original URL filter");
		new CollapserButton(expandMiscButton, document.getElementById("pages-misc-container"), args.misc, "hide misc filter", "show misc filter");
		expandButton.onchange = expandInputOnchange;
		expandTagsButton.setArgs = expandTagsButtonSetArgs;
		expandSavedDateButton.setArgs = expandSavedDateButtonSetArgs;
		expandReadDateButton.setArgs = expandReadDateButtonSetArgs;
		expandUrlButton.setArgs = expandUrlButtonSetArgs;
		expandMiscButton.setArgs = expandMiscButtonSetArgs;
		expandTagsButton.onenter = expandTagsButtonOnenter;
		expandSavedDateButton.onenter = expandDateButtonOnenter;
		expandReadDateButton.onenter = expandReadDateButtonOnenter;
		expandUrlButton.onenter = expandUrlButtonOnenter;
		expandMiscButton.onenter = expandMiscButtonOnenter;
		selectAllButton.onclick = selectAllButtonOnclick;
		searchInput.onchange = showPages;
		fromRatingInput.onchange = showPages;
		toRatingInput.onchange = showPages;
		fromSizeInput.onchange = showPages;
		toSizeInput.onchange = showPages;
		otherInput.onchange = showPages;
		limitInput.onchange = showPages;
		urlInput.onchange = showPages;
		document.getElementById("pages-delete-button").onclick = deleteButtonOnclick;
		document.getElementById("pages-open-button").onclick = openButtonOnclick;
		document.getElementById("pages-tag-button").onclick = tagButtonOnclick;
		document.getElementById("pages-form").onsubmit = showPages;
		document.getElementById("pages-tags-filter-link").onclick = filterTagLinkOnclick;
		document.getElementById("pages-saveddate-filter-link").onclick = filterSavedDateLinkOnclick;
		document.getElementById("pages-readdate-filter-link").onclick = filterReadDateLinkOnclick;
		document.getElementById("pages-url-filter-link").onclick = filterUrlLinkOnclick;
		document.getElementById("pages-misc-filter-link").onclick = filterMiscLinkOnclick;
		nextLink.onclick = nextOnclick;
		previousLink.onclick = previousOnclick;
		document.getElementById("pages-tag-ok-button").onclick = tagOkButtonOnclick;
		document.getElementById("pages-tag-cancel-button").onclick = tagCancelButtonOnclick;
		new ComboBox(tagInput, "");
		tagInput.oninput = tagInputOninput;
		tagInput.onkeydown = tagInputOnkeydown;
		if (args.text)
			searchInput.value = args.text.join(" ");
		if (args.url)
			urlInput.value = args.url.value;
		fromRatingInput.value = "0";
		toRatingInput.value = "500";
		if (args.misc) {
			fromSizeInput.value = args.misc.size.from ? Math.floor(args.misc.size.from / (1024 * 1024) * 10) / 10 : "";
			toSizeInput.value = args.misc.size.to ? Math.ceil(args.misc.size.to / (1024 * 1024) * 10) / 10 : "";
			fromRatingInput.value = "" + args.misc.rating.from;
			toRatingInput.value = "" + args.misc.rating.to;
			otherInput.value = args.misc.other;
		}
		limitInput.value = "" + args.limit;
		expandButton.value = args.moreInfo;
	};

	this.showPagesTab = function(callback) {
		search(callback, true);
	};

})();
