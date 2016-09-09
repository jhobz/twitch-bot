'use strict';

/**
 * node package tmi.js
 * Used for interacting with Twitch servers and chat.
 */
var irc = require('tmi.js'),

/**
 * node package fs
 * Used for reading from and writing to filesystem.
 */
	FileSystem = require('fs'),

/**
 * Location of list of channels to which to connect.
 */
	CHANNELSFILE = '../data/channels.json',

/**
 * Location of list of commands to load.
 */
	COMMANDSFILE = '../data/commands.json',

/**
 * Location of list of commands to load.
 */
	CREDENTIALSFILE = '../data/credentials.json',

/**
 * Location of table of past match data.
 */
	MATCHESFILE = '../data/matches.json',

/**
 * Location of permissions table.
 */
	PERMISSIONSFILE = '../data/permissions.json',

/**
 * Location of predictions table.
 */
	PREDICTIONSFILE = '../data/predictions.json',

/**
 * List of channels to which to connect.
 */
	channels,

/**
 * tmi client instance
 */
	client,

/**
 * List of commands to listen for and their corresponding actions
 */
	commands,

/**
 * Bad variable used as a hack at the moment
 */
	globals = {},

/**
 * Whether a match is in progress
 */
	isMatchInProgress = false,

/**
 * Data of last match
 */
	lastMatch,

/**
 * Cached matches data
 */
	matches,

/**
 * Permissions table
 */
	permissions,

/**
 * Cached prediction data
 */
	predictions,

/**
 * Cached score
 */
	score;

/**
 * Initialize the tmi client and connect to channels.
 * @return Promise
 */
function initClient() {
	// TODO: Allow connecting under multiple identities
	var identity = loadJsonFromFile( CREDENTIALSFILE )[0],
		options = {
			options: {
				debug: false,
			},
			connection: {
				cluster: "aws",
				reconnect: true
			},
			identity: identity,
			channels: channels,
		},
		client = new irc.client( options );

		return client;
}

/**
 * Process chat message. Look for recognized commands and perform appropriate action(s).
 * Ignore commands issued by self.
 * @param channel channel from which the message originated
 * @param userstate state object for user that sent the message
 *		example userstate object
		{
			'badges': { 'broadcaster': '1', 'warcraft': 'horde' },
			'color': '#FFFFFF',
			'display-name': 'Schmoopiie',
			'emotes': { '25': [ '0-4' ] },
			'mod': true,
			'room-id': '58355428',
			'subscriber': false,
			'turbo': true,
			'user-id': '58355428',
			'user-type': 'mod',
			'emotes-raw': '25:0-4',
			'badges-raw': 'broadcaster/1,warcraft/horde',
			'username': 'schmoopiie',
			'message-type': 'action'
		}
 * @param msg message that was sent
 * @param isSelfMessage true if the message was sent by this bot, false otherwise
 *        Note: Is false if message was sent from account but not by bot
*/
function handleMessage( channel, userstate, msg, isSelfMessage ) {
	msg = msg.toLowerCase();
	// Eliminate whitespace mistakes (e.g. "  !command      param")
	var split = msg.match( /\S+/g ) || [],
		user = userstate['username'];

	if (
		isSelfMessage
		|| permissions[user] < 0
		|| !split.length
		|| split[0].charAt( 0 ) !== '!'
	) {
		return;
	}

	var command = split[0].substr( 1 ).toLowerCase(), // remove bang
		commandAction = commands[command];

	if ( hasPermission( user, commandAction ) ) {
		if ( commandAction.type && commandAction.type === 'function' ) {
			// FIXME: this is bad
			globals[commandAction.action]( channel, userstate, msg );
		} else {
			if ( commandAction.action ) {
				commandAction = commandAction.action;
			}
			if ( typeof commandAction === 'function' ) {
				commandAction( split.splice( 1 ), function( message, data ) {
					//client.say( channel, userstate["display-name"] + " - " + message + "." );
				} );
			} else {
				say( channel, commandAction, userstate );
			}
		}
	}
}

/**
 * Determine whether a given user can perform a given action
 * @param user user attempting to perform action
 * @param action action attempting to be performed
 * @return boolean
 */
function hasPermission( user, action ) {
	if (
		!user
		|| !action
		|| action.level !== undefined
		&& (
			permissions[user] === undefined
			|| action.level < permissions[user] // Smaller permission number is higher authority
		)
	) {
		return false;
	}
	return true;
}

/**
 * Output message to channel or user
 * Type of message to send is determined by userstate['message-type']
 * @param channel channel from which the request originated
 * @param msg message to send
 * @param userstate userstate object
 */
function say( channel, msg, userstate ) {
	switch( userstate['message-type'] ) {
		case 'action':
			client.action( channel, msg );
			break;
		case 'chat':
			client.say( channel, msg );
			break;
		case 'whisper':
			client.whisper( userstate.username, msg );
			break;
		default:
			console.error( 'Unknown message type: ' + userstate['message-type']
				+ '. Attempted to say: ' + msg );
			break;
	}
}

