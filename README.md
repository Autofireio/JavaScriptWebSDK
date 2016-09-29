![Autofire logo](http://autofire.io/wp-content/themes/autofire/img/logo_ext.png)

#Autofire JavaScript Web SDK

---

**Table of Contents**

- [Get Started](#getStarted)
	- [Requirements](#requirements)
	- [Fire your first event](#firstEvent)
	- [And now?](#andNow)
- [Usage](#usage)
	- [Initialize](#init)
	- [Progress Event](#progress)
	- [Monetize Event](#monetize)
	- [Resource Event](#resource)
	- [Action Event](#action)
	- [Flush events](#flush)
- [Assumptions](#assumptions)

<a name="getStarted"></a>
## Get Started

<a name="requirements"></a>
### Requirements

ECMAScript 5 or higher. Specifically the following methods are used:

- Array.prototype.indexOf()
- Array.prototype.filter()
- JSON.stringify()
- JSON.parse()

This **JavaScript Web SDK** is intended for use in an internet browser environment.

<a name="firstEvent"></a>
### Fire your first event

To send your first event just follow these simple steps:

1. Download the JavaScript Web SDK.
2. Include it in you project with a simple html script tag.
3. Find your `Game Id` through the games menu in the Autofire Dashboard.
4. Fire the `init` immediately after your game loads, using your `Game Id` and `Game Version`.

This line of code is all you need to get started:

```javascript
// fire the init immediately after your game loads
Autofire.init(your-game-id, your-game-version);
```

Your game is now bootstrapped and all the basic telemetry will start working. Log into your Autofire Dashboard and start optimizing!

<a name="andNow"></a>
### And now?

Autofire is a simple service to use. All you have to do is add the event you need in the flow of your game. Below is a basic example with the following assumptions:

- your Game Id is `this-is-my-game-id`
- your Game Version is `v3.4-beta`
- your game uses levels to measure progress.
- your game offers a sword as an in-app purchase.
- the events you see in the example are further explained later in the documentation, but for the purposes of this example their usage is self explanatory.

Basic example:

```javascript
// player opens your game
// you should call init() immediately after
// this is all you need to do to get all your basic telemetry
Autofire.init('this-is-my-game-id', 'v3.4-beta');

// player starts a new game and enters a new level
// you should call the progress
Autofire.progress('level-1', 0);

// player enters the boss stage of level 1
Autofire.action('level-1-boss');

// player wins the boss
Autofire.action('level-1-completed');

// the boss drops a special item as a reward
// and the player picks it up
Autofire.resource('sword-boss', 1);

// player goes to level 2
Autofire.progress('level-2', 18639);

// player discovers the special stage
Autofire.progress('level-special', 22800);

// in the special stage a sword is offered for in-app purchase
// and the player buys it
Autofire.monetize('sword-special', 400);

// because having this sword is important to the progress of your game
// you want to track it
Autofire.resource('sword-special', 1);

// player returns to level 2 from the special stage
Autofire.progress('level-2', 25300);

// player buys with game gold a potion
Autofire.resource('gold-coins', -300);
Autofire.resource('health-potion', 1);

// player enters the boss stage of level 2
Autofire.action('level-2-boss');

// player uses the potion
Autofire.resource('health-potion', -1);

// player loses and is redirected in the main menu
Autofire.action('game-over');
```

<a name="usage"></a>
## Usage

<a name="init"></a>
### Initialize

To initialize the Autofire SDK just call **once** at the beginning of your game the `init` method. Doing this is very simple and requires the following line of code:

```javascript	
Autofire.init(your-game-id, your-game-version, player-id);
```

- `your-game-id` (string): This is your game's id (as shown in the games menu of your Autofire Dashboard)
- `your-game-version` (string): This is your game's version.
- `player-id` (string, optional): While the SDK will generate and handle the player id per device/browser basis, you may want to provide your own specific player id.
- returns `boolean`

**Example:**

```javascript	
// init
Autofire.init('29bc647056ee11e582810b3fc33376d1', 'v2.3-alpha');
```

<a name="progress"></a>
### Progress Event

A `progress` event may be called whenever an action occurs in your game that you would define it as progress. While this action may cause the game and player to progress (structurally) in your game, it doesn't mean that the event is always positive for the player. For example a `progress` event may be called when changing game level, even if this game level is lower than the current one.

**Definition:**

```javascript
// progress
Autofire.progress(level, score);
```

- `level` (string): This is the name of the level the progress occurred in your game. It can be a new game level, a game difficulty change or a new tier. Generally it is the term that semantically measures progress in your game. 
- `score` (positive int): This is a positive integer representing the current points (actual score, XPs, difficulty modifier etc) the player has the moment the `progress` event fires.
- returns `boolean`

**Example:**

```javascript
// player enters level 2 with score 25398
Autofire.progress('level-2', 25398);
```

<a name="monetize"></a>
### Monetize Event

A `monetize` event may be called whenever an action occurs in your game that you would define it as monetization. That is an action that actually translates to real gain or loss of profit.

**Definition:**

```javascript
// monetize
Autofire.monetize(item, ac, qty);
```

- `item` (string): This is what was exchanged during this `monetize` event. This does not have to be a specific item, but could also be a service, a bonus or any other valuable the `monetize` was fired upon.
- `ac` (int): The `Autofire Credits` is the normalized **total** cost (regrdless of quantity) of the monetize event. The `ac` is an integer representing the gain or loss of profit from the `monetize` event.
- `qty` (positive int, optional): This is the quantity of the items that were monetized. If none is given, default is 1.
- returns `boolean`

**Example:**

```javascript
// player makes an in-app purchase
// 2 items for a total cost of 400, i.e. 200 each
Autofire.monetize('star-fuel-combo', 400, 2);

// player gets a refund
Autofire.monetize('old-star-fuel-combo', -200);
```

<a name="resource"></a>
### Resource Event

A `resource` event may be called whenever a game resource is given or taken from the player. This can be an inventory item, gold pieces, a skill, a special bonus etc.

**Definition:**

```javascript
// resource
Autofire.resource(name, qty);
```

- `name` (string): This is the name of the resource.
- `qty` (int): This is quantity of the resource.
- returns `boolean`

**Example:**

```javascript
// player receives a sword
Autofire.resource('Excalibur', 1);

// player buys something with in-game gold
Autofire.resource('gold-coins', -1000);
```

<a name="action"></a>
### Action Event

An `action` event may be called whenever a player performs a game action that you want to track. These are generally actions that affect how the game progresses or how the player reacts to specific stimulae.

**Definition:**

```javascript
// action
Autofire.action(what);
```

- `what` (string): This is the name of the action.
- returns `boolean`

**Example:**

```javascript
// player encounters level 1 boss
Autofire.action('level-1-boss');

// player takes path A, instead of path B on level 2
Autofire.action('level-2-path-A');
```

<a name="flush"></a>
###Flush events

The `flush` method is called if you want to send all the events stored up until that moment, regardless of other factors. The most common use of `flush` is when the player quits the game. See [assumptions](#assumptions) below for more details on how events are stored and send.

**Definition:**

```javascript	
Autofire.flush();
```

- returns `boolean`

<a name="assumptions"></a>
##Assumptions

**1) Events are grouped and send as batches**

As the game progresses and events are fired they are not immediately sent. Events are grouped and send when a minimum number of stored events are reached. This conserves battery and saves bandwidth. Also there is a maximum time interval allowed between events. This means that if the time distance between the event that just fired from the one last stored is bigger than an allowed time span, all stored events are sent immediately, independent of their total number.

**2) Storage**

All events are saved in a storage mechanism. The storage is used to cache events not ready to be sent. Each time an event is fired, being `progress`, `monetize`, `resource` or `action` the program will check if specific requirements are met (see 1 above) and if yes, it will try to send any cached events, starting from the oldest first.

**3) Cached batches**

While events not sent are cached in batches, this cannot go on for an unlimited amount of batches. Each time the program tries to send the cached events, it first checks the limit of allowed cached batches. If this limit is reached, any excess batches, beggining from the oldest, are removed.

**4) Initilization and player id**

Player Id's are generated and handled by the SDK per device/browser basis. In the case of the JavaScript SDK an Id will be generated during the initialization process and stored for any future use. Since the JavaScript SDK will run in a browser environment, multiple browsers in the same system will produce different player id's as well as in different devices. In this case you may want to provide your own player id based for example on a hash generated from their registration email, thus ensuring consistency of player data across all devices and browsers the player uses.

**5) Connection not found**

If there is problem connecting to the service while trying to send events, the program will pause sending the events and will try to resume the next time an event is fired. Each event is send after the previous one was successfully delivered.

**6) Limits and thresholds**

All limits set in the current code are for testing. This refers to all maximum allowed numbers (like events and parts) and all time periods (event maximum interval).

---

Copyright (c) 2016 Autofire - Game Analytics | <http://autofire.io>