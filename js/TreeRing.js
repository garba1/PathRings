(function($P){
	'use strict';

	$P.TreeRing = $P.defineClass(
		$P.BubbleBase,
		function TreeRing(config) {
			this.processingStatus = new PATHBUBBLES.Text(this, "Processing");

			this.expressionLabel = "";

			this.dataName = config.dataName || null;

			this.dataType = config.dataType || null;
			this.selectedData = config.selectedData || null;
			this.experimentType = "Ortholog";
			this.preHierarchical = "";

			this.selected_file = null;

			this._minRatio = config.minRatio || -1.5;
			this._maxRatio = config.maxRatio || 1.5;
			this._crosstalkLevel = config.crosstalkLevel || 1;
			this._file = config.file || null;
			this.displayMode = config.displayMode || 'title';
			this._species = config.species || 'Gallus';
			config.name = config.name || (config.selectedData && config.dataName) || ('Human vs. ' + this._species);
			config.minSize = undefined !== config.minSize ? config.minSize : 'current';
			$.extend(config, {mainMenu: true, closeMenu: true, groupMenu: true});
			$P.BubbleBase.call(this, config);},
		{
			get minRatio() {return this._minRatio;},
			set minRatio(value) {
				if (value === this._minRatio) {return;}
				this._minRatio = value;
				if (this.menu) {this.menu.updateRatio();}},
			get maxRatio() {return this._maxRatio;},
			set maxRatio(value) {
				if (value === this._maxRatio) {return;}
				this._maxRatio = value;
				if (this.menu) {this.menu.updateRatio();}},
			get ratios() {return [this._minRatio, this._maxRatio];},
			set ratios(value) {
				this._minRatio = value[0];
				this._maxRatio = value[1];
				if (this.menu) {this.menu.updateRatio();}},
			get crosstalkLevel() {return this._crosstalkLevel;},
			set crosstalkLevel(value) {
				if (value === this._crosstalkLevel) {return;}
				this._crosstalkLevel = value;
				if (this.menu) {this.menu.crosstalkLevel = value;}
				this.displayMode = 'crosstalk';
				if (this.svg) {this.createSvg({crossTalkLevel: value}, true);}},
			get maxCrosstalkLevel() {
				if (this.svg) {return this.svg.maxLevel;}
				return 6;},
			get species() {return this._species;},
			set species(value) {
				if (value === this._species) {return;}
				this._species = value;
				if (!this.selectedData) {this.title.name = 'Human vs. ' + value;}
				if (this.menu) {this.menu.species = value;}
				if (this.svg) {
					this.createSvg({dataType: value});}},
			get file() {return this._file;},
			set file(value) {
				this._file = value;
				if (this.menu) {
					$(this.menu.element).find('#file').val(this._file);}},
			get displayMode() {return this._displayMode;},
			set displayMode(value) {
				if (this._displayMode == value) {return;}
				this._displayMode = value;
				if (this.menu) {this.menu.updateDisplayMode(value);}
				if (this.svg) {this.svg.displayMode = value;}},
			onAdded: function(parent) {
				if (!$P.BubbleBase.prototype.onAdded.call(this, parent)) {
					this.createSvg();}},

			/**
			 * (Re)creates the svg component.
			 * @param {object} [config] - optional config paremeters.
			 */
			createSvg: function(config, suppressPropogate) {
				var self = this;
				console.log('Creating D3 Tree Ring', config);
				// Propagate changes.
				if (!suppressPropogate) {
					this.links.forEach(function(link) {
						var target = link.target.object;
						if (target === self) {return;}
						if (target instanceof $P.TreeRing) {target.createSvg(config);}});}

				var actual_config = Object.create(this.svg || null); // Automatically use parameters from existing svg.
				if (!this.dataType) {this.dataType = 'Gallus';}
				$.extend(actual_config, {
					defaultRadius: Math.min(this.w, this.h) - 30,
					dataType: this.dataType});
				if (this.dataName) {actual_config.name = this.dataName;}
				if (this.selectedData) {actual_config.selectedData = this.selectedData;}
				actual_config = $.extend(actual_config, this.getInteriorDimensions());
				actual_config.x += 8;
				actual_config.y += 8;
				actual_config.w -= 16;
				actual_config.h -= 16;
				actual_config = $.extend(actual_config, config);
				if (this.svg) {this.svg.delete();}
				actual_config.parent = this;
				this.svg = new $P.D3TreeRing(actual_config);
				this.svg.init();},
			/**
			 * Removes the svg component.
			 */
			deleteSvg: function() {
				this.svg.delete();
				this.svg = null;},
			createMenu: function() {
				this.menu = new $P.TreeRing.Menu({parent: this});},
			addStatusElement: function () {
				var e = document.getElementById('status');
				if (e === null) {
					e = document.createElement("div");
					e.id = 'status';
				}
				else
					e.style.display = 'block';
				e.style.position = "absolute";
				e.style.fontWeight = 'bold';
				e.style.fontSize = "1.2em";
				e.style.color = "#f00";
				e.style.width = "100%";
				e.style.zIndex = 1000;
				e.innerHTML = "Processing ...";
				return e;
			},

			receiveEvent: function(event) {
				if ('reactionDrag' == event.name && this.contains(event.x, event.y)) {return this;}
				return $P.BubbleBase.prototype.receiveEvent.call(this, event);},

			drawSVG: function() {
				var space = 6; // leave 6 space for tree ring
				$('#svg' + this.id).css({
					width: this.w - 10 - space,
					height: this.h - 10 - space,
					left: this.x + this.w / 2 - this.treeRing.defaultRadius / 2 - 10 + space / 2,
					top: this.y + this.h / 2 - this.treeRing.defaultRadius / 2 + 50 - 20 + space / 2
				});
			},
			drawExtra: function(ctx, scale) {this.processingStatus.draw(ctx, this.x+this.w/2, this.y+this.h/2);}
		});

	$P.TreeRing.Menu = $P.defineClass(
		$P.HtmlMenu,
		function TreeRingMenu(config) {
			var i, tmp, menu, bubble, element;
			tmp = '';

			tmp += '<div style="border: 1px solid #bbb; margin: 1px 1px 0; padding: 2%;">';
			tmp +=   '<div style="width: 100%; font-weight: bold;">Display</div>';
			tmp +=   '<hr/>';

			tmp +=   '<div style="display: inline; font-size: 85%; margin: auto 5% auto 0;">Species:</div>';
			tmp +=   '<select id="selectSpecies" style="display: inline-block;">';
			this.getSpeciesList().forEach(function(species) {
				tmp += '<option value="' + species + '">' + species + '</option>';});
			tmp +=   '</select>';
			tmp +=   '<br/>';

			tmp +=   '<div>';
			tmp +=     '<form style="display: inline-block;">';
			tmp +=       '<input id="showTitle" type="radio" name="displayMode" value="title" checked  style="vertical-align: middle;"/>';
			tmp	+=       '<label for="showTitle" style="font-size: 85%;">  Pathway Names</label><br/>';
			tmp +=       '<input id="showCrosstalk" type="radio" name="displayMode" value="crosstalk" style="vertical-align: middle;"/>';
			tmp	+=       '<label for="showCrosstalk" style="font-size: 85%;">  Crosstalk</label><br/>';
			tmp +=     '</form>';
			tmp +=     '<div style="display: inline; font-size: 90%; margin: auto;">Level: </div>';
			tmp +=     '<select id="crosstalkLevel" style="display: inline-block;">';
			for (i = 1; i <= config.parent.maxCrosstalkLevel; ++i) {
				tmp += '<option value="' + i + '">' + i + '</option>';}
			tmp +=     '</select>';
			tmp +=   '</div>';
			tmp += '</div>';

			tmp += '<div style="border: 1px solid #bbb; border-top-style: none; margin: 0 1px 1px; padding: 2%;">';
			tmp +=   '<div style="width: 100%; font-weight: bold;">Load File</div>';
			tmp +=   '<hr/>';

			tmp +=   '<label for="orthologFile" style="font-size: 85%; margin: 6px 0; display: inline-block; vertical-align: -4px; float: left; width: 80px;">Ortholog:</label>';
			tmp +=   '<div style="display: inline; float: left; width: 90px; overflow: hidden; margin: 2px;">';
			tmp +=     '<input type="file" id="orthologFile" style="width: 300px;"/>';
			tmp +=   '</div>';
			tmp +=   '<br style="display: table; clear: both;"/>';

			tmp +=   '<label for="expressionFile" style="font-size: 85%; margin: 6px 0; vertical-align: -3px; float: left; width: 80px;">Expression:</label>';
			tmp +=   '<div style="display: inline; float: left; width: 90px; overflow: hidden; margin: 2px;">';
			tmp +=     '<input type="file" id="expressionFile" style="width: 300px;"/>';
			tmp +=   '</div>';
			tmp +=   '<br style="display: table; clear: both;"/>';
			tmp +=   '<div>';
			tmp +=     '<div id="expressionRatios" style="range: false; font-size: 70%; margin: 10px 0;"/>';
			tmp +=   '</div>';
			tmp +=   '<br style="display: table; clear: both;"/>';

			tmp +=   '<div style="font-size: 80%; display: inline; margin: auto 0;">log₂(ratio): </div>';
			tmp +=   '<input id="minRatio" type="text" style="font-size: 70%; display: inline-block; width: 20%; text-align: center;"/>';
			tmp +=   '<div style="font-size: 80%; display: inline;  margin: auto 0;"> … </div>';
			tmp +=   '<input id="maxRatio" type="text" style="font-size: 70%; display: inline-block; width: 20%; text-align: center;"/>';
			tmp +=   '<input id="updateRatio" type="button" value="Update" style="margin-left: 35px; font-size: 70%; margin: auto 5px;"/>';
			tmp +=   '<br/>';

			tmp += '</div>';
			//tmp += '<br style="display: table; clear: both;"/>';

			config.menuString = tmp;
			config.w = 260;
			//config.h = 300;
			$P.HtmlMenu.call(this, config);

			menu = this;
			bubble = this.parent;
			element = $(this.element);

			element.find('input[type=radio][name=displayMode]').change(function() {
				bubble.displayMode = this.value;});

			this.species = bubble.species;
			element.find('#selectSpecies').change(function() {
				bubble.species = $(this).val();});

			element.find('#crosstalkLevel').change(function () {
				bubble.crosstalkLevel = $(this).val();});
			element.find('#crossTalkLevel').val(bubble.crossTalkLevel);

			element.find('#orthologFile').change(function() {menu.loadOrtholog();});
			element.find('#expressionFile').change(function() {menu.loadExpression();});
			element.find('#expressionRatios').tickslider({
				range: true,
				min: -6,
				max: 6,
				step: 0.1,
				tick: 1,
				values: [-1.5, 1.5],
				slide: function(event, ui) {
					bubble.minRatio = ui.values[0];
					bubble.maxRatio = ui.values[1];}});
			element.find('#minRatio').change(function() {
				bubble.minRatio = $(this).val();});
			element.find('#maxRatio').change(function() {
				bubble.maxRatio = $(this).val();});
			element.find('#updateRatio').on('click', function() {menu.loadExpression();});

			this.updateRatio();
			this.updateDisplayMode(bubble.displayMode);
			this.onPositionChanged();},
		{
			updateDisplayMode: function(displayMode) {
				var element = $(this.element),
						button;
				element.find('#showTitle').prop('checked', 'title' === displayMode);
				element.find('#showCrosstalk').prop('checked', 'crosstalk' === displayMode);
			},
			updateRatio: function() {
				var element = $(this.element),
						bubble = this.parent;
				element.find('#expressionRatios').tickslider('values', [bubble.minRatio, bubble.maxRatio]);
				element.find('#minRatio').val(bubble.minRatio);
				element.find('#maxRatio').val(bubble.maxRatio);},
			getSpeciesList: function() {
				var list = ['Gallus', 'Alligator', 'Turtle', 'Human', 'Mouse'];
				list.sort();
				return list;},
			set species(value) {
				$(this.element).find('#selectSpecies').val(value);},
			set crosstalkLevel(value) {
				$(this.element).find('#crosstalkLevel').val(value);},
			loadOrtholog: function() {
				var menu = this,
						bubble = this.parent,
						element = $(this.element),
						file = element.find('#orthologFile').get(0).files[0],
						loader;
				bubble.selectedFile = file;
				bubble.orthologFile = file;
				if (!file) {
					alert('Please select your Ortholog data file!');
					return;}

				loader = new $P.FileLoader('Ortholog');
				loader.load(bubble.selectedFile, function (orthologData) {
					var config = {
						customOrtholog: orthologData,
						dataType: bubble.species};
					bubble.orthologLabel = bubble.selectedFile.name;
					bubble.experimentType = 'Ortholog';
					bubble.createSvg(config);});},
			loadExpression: function() {
				var menu = this,
						bubble = this.parent,
						file = $(this.element).find('#expressionFile').get(0).files[0],
						loader;

				if (file) {
					bubble.selectedFile = file;
					bubble.expressionFile = file;}
				else if (bubble.expressionFile) {
					file = bubble.expressionFile;
					bubble.selectedFile = bubble.expressionFile;}
				else {
					alert('Please select your Expression data file!');
					return;}

				loader = new $P.FileLoader('Expression');
				loader.load(bubble.selectedFile, function (expressionData) {
					var config = {
						dataType: bubble.species,
						customExpression: expressionData};
					bubble.expressionLabel =  bubble.selectedFile.name;
					bubble.experimentType = 'Expression';
					bubble.createSvg(config);});},
			onPositionChanged: function (dx, dy, dw, dh) {
				$P.HtmlMenu.prototype.onPositionChanged.call(this, dx, dy, dw, dh);
			}});
})(PATHBUBBLES);
