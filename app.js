var irc = require('tmi.js'),
	request = require('request'),
	fs = require('fs'),
	_ = require('underscore'),
	CHANNELSFILE = 'channels.json',
	COMMANDSFILE = 'commands.json',
	channels,
	client,
	commands;

//var clientId = config.clientId || ""; // A client ID technically isn't necessary, but it's nice to include to prevent rate-limits: https://github.com/justintv/Twitch-API#rate-limits

function initClient( channels ) {
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

function loadChannels( filename ) {
	loadFromFile( filename, function ( response ) {
		channels = response.channels;
		console.log(channels);
	} );
}

function loadCommands( filename ) {
	loadFromFile( filename, function ( response ) {
		commands = response.commands;
		console.log(commands);
	} );
}

/*
 * example userstate object
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

function say( channel, msg, userstate ) {
	switch( userstate['message-type'] ) {
		case 'action':
			client.action( channel, '/me ' + msg );
			break;
		case 'chat':
			client.say( channel, msg );
			break;
		case 'whisper':
			client.whisper( userstate['username'], msg );
			break;
		default:
			console.log( 'Unknown message type: ' + userstate['message-type'] + '. Attempted to say: ' + msg );
			break;
	}
}

/**
 * Load data from file
 *
 * @param file file from which to read
 * @param callback callback function, executed after success
 */
function loadFromFile( filename, callback ) {
    fs.readFile( filename, 'utf8', function( error, data ) {
        if ( error ) {
            throw error;
        }
        callback( JSON.parse( data ) );
    });
}

/**
 * Save data to file
 *
 * @param file file to write to
 * @param data fuck it we'll document you later
 * @param callback callback function, executed after success
 */
function saveToFile( filename, data, callback ) {
    fs.writeFile( filename, JSON.stringify( data ), function( error ) {
        if ( error ) {
            throw error;
        }
		callback( file );
    });
}

function quit() {
    client.say(hostChannel, "Exiting application");
    client.disconnect();
    process.exit();
}

function saveChannels() {
    fs.writeFile(channelsFile, JSON.stringify(channels), function(error) {
        if (error) {
            throw error;
        }
    });
}

function getLiveChannels(callback) {
    var allChannels = Object.keys(channels);
    var liveChannels = [];
    var count = 0;
    var parameters = [
        'limit=100',
        'stream_type=live',
        'client_id=' + clientId
    ];
    _.each(allChannels, function(channel, index) {
        request('https://api.twitch.tv/kraken/streams/' + channel + "?" + parameters.join("&"), function(error, response, body) {
            body = JSON.parse(body);
            if(body.stream) {
                liveChannels.push(channel);
            }

            if(index === (allChannels.length - 1)) {
                callback(liveChannels);
            }
        });
    });
}

function run() {
	loadChannels( CHANNELSFILE );
	loadCommands( COMMANDSFILE );

	// Try to init client. Wait if channels are not loaded.
	var clientInterval = setInterval( function () {
		if ( channels ) {
			client = initClient( channels );
			clearInterval( clientInterval );
			client.connect();
			client.on( 'logon', function () {
				console.log('logon');
			} );
			client.on( 'message', handleMessage );
		}
	}, 10 );
}

run();

process.on('SIGTERM', function() {
    quit();
});
