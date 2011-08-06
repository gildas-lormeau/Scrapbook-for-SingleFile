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

	var archiveId = Number(location.search.split('?')[1]);

	addEventListener("message", function(event) {
		event.data.archiveId = archiveId;
		chrome.extension.sendRequest(event.data);
	}, false);

	chrome.extension.sendRequest({
		gefaultStyle : true
	}, function(style) {
		parent.postMessage(JSON.stringify({
			sefaultStyle : true,
			defaultStyle: style
		}), "*");
	});

})();
