/**
 * ColorPicker - pure JavaScript color picker without using images, external CSS or 1px divs. Copyright © 2011 David Durman, All rights
 * reserved. Modified by Gildas Lormeau: webkit specific and use inlined image
 */
(function(window, document, undefined) {

	var picker, slide, hueOffset = 15;

	/**
	 * Return mouse position relative to the element el.
	 */
	function mousePosition(evt) {
		return {
			x : evt.offsetX,
			y : evt.offsetY
		};
	}

	/**
	 * Convert HSV representation to RGB HEX string. Credits to http://www.raphaeljs.com
	 */
	function hsv2rgb(h, s, v) {
		var R, G, B, X, C;
		h = (h % 360) / 60;
		C = v * s;
		X = C * (1 - Math.abs(h % 2 - 1));
		R = G = B = v - C;

		h = ~~h;
		R += [ C, X, 0, 0, X, C ][h];
		G += [ X, C, C, X, 0, 0 ][h];
		B += [ 0, 0, X, C, C, X ][h];

		var r = R * 255, g = G * 255, b = B * 255;
		return {
			r : r,
			g : g,
			b : b,
			hex : "#" + (16777216 | b | (g << 8) | (r << 16)).toString(16).slice(1)
		};
	}

	/**
	 * Convert RGB representation to HSV. r, g, b can be either in <0,1> range or <0,255> range. Credits to http://www.raphaeljs.com
	 */
	function rgb2hsv(r, g, b) {
		if (r > 1 || g > 1 || b > 1) {
			r /= 255;
			g /= 255;
			b /= 255;
		}
		var H, S, V, C;
		V = Math.max(r, g, b);
		C = V - Math.min(r, g, b);
		H = (C == 0 ? null : V == r ? (g - b) / C : V == g ? (b - r) / C + 2 : (r - g) / C + 4);
		H = (H % 6) * 60;
		S = C == 0 ? 0 : C / V;
		return {
			h : H,
			s : S,
			v : V
		};
	}

	/**
	 * Return click event handler for the slider. Sets picker background color and calls ctx.callback if provided.
	 */
	function slideListener(ctx, slideElement, pickerElement) {
		return function(evt) {
			var mouse = mousePosition(evt);
			if (evt.target.className == "slide-background") {
				ctx.h = mouse.y / slideElement.offsetHeight * 360 + hueOffset;
				var c = hsv2rgb(ctx.h, 1, 1);
				pickerElement.style.backgroundColor = c.hex;
				ctx.callback && ctx.callback(c.hex, {
					h : ctx.h - hueOffset,
					s : ctx.s,
					v : ctx.v
				}, {
					r : c.r,
					g : c.g,
					b : c.b
				}, undefined, mouse);
			}
		};
	}

	/**
	 * Return click event handler for the picker. Calls ctx.callback if provided.
	 */
	function pickerListener(ctx, pickerElement) {
		return function(evt) {
			var mouse = mousePosition(evt), width = pickerElement.offsetWidth, height = pickerElement.offsetHeight;
			if (evt.target.className == "picker-background") {
				ctx.s = mouse.x / width;
				ctx.v = (height - mouse.y) / height;
				var c = hsv2rgb(ctx.h, ctx.s, ctx.v);
				ctx.callback && ctx.callback(c.hex, {
					h : ctx.h - hueOffset,
					s : ctx.s,
					v : ctx.v
				}, {
					r : c.r,
					g : c.g,
					b : c.b
				}, mouse);
			}
		};
	}

	/**
	 * ColorPicker.
	 * 
	 * @param {DOMElement} slideElement HSV slide element.
	 * @param {DOMElement} pickerElement HSV picker element.
	 * @param {Function} callback Called whenever the color is changed provided chosen color in RGB HEX format as the only argument.
	 */
	function ColorPicker(slideElement, pickerElement, callback) {
		var pickerImgElement, slideImgElement;

		if (!(this instanceof ColorPicker))
			return new ColorPicker(slideElement, pickerElement, callback);

		this.callback = callback;
		this.h = 0;
		this.s = 1;
		this.v = 1;
		this.pickerElement = pickerElement;
		this.slideElement = slideElement;

		pickerImgElement = document.createElement("div");
		pickerImgElement.className = "picker-background";
		pickerElement.appendChild(pickerImgElement);

		slideImgElement = document.createElement("div");
		slideImgElement.className = "slide-background";
		slideElement.appendChild(slideImgElement);

		slideElement.addEventListener('click', slideListener(this, slideElement, pickerElement), false);
		pickerElement.addEventListener('click', pickerListener(this, pickerElement), false);
	}

	/**
	 * Sets color of the picker in hsv/rgb/hex format.
	 * 
	 * @param {object} ctx ColorPicker instance.
	 * @param {object} hsv Object of the form: { h: <hue>, s: <saturation>, v: <value> }.
	 * @param {object} rgb Object of the form: { r: <red>, g: <green>, b: <blue> }.
	 * @param {string} hex String of the form: #RRGGBB.
	 */
	function setColor(ctx, hsv, rgb, hex) {
		ctx.h = hsv.h % 360;
		ctx.s = hsv.s;
		ctx.v = hsv.v;
		var c = hsv2rgb(ctx.h, ctx.s, ctx.v), mouseSlide = {
			y : (ctx.h * 120) / 360,
			x : 0
		// not important
		}, pickerHeight = 120, mousePicker = {
			x : ctx.s * 120,
			y : pickerHeight - ctx.v * pickerHeight
		};
		ctx.pickerElement.style.backgroundColor = hsv2rgb(ctx.h, 1, 1).hex;
		ctx.callback && ctx.callback(hex || c.hex, {
			h : ctx.h,
			s : ctx.s,
			v : ctx.v
		}, rgb || {
			r : c.r,
			g : c.g,
			b : c.b
		}, mousePicker, mouseSlide);
	}
	;

	/**
	 * Sets color of the picker in rgb format.
	 * 
	 * @param {object} rgb Object of the form: { r: <red>, g: <green>, b: <blue> }.
	 */
	ColorPicker.prototype.setHsv = function(hsv) {
		setColor(this, hsv);
	};

	/**
	 * Sets color of the picker in rgb format.
	 * 
	 * @param {object} rgb Object of the form: { r: <red>, g: <green>, b: <blue> }.
	 */
	ColorPicker.prototype.setRgb = function(rgb) {
		setColor(this, rgb2hsv(rgb.r, rgb.g, rgb.b), rgb);
	};

	/**
	 * Sets color of the picker in hex format.
	 * 
	 * @param {string} hex Hex color format #RRGGBB.
	 */
	ColorPicker.prototype.setHex = function(hex) {
		setColor(this, rgb2hsv(parseInt(hex.substr(1, 2), 16), parseInt(hex.substr(3, 2), 16), parseInt(hex.substr(5, 2), 16)), undefined, hex);
	};

	/**
	 * Helper to position indicators.
	 * 
	 * @param {HTMLElement} slideIndicator DOM element representing the indicator of the slide area.
	 * @param {HTMLElement} pickerIndicator DOM element representing the indicator of the picker area.
	 * @param {object} mouseSlide Coordinates of the mouse cursor in the slide area.
	 * @param {object} mousePicker Coordinates of the mouse cursor in the picker area.
	 */
	ColorPicker.positionIndicators = function(slideIndicator, pickerIndicator, mouseSlide, mousePicker) {
		if (mouseSlide) {
			pickerIndicator.style.left = 'auto';
			pickerIndicator.style.right = '0px';
			pickerIndicator.style.top = '0px';
			slideIndicator.style.top = (mouseSlide.y - 3) + 'px';
		}
		if (mousePicker) {
			pickerIndicator.style.top = (mousePicker.y - 5) + 'px';
			pickerIndicator.style.left = (mousePicker.x - 5) + 'px';
		}
	};

	window.ColorPicker = ColorPicker;

})(window, window.document);
