'use strict';

class Command {
	// FIXME: level = Channel.baseAuthorityLevel or something
	constructor( trigger, action, level = 2 ) {
		this.trigger = trigger;
		this.action = action;
		this.level = level;
	}

	get trigger() {
		return this.triggerWord;
	}

	set trigger( trigger ) {
		if (
			trigger.charAt( 0 ) === '!'
			|| trigger.charAt( 0 ) === '.'
			|| trigger.charAt( 0 ) === '/'
		) {
			trigger = trigger.substr( 1 );
		}
		this.triggerWord = trigger;
	}

	performAction( message, user ) {
		if ( typeof this.action === 'function' ) {
			return this.action( message, user );
		}
		return this.action;
	}
}

module.exports = Command;
