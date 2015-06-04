module.exports = function( config ){
    config.set( {
        files: [
            //libraries
            'bower_components/jquery/dist/jquery.js',
            'bower_components/angular/angular.js',
            'bower_components/angular-mocks/angular-mocks.js',

            //code
            'build/js/!(*.min).js',
               
            //styles
            'build/css/drg-slider.css',

            //tests
            'src/js/*_test.js'
        ],
        frameworks: [ 'jasmine' ],
        browsers: [ 'PhantomJS' ],
		reporters: 'dots'
    } );
};
