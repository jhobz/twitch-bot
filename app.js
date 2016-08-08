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
	CHANNELSFILE = 'channels.json',

/**
 * Location of list of commands to load.
 */
	COMMANDSFILE = 'commands.json',

/**
 * Location of permissions table.
 */
	PERMISSIONSFILE = 'permissions.json',

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
 * Permissions table
 */
	permissions;

/**
 * Initialize the tmi client and connect to channels.
 * @return Promise
 */
function initClient() {
	// TODO: Allow connecting under multiple identities
	var identity = loadJsonFromFile( 'credentials.json' )[0],
		options = {
			options: {
				debug: true,
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
	// Eliminate whitespace mistakes (e.g. "  !command      param")
	var split = msg.match( /\S+/g ) || [],
		user = userstate['username'];

	if (
		isSelfMessage
		|| permissions[user] < 0
		|| !split.length
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
			client.whisper( userstate['username'], msg );
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
				{ 'message-type': 'chat' }
 * @param string filename file to write to
 * @param object data json to write to file
 */
function saveJsonToFile( filename, data ) {
    FileSystem.writeFileSync( filename, JSON.stringify( data ) );
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
}

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
}

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
}

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
		action: 'addcommand'
	};
	commands.commands = {
		type: 'function',
		action: 'commands'
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
