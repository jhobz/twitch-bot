QUnit.module( 'Basic tests' );

// TODO: Add a real test
QUnit.test( 'truthy', function ( assert ) {
	assert.expect( 3 );
	assert.ok( true, 'true is truthy' );
	assert.equal( 1, true, '1 is truthy' );
	assert.notEqual( 0, true, '0 is NOT truthy' );
} );
