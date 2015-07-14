$(document).on("loadCustom", function() {
	var mobile   = ($('#sidebar').width() < 300);
	var wayPoint = false;
	var circle = null;

	if (localStorage['sfw']) {
		$('span#brothel-text').text($.t('sidebar.loveInterest'));
		$('div#sfw').find('a').hide();
		$('div#sfw').find('a.original').show();
	}

	if (localStorage['hideWarn']) {
		$('#warn').remove();
	}

	if (localStorage['hide-all-' + window.map_path]) {
		$('#hide-all').hide();
		$('#show-all').show();
	}

	if (localStorage['hide-monsters']) {
		$('#info').addClass('hideMonsters');
		$('#hide-monsters').hide();
		$('#show-monsters').show();
	}

	var hackySticky = function () {
		if ($(window).height() > $('#sidebar-wrap').outerHeight() + $('div#copyright').outerHeight() + 45) {
			$('div#copyright').addClass('absolute');
		} else {
			$('div#copyright').removeClass('absolute');
		}
	};
	hackySticky();
	$(window).on('resize', function(){ hackySticky(); });

	$('div#sidebar').niceScroll({
		cursorcolor  : '#5E4F32',
		cursorborder : 'none',
	});

	$('div#info').niceScroll({
		cursorcolor  : '#5E4F32',
		cursorborder : 'none',
	});

	var map = L.map('map', {
		minZoom: 2,
		maxZoom: window.map_mZoom,
		center: window.map_center,
		zoom: 3,
		attributionControl: false,
		zoomControl: false,
		layers: allLayers
	});

	var go = function (cords) {
		map.panTo(cords);
		map.setZoom(window.map_mZoom);
		new L.marker(cords, {
			icon : L.icon({
				iconUrl  : '../files/img/searchhover.png',
				iconSize : [22, 22]
			})
		}).addTo(map);
	};

	new L.Control.Zoom({ position: 'topright' }).addTo(map);
	new L.Control.Fullscreen({ position: 'topright' }).addTo(map);
	var hash = new L.Hash(map);
	var bounds = new L.LatLngBounds(window.map_sWest, window.map_nEast);
	map.setMaxBounds(bounds);

	if (!mobile) {
		var searchData = [];
		$.each(allLayers, function(key, layer) {
			$.each(layer._layers, function(key, marker) {
				searchData.push({ loc : [marker._latlng.lat,marker._latlng.lng] , title : marker._popup._content.replace(/<h1>/, '').replace(/<\/h1>/, ' - ').replace(/\\'/g, '') });
			});
		});

		searchData.sort(function(a,b) {
			if (a.title < b.title) {
				return -1;
			}
			if (a.title > b.title) {
				return 1;
			}
			return 0;
		});

		map.addControl(new L.Control.Search({
			autoResize   : false,
			autoType     : false,
			minLength    : 2,
			position     : 'topright',
			autoCollapse : false,
			zoom         : 5,
			filterJSON   : function(json){ return json; },
			callData     : function(text, callResponse) {
				callResponse($.grep(searchData, function(data) {
					return data.title.match(new RegExp(text, 'i'));
				}));
				setTimeout(function() {
					$('.search-tooltip').getNiceScroll().resize();
				},200);
				return { abort: function(){ console.log('aborted request: ' + text); } };
			}
		}));

		$('.search-tooltip').niceScroll({
			cursorcolor      : '#5E4F32',
			cursorborder     : 'none',
			horizrailenabled : false
		});
	}

	L.tileLayer('../files/maps/' + window.map_path + '/{z}/{x}/{y}.png', {
		tms: true,
		bounds: bounds,
		noWrap: true
	}).addTo(map);

	map.dragging._draggable.on('predrag', function() {
		var pos = map._initialTopLeftPoint.subtract(this._newPos);
		this._newPos = this._newPos.subtract(map._getBoundsOffset(new L.Bounds(pos, pos.add(map.getSize())), map.options.maxBounds));
	});

	map.on('contextmenu', function(e) {
		if (!bounds.contains(e.latlng)) {
			return false;
		}
		if (wayPoint) {
			map.removeLayer(wayPoint);
		}
		wayPoint = new L.marker(e.latlng, {
			icon : L.icon({
				iconUrl  : '../files/img/icons/waypoint.png',
				iconSize : [26, 32]
			})
		}).on('click', function() {
			map.removeLayer(wayPoint);
			hash.removeParam('w');
		}).on('contextmenu', function() {
			map.removeLayer(wayPoint);
			hash.removeParam('w');
		}).addTo(map);
		hash.addParam('w', e.latlng.lat.toFixed(3)+','+e.latlng.lng.toFixed(3));
	});

	$('.leaflet-marker-icon').on('contextmenu',function(e){ return false; });

	map.on('popupopen', function(e) {
		deleteCircle();
		createCircle(e.popup._latlng);
		$('#info-wrap').stop();
		if (localStorage['sfw'] && e.popup._source._popup._content.match(/prostitute/i)) {
			$('#info').html('<h1>' + $.t('sidebar.loveInterest') + '</h1>' + $.t('misc.loveInterestDesc'));
		} else {
			$('#info').html(e.popup._source._popup._content);
		}
		$('#info').getNiceScroll(0).doScrollTop(0,0);
		$('#info-wrap').fadeIn('fast');
		console.log('Popup at:');
		console.log('[' + e.popup._latlng.lat.toFixed(3) + ', ' + e.popup._latlng.lng.toFixed(3) + ']');
	});

	var createCircle = function(latlng) {
		var noteKey = getNoteKey(latlng);
		var lat = latlng.lat.toFixed(3);
		var long = latlng.lng.toFixed(3);
		//only add param and show center button if not a note
		if(!noteMarkerList[noteKey]) {
			hash.addParam('m', lat + ',' + long);
		 	$('#centerButton').show();
		}
		circle = L.circleMarker(L.latLng(lat,long), {
			color: 'red',
			fillColor: '#f03',
			fillOpacity: 0.5,
			radius: 20
		}).addTo(map);
	};

	var deleteCircle = function() {
		if(circle !== null) {
			map.removeLayer(circle);
			hash.removeParam('m');
			$('#centerButton').hide();
		}
	};

	var popupClose = function() {
		$('#info-wrap').fadeOut('fast', function() {
			$('#info').html('');
			deleteCircle();
			map.closePopup();
		});
	};

	map.on('popupclose', function(e) {
		popupClose();
	});

	if (localStorage['markers-' + window.map_path]) {
		$.each($.parseJSON(localStorage['markers-' + window.map_path]), function(key, val) {
			if (val === false) {
				$('i.' + key).parent().addClass('layer-disabled');
				map.removeLayer(window.markers[key]);
			}
		});
	}

  $('ul.key:not(.controls) li:not(.none) i').each(function(i, e) {
		var marker = $(this).attr('class');
		var pill = $("<div class='pill'>"+window.markerCount[marker]+"</div>");
		$(this).next().after(pill);
		if (localStorage['hide-counts']) {
			pill.hide();
		}
	}).promise().done(function() {
		if (localStorage['hide-counts']) {
			$('#hide-counts').hide();
			$('#show-counts').show();
		}
	});

	$('#hide-all').on('click', function(e) {
		var remember = (!localStorage['markers-' + window.map_path]) ? {} : $.parseJSON(localStorage['markers-' + window.map_path]);
		$.each(allLayers, function(key, val) {
			map.removeLayer(val);
		});
		$.each($('ul.key:not(.controls) li:not(.none) i'), function(key, val) {
			remember[$(this).attr('class')] = false;
		});
		$('ul.key:first li').each(function(id, li) {
			$(li).addClass('layer-disabled');
		});
		$(this).hide();
		$('#show-all').show();
		localStorage['markers-' + window.map_path] = JSON.stringify(remember);
		localStorage['hide-all-'+window.map_path] = true;
	});

	$('#show-all').on('click', function(e) {
		var remember = (!localStorage['markers-' + window.map_path]) ? {} : $.parseJSON(localStorage['markers-' + window.map_path]);
		$.each(allLayers, function(key, val) {
			map.addLayer(val);
		});
		$.each($('ul.key:not(.controls) li:not(.none) i'), function(key, val) {
			remember[$(this).attr('class')] = true;
		});
		$('ul.key:first li').each(function(id, li) {
			$(li).removeClass('layer-disabled');
		});
		$(this).hide();
		$('#hide-all').show();
		localStorage['markers-' + window.map_path] = JSON.stringify(remember);
		localStorage.removeItem('hide-all-'+window.map_path);
	});

	$('#hide-counts').on('click', function(e) {
		$('ul.key:not(.controls) > li:not(.none) i').each(function(i, e) {
			$(this).siblings(':last').hide();
		});
		$(this).hide();
		$('#show-counts').show();
		localStorage['hide-counts'] = true;
	});

	$('#show-counts').on('click', function(e) {
		$('ul.key:not(.controls) > li:not(.none) i').each(function(i, e) {
			$(this).siblings(':last').show();
		});
		$(this).hide();
		$('#hide-counts').show();
		localStorage.removeItem('hide-counts');
	});

	$('#reset-tracking').on('click', function(e) {
		e.preventDefault();
		if (confirm($.t('controls.resetInvisConfirm'))) {
			resetInvisibleMarkers();
		}
	});

	$(document).on('click', 'li#hide-monsters', function(e) {
		localStorage['hide-monsters'] = true;
		$('#info').addClass('hideMonsters');
		$('#hide-monsters').hide();
		$('#show-monsters').show();
	});

	$(document).on('click', 'li#show-monsters', function(e) {
		localStorage.removeItem('hide-monsters');
		$('#info').removeClass('hideMonsters');
		$('#hide-monsters').show();
		$('#show-monsters').hide();
	});

	$('ul.key:not(.controls)').on('click', 'li:not(.none)', function(e) {
		var marker   = $(this).find('i').attr('class');
		var remember = (!localStorage['markers-' + window.map_path]) ? {} : $.parseJSON(localStorage['markers-' + window.map_path]);
		if ($(this).hasClass('layer-disabled')) {
			map.addLayer(window.markers[marker]);
			$(this).removeClass('layer-disabled');
			remember[marker] = true;
		} else {
			map.removeLayer(window.markers[marker]);
			$(this).addClass('layer-disabled');
			remember[marker] = false;
		}
		localStorage['markers-' + window.map_path] = JSON.stringify(remember);
	});

	var origSidebar;
	var origBorder;
	var origHide;
	var origMap;
	var origInfoWrap;
	var origInfo;

	var hideSidebar = function() {
		origSidebar = $('#sidebar').css('left');
		origBorder = $('#sidebar-border').css('left');
		origHide = $('#hide-sidebar').css('left');
		origMap = $('#map').css('left');
		origInfoWrap = $('#info-wrap').css(['left','width']);
		origInfo = $('#info').css(['width', 'margin-right']);

		$('#info-wrap').css({'left' : '0px' , 'width' : '100%' });
		$('#info').css({'width' : 'auto', 'margin-right' : '80px'});
		$('#map').css('left', '0px');
		map.invalidateSize();

		var base = $('#sidebar').outerWidth();
		$('#sidebar').animate({left : '-' + base + 'px'}, 200);
		$('#sidebar-border').animate({left : '-' + (base + 15) + 'px'}, 200);
		$('#hide-sidebar').animate({left : '0px'}, 200, function() {
			$('#hide-sidebar').addClass('show-sidebar');
		});
	};

	$(document).on('click', 'div#hide-sidebar:not(.show-sidebar)', function(e) {
		hideSidebar();
		localStorage['hide-sidebar'] = true;
	});

	$(document).on('click', 'div#hide-sidebar.show-sidebar', function(e) {
		showSidebar($(this));
		localStorage.removeItem('hide-sidebar');
	});

	var showSidebar = function(elem) {
		$('#sidebar').animate({left : origSidebar}, 200);
		$(elem).animate({left : origHide}, 200);
		$('#sidebar-border').animate({left : origBorder}, 200, function() {
			$('#map').css('left', origMap);
			map.invalidateSize();
			$('.show-sidebar').removeClass('show-sidebar');
			$('#sidebar').attr('style', '');
			$('#sidebar-border').attr('style', '');
			$('#info-wrap').css(origInfoWrap);
			$('#info').css(origInfo);
			$('#map').attr('style', '');
		});
	};

	if(localStorage['hide-sidebar']) {
		setTimeout(function() { hideSidebar(); }, 500);
	}

	$(window).on('resize', function() {
		if ($('.show-sidebar').length && $(this).width() > 768) {
			$('#map').css('left', origMap);
			map.invalidateSize();
			$('.show-sidebar').removeClass('show-sidebar');
			$('#hide-sidebar').attr('style', '');
			$('#sidebar').attr('style', '');
			$('#sidebar-border').attr('style', '');
			$('#info-wrap').attr('style', '');
			$('#map').attr('style', '');
		}
	});

	$(document).on('click', 'div#warn', function(e) {
		localStorage['hideWarn'] = true;
		$(this).remove();
	});

	$('div#sfw').on('click', 'a.gotosfw', function(e) {
		e.preventDefault();
		if (confirm($.t('misc.nsfwConfirm'))) {
			localStorage['sfw'] = true;
			$('span#brothel-text').text($.t('sidebar.loveInterest'));
			$('div#sfw > a.gotosfw').hide();
			$('div#sfw > a.original').show();
		}
	});

	$('div#sfw').on('click', 'a.original', function(e) {
		e.preventDefault();
		if ($.t('misc.nsfwUndo')) {
			localStorage.removeItem('sfw');
			$('span#brothel-text').text($.t('sidebar.brothel'));
			$('div#sfw > a.original').hide();
			$('div#sfw > a.gotosfw').show();
		}
	});

	var popupClick = function(e) {
		if ($(e.target).is('#popup-content') || $(e.toElement.offsetParent).is('#popup-content') || $(e.toElement.offsetParent).is('#popup-wrap')) {
			return;
		}
		popupClose();
	};

	window.popupClose = function() {
		$('#popup-wrap').remove();
		$(document).off('click', '*', popupClick);
	};

	var popup = function(title, content) {
		$('body').prepend('<div id="popup-wrap"><div id="popup-border"><img id="popup-close" src="../files/img/exit.png" alt="Close" onclick="popupClose();"><div id="popup-content"><h1>' + title + '</h1><hr>' + content + '</div></div></div>');
		$('div#popup-content').niceScroll({
			cursorcolor  : '#5E4F32',
			cursorborder : 'none',
			autohidemode : false,
			railpadding  : { top: 22 , right : 5, bottom: 5}
		});
		$(document).on('click', '*', popupClick);
	};

	$(document).on('click', '.credits', function(e) {
		e.preventDefault();
		popup('Credits', [
			'<p>Created by <a href="https://github.com/untamed0" target="_blank">untamed0</a>, with contributions from:</p>',
			'<ul>',
				'<li><a href="https://github.com/mcarver" target="_blank">mcarver</a> (lead contributor) - Marker count, hash permalink improvements, backup/restore settings, numerous fixes etc</li>',
				'<li><a href="https://github.com/ankri" target="_blank">ankri</a> - Ability to hide markers on right or double click</li>',
				'<li><a href="https://github.com/ITroxxCH" target="_blank">ITroxxCH</a> - Translation/i18n implementation</li>',
				'<li><a href="https://github.com/msmorgan" target="_blank">msmorgan</a> - Javascript &amp; map data structure improvements</li>',
				'<li><a href="https://twitter.com/DesignGears" target="_blank">@DesignGears</a> &amp <a href="https://github.com/hhrhhr" target="_blank">hhrhhr</a> - Map &amp; asset extraction</li>',
			'</ul>',
			'<p>Thanks to the following people for contributions to improving the map data:<br>',
			'todo</p>',
			'<h3>Translations</h3>',
			'<ul>',
				'<li>German - <a href="https://github.com/ITroxxCH" target="_blank">ITroxxCH</a></li>',
			'</ul>',
			'<p>Special thanks to <a href="https://crowdin.com" target="_blank">crowdin</a> for letting us use their excellent translation editor</p>',
			'<h3>Witcher 3 Assets</h3>',
			'<p>The Witcher 3, logo, icons, map &amp; text are the property of <a href="http://en.cdprojektred.com/" target="_blank">CD PROJEKT RED</a> and used without permission. Non commercial use is permitted under section 9.4 of their <a href="http://bar.cdprojektred.com/regulations/" target="_blank">User Agreement</a></p>',
			'<h3>Javascript libraries used</h3>',
			'<ul>',
				'<li><a href="http://jquery.com" target="_blank">jQuery</a> (MIT)</li>',
				'<li><a href="http://git.io/vkLly" target="_blank">jQuery.NiceScroll</a> (MIT)</li>',
				'<li><a href="http://leafletjs.com" target="_blank">Leaflet</a> (BSD2)</li>',
				'<li><a href="http://git.io/vkfA2" target="_blank">Leaflet.label</a> (MIT)</li>',
				'<li><a href="http://git.io/mwK1oA" target="_blank">Leaflet-hash</a> (MIT)</li>',
				'<li><a href="http://git.io/vJw5v" target="_blank">Leaflet.fullscreen</a> (BSD2)</li>',
				'<li><a href="http://git.io/vkCPC" target="_blank">Leaflet Control Search</a> (MIT)</li>',
				'<li><a href="http://git.io/vIAs2" target="_blank">Font Awesome</a> (MIT)</li>',
			'</ul>'
		].join('\n'));
	});

	setTimeout(function() {
		$('ul.key:not(.controls) li:not(.none) i').each(function(i, e) {
			var key = $(this).attr('class');
			key = $.t("sidebar." + key);
			var tooltip = $("<span class='tooltip'>" + key + "</span>");

			var ellipsis = $(this).next();
			if(ellipsis.outerWidth() < ellipsis[0].scrollWidth) {
				$(this).parent().mousemove(function(e) {
					var x = e.clientX,
					y = e.clientY;

					// calculate y-position to counteract scroll offset
					var offset = $("#logo").offset();
					y = y - offset.top;

					tooltip.css('top', (y + 15) + 'px');
					tooltip.css('left', (x + 15) + 'px');
					tooltip.css('display', 'block');
				}).mouseleave(function() {
					tooltip.css('display', 'none');
				});
			}

			$("#sidebar-wrap").append(tooltip);
	  });
		$('ul.controls li:not(.none) i').each(function(i, e) {
			var key = $(this).next().text();
			var tooltip = $("<span class='tooltip'>" + key + "</span>");

			var ellipsis = $(this).next();
			if(ellipsis.outerWidth() < ellipsis[0].scrollWidth) {
				$(this).parent().mousemove(function(e) {
					var x = e.clientX,
					y = e.clientY;

					// calculate y-position to counteract scroll offset
					var offset = $("#logo").offset();
					y = y - offset.top;

					tooltip.css('top', (y + 15) + 'px');
					tooltip.css('left', (x + 15) + 'px');
					tooltip.css('display', 'block');
				}).mouseleave(function() {
					tooltip.css('display', 'none');
				});
			}

			$("#sidebar-wrap").append(tooltip);
		});
	}, 100);

	var fileSaver = null;
	var backupData = function() {
		var currentDate = new Date();
		var formattedDate = currentDate.getFullYear()+'-'+((currentDate.getMonth()+1 < 10) ? '0' : '')+(currentDate.getMonth()+1)+'-'+((currentDate.getDate() < 10) ? '0' : '')+currentDate.getDate();
		var backupFileName = 'witcher3map_backup_'+formattedDate+'.json';
		if (confirm($.t('controls.backupSave', {fileName:backupFileName}))) {
			if(!fileSaver) {
				fileSaver = $.getScript('../files/js/FileSaver.min.js', function() {
					var blob = new Blob([JSON.stringify(localStorage)], {type: "text/plain;charset=utf-8"});
					saveAs(blob, backupFileName);
				});
			}
		}
	};
	var showRestore = function() {
		if (!window.File && !window.FileReader && !window.FileList && !window.Blob) {
			alert($.t('controls.backupHtmlFail'));
			return;
		}
		if($('#restoreDiv').length) return;
		var restoreButtonPos = $('#restoreButton')[0].getBoundingClientRect();
		var restoreDiv = '<div id="restoreDiv" style="top:'+restoreButtonPos.top+'px;right:'+(14+restoreButtonPos.right-restoreButtonPos.left)+'px;"><div style="float:right;"><button class="fa fa-times-circle" onclick="$(\'#restoreDiv\').remove()" style="cursor:pointer" /></div><strong>' + $.t('controls.backupLoad') + '</strong><br/><input type="file" id="files" name="file[]" /></div>';
		$('body').append($(restoreDiv));
		var filesInput = document.getElementById('files');
		filesInput.addEventListener('change', function(e) {
			var file = e.target.files[0];
			var reader = new FileReader();
			reader.onload = function(e) {
				var content = e.target.result;
				try {
					var restoreData = $.parseJSON(content);
					console.log('restore started.');
					for(var prop in restoreData) {
						console.log('restoring property:'+prop+' using value:'+restoreData[prop]);
						localStorage[prop] = restoreData[prop];
					}
					console.log('restore complete!');
					alert($.t('controls.backupLoadSuccess'));
					location.reload();
				} catch(err) {
					alert($.t('controls.backupLoadFail'));
					console.log(err.message);
				} finally {
					$('#restoreDiv').remove();
				}
			};
			reader.readAsText(file);
		});
	};

	var backupButton = L.easyButton('fa-floppy-o', function(btn, map) {
		backupData();
	}, 'Backup Data');
	var restoreButton = L.easyButton('fa-upload', function(btn, map) {
		showRestore();
	}, 'Restore Data', 'restoreButton');
	L.easyBar([backupButton, restoreButton]).addTo(map);

	var noteMarkerList = {};
	var noteStatus = false;
	var noteCursorCss = null;
	L.easyButton('fa-book', function(btn, map) {
		if(!noteStatus) startNote();
		else endNote();
	}, 'Add Note', 'noteButton').addTo(map);

	L.easyButton('fa-crosshairs', function(btn, map) {
		hashParams = hash.getHashParams();
		if(hashParams && hashParams.m) {
			var hashMarker = hashParams.m.split(",");
			map.setView([hashMarker[0], hashMarker[1]]);
		} else {
			map.setView(map_center);
		}
	}, 'Center Highlighted Marker', 'centerButton').addTo(map);

	window.getNoteKey = function (latlng) {
		return map_path + '-' + latlng.lat.toFixed(3) + '_' + latlng.lng.toFixed(3);
	};

	var startNote = function() {
		console.log('starting note');
		noteStatus = true;
		noteCursorCss = $('.leaflet-container').css('cursor');
		$('.leaflet-container').css('cursor', 'crosshair');
		map.addEventListener('click', addNote);
	};

	window.updateNote = function(key) {
		var note = {
			label: $('#note-'+key+'-label').val(),
			title: $('#note-'+key+'-title').val(),
			text: $('#note-'+key+'-text').val()
		}
		var marker = noteMarkerList[key];
		marker.bindLabel(note.label);
		marker.bindPopup(getNotePopup(key, note));
		noteMarkerList[key] = marker;
		console.log('update note done.');
	};

	window.deleteNote = function(key) {
		map.removeLayer(noteMarkerList[key]);
		delete noteMarkerList.key;
		popupClose();
		console.log('note deleted');
	};

	var getNotePopup = function(key, note) {
		note = note || {label:'',title:'',text:''};
		var popupContent =  "<div><span class=\"label\">Label:</span><input type=\"text\" id=\"note-"+key+"-label\" placeholder=\"Enter map label...\" value=\""+note.label+"\" /></div>";
		popupContent += "<div><span class=\"label\">Title:</span><input type=\"text\" id=\"note-"+key+"-title\" placeholder=\"Enter note title...\" value=\""+note.title+"\" /></div>";
		popupContent += "<div><span class=\"label top\">Note:</span><textarea id=\"note-"+key+"-text\" placeholder=\"Enter your note...\">"+note.text+"</textarea></div>"; //You clicked on the map at " + e.latlng.toString()+"
		popupContent += "<br/><button onclick=\"updateNote('"+key+"')\"><i class=\"fa fa-floppy-o\"></i>&nbsp;Save Note</button>";
		popupContent += "<button onclick=\"deleteNote('"+key+"')\"><i class=\"fa fa-trash-o\"></i>&nbsp;Delete Note</button>";
		return popupContent;
	};

	var addNote = function(e) {
		var key = getNoteKey(e.latlng);
		var noteMarker = L.marker(e.latlng, setMarker(icons['add_marker'])).bindLabel('New Note').bindPopup(getNotePopup(key)).openPopup();
		noteMarker.addTo(map);
		noteMarkerList[key] = noteMarker;
		endNote();
		return false;
	};

	var endNote = function() {
		console.log('stopping note');
		noteStatus = false;
		$('.leaflet-container').css('cursor', noteCursorCss);
		map.removeEventListener('click');
	};

	var hashParams = hash.getHashParams();
	if(hashParams) {
		if(hashParams.w) {
			var hashWayPoint = hashParams.w.split(",");
			wayPoint = new L.marker(L.latLng(hashWayPoint[0], hashWayPoint[1]), {
				icon : L.icon({
					iconUrl  : '../files/img/icons/waypoint.png',
					iconSize : [26, 32]
				})
			}).on('click', function() {
				map.removeLayer(wayPoint);
				hash.removeParam('w');
			}).on('contextmenu', function() {
				map.removeLayer(wayPoint);
				hash.removeParam('w');
			}).addTo(map);
		}
		if(hashParams.m) {
			var hashMarker = hashParams.m.split(",");
			$.each(allLayers, function(key, val) {
				$.each(val.getLayers(), function(key, marker) {
					if(hashMarker[0] == marker._latlng.lat && hashMarker[1] == marker._latlng.lng) {
						marker.openPopup();
					}
				});
			});
		} else {
			$('#centerButton').hide();
		}
	} else {
		$('#centerButton').hide();
	}
});
