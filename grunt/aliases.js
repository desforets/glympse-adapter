
//var metrics = require('famous-metrics');

module.exports = function (grunt) {
  'use strict';
  grunt.registerTask('serve', function (target) {
   // if (metrics.getTracking()) {
   //   metrics.track('grunt serve', {});
   // }

    if (target === 'dist') {
      return grunt.task.run(['build', 'connect:dist:keepalive']);
    }

    grunt.task.run([
      'clean:server',
      'processhtml:dev',
      'connect:livereload',
      'watch'
    ]);
  });

  grunt.registerTask('build', [
    'clean:dist',
    'lint',
    'processhtml:dist',
    'useminPrepare',
    'requirejs:compile',
    'concat',
    //'cssmin',
    'newer:uglify',
	'newer:imagemin',
    'copy:dist',
    'rev',
    'usemin',
    'htmlmin'
	//'clean:postDist'
  ]);

  grunt.registerTask('lint', [
    'jscs',
    'eslint'
  ]);
  
  grunt.registerTask('test', [
    'lint'
  ]);
  
  grunt.registerTask('crush', [
    'newer:imagemin'
  ]);

  grunt.registerTask('default', [
    'build'
  ]);
};
