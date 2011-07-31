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

	var toolbox, colorPicker, bgColorPicker;

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

	function getColorPicker(callback) {
		var value, styleSheet, doc, colorInput, colorFrame = document.createElement("iframe"), slideElement, pickerElement, pickerIndicator, slideIndicator, colorPicker;
		colorFrame.classList.add("scrapbook-editor");
		colorFrame.classList.add("scrapbook-colorpicker");
		document.body.appendChild(colorFrame);
		doc = colorFrame.contentDocument;
		styleSheet = document.createElement("link");
		styleSheet.rel = "stylesheet";
		styleSheet.href = _SCRAPBOOK_PATH + "/pages/proxy-colorpicker.css";
		doc.head.appendChild(styleSheet);

		colorInput = doc.createElement("input");
		colorInput.classList.add("color");
		colorInput.hidden = true;
		doc.body.appendChild(colorInput);

		slideIndicator = doc.createElement("div");
		slideIndicator.classList.add("slide-indicator-input");
		slideElement = doc.createElement("div");
		slideElement.classList.add("slide-input");
		doc.body.appendChild(slideElement);
		slideElement.appendChild(slideIndicator);

		pickerIndicator = doc.createElement("div");
		pickerIndicator.classList.add("picker-indicator-input");
		pickerElement = doc.createElement("div");
		pickerElement.classList.add("picker-input");
		doc.body.appendChild(pickerElement);
		pickerElement.appendChild(pickerIndicator);

		colorPicker = new ColorPicker(slideElement, pickerElement, function(hex, hsv, rgb, mousePicker, mouseSlide) {
			value = hex;
			ColorPicker.positionIndicators(slideIndicator, pickerIndicator, mouseSlide, mousePicker);
			if (callback)
				callback(value);
		});
		colorFrame.hidden = true;
		value = 0;
		return {
			toggle : function() {
				colorFrame.hidden = !colorFrame.hidden;
			},
			show : function() {
				colorFrame.hidden = false;
			},
			hide : function() {
				colorFrame.hidden = true;
			},
			getValue : function() {
				return value;
			},
			setValue : function(color) {
				value = color;
				colorPicker.setHex(value);
			},
			setPosition : function(left) {
				colorFrame.style.left = left + "px";
			},
			getElement : function() {
				return doc;
			}
		};
	}

	function getToolbox() {
		var doc, styleSheet, frame = document.createElement("iframe"), displayed = false, container = document.createElement("div"), collapseButton, fontSizeButton, fontFamilyButton, colorButton, colorView, bgColorButton, bgcolorView, saveButton;

		function createCommandButton(className, title, command) {
			createButton(className, title, function() {
				document.execCommand(command);
			}, false);
		}

		function createSelectButton(label, title, items, onchange) {
			var option, select = doc.createElement("select");
			select.title = title;
			option = doc.createElement("option");
			option.style.color = "gray";
			option.innerText = label;
			option.value = "";
			select.appendChild(option);
			items.forEach(function(item) {
				option = doc.createElement("option");
				option.innerText = item;
				option.value = item;
				select.appendChild(option);
			});
			select.classList.add("select-input");
			select.addEventListener("change", onchange, false);
			container.appendChild(select);
			return select;
		}

		function createColorView(title, onclick) {
			var buttonContainer = doc.createElement("div"), button = doc.createElement("div");
			buttonContainer.classList.add("button");
			buttonContainer.title = title;
			buttonContainer.classList.add("color-set-input");
			buttonContainer.addEventListener("click", onclick, false);
			buttonContainer.appendChild(button);
			container.appendChild(buttonContainer);
			return button;
		}

		function createButton(className, title, onclick, parent) {
			var button = doc.createElement("div");
			button.title = title;
			button.classList.add(className);
			button.classList.add("button");
			button.addEventListener("click", onclick, false);
			(parent || container).appendChild(button);
			return button;
		}

		function show() {
			collapseButton.classList.remove("collapse-left-button");
			collapseButton.classList.add("collapse-right-button");
			document.body.contentEditable = true;
			frame.classList.remove("collapsed");
			doc.body.classList.remove("collapsed");
			displayed = true;
		}

		function hide() {
			collapseButton.classList.remove("collapse-right-button");
			collapseButton.classList.add("collapse-left-button");
			document.body.contentEditable = false;
			frame.classList.add("collapsed");
			doc.body.classList.add("collapsed");
			colorPicker.hide();
			bgColorPicker.hide();
			displayed = false;
		}

		function toggle() {
			if (displayed)
				hide();
			else
				show();

		}

		frame.classList.add("scrapbook-editor");
		frame.classList.add("scrapbook-toolbox");
		frame.classList.add("collapsed");
		frame.scrolling = "no";
		document.body.appendChild(frame);
		doc = frame.contentDocument;
		doc.body.classList.add("collapsed");
		styleSheet = document.createElement("link");
		styleSheet.rel = "stylesheet";
		styleSheet.href = _SCRAPBOOK_PATH + "/pages/proxy-toolbox.css";
		doc.head.appendChild(styleSheet);

		container.classList.add("main-buttons");
		doc.body.appendChild(container);

		collapseButton = createButton("collapse-left-button", "Show/Hide Editor Toolbox", function() {
			toggle();
		}, doc.body);

		document.execCommand("IgnoreSpelling");
		document.execCommand("styleWithCSS");
		document.execCommand("InsertBrOnReturn");
		createCommandButton("bold-button", "Bold", "Bold");
		createCommandButton("italic-button", "Italic", "Italic");
		createCommandButton("underline-button", "Underline", "Underline");
		createCommandButton("strike-button", "Strike Through", "StrikeThrough");
		fontSizeButton = createSelectButton("Font Size", "Font Size", [ "1", "2", "3", "4", "5", "6", "7" ], function(event) {
			if (event.target.value)
				document.execCommand("FontSize", false, event.target.value);
			event.target.value = "";
		});
		fontFamilyButton = createSelectButton("Font Family", "Font Family", [ "Arial", "Courier New", "Times New Roman" ], function(event) {
			if (event.target.value)
				document.execCommand("FontName", false, event.target.value);
			event.target.value = "";
		});
		fontFamilyButton.style.fontSize = "9pt";
		createCommandButton("remove-format-button", "Remove Format", "RemoveFormat");
		colorButton = createButton("color-button", "Select Text Color", function() {
			colorPicker.setPosition(frame.offsetLeft + colorButton.offsetLeft + 10);
			bgColorPicker.hide();
			colorPicker.toggle();
		});
		colorView = createColorView("Set Text Color", function() {
			document.execCommand("ForeColor", false, colorPicker.getValue());
		});
		colorPicker.setValue("#000000");
		colorView.style.backgroundColor = colorPicker.getValue();

		colorPicker.getElement().addEventListener("click", function() {
			colorView.style.backgroundColor = colorPicker.getValue();
		}, false);
		bgColorButton = createButton("bgcolor-button", "Select Text Background Color", function() {
			bgColorPicker.setPosition(frame.offsetLeft + bgColorButton.offsetLeft + 10);
			colorPicker.hide();
			bgColorPicker.toggle();
		});
		bgcolorView = createColorView("Set Text Background Color", function() {
			document.execCommand("HiliteColor", false, bgColorPicker.getValue());
		});
		bgColorPicker.setValue("#ffffff");
		bgcolorView.style.backgroundColor = bgColorPicker.getValue();
		bgColorPicker.getElement().addEventListener("click", function() {
			bgcolorView.style.backgroundColor = bgColorPicker.getValue();
		}, false);
		createCommandButton("olist-button", "Ordered List", "InsertOrderedList");
		createCommandButton("ulist-button", "Unordered List", "InsertUnorderedList");
		createCommandButton("indent-button", "Indent", "Indent");
		createCommandButton("outdent-button", "Outdent", "Outdent");
		createCommandButton("align-left-button", "Align Left", "JustifyLeft");
		createCommandButton("align-center-button", "Align Center", "JustifyCenter");
		createCommandButton("align-right-button", "Align Right", "JustifyRight");
		createCommandButton("justify-button", "Justify", "JustifyFull");
		createCommandButton("hrule-button", "Horizontal Rule", "InsertHorizontalRule");
		createCommandButton("undo-button", "Undo", "Undo");
		createCommandButton("redo-button", "Redo", "Redo");
		saveButton = createButton("save-button", "Save", function() {
			var docElement = document.documentElement.cloneNode(true);
			Array.prototype.forEach.call(docElement.querySelectorAll(".scrapbook-editor"), function(element) {
				element.parentElement.removeChild(element);
			});
			docElement.querySelector("body").contentEditable = false;
			var content = getDoctype(document) + docElement.outerHTML;
			document.getElementById("scrapbook-background").contentWindow.postMessage({
				saveArchive : true,
				content : content
			}, "*");
		});
		saveButton.style.marginLeft = "15px";

		document.addEventListener("click", function() {
			colorPicker.hide();
			bgColorPicker.hide();
		}, false);
		return {
			toggle : toggle,
			show : show,
			hide : hide,
			getElement : function() {
				return doc;
			}
		};
	}

	colorPicker = getColorPicker(function() {
		document.execCommand("ForeColor", false, colorPicker.getValue());
	});
	bgColorPicker = getColorPicker(function() {
		document.execCommand("HiliteColor", false, bgColorPicker.getValue());
	});
	toolbox = getToolbox();

})();
