// Copies remaining files to places other tasks can use
module.exports = {
  dist: {
    files: [{
      expand: true,
      cwd: '<%= config.app %>',
	  //flatten: true,
      src: [
        'img/{,*/}*.{png,jpg,gif}'
      ],
      dest: '<%= config.dist %>'
    }]
  }
};
