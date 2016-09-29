/**
 * Autofire | Game Analytics | http://autofire.io
 * JavaScript Web SDK
 * @version v0.4 - 2016-09-29
 * @link https://github.com/autofireio/JavaScriptWebSDK
 * @author jkourou <john@autofire.io>
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */
var Autofire = typeof Autofire != 'undefined' ? Autofire : {};

Autofire._helpers = {

	lsExists: function() {
		var test = 'test';
		try {
			localStorage.setItem(test, test);
			localStorage.removeItem(test);
			return true;
		} catch(e) {
			return false;
		}
	},

	persistenceRead: function(key, prefix) {
		var prefix = typeof prefix !== 'undefined' ? prefix : false;

		// return cookie by name if exists
		function getCookie(name) {
			var re = new RegExp(name + "=([^;]+)");
			var value = re.exec(document.cookie);
			return (value != null) ? unescape(value[1]) : null;
		}

		if (this.lsExists() === true) {
			if (prefix) {
				var cachedBatchesKeys = [];
				for (var i = 0; i < localStorage.length; i++) {
					if (localStorage.key(i).indexOf(key) != -1) {
						cachedBatchesKeys.push(localStorage.key(i));
					}
				}
				return cachedBatchesKeys;
			} else if (localStorage.getItem(key) !== null)
				return localStorage.getItem(key);
			else
				return false;
		} else {
			if (prefix) {
				var cookies = document.cookie.split(';');
				var cachedBatchesKeys = [];
				for(var i = 0; i < cookies.length; i++) {
					if (cookies[i].indexOf(key) != -1) {
						var theKey = cookies[i].split('=');
						cachedBatchesKeys.push(theKey);
					}
				}
				document.cookie = cookies.join(';');
			} else if (getCookie(key) !== null)
				return getCookie(key);
			else
				return false;
		}
	},

	persistenceWrite: function(key, data, isJson) {
		var isJson = typeof isJson !== 'undefined' ? isJson : true;

		try {
			if (isJson)
				data = JSON.stringify(data);

			if (this.lsExists() === true)
				localStorage.setItem(key, data);
			else
				document.cookie = key + '=' + data;
			return true;
		} catch(e) {
			return false;
		}
	},

	persistenceDelete: function(key) {
		if (this.lsExists() === true)
			localStorage.removeItem(key);
		else
			document.cookie = key + '=;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
	},

	sendBucket: function(cachedBatchesKeys) {
		var cachedBatch = JSON.parse(this.persistenceRead(cachedBatchesKeys[0]));
		var url = Autofire._settings.serviceURL;
		var data = {
			header 	: cachedBatch.batch.header,
			events	: cachedBatch.batch.events
		}
		var requestBody = JSON.stringify(data);
		var xhr = new XMLHttpRequest();
		xhr.open('POST', url, true);
		xhr.setRequestHeader('Content-Type', 'application/json');
		xhr.setRequestHeader('X-Autofire-Game-Id', cachedBatch.gameId);
		xhr.setRequestHeader('X-Autofire-Player-Id', cachedBatch.uuid);
		xhr.onload = function(e) {
			if (xhr.readyState === 4) {
				if (xhr.status === 200 || xhr.status === 400 || xhr.status === 404) { // 400 is malformed event. 404 Game Id not found. Remove it as sent.
					Autofire._helpers.persistenceDelete(cachedBatchesKeys[0]);
					cachedBatchesKeys.shift();
					if (cachedBatchesKeys.length > 0)
						Autofire._helpers.sendBucket(cachedBatchesKeys);
					else
						Autofire._core.sending = false;
				} else {
					console.error(xhr.statusText);
					Autofire._core.sending = false;
				}
			}
		};
		xhr.onerror = function(e) {
			console.error(xhr.statusText);
			Autofire._core.sending = false;
		};
		Autofire._core.sending = true;
		xhr.send(requestBody);
	},

	checkBatch: function(force) {
		var force = typeof force !== 'undefined' ? force : false;
		var maxCachedBatches = 10;
		var maxEvents = 3;
		var interval = 600;

		Autofire._core.currentState.totalEvents += 1;

		if (
				force ||
				Autofire._core.currentState.batch.events.length >= maxEvents ||
				this.getCurrentTimestamp(false) -
				Math.floor(Date.parse(Autofire._core.currentState.batch.events[Autofire._core.currentState.batch.events.length - 1][1]) / 1000) >
				interval
			) {

			var storedCurrentBatch = JSON.parse(this.persistenceRead('autofire-current-batch'));
			if (storedCurrentBatch && storedCurrentBatch.batch.events.length > 0)
				this.persistenceWrite(
					'autofire-cached_' + 'batch_' + this.getCurrentTimestamp(false),
					storedCurrentBatch
				);
			if (Autofire._core.currentState.batch.header) // if the header hasn't been initialized (first load of init)
				Autofire._core.currentState.batch.header[1].startLvl = Autofire._core.currentLvl; 	// last level from previous batch
			Autofire._core.currentState.batch.events = [];								 			// empty the events
			this.persistenceWrite('autofire-current-batch', Autofire._core.currentState); 			// save the new current state

			// if the cached batches are more than the maximum allowed
			var cachedBatchesKeys = this.persistenceRead('autofire-cached', true);
			cachedBatchesKeys.sort();
			if (cachedBatchesKeys.length > maxCachedBatches) {
				var oldestbatch = cachedBatchesKeys.shift();
				this.persistenceDelete(oldestbatch);
			}

			if (Autofire._core.sending)
				return false;
			else if (cachedBatchesKeys && cachedBatchesKeys.length > 0)
				this.sendBucket(cachedBatchesKeys);
		}
	},

	getOs: function() {
		var ua = window.navigator.userAgent, tem, M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];

		if (/trident/i.test(M[1])) {
			tem=/\brv[ :]+(\d+)/g.exec(ua) || [];
			return { name:'IE', version:(tem[1] || '') };
		}

		if (M[1] === 'Chrome') {
			tem = ua.match(/\bOPR\/(\d+)/)
			if(tem != null) { return {name:'Opera', version:tem[1]}; }
		}

		M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];

		if ((tem = ua.match(/version\/(\d+)/i)) != null)
			M.splice(1,1,tem[1]);

		return M[0] + ' ' + M[1];
	},

	getModel: function() {
		return window.navigator.platform;
	},

	getLocale: function() {
		return window.navigator.language;
	},

	getCurrentTimestamp: function(iso) {
		if (iso) { // iso date with timezone
			var now = new Date();
			var tzo = -now.getTimezoneOffset();
			var dif = tzo >= 0 ? '+' : '-';
			var pad = function(num) {
				var norm = Math.abs(Math.floor(num));
				return (norm < 10 ? '0' : '') + norm;
			};

			return now.getFullYear()
				+ '-' + pad(now.getMonth()+1)
				+ '-' + pad(now.getDate())
				+ 'T' + pad(now.getHours())
				+ ':' + pad(now.getMinutes())
				+ ':' + pad(now.getSeconds())
				+ dif + pad(tzo / 60)
				+ ':' + pad(tzo % 60);
		} else { // seconds
			if (!Date.now)
				Date.now = function() { return new Date().getTime(); }
			return Math.floor(Date.now() / 1000);
		}
	},

	createGUID: function() {
		// create GUID part
		function s4() {
			return Math.floor((1 + Math.random()) * 0x10000)
				.toString(16)
				.substring(1);
		}

		return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
	},

	getUUID: function() {
		var uuid;

		if (this.persistenceRead('autofire-uuid')) {
			uuid = this.persistenceRead('autofire-uuid');
		} else {
			uuid = this.createGUID();
			this.persistenceWrite('autofire-uuid', uuid, false);
		}

		return uuid;
	}
}