/**
 * Load data from file
 *
 * @param filename file from which to read
 * @return object file contents parsed as JSON
 */
function loadJsonFromFile( filename ) {
    return JSON.parse( FileSystem.readFileSync( filename, 'utf8' ) );
}

/**
 * Save data to file
 *
 * @param string filename file to write to
 * @param object data json to write to file
 */
function saveJsonToFile( filename, data ) {
    FileSystem.writeFileSync( filename, JSON.stringify( data ) + '\n' );
}


/**
 * Terminate application
 */
function quit() {
    channels.forEach( function ( channel ) {
		say(
			channel,
			// 'Terminating application. Please contact the developer '
			// + 'on Twitter if no warning was announced prior to termination.',
			'Application terminated.',
			{ 'message-type': 'chat' }
		);
	} );
    client.disconnect();
    process.exit();
}

globals.uptime = function ( channel, userstate, message ) {
	client.api( {
		url: 'https://api.twitch.tv/kraken/streams/' + channel.substr(1),
		headers: {
			'Client-ID': '8ulj8xtb0zh31jp2met3iqo0uh3ec2p'
		}
	}, function ( err, res, body ) {
		if ( err || !body )
			return;

		if ( !body.stream ) {
			say(
				channel,
				channel.substr( 1 ) + '\'s stream is currently offline.',
				userstate
			);
		} else {
			var stream = body.stream,
				startTime = new Date( stream['created_at'] ),
				diff = new Date() - startTime;

			say(
				channel,
				channel.substr( 1 ) + ' has been live for '
					+ Math.floor( diff / 1000 / 60 / 60 ) + 'h'
					+ Math.floor( diff / 1000 / 60 % 60 ) + 'm'
					+ Math.floor( diff / 1000 % 60 ) + 's.',
				userstate
			);
		}
	} );
};

globals.addcommand = function ( channel, userstate, message ) {
	var split = message.match( /\S+/g ) || [],
		command = split[1],
		msg = split.slice( 2, split.length ).join( ' ' );

	if ( commands[command] ) {
		say(
			channel,
			'That is already a command, please select a different name.',
			userstate
		);
	} else {
		commands[command] = msg;
		saveJsonToFile( COMMANDSFILE, commands );
	}
};

globals.removecommand = function ( channel, userstate, message ) {
	var split = message.match( /\S+/g ) || [],
		command = split[1];

	if ( commands[command] ) {
		delete commands[command];
		saveJsonToFile( COMMANDSFILE, commands );
	} else {
		say(
			channel,
			'That is not a command, please select a different name. You can use !commands to see the list of commands.',
			userstate
		);
	}
};

globals.commands = function ( channel, userstate, message ) {
	var user = userstate.username,
		output = [];

	Object.keys( commands ).forEach( function ( command ) {
		if ( command !== 'commands' && hasPermission( user, commands[command] ) ) {
			output.push( '!' + command );
		}
	} );

	say(
		channel,
		output.join( ', ' ),
		userstate
	);
};

globals.score = function ( channel, userstate, message ) {
	if ( !matches || !matches._expiry || matches._expiry.getTime() < ( new Date() ).getTime() ) {
		refreshMatchData();
	}

	if ( !score ) {
		score = '';

		var runnerScores = matches[matches.length - 1].results.scores;
		for ( var runner in runnerScores ) {
			score += runner + ': ' + runnerScores[runner] + ', ';
		}

		score = score.substr( 0, score.length - 2 );
	}

	say(
		channel,
		score,
		userstate
	);
};

globals.points = function ( channel, userstate, message ) {
	var split = message.match( /\S+/g ) || [],
		user = split.length > 1 ? split[1] : userstate.username,
		output;

	if ( !predictions || !predictions._expiry || predictions._expiry.getTime() < ( new Date() ).getTime() ) {
		refreshPredictionData();
	}

	if ( !predictions[user] ) {
		output = 'No prediction data associated with '
			+ user
			+ '. You can predict the winner of this week with "!predict hobz" or "!predict spike"';
	} else {
		var isOther = user === userstate.username,
			isPlural = predictions[user].score !== 1;
		output = ( isOther ? 'You have ' : user + ' has ' )
			+ predictions[user].score + ' point'
			+ ( isPlural ? 's.' : '.' );
	}

	say(
		channel,
		output,
		userstate
	);
};

