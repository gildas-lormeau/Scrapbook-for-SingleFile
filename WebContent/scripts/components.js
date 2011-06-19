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
function ComboBox(element, value) {
	var timeoutDataChange, timeoutHide, that = this, suggest = document.createElement("select"), wrapper = document.createElement("span"), data = document
			.getElementById(element.getAttribute("list")), inputRegExp = / combobox-input/, resetElement = element.resetElement;

	function refreshData(event) {
		if (timeoutDataChange)
			clearTimeout(timeoutDataChange);
		timeoutDataChange = setTimeout(function() {
			displaySuggest();
			timeoutDataChange = null;
		}, 0);
	}

	function displaySuggest() {
		var value;
		if (element.value && that.hasFocus && data && data.children[0]
				&& ((data.children[0].length == 1 && data.children[0].children[0].value != element.value) || (data.children[0].length > 1))) {
			value = suggest.value;
			suggest.innerHTML = data.children[0].innerHTML;
			suggest.value = value;
			suggest.style.display = "block";
		} else
			hideSuggest();
	}

	function validateSuggest() {
		element.value = suggest.value;
		element.focus();
		suggest.selectedIndex = -1;
		suggest.style.display = "none";
	}

	function hideSuggest() {
		suggest.selectedIndex = -1;
		suggest.innerHTML = "";
		suggest.style.display = "none";
	}

	function setTimeoutHide() {
		clearTimeoutHide();
		timeoutHide = setTimeout(function() {
			that.hasFocus = false;
			hideSuggest();
			timeoutHide = null;
		}, 50);
	}

	function clearTimeoutHide() {
		that.hasFocus = true;
		if (timeoutHide)
			clearTimeout(timeoutHide);
	}

	function onInputKeydown(event) {
		if (event.keyIdentifier == "Up")
			event.preventDefault();
		if (event.keyIdentifier == "Down" && suggest.style.display == "block") {
			suggest.focus();
			if (!suggest.value)
				suggest.children[0].selected = true;
			event.preventDefault();
		}
		if (event.keyIdentifier == "Enter") {
			if (suggest.style.display == "block") {
				hideSuggest();
				event.preventDefault();
			}
		}
	}

	function onSuggestKeydown(event) {
		if (event.keyIdentifier == "Up" && suggest.selectedIndex == 0) {
			suggest.selectedIndex = -1;
			element.focus();
			event.preventDefault();
		}
		if (event.keyIdentifier == "Enter") {
			validateSuggest();
			event.preventDefault();
		}
	}

	function selectOption(event) {
		suggest.focus();
		suggest.selectedIndex = event.target.index;
	}

	function validate(event) {
		suggest.selectedIndex = event.target.index;
		validateSuggest();
	}

	this.suggest = suggest;
	if (value)
		element.value = value;

	data.addEventListener("DOMSubtreeModified", refreshData);

	element.parentElement.insertBefore(wrapper, element);
	element.className += " combobox-input";
	element.addEventListener("input", displaySuggest);
	element.addEventListener("focus", clearTimeoutHide);
	element.addEventListener("focus", displaySuggest);
	element.addEventListener("keydown", onInputKeydown);
	element.addEventListener("blur", setTimeoutHide);

	element.resetElement = function() {
		data.removeEventListener("DOMSubtreeModified", refreshData);
		element.removeEventListener("input", displaySuggest);
		element.removeEventListener("focus", clearTimeoutHide);
		element.removeEventListener("focus", displaySuggest);
		element.removeEventListener("keydown", onInputKeydown);
		element.removeEventListener("blur", setTimeoutHide);
		suggest.removeEventListener("keydown", onSuggestKeydown);
		suggest.removeEventListener("blur", setTimeoutHide);
		suggest.removeEventListener("focus", clearTimeoutHide);
		suggest.removeEventListener("mouseover", selectOption);
		suggest.removeEventListener("click", validate);
		wrapper.parentElement.replaceChild(element, wrapper);
		element.className = element.className.replace(inputRegExp, "");
		element.removeAttribute("list");
		delete element.list;
		if (resetElement)
			resetElement();
	};

	suggest.className = "combobox-suggest";
	suggest.size = 4;
	suggest.style.display = "none";
	suggest.addEventListener("keydown", onSuggestKeydown);
	suggest.addEventListener("blur", setTimeoutHide);
	suggest.addEventListener("focus", clearTimeoutHide);
	suggest.addEventListener("mouseover", selectOption);
	suggest.addEventListener("click", validate);

	wrapper.className = "combobox-wrapper";
	wrapper.appendChild(element);
	wrapper.appendChild(suggest);

	element.__defineGetter__("values", function() {
		var s = element.value ? element.value.split(/\s*,\s*/) : [];
		return s.filter(function(v) {
			return v.replace(/^\s*([\S\s]*?)\s*$/, '$1');
		});
	}, true);
}