Autofire._settings = {
	platform		: 'Javascript-Web',
	autofireVersion	: '0.4',
	os				: Autofire._helpers.getOs(),
	model			: Autofire._helpers.getModel(),
	locale			: Autofire._helpers.getLocale(),
	//serviceURL	: 'https://service.autofire.io/v1/games/players/datapoints'
	serviceURL		: 'http://putsreq.com/Foy3mZhbjMD7mcXZXwjx'
}

Autofire._core = {

	// HEADER
	header: function(tags, nominalDict) {
		return [tags, nominalDict];
	},

	// EVENTS
	event: function(name, timestamp, nominalDict, ordinalDict, scaleDict) {
		return [name, timestamp, nominalDict, ordinalDict, scaleDict];
	},

	progress: function(level, score) {
		var timestamp = Autofire._helpers.getCurrentTimestamp(true);
		return this.event('PROGRESS', timestamp, {level: level}, {score: score}, {});
	},

	monetize: function(name, ac, qty) {
		var timestamp = Autofire._helpers.getCurrentTimestamp(true);
		return this.event('MONETIZE', timestamp, {name: name}, {ac: ac, qty: qty}, {});
	},

	resource: function(name, qty) {
		var timestamp = Autofire._helpers.getCurrentTimestamp(true);
		return this.event('RESOURCE', timestamp, {name: name}, {qty: qty}, {});
	},

	action: function(what) {
		var timestamp = Autofire._helpers.getCurrentTimestamp(true);
		return this.event('ACTION', timestamp, {what: what}, {}, {});
	},

	sending: false,

	currentLvl: null,

	currentState: {
		gameId			: 'the_game',
		uuid 			: 'the_player',
		isInitialized 	: false,
		totalEvents		: 0,
		batch 			: {
			header 		: null,
			events 		: []
		}
	}
}

