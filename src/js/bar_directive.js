angular.module( 'drg.slider' )
    .directive( 'drgSliderBar', function () {
        return {
            restrict : 'EA',
            require : '^drgSlider',
            compile : function ( elem, attr ) {
                return function ( scope, elem, attr, ngSliderCtrl ) {
                    // set up the defaults
                    scope.low = 0;
                    scope.high = 0;
                    scope.lowKnob = null;
                    scope.highKnob = null;

                    /**
                     * keep the bar the correct size
                     */
                    function updateBar() {
                        // get the bar's offset
                        var offset = ngSliderCtrl.valueToPercent( scope.low, scope.lowKnob ? scope.lowKnob.elem : null, true );

                        // compute the size of the bar
                        var size = ngSliderCtrl.valueToPercent( scope.high, scope.highKnob ? scope.highKnob.elem : null, true ) - offset;

                        // set the CSS
                        if( ngSliderCtrl.options.vertical ) {
                            elem.css( {
                                top : offset + '%',
                                height : size + '%'
                            } );
                        } else {
                            elem.css( {
                                left : offset + '%',
                                width : size + '%'
                            } );
                        }
                    }

                    // register this bar with the slider
                    var bar = ngSliderCtrl.registerBar( {
                        elem : elem,
                        scope : scope,
                        onStart : function () {
                            elem.addClass( 'active' );
                        },
                        onChange : function () {
                            updateBar();
                        },
                        onEnd : function () {
                            elem.removeClass( 'active' );
                        }
                    } );

                    // watch the attributes for updates
                    attr.$observe( 'low', function ( low ) {
                        scope.low = low;
                        updateBar();
                    } );
                    attr.$observe( 'high', function ( high ) {
                        scope.high = high;
                        updateBar();
                    } );

                    // set the default events
                    var events = [ 'mousedown', 'touchstart' ];
                    if ( window.PointerEvent ) {
                        // the browser supports javascript Pointer Events (currently only IE11), use those
                        events = [ 'pointerdown' ];
                    } else if ( window.navigator.MSPointerEnabled ) {
                        // the browser supports M$'s javascript Pointer Events (IE10), use those
                        events = [ 'MSPointerDown' ]
                    }

                    // bind the start events
                    angular.forEach( events, function ( event ) {
                        elem.bind( event, function ( ev ) {
                            ev.preventDefault();
                            ev.stopPropagation();
                            bar.start( ev );
                        } );
                    } );
                }
            }
        }
    } );