'use strict';

const chai = require( 'chai' ),
	expect = chai.expect,
	Command = require( '../app/Command.js' );

describe( 'Command', function () {
	let command = new Command( 'myTrigger', 'myAction' );

	describe( '#constructor()', function () {
		it( 'should set Command.trigger', function () {
			expect( command.trigger ).to.equal( 'myTrigger' );
		} );

		it( 'should strip special characters before setting Command.trigger', function () {
			expect( new Command( '!myTrigger', 'myAction' ).trigger ).to.equal( 'myTrigger' );
		} );

		it( 'should set Command.action', function () {
			expect( command.action ).to.equal( 'myAction' );
		} );

		it( 'should set Command.level to 2 by default', function () {
			expect( command.level ).to.equal( 2 );
		} );

		it( 'should set Command.level when specified', function () {
			expect( new Command( 'myTrigger', 'myAction', 1 ).level ).to.equal( 1 );
		} );
	} );

	describe( '#performAction()', function () {
		it( 'should call a function if one is given', function () {
			expect( new Command( 'myTrigger', () => 'test' ).performAction() ).to.equal( 'test' );
		} );

		it( 'should return a message if its action is a string', function () {
			expect( command.performAction() ).to.equal( 'myAction' );
		} );

		it( 'should pass params to functions', function () {
			let complexCommand = new Command(
				'myTrigger',
				( msg, user ) => user + ': ' + msg
			);
			expect(
				complexCommand.performAction( 'command params', 'user' )
			).to.equal( 'user: command params' );
			expect(
				complexCommand.performAction( '', 'user' )
			).to.equal( 'user: ' );
		} );
	} );
} );