// ΙΝΙΤ
Autofire.init = function(gameId, version, playerId) {
	if (Autofire._core.currentState.isInitialized)
		return false;

	var playerId = typeof playerId != 'undefined' ? playerId : false;

	// if previous data exists send them
	Autofire._helpers.checkBatch(true);

	Autofire._core.currentState.batch.header = this._core.header(
		[],
		{
			platform	: Autofire._settings.platform,
			os 			: Autofire._settings.os,
			model 		: Autofire._settings.model,
			locale 		: Autofire._settings.locale,
			ver 		: version,
			autofireVer : Autofire._settings.autofireVersion,
			initTs		: Autofire._helpers.getCurrentTimestamp(true),
			startLvl	: null
		}
	);

	Autofire._core.currentState.gameId = gameId;
	Autofire._core.currentState.uuid = playerId ? playerId : Autofire._helpers.getUUID();
	Autofire._core.currentState.isInitialized = true;

	return true;
};

// PROGRESS
Autofire.progress = function(level, score) {
	if (!Autofire._core.currentState.isInitialized)
		return false;

	Autofire._core.currentState.batch.events.push(Autofire._core.progress(level, score));
	Autofire._core.currentLvl = level;
	var isStored = Autofire._helpers.persistenceWrite('autofire-current-batch', Autofire._core.currentState);
	Autofire._helpers.checkBatch();
	return isStored;
};

// MONETIZE
Autofire.monetize = function(name, ac, qty) {
	if (!Autofire._core.currentState.isInitialized)
		return false;

	Autofire._core.currentState.batch.events.push(Autofire._core.monetize(name, ac, qty));
	var isStored = Autofire._helpers.persistenceWrite('autofire-current-batch', Autofire._core.currentState);
	Autofire._helpers.checkBatch();
	return isStored;
};

// RESOURCE
Autofire.resource = function(name, qty) {
	if (!Autofire._core.currentState.isInitialized)
		return false;

	Autofire._core.currentState.batch.events.push(Autofire._core.resource(name, qty));
	var isStored = Autofire._helpers.persistenceWrite('autofire-current-batch', Autofire._core.currentState);
	Autofire._helpers.checkBatch();
	return isStored;
}

// ACTION
Autofire.action = function(what) {
	if (!Autofire._core.currentState.isInitialized)
		return false;

	Autofire._core.currentState.batch.events.push(Autofire._core.action(what));
	var isStored = Autofire._helpers.persistenceWrite('autofire-current-batch', Autofire._core.currentState);
	Autofire._helpers.checkBatch();
	return isStored;
}

// FLUSH
Autofire.flush = function() {
	var initTsSeconds = new Date(Autofire._core.currentState.batch.header[1].initTs).getTime() / 1000;
	// if previous cached batches exists send them
	Autofire._helpers.checkBatch(true);
	return true;
};
