/*
	Költségvetés vizualizáció
	Copyright (C) 2019 DeepData Ltd.
*/

// CONFIGURATION SECTION

var
	YEAR = document.body.dataset.year,
	BUDG_FILE = '/' + YEAR + '/budget.csv',
	ECON_FILE = '/' + YEAR + '/economies.csv',
	FUNC_FILE = '/' + YEAR + '/functions.csv',
	ECON_MILESTONES_FILE = '/' + YEAR + '/economies_milestones.csv',
	FUNC_MILESTONES_FILE = '/' + YEAR + '/functions_milestones.csv',
	colors = [
		'#f7981d' /* 01 Általános közszolgáltatások */,
		'#5c628f' /* 02 Védelem */,
		'#ee2a7b' /* 03 Közrend és közbiztonság */,
		'#254478' /* 04 Gazdasági ügyek */,
		'#d32027' /* 05 Környezetvédelem */,
		'#5c9ad2' /* 06 Lakásépítés és kommunális létesítménye */,
		'#e5960a' /* 07 Egészségügy */,
		'#70ac45' /* 08 Szabadidő, sport, kultúra, vallás */,
		'#4971b6' /* 09 Oktatás */,
		'#bb208a' /* 10 Szociális védelem */,
		'#ef538c' /* 9000 Technikai funkciókódok */,
	]
	;

// DO NOT MODIFY BELOW THIS LINE
// ----------------------------------------------------------------------------

// INIT

function pc(n) { return n + '%'; }

var
	ECON = {},
	FUNC = {},
	FUNC_COLORS = {},
	MODE_FUNC = 0,
	MODE_ECON = 1,
	ECON_MILESTONES = {},
	FUNC_MILESTONES = {},
	VM = new Vm()
	;

$(function () {
	$('#mode-switcher-left').children().clone().appendTo('#mode-switcher-right');

	ko.applyBindings(VM, document.getElementById("htmlTop"));
	loadData();

	refreshWidths();
	var resizeTimer;
	$(window).resize(function () {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(refreshWidths, 100);
	});
});

// CLASSES

function Category(id, name) {
	var self = this;
	self.id = id;
	self.name = name;
}

function Node(name, value, children) {
	var self = this;

	self.name = name ? name : '<anon>';
	self.value = value ? value : 0;
	self.children = children ? children.sort(function (a, b) { return b.value - a.value; }) : [];

	self.update = function () {
		if (self.children && self.children.length > 0) {
			self.children = children.sort(function (a, b) { return b.value - a.value; });
			self.value = 0;
			self.children.forEach(function (child) {
				child.update();
				self.value += child.value;
			});
		}
	};

	self.update();
} // node

