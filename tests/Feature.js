'use strict';

const chai = require( 'chai' ),
	expect = chai.expect,
	Command = require( '../app/Command' ),
	Feature = require( '../app/Feature' );

describe( 'Feature', function () {
	describe( '#constructor()', function () {
		it( 'should set the list of commands to an empty array by default', function () {
			expect( new Feature().commands ).to.deep.equal( [] );
		} );

		it( 'should set the list of given commands', function () {
			expect(
				new Feature(
					[ new Command( 'a', 'msg' ) ]
				).commands
			).to.deep.equal( [ new Command( 'a', 'msg' ) ] );
		} );
	} );

	describe( '#getCommand()', function () {
		let feature = new Feature( [
			new Command( 'a', 'msg' ),
			new Command( 'b', 'msg2' )
		] );

		it( 'should return a command with the given trigger if one exists', function () {
			expect( feature.getCommand( 'a' ) ).to.deep.equal( new Command( 'a', 'msg' ) );
		} );
	} );
} );