function ElementInput(element, value) {
	var elementRegExp = / element-input/, resetElement = element.resetElement;

	element.resetElement = function() {
		if (!element.textContent)
			element.textContent = "";
		element.contentEditable = false;
		element.className = element.className.replace(elementRegExp, "");
		element.removeAttribute("contenteditable");
		element.removeEventListener("keydown", onkeydown);
		if (resetElement)
			resetElement();
	};

	function onkeydown(event) {
		if (event.keyIdentifier == "U+001B") {
			element.resetElement();
			element.blur();
		}
		if (event.keyIdentifier == "Enter") {
			element.resetElement();
			element.blur();
		}
	}

	if (value)
		element.textContent = value;
	element.className += " element-input";
	element.contentEditable = true;
	element.addEventListener("keydown", onkeydown);
	element.__defineSetter__("value", function(value) {
		element.textContent = value;
	});
	element.__defineGetter__("value", function() {
		return element.textContent;
	});

}

function RatingInput(element, value) {
	var starWidth = 12;

	function setRating(rating) {
		var className = element.className, ratingRegExp = / rating-value-\d\d\d/;
		if (rating)
			if (element.className.indexOf("rating-value") != -1)
				element.className = rating ? className.replace(ratingRegExp, " rating-value-" + rating) : className.replace(ratingRegExp, "");
			else
				element.className += " rating-value-" + rating;
		else
			element.className = className.replace(ratingRegExp, "");
	}

	value = value || 0;
	setRating(value);
	element.className += " rating-input";
	element.addEventListener("mousemove", function(event) {
		setRating(Math.ceil(event.offsetX / starWidth) * 100);
	}, true);
	element.addEventListener("mouseout", function(event) {
		setRating(value);
	}, true);
	element.addEventListener("click", function(event) {
		value = Math.ceil(event.offsetX / starWidth) * 100;
		if (element.onenter)
			element.onenter(value);
	}, true);
	element.__defineSetter__("value", function(val) {
		setRating(val);
		value = val;
	}, true);
	element.__defineGetter__("value", function() {
		return value;
	}, true);
}

