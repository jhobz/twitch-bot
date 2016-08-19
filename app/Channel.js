'use strict';

const Feature = require( './Feature' ),
	extend = require( 'extend' );

class Channel {
	static get TRIGGER_CHAR() { return '!'; }
	static get BASE_AUTHORITY_LEVEL() { return 2; }

	constructor( features = Feature.DEFAULT_FEATURES ) {
		this.features = features;
		this.permissions = new Map();
	}

	setAuthorityLevel( user, authorityLevel = Channel.BASE_AUTHORITY_LEVEL ) {
		this.permissions.set( user, authorityLevel );
	}

	getAuthorityLevel( user ) {
		let level = this.permissions.get( user );
		return level !== undefined ? level : Channel.BASE_AUTHORITY_LEVEL;
	}

	handleMessage( message, user ) {
		let split = message.match( /\S+/g ),
			features = this.features;

		for ( let i in features ) {
			let command = features[i].getCommand( split[0].substr( 1 ).toLowerCase() ),
				level = this.getAuthorityLevel( user );
			if (
				command
				&& level > -1
				&& level <= command.level
			) {
				return command.performAction( split.splice( 1 ).join( ' ' ), user );
			}
		}

		return false;
	}
}

module.exports = Channel;
