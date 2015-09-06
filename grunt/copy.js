// Copies remaining files to places other tasks can use
module.exports = {
  dist: {
    files: [{
      expand: true,
      dot: true,
      cwd: '<%= config.app %>',
      dest: '<%= config.distExports %>',
      src: [
		'js/{,*/}*.*'
      ]
    }]
  },
  build: {
	files: [{
      expand: true,
      cwd: '<%= config.distExports %>',
      dest: '<%= config.builds %>',
      src: [ '*.min.*' ]
    }]
  }
};
