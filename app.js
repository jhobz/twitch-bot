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
 * List of channels to which to connect.
 */
	channels,

/**
 * tmi client instance
 */
	client,

/**
 * List of commands to listen for.
 */
	commands;

/**
 * Initialize the tmi client and connect to channels.
 * @return Promise
 */
function initClient() {
	var options = {
			options: {
				debug: true,
			},
			connection: {
				cluster: "aws",
				reconnect: true
			},
			identity: {
				username: 'guylove',
				password: 'oauth:wb99bxkegr490kuko2eekhwa4kufwg'
			},
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
*/
function handleMessage( channel, userstate, msg, isSelfMessage ) {
	// Eliminate whitespace mistakes (e.g. "  !command      param")
	var split = msg.match( /\S+/g ) || [];
	if ( isSelfMessage || !split.length ) {
		return;
	}

	var command = split[0].substr( 1 ).toLowerCase(), // remove bang
		commandAction = commands[command];

	if( commandAction ) {
		if ( typeof commandAction === 'function' ) {
			commandAction( split.splice( 1 ), function( message, data ) {
				//client.say( channel, userstate["display-name"] + " - " + message + "." );
			} );
		} else {
			say( channel, commandAction, userstate );
		}
	}
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
			console.log( 'Unknown message type: ' + userstate['message-type']
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
    FileSystem.writeFileSync( filename, JSON.stringify( data ) );
}

/**
 * Terminate application
 */
function quit() {
    channels.forEach( function ( channel ) {
		say(
			channel,
			'Terminating application. Please contact the developer (@J_Hobz)'
			+ 'on Twitter if no warning was announced prior to termination.',
			{
				'message-type': 'chat'
			}
		);
	} );
    client.disconnect();
    process.exit();
}

/**
 * Start main application thread
 */
function run() {
	channels = loadJsonFromFile( CHANNELSFILE ).channels;
	commands = loadJsonFromFile( COMMANDSFILE ).commands;

	client = initClient();
	client.connect();
	client.on( 'message', handleMessage );
}

process.on( 'SIGINT', function() {
    quit();
} );

run();
