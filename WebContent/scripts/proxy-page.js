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

	var toolbox, colorPicker, bgColorPicker, defaultStyle;

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
		var value, link = document.createElement("link"), colorFrame = document.body.appendChild(document.createElement("iframe")), doc = colorFrame.contentDocument, colorInput = doc
				.createElement("input"), slideElement = doc.createElement("div"), pickerElement = doc.createElement("div"), pickerIndicator = doc
				.createElement("div"), slideIndicator = doc.createElement("div"), colorPicker;
		colorFrame.classList.add("scrapbook-editor");
		colorFrame.classList.add("scrapbook-colorpicker");
		link.rel = "stylesheet";
		link.href = scrapbook_path + "/pages/proxy-colorpicker.css";
		doc.head.appendChild(link);
		colorInput.classList.add("color");
		colorInput.hidden = true;
		doc.body.appendChild(colorInput);
		slideIndicator.classList.add("slide-indicator-input");
		slideElement.classList.add("slide-input");
		doc.body.appendChild(slideElement);
		slideElement.appendChild(slideIndicator);
		pickerIndicator.classList.add("picker-indicator-input");
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

	function initDocument() {
		document.body.setAttribute("onmousemove", "(" + (function() {
			var note = window.scrapbook_currentNote;
			if (note) {
				if (document.body.style["-webkit-user-select"] != "none")
					document.body.style["-webkit-user-select"] = "none";
				note.target.style.left = note.target.offsetLeft + (event.clientX - (note.origX || 0)) + 'px';
				note.target.style.top = note.target.offsetTop + (event.clientY - (note.origY || 0)) + 'px';
				note.origX = event.clientX;
				note.origY = event.clientY;
			} else {
				note = window.scrapbook_currentGrip;
				if (note) {
					document.body.style["-webkit-user-select"] = "none";
					note.target.style.width = note.target.offsetWidth + (event.clientX - (note.origX || 0)) + 'px';
					note.origX = event.clientX;
					note.target.style.minHeight = note.target.offsetHeight + (event.clientY - (note.origY || 0)) + 'px';
					note.origY = event.clientY;
				} else if (document.body.style["-webkit-user-select"] != "text")
					document.body.style["-webkit-user-select"] = "text";
			}
		}).toString() + ")()");
		document.body.setAttribute("onmouseup", "(" + (function() {
			window.scrapbook_currentNote = null;
			window.scrapbook_currentGrip = null;
		}).toString() + ")()");
	}

	function getNote() {
		var element = document.createElement("div"), grip = document.createElement("div"), pin = document.createElement("div"), close = document
				.createElement("div"), resize = document.createElement("div"), gripContainer = document.createElement("div"), container = document
				.createElement("div"), paragraph = document.createElement("p");

		function initNoteElement() {
			element.contentEditable = false;
			element.className = "scrapbook-note";
			element.style["-webkit-user-select"] = "none";
			element.style.minWidth = "100px";
			element.style.background = "-webkit-gradient(linear, 0% 0%, 0% 100%, from(rgba(247,247,210,1)), to(rgba(240,242,155,1)))";
			element.style["-webkit-box-shadow"] = "0 2px 12px rgba(0,0,0,.5)";
			element.style.position = "absolute";
			element.style.left = (document.body.scrollLeft + document.body.offsetWidth / 2) + "px";
			element.style.top = (document.body.scrollTop + 50) + "px";
			element.style.zIndex = 9007199254740992;
			element.setAttribute("onmousedown", "(" + (function() {
				var element = event.target;
				if (element.className != "scrapbook-note-close" && element.className != "scrapbook-note-pin") {
					while (element.className != "scrapbook-note")
						element = element.parentElement;
					if (document.body.lastChild != element)
						document.body.appendChild(element);
				}
			}).toString() + ")()");
		}

		function initPinElement() {
			pin.className = "scrapbook-note-pin";
			pin.title = "Unpin";
			pin.style.backgroundImage = "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAAZiS0dEAP8A/wD/oL2nkwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9sIBBUNKJHJLfYAAAGOSURBVDjL5ZPJLwMBFMa/2cx0UNEI0dDWEkNIUaUhsURciISEQxPiQOLkyEX8FQ5EuHBGJE6OEgexxF4tJaq2NlNRqjWm03HqQW1xk3jH973vl7wN+B/hqLKNePp7nYeWmp5EjfzJvA3kZDXXjWkjoqCvr5x1WGyDvwKkAzzxEJQJSQNlZY3KNBomdk1Cb1wnEg2uwhKK9d+3syR5R+t1WralYTH27EsBy0M6D+Ll6BhkRbmau7xAAgCdCOD12QNpfW1ThCQj5gvjdW0dUAEQKhihWA1bLYgxjBSv/wCguKRk1R9E1HMGQpMOheIh3/pAcCw4r39DdZ9PhUJPl1+2sAUwxrrGGVqn61NcThB5+bi/vkGqUPASXZzPzQHEb4doBWTp4spL1wqqYjAh7HAh1WQCtXcwmWj+FHBqrhlKbm0aVW4CUYjiqmIuQ/DIAVmXYf9sS+8A+2ZrN19aMi49RiLi3FJn1t5mE63Epjlb9aUkBoZ/vDhna4fX3WUP7BiKrPHcCTjmNEmr/bt/8gbi940I+j5U9QAAAABJRU5ErkJggg==)";
			pin.style.position = "absolute";
			pin.style.right = "18px";
			pin.style.top = "2px";
			pin.style.width = "16px";
			pin.style.height = "16px";
			pin.style.opacity = ".7";
			pin.setAttribute("onclick", "(" + (function() {
				var note = event.target.parentElement.parentElement.parentElement;
				if (note.style.position == "absolute") {
					event.target.title = "Pin";
					event.target.style.backgroundImage = "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAAZiS0dEAP8A/wD/oL2nkwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9sIBBUNNIXIcbkAAAF4SURBVDjLY2AYGeCKvmnBrci4Uxd1jUNJ1nyWgUHmdc+EF///////etnK75cMzOJIMuAeA4Pa26T0Z7+fPfv3/////2+Wrfx+XlEjGqeGmyqazA/4xP2fC0iav9bSdv1c3/jm7+fP/3+/ePn/z+Mn//7/////ac+EPzD1LOgGcIhJxAi1tSxgevaMgYGLjYErNY2BgYHhPxMPD+PPk6f//3n58i8LK8tnnAYwc7BzssjKMHCEBjH8efTg/78PbxmZBIQZ/n39yvC1oXnfxwuXl3358vkRTi+cYWBgfW3pMPPX1Wt////////3vVv///398/9TVcXHJwwMIkQF3BMp5ebvm7f+/fPk6b///////7F18//Xyup9RGm+aWSZ9mnztr+fV635/FrfbNfPCxf///////9LG6f7BDVf1DcNfDln/p8Xnb1v7/CKejEwMDC8DIroflPTcPGBogbhRHQrNPrOo7rGh+fl1Y3hYgwcrLfZ+PgGbz4BAEcLsvXdBmMGAAAAAElFTkSuQmCC)";
					note.style.position = "fixed";
					note.style.top = (note.offsetTop - document.body.scrollTop) + "px";
					note.style.left = (note.offsetLeft - document.body.scrollLeft) + "px";
				} else {
					event.target.title = "Unpin";
					event.target.style.backgroundImage = "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAAZiS0dEAP8A/wD/oL2nkwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9sIBBUNKJHJLfYAAAGOSURBVDjL5ZPJLwMBFMa/2cx0UNEI0dDWEkNIUaUhsURciISEQxPiQOLkyEX8FQ5EuHBGJE6OEgexxF4tJaq2NlNRqjWm03HqQW1xk3jH973vl7wN+B/hqLKNePp7nYeWmp5EjfzJvA3kZDXXjWkjoqCvr5x1WGyDvwKkAzzxEJQJSQNlZY3KNBomdk1Cb1wnEg2uwhKK9d+3syR5R+t1WralYTH27EsBy0M6D+Ll6BhkRbmau7xAAgCdCOD12QNpfW1ThCQj5gvjdW0dUAEQKhihWA1bLYgxjBSv/wCguKRk1R9E1HMGQpMOheIh3/pAcCw4r39DdZ9PhUJPl1+2sAUwxrrGGVqn61NcThB5+bi/vkGqUPASXZzPzQHEb4doBWTp4spL1wqqYjAh7HAh1WQCtXcwmWj+FHBqrhlKbm0aVW4CUYjiqmIuQ/DIAVmXYf9sS+8A+2ZrN19aMi49RiLi3FJn1t5mE63Epjlb9aUkBoZ/vDhna4fX3WUP7BiKrPHcCTjmNEmr/bt/8gbi940I+j5U9QAAAABJRU5ErkJggg==)";
					note.style.position = "absolute";
					note.style.top = (note.offsetTop + document.body.scrollTop) + "px";
					note.style.left = (note.offsetLeft + document.body.scrollLeft) + "px";
				}
			}).toString() + ")()");
		}

		function initCloseElement() {
			close.className = "scrapbook-note-close";
			close.title = "Delete";
			close.style.backgroundImage = "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAB3RJTUUH1woQCDkQxGYFbwAAAAlwSFlzAAAewQAAHsEBw2lUUwAAAARnQU1BAACxjwv8YQUAAAHaSURBVHja3VJBa9RAFP5mJroxm3TdrR4sgojHFaGIvVvBo3gWlGr9CUrFXyD4KwQR/A1KD4VW8NBTrnWr6XazLVvbjW4mmcyML9sqG1v17oOXSd7M982X7z1gIqy1/0y5sOhNfrMKwZOlw5eXL3BSZAuLsIWCUQW8t2/GNV45IcTh+vTZX8FGKSR37p5AoPUlIrGWc5s/etz+WZYPHrZBNR4EdvBh7eaYKFf4eus2r/7C0nOLWg225NrdhZHp1fJGxnkoGlNwGg1k0RZkHDOT52guv4NTIchzQwo4CwIwz4PNZAjGwH0fTjAFGUXIerE2qgS/H2MqBNnOzg3uuh95kgineRbCdQFjKDXkl890c18Xo9HcudWVX5iKB+7rV+s6TefUYGCgNLC5CXQ6pTeQvdgcgdcnMRUFR8OQMc44dAGQ22MFBfkgOC/3fj9eUZDeu9+myQjFGY9ABJ6ZobwwJqiRgcIRYX/2evvPCqwNHQKf8j2k29uQ/T4ZppjbbPH6+WnopA61vx9uXb7CLnY2jiuwZBY9kHZ7Zas09dq3StW/d7t6uPGJRoGXLYUlT4jkuAJ1MJzXo3RZDQ+MLbQ/vboiy3p8bdZPoujb6SAQcm9v3m21QCv+k/gB4NkSwe3cC88AAAAASUVORK5CYII=)";
			close.style.position = "absolute";
			close.style.right = "0px";
			close.style.top = "2px";
			close.style.width = "16px";
			close.style.height = "16px";
			close.style.opacity = ".8";
			close.setAttribute("onclick", "(" + (function() {
				var note = event.target.parentElement.parentElement.parentElement;
				if (!note.innerText.trim() || confirm("Do you really want to delete this note ?"))
					note.parentElement.removeChild(note);
			}).toString() + ")()");
		}

		function initGripElement() {
			grip.title = "Drap and drop or double-click to toggle displaying";
			grip.style.position = "relative";
			grip.style.height = "20px";
			grip.style.margin = "2px";
			grip.style.backgroundColor = "#e3df7c";
			grip.setAttribute("onmousedown", "(" + (function() {
				var note = event.target.parentElement;
				if (event.target.parentElement.className == "scrapbook-note") {
					window.scrapbook_currentNote = {
						target : note,
						origX : event.clientX,
						origY : event.clientY
					};
					return false;
				}
				return true;
			}).toString() + ")()");
			grip.setAttribute("ondblclick", "("
					+ (function() {
						var content = event.target.nextSibling.nextSibling, text;
						if (content.style.display) {
							content.style.display = '';
							content.parentElement.style.opacity = 1;
							event.target.title = "Drap and drop or double-click to toggle display";
							event.target.firstChild.style.display = "";
							event.target.nextSibling.style.display = "";
						} else {
							text = content.innerText.trim();
							content.style.display = "none";
							content.parentElement.style.opacity = .7;
							event.target.title = text.length ? text.length > 100 ? text.substring(0, 100) + "..." : text
									: "Drap and drop or double-click to toggle displaying";
							event.target.firstChild.style.display = "none";
							event.target.nextSibling.style.display = "none";
						}
					}).toString() + ")()");
		}

		function initResizeElement() {
			resize.style.backgroundImage = "url(data:image/gif;base64,R0lGODlhEAAQAMIBAH4Mbv///8rgjQAAAP///////////////yH5BAEAAAIALAAAAAAOAA4AAAMfKLrc/rCFuMKgwt6oaZ/Pt0nD1ZFm6Ygmw2bje8pqAgA7)";
			resize.style.position = "absolute";
			resize.style.bottom = "0px";
			resize.style.right = "0px";
			resize.style.width = "16px";
			resize.style.height = "16px";
			resize.style.cursor = "se-resize";
			resize.setAttribute("onmousedown", "(" + (function() {
				window.scrapbook_currentGrip = {
					target : event.target.nextSibling,
					origX : event.clientX,
					origY : event.clientY
				};
				return false;
			}).toString() + ")()");
		}

		function initContainerElement() {
			container.style["-webkit-user-select"] = "text";
			container.contentEditable = true;
			container.style.minWidth = "200px";
			container.style.minHeight = "300px";
			container.style.margin = "5px";
		}

		function initParagraphElement() {
			paragraph.style.minHeight = "1em";
		}

		function create(parent, child) {
			var i, rule, element = parent.appendChild(child), elementStyle = getComputedStyle(element);
			for (i = 0; i < elementStyle.length; i++) {
				rule = elementStyle[i];
				if (typeof defaultStyle[rule] != "undefined" && defaultStyle[rule] != elementStyle[rule])
					element.style[rule] = defaultStyle[rule];
			}
		}

		create(document.body, element);
		create(element, grip);
		create(grip, gripContainer);
		create(gripContainer, pin);
		create(gripContainer, close);
		create(element, resize);
		create(element, container);
		create(container, paragraph);
		initNoteElement();
		initPinElement();
		initCloseElement();
		initGripElement();
		initResizeElement();
		initContainerElement();
		initParagraphElement();
		return element;
	}

	function getToolbox() {
		var doc, link = document.createElement("link"), stylesheet = document.createElement("style"), frame = document.createElement("iframe"), displayed = false, container = document
				.createElement("div"), collapseButton, fontSizeButton, fontFamilyButton, colorButton, colorView, bgColorButton, bgcolorView, saveButton, getNoteButton;

		function createCommandButton(className, title, command) {
			createButton(className, title, function() {
				document.execCommand(command);
			}, false);
		}

		function createSelectButton(label, title, items, onchange) {
			var option = doc.createElement("option"), select = doc.createElement("select");
			select.title = title;
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

		if (!document.querySelector(".scrapbook-editor-stylesheet")) {
			stylesheet.className = "scrapbook-editor-stylesheet";
			stylesheet.innerText = ":focus { outline: 5px auto -webkit-focus-ring-color; }";
			document.head.appendChild(stylesheet);
		}

		frame.style["-webkit-user-select"] = "none";
		frame.classList.add("scrapbook-editor");
		frame.classList.add("scrapbook-toolbox");
		frame.classList.add("collapsed");
		frame.scrolling = "no";
		document.body.appendChild(frame);
		doc = frame.contentDocument;
		doc.body.classList.add("collapsed");
		link.rel = "stylesheet";
		link.href = scrapbook_path + "/pages/proxy-toolbox.css";
		doc.head.appendChild(link);
		container.classList.add("main-buttons");
		doc.body.appendChild(container);
		collapseButton = createButton("collapse-left-button", "Show/Hide Editor Toolbox", function() {
			toggle();
		}, doc.body);
		document.execCommand("styleWithCSS", 0, true);
		createCommandButton("bold-button", "Bold", "Bold");
		createCommandButton("italic-button", "Italic", "Italic");
		createCommandButton("underline-button", "Underline", "Underline");
		createCommandButton("strike-button", "Strike Through", "StrikeThrough");
		fontSizeButton = createSelectButton("Font Size", "Font Size", [ "1", "2", "3", "4", "5", "6", "7" ], function(event) {
			if (event.target.value)
				document.execCommand("FontSize", false, event.target.value);
			event.target.value = "";
		});
		fontFamilyButton = createSelectButton("Font Family", "Font Family", [ "cursive", "monospace", "sans-serif", "serif" ], function(event) {
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
		getNoteButton = createButton("get-note-button", "Add Note", getNote);
		getNoteButton.style.marginLeft = "8px";
		saveButton = createButton("save-button", "Save", function() {
			var docElement = document.documentElement.cloneNode(true);
			Array.prototype.forEach.call(docElement.querySelectorAll(".scrapbook-editor"), function(element) {
				element.parentElement.removeChild(element);
			});
			docElement.querySelector("body").contentEditable = false;
			document.getElementById("scrapbook-background").contentWindow.postMessage({
				saveArchive : true,
				content : getDoctype(document) + docElement.outerHTML
			}, "*");
		});
		saveButton.style.marginLeft = "7px";
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

	addEventListener("message", function(event) {
		var message = JSON.parse(event.data);
		if (message.sefaultStyle)
			defaultStyle = JSON.parse(message.defaultStyle);
	}, false);

	initDocument();
	colorPicker = getColorPicker(function() {
		document.execCommand("ForeColor", false, colorPicker.getValue());
	});
	bgColorPicker = getColorPicker(function() {
		document.execCommand("HiliteColor", false, bgColorPicker.getValue());
	});
	toolbox = getToolbox();

})();
