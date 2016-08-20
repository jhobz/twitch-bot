module.exports = function ( grunt ) {
	grunt.initConfig( {
		pkg: grunt.file.readJSON( 'package.json' ),

		mochaTest: {
			test: {
				options: {
					colors: true,
					reporter: 'min',
				},
				src: ['tests/**/*.js'],
			},
		},

		watch: {
			files: ['tests/*.js', 'app/*.js'],
			tasks: ['mochaTest'],
			options: {
				interrupt: true,
			},
		},
	} );
	// load up your plugins
	grunt.loadNpmTasks( 'grunt-mocha-test' );
	grunt.loadNpmTasks( 'grunt-contrib-watch' );
	// register one or more task lists (you should ALWAYS have a "default" task list)
	grunt.registerTask( 'default', ['mochaTest'] );
};