function KeywordsInput(element, values, tagsLabel, addTagtitle, deleteTagTitle, tagTitle) {
	var timeoutBlur, currentKeyword, plusElement = document.createElement("img"), dataNewTag = document.createElement("datalist"), tagsLabelElement = document
			.createElement("span");

	function removeElement() {
		currentKeyword.resetElement();
		currentKeyword.removeEventListener("keydown", onkeydown);
		element.removeChild(currentKeyword);
		currentKeyword = null;
	}	

	function decorateKeywordElement() {
		var deleteElement = document.createElement("img"), keyword = currentKeyword;
		
		function keywordOnclick() {
			if (element.onselect)
				element.onselect(keyword.textContent);
		}
		
		function deleteOnclick(){
			if (element.ondelete)
				element.ondelete(keyword.textContent);
			element.removeChild(keyword);
			element.removeChild(deleteElement);
			currentKeyword = null;			
		}
		
		currentKeyword.className = "keywords-input-keyword";
		currentKeyword.tabIndex = "0";

		currentKeyword.addEventListener("click", keywordOnclick);
		currentKeyword.addEventListener("keyup", function(event) {
			if (event.keyIdentifier == "Enter")
				keywordOnclick();
		}, false);

		deleteElement.className = "keywords-input-delete-button clickable";
		deleteElement.src = "../resources/delete.png";
		deleteElement.tabIndex = "0";
		
		if (deleteTagTitle)
			deleteElement.title = deleteTagTitle;
		deleteElement.onclick = deleteOnclick;
		deleteElement.addEventListener("keyup", function(event) {
			if (event.keyIdentifier == "Enter")
				deleteOnclick();
		}, false);
		element.insertBefore(deleteElement, plusElement);
	}

	function validateElement() {
		decorateKeywordElement();
		if (element.onadd)
			element.onadd(currentKeyword.textContent);
		currentKeyword = null;
	}

	function onkeydown(event) {
		if (event.keyIdentifier == "U+001B")
			removeElement();
		if (event.keyIdentifier == "Enter" || event.keyIdentifier == "U+001B") {
			currentKeyword.removeEventListener("keydown", onkeydown);
			if (currentKeyword.textContent)
				validateElement();
			else
				currentKeyword = null;
			event.preventDefault();
		}
	}

	function onmousedown() {
		var textContent;
		if (currentKeyword) {
			if (currentKeyword.textContent) {
				textContent = currentKeyword.textContent;
				removeElement();
				currentKeyword = document.createElement("span");
				currentKeyword.textContent = textContent;
				currentKeyword.title = tagTitle;
				element.insertBefore(currentKeyword, plusElement);
				validateElement();
			} else {
				removeElement();
				return;
			}
		}
		currentKeyword = document.createElement("span");
		currentKeyword.className = "keywords-input-newkeyword";
		element.insertBefore(currentKeyword, plusElement);
		new ElementInput(currentKeyword);
		currentKeyword.setAttribute("list", dataNewTag.id);
		currentKeyword.list = dataNewTag.id;
		currentKeyword.title = "";
		new ComboBox(currentKeyword);
		currentKeyword.addEventListener("keydown", onkeydown);
		currentKeyword.focus();		
	}

	this.__proto__.datalistCount = this.__proto__.datalistCount || 0;

	dataNewTag.id = "keywords-input-datalist-" + this.__proto__.datalistCount++;

	tagsLabelElement.textContent = tagsLabel;

	element.appendChild(tagsLabelElement);
	element.appendChild(plusElement);
	element.appendChild(dataNewTag);

	if (values)
		values.forEach(function(value) {
			currentKeyword = document.createElement("span");
			currentKeyword.textContent = value;
			currentKeyword.title = tagTitle;
			element.insertBefore(currentKeyword, plusElement);
			decorateKeywordElement();
		});
	currentKeyword = null;

	plusElement.src = "../resources/plus.png";
	plusElement.className = "keywords-input-plus-button  clickable";
	if (addTagtitle)
		plusElement.title = addTagtitle;
	plusElement.addEventListener("mousedown", function() {
		if (event.button == 0) {
			onmousedown();
			event.preventDefault();
		}
	});
	plusElement.tabIndex = "0";
	plusElement.addEventListener("keyup", function(event) {
		if (event.keyIdentifier == "Enter")
			onmousedown();
	}, false);
}