function Vm() {
	var self = this;

	// DATA

	self.mode = ko.observable();
	self.loading = ko.observable(true);

	// layer 0: original nodes
	self.nodes = ko.observableArray();
	self.root = ko.observable(rootNode([]));
	self.total = ko.computed(function () {
		return self.root().value;
	});

	// layer N: visible nodes
	self.stack = ko.observableArray([self.root()]);
	self.stackTop = ko.computed(function () {
		return self.stack()[self.stack().length - 1];
	});
	self.visibleNodes = ko.computed(function () {
		return self.stackTop().children.filter(function (it) { return it.value > 0 });
	});
	self.subTotal = ko.computed(function () {
		return self.stackTop().value;
	});
	self.menu = ko.computed(function () {
		return self.stack()[0].children.filter(function (it) { return it.value > 0 });
	});

	// auto updating
	self.nodes.subscribe(function (newNodes) {
		self.root(rootNode(newNodes));
	});

	// UTLITY

	self.max = ko.computed(function () {
		var m = 0;
		self.visibleNodes().forEach(function (n) { m = n.value > m ? n.value : m; });
		return m;
	});

	self.sum = ko.computed(function () {
		var s = 0;
		self.visibleNodes().forEach(function (n) { s += n.value; });
		return s;
	});

	self.sumTill = function (i) {
		var s = 0;
		self.visibleNodes().forEach(function (n, j) { if (j < i) s += n.value; });
		return s;
	}

	// VIS

	self.svgWidth = ko.observable(0);
	self.labelWidthPx = ko.observable(0);
	self.barWidth = ko.computed(function () {
		return Math.min(1000, self.svgWidth()) * 0.04; // max 40
	});
	self.curveWidth = ko.computed(function () {
		return Math.min(900, self.svgWidth()) / 100; //  max 9
	});
	self.backBarWidth = ko.computed(function () {
		return (self.svgWidth() != 0) ? self.barWidth() / (self.svgWidth() / 200) : 0;
	});
	self.labelX = ko.computed(function () { return self.barWidth() + self.curveWidth() + 1 });
	self.labelWidth = ko.computed(function () { return 100 - self.labelX() });
	self.labelMaxLen = ko.computed(function () { return self.labelWidthPx() / 10; });

	self.backBarWidthPc = ko.computed(function () { return pc(self.backBarWidth()) });
	self.barWidthPc = ko.computed(function () { return pc(self.barWidth()) });
	self.curveWidthPc = ko.computed(function () { return pc(self.curveWidth()) });
	self.curveXPc = ko.computed(function () { return self.barWidthPc() })
	self.labelWidthPc = ko.computed(function () { return pc(self.labelWidth()) });
	self.labelXPc = ko.computed(function () { return pc(self.labelX()) });

	self.barHeight = function (node) {
		return node.value / self.sum() * 100 + '%';
	};

	self.barY = function (index) {
		return self.sumTill(index) / self.sum() * 100 + '%';
	};

	self.barYMiddle = function (node, index) {
		return (self.sumTill(index) + node.value / 2) / self.sum() * 100 + '%';
	};

	self.color = function (node) {
		return self.stack().length > 1
			? self.colorOfParent()
			: self.colorById(node.id);
	}

	self.colorById = function (id) {
		var ids = self.stack()[0].children.map(function (n) { return n.id }).sort();
		var index = ids.indexOf(id);
		return colors[index % colors.length];
	}

	self.colorOfParent = ko.observable();

	self.cursor = ko.observable();

	self.curveD = function (node, index) {
		var
			x1 = 0,
			y1 = self.barYMiddle(node, index).slice(0, -1),
			x2 = 100,
			y2 = self.labelY(node, index).slice(0, -1),
			cx1 = 25,
			cx2 = 50,
			m = x1 + ',' + y1,
			c1 = cx1 + ',' + y1,
			c2 = cx2 + ',' + y2,
			e = x2 + ',' + y2,
			d = 'M' + m + ' C' + c1 + ' ' + c2 + ' ' + e;
		return d;
	};

	self.hasSelected = function () {
		return self.stack().length > 1;
	}

	self.isSelected = function (id) {
		return self.hasSelected() && self.stack()[1].id == id;
	}

	self.menuItemPadding = function (node) {
		const min = 0;
		const max = 75;
		const pc = node.value / self.total();
		return min + pc * (max - min) + 'px 10px';
	}

	self.label = function (name) {
		var len = self.labelMaxLen();
		return (len < name.length) ? name.substr(0, len) + '…' : name;
	}

	self.labelY = function (node, index) {
		return (index + 0.5) / self.visibleNodes().length * 100 + '%';
	};

	self.opacity = function (node, index) {
		return self.stack().length == 1 ? 1.0 : node.value / self.max() * 0.7 + 0.2;
	}

	// NAV

	self.down = function (node, skipHistory) {
		if (node.children && node.children.length > 0) {
			if (self.stack().length == 1) {
				self.colorOfParent(self.color(node));
			}
			self.stack.push(node);
			if (true !== skipHistory) {
				history.pushState(null, null, '#' + location.hash.replace('#', '') + '/' + node.id);
			}
		}
	}

	self.from = function (node) {
		self.upTill(0, true); // no history manipulation
		self.down(node);
		history.replaceState(null, null, '#' + self.mode() + '/' + node.id)
		refreshWidths();
	}

	self.up = function (skipHistory) {
		if (self.stack().length > 1) {
			self.stack.pop();
			if (self.stack().length == 1) {
				self.colorOfParent(null);
			}
			if (true !== skipHistory) {
				var h = location.hash.split('/')
				h.pop();
				history.pushState(null, null, h.join('/'))
			}
		}
	}

	self.upTill = function (i, skipHistory) {
		var h = location.hash.split('/')
		while (self.stack().length > i + 1) {
			self.up(true); // we manage it, and push only one state at the end
			h.pop()
		}
		if (true !== skipHistory) {
			history.pushState(null, null, h.join('/'))
		}
	}

	self.switchMode = function () {
		self.upTill(0, false);
		self.mode(self.mode() == MODE_ECON ? MODE_FUNC : MODE_ECON);
		showMode(self.mode());
		history.replaceState(null, null, '#' + self.mode());
	}

	// milestone
	self.milestones = ko.observable({});
	self.milestone = ko.computed(function () {
		var id = (self.stack().length == 1) ? "!" : self.stack()[1].id;
		var m = self.milestones()[id];
		return (typeof m !== 'undefined') ? m : { compare: '', image: '', title: '', text: '' };
	});

	// landing
	var w = window.location.href.indexOf('nowelcome') === -1;
	self.showOverlay = ko.observable(w);
	self.showWelcome = ko.observable(w);
	self.showHint = ko.observable(false);
	self.overlayHole = ko.observable({ x: 0, y: 0, width: 0, height: 0 });
	self.closeWelcome = function () {
		refreshWidths();
		$(window).scrollTop(0);
		self.showWelcome(false);
		var items = $('#total');
		if (items.length > 0) {
			var item = $(items[0]);
			var pos = item.position();
			var add = 10; // adding some border
			var rxOut = 20; // making left side go out the screen, to hide left side rounded corners
			self.overlayHole({
				x: pos.left - rxOut,
				y: pos.top - add,
				width: item.outerWidth() + add + rxOut,
				height: item.outerHeight() + (2 * add)
			});
			self.showHint(true);
		} else {
			self.showOverlay(false);
		}
	}
	self.overlayClick = function () {
		self.showOverlay(false);
		self.showHint(false);
		self.showAbout(false);
	}

	self.showAbout = ko.observable(false);
	self.clickAbout = function () {
		self.overlayHole({ x: 0, y: 0, width: 0, height: 0 });
		self.showOverlay(true);
		self.showAbout(true);
	}
	self.closeAbout = function () {
		self.showOverlay(false);
		self.showAbout(false);
	}

} // vm

