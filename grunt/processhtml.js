module.exports = {
  dev: {
    files: {
      '.tmp/index.html': ['<%= config.app %>/index.html']
    }
  },
  dist: {
    files: {
      '<%= config.distExports %>/index.html': ['<%= config.app %>/index.html']
    }
  },
  options: {
    commentMarker: 'process'
  }
};