function TitleInput(element, value, editButtonTitle, deleteButtonTitle) {
	var imgElement = document.createElement("img"), deleteElement = document.createElement("img"), wrapper = document.createElement("span"), commandWrapper = document
			.createElement("span"), onclick, currentTitleEdit, timeoutBlur;

	function resetElement() {
		if (deleteButtonTitle)
			deleteElement.title = deleteButtonTitle;
		element.scrollLeft = 0;
		element.style.textOverflow = "";
		element.onclick = onclick;
		currentTitleEdit = null;
		element.removeEventListener("keydown", onkeydown);
		element.removeEventListener("blur", setTimeoutBlur);
	}

	function setTimeoutBlur() {
		clearTimeoutBlur();
		timeoutBlur = setTimeout(function() {
			timeoutBlur = null;
			if (currentTitleEdit) {
				element.textContent = value;
				element.resetElement();
				resetElement();
			}
		}, 50);
	}

	function clearTimeoutBlur() {
		if (timeoutBlur)
			clearTimeout(timeoutBlur);
	}

	function onkeydown(event) {
		if (event.keyIdentifier == "U+001B") {
			element.textContent = value;
			element.resetElement();
			resetElement();
			event.preventDefault();
		}
		if (event.keyIdentifier == "Enter") {
			value = element.textContent;
			resetElement();
			if (element.onenter)
				element.onenter(element.textContent);
		}
	}

	if (value)
		element.textContent = value;
	else
		value = element.textContent;
	element.className += " title-input";
	imgElement.src = "../resources/edit.png";
	imgElement.className = "title-input-edit-button clickable";
	if (editButtonTitle)
		imgElement.title = editButtonTitle;
	deleteElement.src = "../resources/delete12.png";
	deleteElement.className = "title-input-delete-button clickable";
	if (deleteButtonTitle)
		deleteElement.title = deleteButtonTitle;
	element.parentElement.replaceChild(wrapper, element);
	commandWrapper.className = "title-input-wrapper";
	wrapper.appendChild(element);
	commandWrapper.appendChild(imgElement);
	commandWrapper.appendChild(deleteElement);

	commandWrapper.style.opacity = 0;

	wrapper.appendChild(commandWrapper);
	wrapper.parentElement.addEventListener("mouseover", function() {
		if (!currentTitleEdit)
			commandWrapper.style.opacity = 1;
	}, true);
	wrapper.parentElement.addEventListener("mouseout", function() {
		commandWrapper.style.opacity = 0;
	}, true);
	imgElement.addEventListener("mousedown", function() {
		clearTimeoutBlur();
		if (currentTitleEdit) {
			value = element.textContent;
			resetElement();
			element.resetElement();
			if (element.onenter)
				element.onenter(element.textContent);
			return;
		} else {
			new ElementInput(element);
			commandWrapper.style.opacity = 0;
			if (deleteButtonTitle)
				deleteElement.title = "";
		}
		currentTitleEdit = true;
		onclick = element.onclick;
		element.onclick = null;
		element.addEventListener("keydown", onkeydown);
		element.addEventListener("blur", setTimeoutBlur);
		element.style.textOverflow = "clip";
		element.focus();
		event.preventDefault();
	}, true);
	deleteElement.addEventListener("mousedown", function() {
		if (!currentTitleEdit && element.ondelete)
			element.ondelete();
	}, true);
}

function SortByLink(element, defaultValue, group) {
	var value = defaultValue;

	function sort() {
		if (group)
			group.forEach(function(elt) {
				if (elt != element)
					elt.value = "";
			});
		var oldValue = value;
		if (oldValue == "desc")
			value = "asc";
		else
			value = "desc";
		if (oldValue)
			element.className = element.className.replace(" " + oldValue, " " + value);
		else
			element.className += " " + value;
		if (element.onenter)
			element.onenter(value);
	}

	function setValue(val) {
		if (value)
			element.className = element.className.replace(" " + value, val ? " " + val : "");
		else if (val)
			element.className += " " + val;
	}

	element.addEventListener("click", sort);
	element.className += " sortby-link";
	element.__defineSetter__("value", function(val) {
		setValue(val ? val : "");
		value = val;
	}, true);
	element.__defineGetter__("value", function() {
		return value;
	}, true);
	element.className += " " + value;
	if (element.onenter)
		element.onenter(value);
}

function CollapserButton(element, contentElement, expanded, expandTitle, collapseTitle) {
	var value;

	function refresh() {
		if (!value) {
			element.className = element.className.replace(/ expanded/, value);
			if (collapseTitle)
				element.title = collapseTitle;
			contentElement.className = contentElement.className.replace(/ expanded/, value);
			if (element.onenter)
				element.onenter(value);
		} else if (element.className.indexOf(" expanded") == -1) {
			element.className += " " + value;
			if (expandTitle)
				element.title = expandTitle;
			contentElement.className += " " + value;
			if (element.onenter)
				element.onenter(value);
		}
	}
	
	function toggleContent() {
		value = (value == "expanded") ? "" : "expanded";
		refresh();
	}

	element.className += " collapser-button";
	contentElement.className += " collapser-content";
	element.addEventListener("click", toggleContent);
	element.addEventListener("keyup", function(event) {
		if (event.keyIdentifier == "Enter")
			toggleContent();
	}, false);

	element.__defineSetter__("value", function(val) {
		value = val ? "expanded" : "";
		refresh();
	}, true);
	element.__defineGetter__("value", function() {
		return value;
	}, true);

	element.tabIndex = "0";
	element.value = expanded ? "expanded" : "";
}