// FUNCTIONS

function addOrInc(object, key, value) {
	if (!object[key]) object[key] = 0;
	object[key] += value;
}

function finalizeLoading() {
	VM.mode(MODE_FUNC);
	showMode(MODE_FUNC);
	VM.loading(false);

	readPath();
	window.addEventListener('popstate', readPath);
}

function generateColors() {

	function saveColor(func, color) {
		$.each(func.children, function (i, child) {
			FUNC_COLORS[child.id] = color;
			saveColor(child, color);
		});
	}

	const ids = Object.keys(FUNC).sort();
	for (var i = 0; i < ids.length; i++) {
		const id = ids[i];
		const color = colors[i++ % colors.length];
		FUNC_COLORS[id] = color;
		saveColor(FUNC[id], color);
	}
}

function groupNums(v) {
	return (v + '').replace(/\d(?=(?:\d{3})+(?:\.|$))/g, function ($0, i) { return $0 + ' ' });
}

function huf(v) {
	return groupNums(v) + ' Ft';
}

function loadData() {
	VM.loading(true);
	$.when(
		$.get(BUDG_FILE),
		$.get(ECON_FILE),
		$.get(FUNC_FILE),
		$.get(ECON_MILESTONES_FILE),
		$.get(FUNC_MILESTONES_FILE)
	).then(function (b, e, f, em, fm) {
		loadFlatTree(b[0]);
		loadTreeData(e[0], ECON);
		loadTreeData(f[0], FUNC);
		loadMilestones(em[0], ECON_MILESTONES);
		loadMilestones(fm[0], FUNC_MILESTONES);
		generateColors();
		finalizeLoading();
	}).fail(function (f1) {
		console.log('ERR', f1);
	});
}

function loadFlatTree(csv) {
	/*
		CSV structure:
		line 0: ECON ID
		line 1: ECON TITLE
		col 0: FUNC ID
		col 0: FUNC TITLE
		cell i>1, j>1: VALUE
	*/

	// read CSV
	var data = Papa.parse(csv, {
		dynamicTyping: true,
		header: false, // let's handle manually this time
		skipEmptyLines: true
	}).data;

	// convert to JSON
	var econ = data[0], budget = [];
	for (var y = 0; y < data.length; y++) {
		var func = data[y][0];
		for (var x = 2; x < data[y].length; x++) {
			if (2 <= y) {
				budget.push({
					econ_id: econ[x],
					func_id: func,
					value: Number((data[y][x] || '').toString().replace(/\D+/g, ''))
				});
			}
		}
	}
	console.log(budget[0]);

	$.each(budget, function (k, v) {
		addOrInc(ECON, v.econ_id, Number(v.value));
		addOrInc(FUNC, v.func_id, Number(v.value));
	});

	mapToNode(ECON);
	mapToNode(FUNC);
}

