module.exports =
{
	updateVersion: {
		src: ['app/src/VersionInfo.js'],
		overwrite: true,                 // overwrite matched source files
		replacements: [
			{
				from: /version: \'.*?\'/,
				to: 'version: \'<%= config.moduleVersion %>\''
			}
			,{
				from: /id: \'.*?\'/,
				to: 'id: \'<%= config.moduleOut %>\''
			}
			,{
				from: /buildDate: \'.*?\'/,
				to: 'buildDate: \'<%= grunt.template.today("UTC:yyyy-mm-dd HH:MM:ss \'UTC\'") %>\''
			}
		]
	}
};
