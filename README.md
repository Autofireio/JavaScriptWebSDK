![Autofire logo](http://autofire.io/wp-content/themes/autofire/img/logo_ext.png)

#Autofire JavaScript Web SDK

---

**Table of Contents**

- [Get Started](#getStarted)
	- [Requirements](#requirements)
	- [Fire your first event](#firstEvent)
	- [And now?](#andNow)
- [Usage](#usage)
	- [Start Session](#start) 
	- [Progress Event](#progress)
	- [Monetize Event](#monetize)
	- [Finish Session](#finish)
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
3. Find your Game Id through the games menu in the Autofire Dashboard.
4. Fire the startSession event immediately after your game loads, using your game's Id and Version.
5. Fire the finishSession event when your game ends or the player quits.

These two lines of code are all you need to get started:

```javascript
// fire the startSession immediately after your game loads
Autofire.startSession(your-game-id, your-game-version);

// fire the finishSession event when your game ends or the player quits
Autofire.finishSession();
```

Your game is now bootstrapped and all the basic telemetry will start working. Log into your Autofire Dashboard and start optimizing!

<a name="andNow"></a>
### And now?

Autofire is a simple service to use. All you have to do is add the event you need in the flow of your game. Below is a basic example with the following assumptions:

- your Game Id is `this-is-my-game-id`
- your game version is `v3.4-beta`
- your game uses levels to progress and has 2 main levels, 2 boss levels and 1  special level.
- your game has in-app purchases with 2 swords and 2 power ups.
- the events you see in the example are further explained later in the documentation, but for the purposes of this example their usage is self explanatory.

Basic example:

```javascript
// player opens your game
// you should call the startSession immediately after
// this will ensure that the player and session are counted
// this is all you need to do in your code to get all your basic telemetry
Autofire.startSession('this-is-my-game-id', 'v3.4-beta');

// player starts a new game and enters a new level
// you should call the progressWithLevel
Autofire.progressWithLevel('level-1');

// player enters the boss stage of level 1
Autofire.progressWithLevel('level-1-boss');

// player wins the boss
// you want to track the win and the score
Autofire.progressWithLevelAndScore('level-1-completed', 3421);

// the boss drops a special item as a reward
// if the player picks up the item
Autofire.monetizeWithItem('sword-boss-1');

// player goes to level 2
Autofire.progressWithLevel('level-2');

// player discovers the special stage of level 2
// you want to track both the level and the score
Autofire.progressWithLevelAndScore('level-2-special', 5734);

// in the special stage a sword is found
Autofire.monetizeWithItem('sword-special-2');

// because finding the sword is important to the progress of your game
// you want to log it as a simple progress
Autofire.progress();

// also you offer 2 power ups with a sale because of the special stage
// the player decides to buy only one, so you log it with its cost
Autofire.monetizeWithItemAndVC('life-potion', 3.45);

// player advances to level 2
Autofire.progressWithLevel('level-2');

// player enters the boss stage of level 2
Autofire.progressWithLevel('level-2-boss');

// player loses and is redirected in the main menu
Autofire.progressWithLevel('menu');

// player quits your game
Autofire.finishSession();
```

<a name="usage"></a>
## Usage

<a name="start"></a>
### Start Session

To start an Autofire session with our service (so that you can later send events), just call **once** the `startSession` method. Doing that is very simple and requires the following line of code:

	Autofire.startSession(your-game-id, your-game-version);
	
- `your-game-id` (string): This is your Game Id (as shown in your Autofire Dashboard in the games' menu)
- `your-game-version` (string): This is your game's version.
- retuns `boolean`

Example:

```javascript	
Autofire.startSession('29bc647056ee11e582810b3fc33376d1', 'v2.3-alpha');
```

Based on the type of your game, `startSession` may need to be called more than once (as pages refresh), depending on your definition of a session. See [assumptions](#assumptions) below for more info on this.

<a name="progress"></a>
### Progress Event

A `progress` event may be called whenever an action occurs in your game that you would define it as progress. While this action may cause the game and player to progress (structurally) in your game, it doesn't mean that the event is always positive for the player. For example a `progress` event may be changing level, or losing a life.

Definitions:

```javascript
// simple progress
Autofire.progress();

// with level
Autofire.progressWithLevel(level);
	
// with score
Autofire.progressWithScore(score);
	
// with level and score
Autofire.progressWithLevelAndScore(level, score);
```

- `level` (string, optional): This is the level that you are tracking with this `progress` event. It does not need to be an actual game level, but more like something that you define as a level change. For example it could mean that the game difficulty changed.
- `score` (positive int, optional): This is a positive integer representing the points the player gained when the `progress` event fired.
- retuns `boolean`

There are four ways to call the `progress` event.

**Undefined progress**

The event is called with no arguments. This is usefull for counting your `progress` events, regardless for what reason they fired.

```javascript
Autofire.progress();
```

**Level based progress**

```javascript
Autofire.progressWithLevel('level-2-special');
```

**Score based progress**

```javascript
Autofire.progressWithScore(25398);
```

**Level and Score based progress**

```javascript
Autofire.progressWithLevelAndScore('level-2-special', 25398);
```

<a name="monetize"></a>
### Monetize Event

A `monetize` event may be called whenever an action occurs in your game that you would define it as monetization.

Definitions:

```javascript
// simple monetize
Autofire.monetize();
	
// with item
Autofire.monetizeWithItem(item);
	
// with virtual currency
Autofire.monetizeWithVC(vc);

// with item and virtual currency
Autofire.monetizeWithItemAndVC(item, vc);
```

- `item` (string, optional): This is the item that was exchanged during this `monetize` event. This does not have to be a specific item, but could also be a service, a bonus or any other valuable the `monetize` was fired upon.
- `vc` (positive int, optional): This is the virtual cost of the monetize event. The `vc` is a positive integer representing the cost of the `monetize` event.
- retuns `boolean`

There are four ways to call the `monetize` event.

**Undefined monetize**

The event is called with no arguments. This is usefull for counting your `monetize` events, regardless for what reason they fired.

```javascript
Autofire.monetize();
```

**Item based monetize**

```javascript
Autofire.monetizeWithItem('star-fuel-combo');
```

**Virtual Currency based monetize**

```javascript
Autofire.monetizeWithVC(428);
```

**Item and Virtual Currency based progress**

```javascript
Autofire.monetizeWithItemAndVC('star-fuel-combo', 428);
```

<a name="finish"></a>
###Finish Session

The `finishSession` event is called to close your started session. This event should always be called after a `startSession` event has already been successfully called. For further discussion on the `startSession` and `finishSession` events check the [assumptions](#assumptions) below.

```javascript	
Autofire.finishSession();
```

- retuns `boolean`

<a name="assumptions"></a>
##Assumptions

When the `startSession` event is fired, a session is started. In order to properly keep track of the session it is important to be clearly defined when a session starts and when it finishes.

**1) If a started session is not 'closed' and the next event we call is:**

- `startSession`: Nothing happens. You should finish the active session first before initializing a new one.
- `finishSession`: Session is closed normally.
- `progress`: Executes normally.
- `monetize`: Executes normally.

**2) If a started session is not properly 'closed' and the browser window is refreshed and the next event we call is:**

- `startSession`: Tries to restore a previous running session from persistence. If an initialized session exists and a time constraint returns true, the session is restored. If no session exists a new one is created.
- `finishSession`: Tries to restore previous running session from persistence. If an initialized session exists and a time constraint returns true, the session is restored. If no session exists it exits.
- `progress`: Tries to restore previous running session from persistence. If an initialized session exists and a time constraint returns true, the session is restored. If no session exists it exits.
- `monetize`: Tries to restore previous running session from persistence. If an initialized session exists and a time constraint returns true, the session is restored. If no session exists it exits.

**3) Events are grouped and send as batches**

As the game progresses and events are fired they are not immediately sent. Events are grouped and sent when a minimum number of stored events are reached. This conserves battery and saves bandwidth. Also there is a maximum time interval allowed between events. This means that if the time distance between the event that just fired from the one last stored is bigger than an allowed time span, all stored events are sent immediately, independent of their total number.

**4) Storage**

All events and the sessions are saved in a storage mechanism. The storage is used to cache events not ready to be sent, or sessions that failed to finish (e.g. due to a crash or a browser window refresh or close). Each time an event is fired (being `startSession`, `finishSession`, `progress`, `monetize`) the program will try to send any cached events and sessions, starting from the oldest first. As per event grouping (see 3), sessions are also checked before sent against their age and a maximum allowed number of stored sessions. All sessions that are old and/or excess of the allowed limit are deleted, starting from the oldest stored.

**5) Connection not found**

If there is problem connecting to the service while trying to send events, the program will pause sending the events and will try to resume the next time an event is fired. Each event is send after the previous one was successfully delivered.

**6) Limits and Thresholds**

All limits set in the current code are for testing. This refers to all maximum allowed numbers (like events and sessions) and all time periods (session time to live and event maximum interval).

---

Copyright (c) 2016 Autofire - Game Analytics | <http://autofire.io>