function loadTreeData(csv, TREE) { // data is CSV: id, value, parent_id

	// 0. parsing CSV
	var data = Papa.parse(csv, {
		dynamicTyping: true,
		header: true,
		skipEmptyLines: true,
		trimHeader: true
	}).data;

	// 1. updating nodes with label and parent_id
	$.each(data, function (k, v) {
		if (!TREE[v.id]) TREE[v.id] = new Node('', 0, []);
		TREE[v.id].name = v.value.trim();
		TREE[v.id]['parent_id'] = v.parent_id;
		TREE[v.id]['id'] = v.id;
	});

	// 2. building up children arrays
	$.each(TREE, function (k, v) {
		if (TREE[v.parent_id]) {
			TREE[v.parent_id].children.push(v);
			TREE[v.parent_id].update();
		} else {
			v.parent_id = null;
		}
	});

	// 3. remove non-root elements
	$.each(TREE, function (k, v) {
		if (null != v.parent_id) delete TREE[k];
	});
}

function loadMilestones(csv, obj) {
	var data = Papa.parse(csv, {
		dynamicTyping: true,
		header: true,
		skipEmptyLines: true,
		trimHeader: true
	}).data;
	$.each(data, function (k, v) {
		obj[v.id] = {
			compare: v['text 1'],
			image: "url('" + v.picture + "')",
			text: v.description,
			title: v.title
		}
	});
}

function mapToNode(object) {
	Object.keys(object).map(function (k) {
		object[k] = new Node('', object[k], []);
	});
}

function readPath() {
	// location.hash: '' or '#mode/id1/id2'
	const h = location.hash.replace('#/', '').replace('#', '').replace(/\/$/, '') // '' or 'mode/id1/id2'
	const parts = h.split('/');
	const mode = parts[0];
	if (mode != MODE_ECON && mode != MODE_FUNC) mode = VM.mode();
	if (mode != VM.mode()) {
		VM.mode(mode);
		showMode(mode);
	}

	const ids = parts.slice(1);
	if ('' == h || ids.length == 0) VM.upTill(0, true) // no history manipulation
	else {
		var validIds = [];
		for (var i = 0; i < ids.length; i++) {
			const id = ids[i];
			const node = VM.stack()[i].children.filter(function (it) { return it.id == id })[0] // undefined if not found
			if (node) {
				if (VM.stack().length <= i || VM.stack()[i].id != id) {
					VM.upTill(i, true) // no history manipulation
					VM.down(node, true) // no history manipulation
					validIds.push(id);
				}
			} else console.log('node not found:', id)
		}
		history.replaceState(null, null, '#' + VM.mode() + '/' + validIds.join('/'))
		refreshWidths();
	}
}

function refreshWidths() {
	VM.svgWidth($('#svg-container').width());

	var lw = VM.svgWidth() * (1 - VM.labelX() / 100);
	VM.labelWidthPx(lw);
}

function rootNode(children) {
	return new Node('Teljes költségvetés', 0, children);
}

function showMode(MODE) {
	showTree(MODE == MODE_FUNC ? FUNC : ECON);
	VM.milestones(MODE == MODE_FUNC ? FUNC_MILESTONES : ECON_MILESTONES);
}

function showTree(TREE) {
	VM.nodes([]);
	$.each(TREE, function (k, v) { v.update(); VM.nodes.push(v); });
	VM.stack([VM.root()]);
}

function shuffle(a) {
	var j, x, i;
	for (i = a.length - 1; i > 0; i--) {
		j = Math.floor(Math.random() * (i + 1));
		x = a[i];
		a[i] = a[j];
		a[j] = x;
	}
}

function sumChildren(node) {
	if (node.children && node.children.length > 0) {
		var s = 0;
		node.children.forEach(function (n) {
			s += sumChildren(n);
		});
		return s;
	} else {
		return node.value ? node.value : 0;
	}
}

// SAFARI FIX...

if (!Math.trunc) {
	Object.defineProperty(Math, "trunc", {
		value: function (val) {
			return val < 0 ? Math.ceil(val) : Math.floor(val);
		}
	});
}