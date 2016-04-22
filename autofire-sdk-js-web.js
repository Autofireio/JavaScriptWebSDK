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
				var cachedSessionPartsKeys = [];
				for (var i = 0; i < localStorage.length; i++) {
					if (localStorage.key(i).indexOf(key) != -1) {
						cachedSessionPartsKeys.push(localStorage.key(i));
					}
				}
				return cachedSessionPartsKeys;
			} else if (localStorage.getItem(key) !== null)
				return localStorage.getItem(key);
			else
				return false;
		} else {
			if (prefix) {
				var cookies = document.cookie.split(';');
				var cachedSessionPartsKeys = [];
				for(var i = 0; i < cookies.length; i++) {
					if (cookies[i].indexOf(key) != -1) {
						var theKey = cookies[i].split('=');
						cachedSessionPartsKeys.push(theKey);
					}
				}
				document.cookie = cookies.join(';');
			} else if (getCookie(key) !== null)
				return getCookie(key);
			else
				return false;
		}
	},

	persistenceWrite: function(key, data) {
		try {
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

	checkInitializedSession: function(token, version) {
		var token = typeof token !== 'undefined' ? token : false;
		var version = typeof version !== 'undefined' ? version : false;
		var isInitializedStoredTTL = 600;
		var isInitializedStored = JSON.parse(this.persistenceRead('autofire-isInitialized-stored'));
		if (Autofire._session.currentState.isInitialized) // initialized: during this run
			return true;
		else if (isInitializedStored && this.getCurrentTimestamp() - isInitializedStored.startedAtUTC <= isInitializedStoredTTL) // initialized: saved
			return isInitializedStored;
		else if (token && version) // initialized: false, create new session
			return {
				token			: token,
				version 		: version,
				sessionId 		: this.createGUID(),
				uuid 			: this.getUUID(),
				startedAtUTC 	: this.getCurrentTimestamp(),
				part 			: 1
			}
		else
			return false; // initialized: false, do nothing
	},

	sendSessionParts: function(cachedSessionPartsKeys) {
		var cachedSessionPart = JSON.parse(this.persistenceRead(cachedSessionPartsKeys[0]));
		var url = Autofire._settings.serviceURL;
		var data = {
			events: [{
				session 	: cachedSessionPart.sessionPart.session,
				game		: cachedSessionPart.sessionPart.game,
				device		: cachedSessionPart.sessionPart.device,
				player		: cachedSessionPart.sessionPart.player,
				dataPoints	: cachedSessionPart.sessionPart.dataPoints
			}]
		}
		var requestBody = JSON.stringify(data);
		var xhr = new XMLHttpRequest();
		xhr.open('POST', url, true);
		xhr.setRequestHeader('Content-Type', 'application/json');
		xhr.setRequestHeader('X-Autofire-Game-Id', cachedSessionPart.token);
		xhr.setRequestHeader('X-Autofire-Player-Id', cachedSessionPart.uuid);
		xhr.onload = function(e) {
			if (xhr.readyState === 4) {
				if (xhr.status === 200 || xhr.status === 400) { // 400 is malformed event. Remove it as sent.
					Autofire._helpers.persistenceDelete(cachedSessionPartsKeys[0]);
					cachedSessionPartsKeys.shift();
					if (cachedSessionPartsKeys.length > 0)
						Autofire._helpers.sendSessionParts(cachedSessionPartsKeys);
					else
						Autofire._session.sending = false;
				} else {
					console.error(xhr.statusText);
					Autofire._session.sending = false;
				}
			}
		};
		xhr.onerror = function(e) {
			console.error(xhr.statusText);
			Autofire._session.sending = false;
		};
		Autofire._session.sending = true;
		xhr.send(requestBody);
	},

	prepareSessionParts: function() {
		var maxSessions = 3;
		var ttl = 600;
		var cachedSessionPartsKeys = this.persistenceRead('autofire-cached', true);
		var cachedSessionsKeys = [];

		function removeKey(key) {
			var key = typeof key !== 'undefined' ? key : false;
			return function(element) {
				if (key) {
					if (element.indexOf(key) === -1)
						return element;
					else
						Autofire._helpers.persistenceDelete(element);
				} else {
					var sessionPartDetails = element.split('_');
					if (Autofire._helpers.getCurrentTimestamp() - sessionPartDetails[1] > ttl)
						Autofire._helpers.persistenceDelete(element);
					else
						return element;
				}
			}
		}

		if (cachedSessionPartsKeys && cachedSessionPartsKeys.length > 0) {
			// expired sessions
			cachedSessionPartsKeys = cachedSessionPartsKeys.filter(removeKey);

			// build help array to count sessions
			for (var i = 0; i < cachedSessionPartsKeys.length; i++) {
				var sessionPartDetails = cachedSessionPartsKeys[i].split('_');
				if (cachedSessionsKeys.indexOf(sessionPartDetails[1] + '_' + sessionPartDetails[2]) === -1)
					cachedSessionsKeys.push(sessionPartDetails[1] + '_' + sessionPartDetails[2]);
			}

			cachedSessionPartsKeys.sort();
			cachedSessionsKeys.sort();

			// maximum allowed sessions
			var noOfSessions = cachedSessionsKeys.length;
			if (noOfSessions > maxSessions) {
				var cachedSessionsKeysToRemove = cachedSessionsKeys.slice(0, noOfSessions - maxSessions);
				for (var i = 0; i < cachedSessionsKeysToRemove.length; i++)
					cachedSessionPartsKeys = cachedSessionPartsKeys.filter(removeKey(cachedSessionsKeysToRemove[i]));
			}

			if (cachedSessionPartsKeys.length > 0)
				this.sendSessionParts(cachedSessionPartsKeys);
		}
	},

	checkSessionPart: function(force) {
		var force = typeof force !== 'undefined' ? force : false;
		var maxEvents = 3;
		var interval = 600;

		if (force ||
			Autofire._session.currentState.sessionPart.dataPoints.length >= maxEvents ||
			this.getCurrentTimestamp - Autofire._session.currentState.sessionPart.dataPoints[Autofire._session.currentState.sessionPart.dataPoints.length - 1][1] > interval) {

			if (force) {
				var savedCurrentSession = JSON.parse(this.persistenceRead('autofire-current-session-part'));
				if (savedCurrentSession)
					this.persistenceWrite(
						'autofire-cached_' +
						savedCurrentSession.startedAtUTC + '_' +
						savedCurrentSession.sessionPart.session[0] + '_' +
						'part' + savedCurrentSession.sessionPart.session[1].part
						,
						savedCurrentSession
					);
			} else {
				this.persistenceWrite(
					'autofire-cached_' +
					Autofire._session.currentState.startedAtUTC + '_' +
					Autofire._session.currentState.sessionPart.session[0] + '_' +
					'part' +  Autofire._session.currentState.sessionPart.session[1].part
					,
					 Autofire._session.currentState
				);
			}

			if (!force) {
				var partNo = parseInt(Autofire._session.currentState.sessionPart.session[1].part) + 1;
				Autofire._session.currentState.sessionPart.session[1].part = partNo.toString();
				Autofire._session.currentState.sessionPart.dataPoints = [];
				this.persistenceWrite('autofire-current-session-part', Autofire._session.currentState);
				this.persistenceWrite('autofire-isInitialized-stored',	{
						token			: Autofire._session.currentState.token,
						version 		: Autofire._session.currentState.sessionPart.game.ver,
						sessionId 		: Autofire._session.currentState.sessionPart.session[0],
						uuid 			: Autofire._session.currentState.uuid,
						startedAtUTC	: Autofire._session.currentState.startedAtUTC,
						part 			: partNo + 1
					}
				);
			}

			if (Autofire._session.sending)
				return false;
			else
				this.prepareSessionParts();
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

	getTimezone: function() {
		return (new Date().getTimezoneOffset() / 60).toString();
	},

	getLocale: function() {
		return window.navigator.language;
	},

	getCurrentTimestamp: function() {
		if (!Date.now) {
			Date.now = function() { return new Date().getTime(); }
		}
		return Math.floor(Date.now() / 1000);
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
			if (this.lsExists() === true)
				localStorage.setItem('autofire-uuid', uuid);
			else
				document.cookie = 'autofire-uuid' + '=' + uuid;
		}

		return uuid;
	}
}

Autofire._settings = {
	platform		: 'Javascript-Web',
	autofireVersion	: '0.4',
	os				: Autofire._helpers.getOs(),
	model			: Autofire._helpers.getModel(),
	timeZone		: Autofire._helpers.getTimezone(),
	locale			: Autofire._helpers.getLocale(),
	serviceURL		: 'https://service.autofire.io/v1/games/players/datapoints'
}

Autofire._session = {

	// HEADERS
	header: function(name, nominalDict) {
		return [name, nominalDict];
	},

	playerHeader: function(tags, nominalDict) {
		return [tags, nominalDict];
	},

	device: function(platform, os, model, timeZone) {
		return this.header(platform, {os: os, model: model, tz: timeZone});
	},

	player: function(tags, locale) {
		return this.playerHeader(tags, {locale: locale});
	},

	game: function(version, autofireVersion) {
		return {ver: version, autofireVer: autofireVersion};
	},

	session: function(id, startedAtUTC, part) {
		return this.header(id, {started: startedAtUTC, part: part});
	},

	// EVENTS
	event: function(name, timestamp, tags, nominalDict, ordinalDict, scaleDict) {
		return [name, timestamp, tags, nominalDict, ordinalDict, scaleDict];
	},

	start: function(timestamp) {
		return this.event('STARTED', timestamp, [], {}, {}, {});
	},

	end: function(timestamp, duration) {
		return this.event('ENDED_FINI', timestamp, [], {}, {duration: duration}, {});
	},

	progress: function(level, score) {
		var level = typeof level !== 'undefined' ? level : false;
		var score = typeof score !== 'undefined' ? score : false;
		var timestamp = Autofire._helpers.getCurrentTimestamp();
		if (level !== false && score !== false)
			return this.event('PROGRESSED', timestamp, [], {level: level}, {score: score}, {});
		else if (level !== false)
			return this.event('PROGRESSED', timestamp, [], {level: level}, {}, {});
		else if (score !== false)
			return this.event('PROGRESSED', timestamp, [], {}, {score: score}, {});
		else
			return this.event('PROGRESSED', timestamp, [], {}, {}, {});
	},

	monetize: function(item, vc) {
		var item = typeof item !== 'undefined' ? item : false;
		var vc = typeof vc !== 'undefined' ? vc : false;
		var timestamp = Autofire._helpers.getCurrentTimestamp();
		if (item !== false && vc !== false)
			return this.event('MONETIZED', timestamp, [], {item: item}, {vc: vc}, {});
		else if (item !== false)
			return this.event('MONETIZED', timestamp, [], {item: item}, {}, {});
		else if (vc !== false)
			return this.event('MONETIZED', timestamp, [], {}, {vc: vc}, {});
		else
			return this.event('MONETIZED', timestamp, [], {}, {}, {});
	},

	makeHeaders: function(isInitialized) {
		Autofire._session.currentState.sessionPart.device = Autofire._session.device(
			Autofire._settings.platform,
			Autofire._settings.os,
			Autofire._settings.model,
			Autofire._settings.timeZone
		);

		Autofire._session.currentState.sessionPart.player = Autofire._session.player(
			[],
			Autofire._settings.locale
		);

		Autofire._session.currentState.sessionPart.game = Autofire._session.game(
			isInitialized.version,
			Autofire._settings.autofireVersion
		);

		Autofire._session.currentState.token = isInitialized.token;
		Autofire._session.currentState.uuid = isInitialized.uuid;
		Autofire._session.currentState.startedAtUTC = isInitialized.startedAtUTC;

		Autofire._session.currentState.sessionPart.session = Autofire._session.session(
			isInitialized.sessionId,
			Autofire._session.currentState.startedAtUTC.toString(),
			isInitialized.part.toString()
		);

		isInitialized.part += 1;
		Autofire._helpers.persistenceWrite('autofire-isInitialized-stored', isInitialized);
		Autofire._session.currentState.isInitialized = true;
	},

	sending: false,

	currentState: {
		token			: 'the_game',
		uuid 			: 'the_player',
		isInitialized 	: false,
		startedAtUTC 	: false,
		sessionPart 	: {
			dataPoints 		: []
		}
	}
}

// START
Autofire.startSession = function(token, version) {
	var isInitializedState = Autofire._helpers.checkInitializedSession(token, version);
	if (isInitializedState === true) // session already initialized in current run
		return false;

	// if previous session data exists send them
	Autofire._helpers.checkSessionPart(true);

	// make headers and save session state
	Autofire._session.makeHeaders(isInitializedState);

	// send STARTED event
	Autofire._session.currentState.sessionPart.dataPoints.push(Autofire._session.start(Autofire._session.currentState.startedAtUTC));
	var isStored = Autofire._helpers.persistenceWrite('autofire-current-session-part', Autofire._session.currentState);
	Autofire._helpers.checkSessionPart();
	return isStored;
};

// END
Autofire.finishSession = function() {
	var isInitializedState = Autofire._helpers.checkInitializedSession();
	if (isInitializedState && isInitializedState !== true)
		Autofire._session.makeHeaders(isInitializedState);
	else if (isInitializedState !== true)
		return false;

	var timestamp = Autofire._helpers.getCurrentTimestamp();
	var duration = timestamp - Autofire._session.currentState.startedAtUTC;

	Autofire._session.currentState.sessionPart.dataPoints.push(Autofire._session.end(timestamp, duration));
	var isStored = Autofire._helpers.persistenceWrite('autofire-current-session-part', Autofire._session.currentState);
	Autofire._helpers.checkSessionPart(true);
	Autofire._helpers.persistenceDelete('autofire-current-session-part');
	Autofire._helpers.persistenceDelete('autofire-isInitialized-stored');
	Autofire._session.currentState.isInitialized = false;
	return isStored;
};

// PROGRESS
Autofire.progress = function() {
	var isInitializedState = Autofire._helpers.checkInitializedSession();
	if (isInitializedState && isInitializedState !== true)
		Autofire._session.makeHeaders(isInitializedState);
	else if (isInitializedState !== true)
		return false;

	Autofire._session.currentState.sessionPart.dataPoints.push(Autofire._session.progress());
	var isStored = Autofire._helpers.persistenceWrite('autofire-current-session-part', Autofire._session.currentState);
	Autofire._helpers.checkSessionPart();
	return isStored;
};

Autofire.progressWithLevel = function(level) {
	var isInitializedState = Autofire._helpers.checkInitializedSession();
	if (isInitializedState && isInitializedState !== true)
		Autofire._session.makeHeaders(isInitializedState);
	else if (isInitializedState !== true)
		return false;

	Autofire._session.currentState.sessionPart.dataPoints.push(Autofire._session.progress(level));
	var isStored = Autofire._helpers.persistenceWrite('autofire-current-session-part', Autofire._session.currentState);
	Autofire._helpers.checkSessionPart();
	return isStored;
};

Autofire.progressWithScore = function(score) {
	var isInitializedState = Autofire._helpers.checkInitializedSession();
	if (isInitializedState && isInitializedState !== true)
		Autofire._session.makeHeaders(isInitializedState);
	else if (isInitializedState !== true)
		return false;

	Autofire._session.currentState.sessionPart.dataPoints.push(Autofire._session.progress(false, score));
	var isStored = Autofire._helpers.persistenceWrite('autofire-current-session-part', Autofire._session.currentState);
	Autofire._helpers.checkSessionPart();
	return isStored;
};

Autofire.progressWithLevelAndScore = function(level, score) {
	var isInitializedState = Autofire._helpers.checkInitializedSession();
	if (isInitializedState && isInitializedState !== true)
		Autofire._session.makeHeaders(isInitializedState);
	else if (isInitializedState !== true)
		return false;

	Autofire._session.currentState.sessionPart.dataPoints.push(Autofire._session.progress(level, score));
	var isStored = Autofire._helpers.persistenceWrite('autofire-current-session-part', Autofire._session.currentState);
	Autofire._helpers.checkSessionPart();
	return isStored;
};

// MONETIZE
Autofire.monetize = function() {
	var isInitializedState = Autofire._helpers.checkInitializedSession();
	if (isInitializedState && isInitializedState !== true)
		Autofire._session.makeHeaders(isInitializedState);
	else if (isInitializedState !== true)
		return false;

	Autofire._session.currentState.sessionPart.dataPoints.push(Autofire._session.monetize());
	var isStored = Autofire._helpers.persistenceWrite('autofire-current-session-part', Autofire._session.currentState);
	Autofire._helpers.checkSessionPart();
	return isStored;
};

Autofire.monetizeWithItem = function(item) {
	var isInitializedState = Autofire._helpers.checkInitializedSession();
	if (isInitializedState && isInitializedState !== true)
		Autofire._session.makeHeaders(isInitializedState);
	else if (isInitializedState !== true)
		return false;

	Autofire._session.currentState.sessionPart.dataPoints.push(Autofire._session.monetize(item));
	var isStored = Autofire._helpers.persistenceWrite('autofire-current-session-part', Autofire._session.currentState);
	Autofire._helpers.checkSessionPart();
	return isStored;
};

Autofire.monetizeWithVC = function(vc) {
	var isInitializedState = Autofire._helpers.checkInitializedSession();
	if (isInitializedState && isInitializedState !== true)
		Autofire._session.makeHeaders(isInitializedState);
	else if (isInitializedState !== true)
		return false;

	Autofire._session.currentState.sessionPart.dataPoints.push(Autofire._session.monetize(false, vc));
	var isStored = Autofire._helpers.persistenceWrite('autofire-current-session-part', Autofire._session.currentState);
	Autofire._helpers.checkSessionPart();
	return isStored;
};

Autofire.monetizeWithItemAndVC = function(item, vc) {
	var isInitializedState = Autofire._helpers.checkInitializedSession();
	if (isInitializedState && isInitializedState !== true)
		Autofire._session.makeHeaders(isInitializedState);
	else if (isInitializedState !== true)
		return false;

	Autofire._session.currentState.sessionPart.dataPoints.push(Autofire._session.monetize(item, vc));
	var isStored = Autofire._helpers.persistenceWrite('autofire-current-session-part', Autofire._session.currentState);
	Autofire._helpers.checkSessionPart();
	return isStored;
};
