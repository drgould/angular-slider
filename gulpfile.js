var pkg = require( './package.json' );

var fs = require( 'fs' );
var path = require( 'path' );

var gulp = require( 'gulp' );
var sync = require( 'gulp-sync' )( gulp ).sync;
var rename = require( 'gulp-rename' );
var replace = require( 'gulp-replace' );

var concat = require( 'gulp-concat' );
var sourcemaps = require( 'gulp-sourcemaps' );

var uglify = require( 'gulp-uglify' );
var babel = require( 'gulp-babel' );
var ngannotate = require( 'gulp-ng-annotate' );
var stripdebug = require( 'gulp-strip-debug' );

var sass = require( 'gulp-sass' );
var minifyCss = require( 'gulp-minify-css' );
var sassCompileConfig = {
    sourceComments : true,
    outputStyle : 'expanded'
};

var karma = require( 'karma' ).server;

var sourceDir = './src';
var buildDir = './build';
var releaseDir = './dist';
var demoDir = './demo';

var cssDir = '/css';
var jsDir = '/js';

var compileDir = buildDir;


/********************************************
 *                  SCSS                    *
 ********************************************/

var sourceCssDir = sourceDir + cssDir;
var baseCssFile = sourceCssDir + '/drg-slider.scss';

function setupCssTemplate( dir, filename, destDir ) {
    var name = filename.replace( '.tpl.scss', '' );
    var file = path.join( dir, filename );

    var templateTask = 'template-' + name;
    var compileTask = 'compile-' + templateTask;
    var minifyTask = 'minify-' + templateTask;

    var compiledFilename = 'drg-slider.' + name + '.tpl';

    gulp.task( compileTask, function () {
        return gulp.src( file )
            .pipe( sass( sassCompileConfig ) )
            .pipe( rename( compiledFilename + '.css' ) )
            .pipe( gulp.dest( destDir ) );
    } );
    gulp.task( minifyTask, function () {
        return gulp.src( file )
            .pipe( sourcemaps.init() )
            .pipe( sass( sassCompileConfig ) )
            .pipe( minifyCss() )
            .pipe( rename( compiledFilename + '.min.css' ) )
            .pipe( sourcemaps.write( '.' ) )
            .pipe( gulp.dest( destDir ) );
    } );

    gulp.task( templateTask, [ compileTask, minifyTask ] );

    return templateTask;
}

function templateFilenames() {
    return fs.readdirSync( sourceDir + cssDir ).filter( function( file ) {
        return !!~file.indexOf( '.tpl.scss' );
    } );
}
function templateFiles() {
    return templateFilenames().map( function( filename ) {
        return path.join( sourceDir + cssDir, filename );
    } );
}
function templateTasks() {
    return templateFilenames().map( function( filename ) {
        return setupCssTemplate( sourceDir + cssDir, filename , compileDir + cssDir );
    } );
}

var cssFiles = path.join( sourceCssDir, '*.scss' );

gulp.task( 'template-css', templateTasks() );

gulp.task( 'compile-base-css', function() {
    return gulp.src( baseCssFile )
        .pipe( sass( sassCompileConfig ) )
        .pipe( rename( 'drg-slider.base.css' ) )
        .pipe( gulp.dest( compileDir + cssDir ) );
} );
gulp.task( 'minify-base-css', function () {
    return gulp.src( baseCssFile )
        .pipe( sourcemaps.init() )
        .pipe( sass( sassCompileConfig ) )
        .pipe( minifyCss() )
        .pipe( rename( 'drg-slider.base.min.css' ) )
        .pipe( sourcemaps.write( '.' ) )
        .pipe( gulp.dest( compileDir + cssDir ) );
} );
gulp.task( 'base-css', [ 'compile-base-css', 'minify-base-css' ] );

gulp.task( 'css', [ 'base-css', 'template-css' ] );

gulp.task( 'watch-css', function() {
    gulp.watch( cssFiles, [ 'css' ] );
} );


/**********************************************
 *                      JS                    *
 **********************************************/

function jsDestDir() { return compileDir + jsDir; }
function jsFiles() {
    var srcDir = sourceDir + jsDir;
    return [
        path.join( srcDir, '*.js' ),
        '!' + path.join( srcDir, '*_test.js' )
    ];
}


gulp.task( 'compile-js', function() {
    return gulp.src( jsFiles() )
        .pipe( replace( '{{version}}', pkg.version ) )
        .pipe( sourcemaps.init() )
        .pipe( babel() )
        .pipe( ngannotate() )
        .pipe( concat( 'drg-slider.js' ) )
        .pipe( sourcemaps.write( '.' ) )
        .pipe( gulp.dest( jsDestDir() ) );
} );

gulp.task( 'uglify-js', function() {
    return gulp.src( jsFiles() )
        .pipe( replace( '{{version}}', pkg.version ) )
        .pipe( sourcemaps.init() )
        .pipe( stripdebug() )
        .pipe( babel() )
        .pipe( ngannotate() )
        .pipe( concat( 'drg-slider.min.js' ) )
        .pipe( uglify( { preserveComments : 'some' } ) )
        .pipe( sourcemaps.write( '.' ) )
        .pipe( gulp.dest( jsDestDir() ) );
} );

gulp.task( 'js', [ 'compile-js', 'uglify-js' ] );

gulp.task( 'watch-js', function() {
    gulp.watch( jsFiles(), [ 'js' ] );
} );


/********************************************
 *                Unit Tests                *
 ********************************************/

var karmaConfig = path.join( __dirname, 'karma.conf.js' );

gulp.task( 'karma', function( done ) {
    return karma.start( {
        configFile : karmaConfig,
        singleRun : true
    }, done );
} );
gulp.task( 'karma-watch', function() {
    karma.start( {
        configFile : karmaConfig,
        autoWatch : true
    } );
} );


/********************************************
 *                  Build                   *
 ********************************************/

gulp.task( 'build', [ 'css', 'js' ] );
gulp.task( 'watch', [ 'watch-css', 'watch-js' ] );

gulp.task( 'setup-release', function() {
    compileDir = releaseDir;
    gulp.task( 'template-css', templateTasks() );
} );

gulp.task( 'dev', sync( [ 'build', 'watch', 'karma-watch' ] ) );
gulp.task( 'travis', sync( [ 'build', 'karma' ] ) );
gulp.task( 'release', sync( [ 'setup-release', 'build' ] ) );