globals.predict = function ( channel, userstate, message ) {
	if ( isMatchInProgress ) {
		say(
			channel,
			'Predictions lock at the beginning of each match and reopen at the end of the stream.',
			userstate
		);
		return;
	}

	if ( !predictions ) {
		refreshPredictionData();
	}

	var currentWeek = matches.length + 1,
		split = message.match( /\S+/g ) || [],
		prediction = split[1],
		user = userstate.username,
		output;

	if ( prediction && prediction.indexOf( 'spike' ) >= 0 ) {
		prediction = 'spike';
	} else if ( prediction && prediction.indexOf( 'hobz' ) >= 0 ) {
		prediction = 'hobz';
	} else {
		prediction = 'error';
		output = user
			+ ': Your prediction has not been logged. Please predict either "spike" or "hobz".';
	}

	if ( !output ) {
		output = user
			+ ': Your prediction of ' + prediction
			+ ' for week ' + currentWeek + ' has been saved.';
	}

	if ( !predictions[user] ) {
		predictions[user] = {
			score: 0,
			predictions: {}
		};
	}

	predictions[user].predictions[currentWeek] = prediction;
	saveJsonToFile( PREDICTIONSFILE, predictions );

	say(
		channel,
		output,
		userstate
	);
};

globals.startMatch = function ( channel, userstate, message ) {
	if ( isMatchInProgress ) {
		return;
	}

	isMatchInProgress = true;
	say(
		channel,
		'The race is underway and predictions have been locked. Don\'t forget to root for '
			+ 'TeamHobz or TeamSpike in chat! LET THE BATTLE BEGIN!',
		userstate
	);
};

globals.recordMatch = function ( channel, userstate, message ) {
	if ( !isMatchInProgress ) {
		return;
	}

	refreshMatchData();
	refreshPredictionData();

	var date = new Date(),
		split = message.match( /\S+/g ) || [],
		game = split[1].replace( /_/g, ' ' ),
		winner = split[2],
		punishment = split.slice( 3, split.length ).join( ' ' ),
		lastScores = lastMatch.results.scores;

	var match = {
		date: date,
		game: game,
		punishment: punishment,
		results: {
			scores: {
				hobz: lastScores.hobz,
				spike: lastScores.spike
			},
			times: [],
			winner: winner
		}
	};

	match.results.scores[winner]++;
	matches.push( match );
	lastMatch = match;
	saveJsonToFile( MATCHESFILE, matches );
	updatePoints( winner );
	isMatchInProgress = false;

	say(
		channel,
		'Match recorded. Predictions are now available for the next match.',
		userstate
	);
};

function refreshMatchData() {
	matches = loadJsonFromFile( MATCHESFILE );
	lastMatch = matches[matches.length - 1];
	var lastMatchDate = new Date( lastMatch.date );

	// This feels dirty... but expire cache day after next match
	var expiry = new Date(
		lastMatchDate.getFullYear(),
		lastMatchDate.getMonth(),
		lastMatchDate.getDate() + 8
	);

	while ( expiry.getTime() < (new Date()).getTime() ) {
		expiry = new Date(
			expiry.getFullYear(),
			expiry.getMonth(),
			expiry.getDate() + 7
		);
	}

	matches._expiry = expiry;
}

function refreshPredictionData() {
	refreshMatchData();

	predictions = loadJsonFromFile( PREDICTIONSFILE );
	var lastMatchDate = new Date( lastMatch.date );

	// This feels dirty... but expire cache day after next match
	var expiry = new Date(
		lastMatchDate.getFullYear(),
		lastMatchDate.getMonth(),
		lastMatchDate.getDate() + 8
	);

	while ( expiry.getTime() < (new Date()).getTime() ) {
		expiry = new Date(
			expiry.getFullYear(),
			expiry.getMonth(),
			expiry.getDate() + 7
		);
	}

	predictions._expiry = expiry;
}

function updatePoints( winner ) {
	// FIXME: Everything
	var week = matches.length;
	for ( var user in predictions ) {
		// FIXME: Find a way to not hard-code this check
		if ( user !== '_expiry' && predictions[user].predictions[week] === winner ) {
			predictions[user].score++;
		}
	}
	saveJsonToFile( PREDICTIONSFILE, predictions );
}

/**
 * Start main application thread
 */
function run() {
	channels = loadJsonFromFile( CHANNELSFILE );
	commands = loadJsonFromFile( COMMANDSFILE );

	// FIXME: Make all this less gross
	commands.uptime = {
		type: 'function',
		action: 'uptime'
	};
	commands.addcommand = {
		type: 'function',
		level: 1,
		action: 'addcommand'
	};
	commands.removecommand = {
		type: 'function',
		level: 0,
		action: 'removecommand'
	};
	commands.commands = {
		type: 'function',
		action: 'commands'
	};
	commands.score = {
		type: 'function',
		action: 'score'
	};
	commands.points = {
		type: 'function',
		action: 'points'
	};
	commands.predict = {
		type: 'function',
		action: 'predict'
	};
	commands.startmatch = {
		type: 'function',
		level: 1,
		action: 'startMatch'
	};
	commands.recordmatch = {
		type: 'function',
		level: 0,
		action: 'recordMatch'
	};

	permissions = loadJsonFromFile( PERMISSIONSFILE );

	client = initClient();
	client.connect();
	client.on( 'message', handleMessage );
}

process.on( 'SIGINT', function() {
    quit();
} );

run();