function getDateStr(timestamp) {
	var m, d, date = new Date();
	date.setTime(timestamp);
	m = date.getMonth() + 1;
	d = date.getDate();
	return date.getFullYear() + "-" + (m < 10 ? "0" + m : m) + "-" + (d < 10 ? "0" + d : d);
}

function PeriodInput(element, value, fromDateUser, toDateUser, fromDateLabel, toDateLabel, allLabel, emptyLabel, todayLabel, weekLabel, monthLabel, userLabel) {
	var period, fromDate, toDate, fromElement = document.createElement("input"), toElement = document.createElement("input"), fromLabel = document
			.createElement("span"), toLabel = document.createElement("span"), periodContainer = document.createElement("span"), container = document
			.createElement("span"), periodInput = document.createElement("select");

	function setPeriod() {
		periodContainer.style.display = "none";
		period = periodInput.value;
		if (period == "user") {
			periodContainer.style.display = "inline";
			element.fromDate = fromDateUser || null;
			element.toDate = toDateUser || new Date();
		} else {
			element.fromDate = null;
			element.toDate = null;
		}
	}

	function validate(skipOnEnter) {
		if (!skipOnEnter && element.onenter)
			element.onenter();
	}

	element.className += " period-input";
	fromLabel.className = "period-from-label-input";
	fromLabel.textContent = fromDateLabel;
	toLabel.className = "period-to-label-input";
	toLabel.textContent = toDateLabel;
	fromElement.className = "period-date-input";
	fromElement.onchange = validate;
	toElement.className = "period-date-input";
	container.className = "period-date-filters-input";
	toElement.onchange = validate;
	if (emptyLabel)
		periodInput.options[periodInput.options.length] = new Option(emptyLabel, "empty");
	periodInput.options[periodInput.options.length] = new Option(todayLabel, "today");
	periodInput.options[periodInput.options.length] = new Option(weekLabel, "week");
	periodInput.options[periodInput.options.length] = new Option(monthLabel, "month");
	periodInput.options[periodInput.options.length] = new Option(allLabel, "all");
	periodInput.options[periodInput.options.length] = new Option(userLabel, "user");
	periodInput.onchange = function() {
		setPeriod();
		validate();
	};
	periodContainer.appendChild(fromLabel);
	periodContainer.appendChild(fromElement);
	periodContainer.appendChild(toLabel);
	periodContainer.appendChild(toElement);
	periodContainer.style.display = "none";
	element.appendChild(periodInput);
	element.appendChild(periodContainer);
	element.appendChild(container);

	element.__defineGetter__("fromDate", function() {
		var dateArray;
		dateArray = fromElement.value.split("-");
		if (dateArray.length == 3)
			fromDate = new Date(dateArray[0], dateArray[1] - 1, dateArray[2]);
		return fromDate;
	}, true);
	element.__defineGetter__("toDate", function() {
		var dateArray = toElement.value.split("-");
		if (dateArray.length == 3)
			toDate = new Date(dateArray[0], dateArray[1] - 1, dateArray[2]);
		return toDate;
	}, true);
	element.__defineSetter__("fromDate", function(date) {
		fromDate = date;
		fromElement.value = date ? getDateStr(date.getTime()) : null;
	}, true);
	element.__defineSetter__("toDate", function(date) {
		toDate = date;
		toElement.value = date ? getDateStr(date.getTime()) : null;
	}, true);
	element.__defineGetter__("period", function() {
		return period;
	}, true);
	element.__defineSetter__("period", function(value) {
		period = value;
		periodInput.value = value;
		setPeriod();
		validate(true);
	}, true);
	element.setPeriod = function(value) {
		period = value;
		periodInput.value = value;
		setPeriod();
	};
	element.focus = function() {
		periodInput.focus();
	};

	element.period = value;
	fromDateUser = null;
	toDateUser = null;
}