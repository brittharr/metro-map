module.exports = function(grunt){
    "use strict";
    require("matchdep").filterDev("grunt-*").forEach(grunt.loadNpmTasks);

    grunt.initConfig({
        php: {
            dev: {
                options: {
                    hostname: 'localhost',
                    port: 4000,
                    base: '.',
                    keepalive: true
                }
            }
        }
    });

    grunt.registerTask('default', ['php:dev']);
};
