angular.module( 'drg.slider' )
    .directive( 'drgSliderKnob', function ( $parse, $timeout ) {
        return {
            restrict : 'EA',
            require : [ '^drgSlider', '^ngModel' ],
            scope : true,
            compile : function ( elem, attr ) {
                // make sure we have a model
                if ( angular.isUndefined( attr.ngModel ) ) {
                    throw "ngSliderKnob Error: ngModel not specified";
                }

                return function ( scope, elem, attr, ctrls ) {
                    // get the controllers
                    var ngSliderCtrl = ctrls[ 0 ];
                    var ngModelCtrl = ctrls[ 1 ];

                    // is the knob enabled?
                    scope.enabled = true;

                    /**
                     * Make sure the value gets applied up the hierarchy
                     * @param value {number}
                     */
                    function updateModel( value ) {
                        $parse( attr.ngModel ).assign( scope.$parent.$parent, parseFloat( value ) );
                        if ( !scope.$$phase ) {
                            scope.$apply();
                        }
                    }

                    /**
                     * Move the knob to the correct position
                     * @param value
                     */
                    function updateKnob( value ) {
                        // set the CSS as needed
                        elem.css( ngSliderCtrl.options.vertical ? 'top' : 'left', ngSliderCtrl.valueToPercent( value, elem ) + '%' );
                    }

                    // register the knob
                    var knob = ngSliderCtrl.registerKnob( {
                        ngModel : ngModelCtrl,			// the model
                        elem : elem,						// the knob DOM element
                        onChange : function ( value ) {		// what to do when the model changes
                            // sync the model
                            updateModel( value );
                            updateKnob( value );

                            // expose the value to the scope
                            scope.$viewValue = value;

                        },
                        onStart : function () {			// what to do when the user starts dragging this knob
                            elem.addClass( 'active' );
                        },
                        onEnd : function () {				// what to do when the user stops dragging this knob
                            elem.removeClass( 'active' );
                        }
                    } );

                    // watch for disabilities
                    scope.$watch( function () {
                        return scope.$eval( attr.ngDisabled );
                    }, function ( disabled ) {
                        // is the knob disabled?
                        scope.enabled = !disabled;

                        // tell the DOM
                        if ( disabled ) {
                            elem.addClass( 'disabled' );
                        } else {
                            elem.removeClass( 'disabled' );
                        }

                        // tell the slider this knob is disabled
                        scope.enabled || knob.disabled()
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
                            knob.start( ev );
                        } );
                    } );

                    $timeout( function() {
                        updateKnob( scope.$viewValue );
                    } );
                };
            }
        }
    } );
