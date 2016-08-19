'use strict';

class Feature {
	constructor( commands = [] ) {
		this.commands = commands;
		this.commandMap = new Map( commands.map( ( i ) => [ i.trigger, i ] ) );
	}

	static get DEFAULT_FEATURES() {
		return [ 'feature' ];
	}

	getCommand( trigger ) {
		return this.commandMap.get( trigger );
	}
}

module.exports = Feature;
