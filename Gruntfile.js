module.exports = ( grunt ) => {
	grunt.initConfig( {
		pkg: grunt.file.readJSON( 'package.json' ),

		qunit: { // internal task or name of a plugin (like "qunit")
			all: ['tests/*.html']
		},

		watch: {
			files: ['tests/*.js', 'tests/*.html', 'app/*.js'],
			tasks: ['qunit']
		},
	} );
	// load up your plugins
	grunt.loadNpmTasks( 'grunt-contrib-qunit' );
	grunt.loadNpmTasks( 'grunt-contrib-watch' );
	// register one or more task lists (you should ALWAYS have a "default" task list)
	grunt.registerTask( 'default', ['qunit'] );
};