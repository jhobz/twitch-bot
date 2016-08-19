'use strict';

const chai = require( 'chai' ),
	expect = chai.expect,
	Channel = require( '../app/Channel' ),
	Command = require( '../app/Command' ),
	Feature = require( '../app/Feature' );

describe( 'Channel', function () {
	describe( '#constructor()', function () {
		it( 'should set the base list of features by default', function () {
			expect( new Channel().features ).to.deep.equal( Feature.DEFAULT_FEATURES );
		} );

		it( 'should set the list of features when given', function () {
			expect(
				new Channel( [ 'feature1', 'feature2' ] ).features
			).to.deep.equal( [ 'feature1', 'feature2' ] );
		} );
	} );

	describe( '#setAuthorityLevel()', function () {
		let channel = new Channel();

		it( 'should set the authorityLevel to the given user', function () {
			channel.setAuthorityLevel( 'myUser', 1 );
			expect( channel.permissions.get( 'myUser' ) ).to.equal( 1 );
		} );

		it( 'should not erase permissions of other users', function () {
			channel.setAuthorityLevel( 'myUser', 1 );
			channel.setAuthorityLevel( 'secondUser', 2 );
			expect( channel.permissions.get( 'myUser' ) ).to.equal( 1 );
		} );

		it( 'should change permissions of existing users', function () {
			channel.setAuthorityLevel( 'myUser', 1 );
			channel.setAuthorityLevel( 'myUser', 2 );
			expect( channel.permissions.get( 'myUser' ) ).to.equal( 2 );
		} );

		it( 'should set the authorityLevel to the base authority level by default', function () {
			channel.setAuthorityLevel( 'myUser' );
			expect( channel.permissions.get( 'myUser' ) ).to.equal( Channel.BASE_AUTHORITY_LEVEL );
		} );
	} );

	describe( '#getAuthorityLevel()', function () {
		let channel = new Channel();

		it( 'should return the base authority level for unregistered users', function () {
			expect( channel.getAuthorityLevel( 'user' ) ).to.equal( Channel.BASE_AUTHORITY_LEVEL );
		} );

		it( 'should return the authority level of set users', function () {
			channel.setAuthorityLevel( 'user', 1 );
			expect( channel.getAuthorityLevel( 'user' ) ).to.equal( 1 );
		} );
	} );

	describe( '#handleMessage()', function () {
		let channel = new Channel( [
			new Feature( [
				new Command( 'a', 'msg' ),
				new Command( 'b', () => 'msg2' ),
				new Command( 'c', ( p, u ) => u + ': ' + p ),
				new Command( 'd', 'msg3', 1 ),
			] )
		] );

		it( 'should execute a command if its trigger is given', function () {
			expect( channel.handleMessage( '!a' ) ).to.equal( 'msg' );
			expect( channel.handleMessage( '!b' ) ).to.equal( 'msg2' );
		} );

		it( 'should return false if no command exists with the given trigger', function () {
			expect( channel.handleMessage( '!u' ) ).to.not.be.ok;
		} );

		it( 'should properly pass on parameters', function () {
			expect( channel.handleMessage( '!c param param2', 'user' ) ).to.equal( 'user: param param2' );
			expect( channel.handleMessage( '!c', 'user' ) ).to.equal( 'user: ' );
		} );

		it( 'should ignore case', function () {
			expect( channel.handleMessage( '!A' ) ).to.equal( 'msg' );
		} );

		it( 'should check authorityLevel', function () {
			channel.setAuthorityLevel( 'op', 1 );
			channel.setAuthorityLevel( 'su', 0 );
			channel.setAuthorityLevel( 'banned', -1 );

			expect( channel.handleMessage( '!d', 'user' ) ).to.not.be.ok;
			expect( channel.handleMessage( '!d', 'banned' ) ).to.not.be.ok;
			expect( channel.handleMessage( '!d', 'op' ) ).to.equal( 'msg3' );
			expect( channel.handleMessage( '!d', 'su' ) ).to.equal( 'msg3' );
		} );
	} );
} );