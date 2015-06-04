angular.module( 'drg.slider' )
    .directive( 'drgSlider', function ( $document, $compile, $interpolate ) {
        return {
            restrict : 'EA',
            controller : 'SliderCtrl',
            scope : true,
            compile : function ( elem, attr ) {
                // check requirements
                if ( angular.isUndefined( attr.floor ) ) {
                    throw "ngSlider Error: Floor not specified";
                }
                if ( angular.isUndefined( attr.ceiling ) ) {
                    throw "ngSlider Error: Ceiling not specified";
                }

                return function ( scope, elem, attr, ctrl ) {

                    /**
                     * Get the current relative position of the cursor at the given index
                     * @param ev {Event}
                     * @param index {number}
                     * @returns {number}
                     */
                    function cursorPosition( ev, index ) {
                        var position = -1 * scope.dimensions().sliderOffset;
                        if ( ctrl.options.vertical ) {
                            position += ev.touches ? ev.touches[ index ].pageY : ev.pageY;
                        } else {
                            position += ev.touches ? ev.touches[ index ].pageX : ev.pageX;
                        }
                        return position;
                    }

                    /**
                     * Get the current position of the given knob
                     * @param knob {angular.element}
                     * @returns {number}
                     */
                    function knobPosition( knob ) {
                        var offset = ctrl.options.vertical ? knob[ 0 ].offsetTop : knob[ 0 ].offsetLeft;
                        return offset - scope.dimensions().sliderOffset;
                    }

                    // add the bars
                    elem.prepend( $compile( '<drg-slider-bar low="' + $interpolate.startSymbol() + ' bar.low() ' + $interpolate.endSymbol() + '" high="' + $interpolate.startSymbol() + ' bar.high() ' + $interpolate.endSymbol() + '" ng-repeat="bar in bars"></ng-slider-bar>' )( scope ) );

                    /**
                     * Get the current slider size and offset
                     * @returns {{sliderSize: number, sliderOffset: number}}
                     */
                    scope.dimensions = function () {
                        // get the offset for the slider
                        var offset = ctrl.options.vertical ? elem[ 0 ].offsetTop : elem[ 0 ].offsetLeft;

                        if ( elem[ 0 ].offsetParent ) {
                            // take into account the offset of this element's parent
                            offset += ctrl.options.vertical ? elem[ 0 ].offsetParent.offsetTop : elem[ 0 ].offsetParent.offsetLeft;
                        }

                        return {
                            sliderSize : ctrl.options.vertical ? elem[ 0 ].offsetHeight : elem[ 0 ].offsetWidth,	// get the size of the slider
                            sliderOffset : offset
                        };
                    };

                    /**
                     * What to do when the user starts sliding
                     * @param ev {Event}
                     */
                    scope.onStart = function ( ev ) {
                        // get the index of the touch/mouse
                        var index = 0;
                        if ( ev.targetTouches ) {
                            index = ev.targetTouches[ 0 ].identifier;
                        }

                        // save the starting position(s)
                        if ( angular.isArray( scope.currentKnobs[ index ] ) && scope.currentKnobs[ index ].length > 1 ) {
                            var cursorPos = cursorPosition( ev, index );
                            scope.startOffsets[ index ] = scope.currentKnobs[ index ].map( function ( knob ) {
                                return knobPosition( knob.elem ) - cursorPos;
                            } );
                        } else {
                            scope.startOffsets[ index ] = [ 0 ];
                        }

                        // fire a "move"
                        scope.onMove( ev );
                    };

                    /**
                     * What to do when a knob is moved
                     * @param ev {Event}
                     */
                    scope.onMove = function ( ev ) {
                        // get the current dimensions
                        var dimensions = scope.dimensions();

                        angular.forEach( scope.currentKnobs, function ( knobs, index ) {
                            if ( scope.currentKnobs[ index ] ) {
                                // get the current mouse position
                                var position = cursorPosition( ev, index );

                                var startOffsets = scope.startOffsets[ index ];

                                if ( !angular.isArray( knobs ) ) {
                                    knobs = [ knobs ];
                                }

                                // get the size of the knob(s) being dragged
                                for ( var i = 0; i < knobs.length; i++ ) {
                                    // get the size of the knob
                                    var knobSize = ctrl.options.vertical ? knobs[ i ].elem[ 0 ].offsetHeight : knobs[ i ].elem[ 0 ].offsetWidth;

                                    // get the current mouse/finger position as a percentage
                                    var percent = Math.max( 0, Math.min( (position + startOffsets[ i ] - (knobSize / 2)) / (dimensions.sliderSize - knobSize), 1 ) );

                                    // compute the value from the percentage
                                    var value = ((percent * (scope.ceiling - scope.floor)) + scope.floor).toFixed( ctrl.options.precision );

                                    // update the model for the knob being dragged
                                    knobs[ i ].ngModel.$setViewValue( value );
                                    if ( !scope.$$phase ) {
                                        scope.$apply();
                                    }
                                }
                            }
                        } );
                    };

                    /**
                     * What to do when the slide is finished
                     */
                    scope.onEnd = function ( index ) {
                        // remove the knob from the list of knobs currently being dragged
                        var knobs = scope.currentKnobs[ index ] || [];
                        if( index < scope.currentKnobs.length ) {
                            delete scope.currentKnobs[ index ];
                        }

                        if ( !angular.isArray( knobs ) ) {
                            knobs = [ knobs ];
                        }

                        angular.forEach( knobs, function ( knob ) {
                            // fire the knob's onEnd callback
                            knob.onEnd();
                        } );

                        if ( scope.currentKnobs.length == 0 ) {
                            // we're no longer sliding
                            scope.sliding = false;
                        }
                    };

                    scope.onResize = function() {
                        scope.fix();
                    };

                    // set the default events
                    var moveEvents = [ 'mousemove', 'touchmove' ];
                    var cancelEvents = [ 'mousecancel', 'touchcancel' ];
                    var endEvents = [ 'mouseup', 'touchend' ];

                    if ( window.PointerEvent ) {
                        // the browser supports javascript Pointer Events (currently only IE11), use those
                        moveEvents = [ 'pointermove' ];
                        cancelEvents = [ 'pointercancel' ];
                        endEvents = [ 'pointerup' ];
                    } else if ( window.navigator.msPointerEnabled ) {
                        // the browser supports M$'s javascript Pointer Events (IE10), use those
                        moveEvents = [ 'MSPointerMove' ];
                        cancelEvents = [ 'MSPointerCancel' ];
                        endEvents = [ 'MSPointerUp' ];
                    }

                    // bind the move events
                    angular.forEach( moveEvents, function ( event ) {
                        $document.bind( event, function ( ev ) {
                            if ( scope.sliding ) {
                                // they see me slidin', they hatin'
                                ev.preventDefault();
                                ev.stopPropagation();
                                scope.onMove( ev );
                            }
                        } );
                    } );

                    // bind the end and cancel events
                    angular.forEach( cancelEvents.concat( endEvents ), function ( event ) {
                        $document.bind( event, function ( ev ) {
                            if ( scope.sliding ) {
                                // it's electric, boogie woogie, woogie

                                // fire the end events for the drags that are ending
                                if ( ev.changedTouches ) {
                                    for ( var i = 0; i < ev.changedTouches.length; i++ ) {
                                        scope.onEnd( ev.changedTouches[ i ].identifier );
                                    }
                                } else {
                                    scope.onEnd( 0 );
                                }
                            }
                        } );
                    } );

                    // watch for disabilities
                    scope.$watch( function () {
                        return scope.$eval( attr.ngDisabled );
                    }, function ( disabled ) {
                        // do we have disabilities?
                        scope.disabled = angular.isDefined( disabled ) && disabled;

                        // tell the DOM
                        if ( scope.disabled ) {
                            elem.addClass( 'disabled' );
                        } else {
                            elem.removeClass( 'disabled' );
                        }

                        if ( scope.sliding ) {
                            // I wanna wake up where you are, I won't say anything at all
                            angular.forEach( scope.currentKnobs.keys(), function ( index ) {
                                scope.onEnd( index );
                            } );
                        }
                    } );

                    // watch the attributes and update as necessary
                    attr.$observe( 'ceiling', function ( ceiling ) {
                        ceiling = angular.isDefined( ceiling ) ? parseFloat( ceiling ) : 0;
                        scope.ceiling = isNaN( ceiling ) ? 0 : ceiling;
                        scope.onResize();
                    } );
                    attr.$observe( 'floor', function ( floor ) {
                        floor = angular.isDefined( floor ) ? parseFloat( floor ) : 0;
                        scope.floor = isNaN( floor ) ? 0 : floor;
                        scope.onResize();
                    } );
                    scope.$watch( function () {
                        return scope.$eval( attr.drgSliderOptions );
                    }, function ( opts ) {
                        ctrl.options = angular.extend( {}, ctrl.defaultOptions, angular.isDefined( opts ) && angular.isObject( opts ) ? opts : {} );
                        if ( ctrl.options.vertical ) {
                            elem.addClass( 'drg-slider-vertical' ).removeClass( 'drg-slider-horizontal' );
                        } else {
                            elem.addClass( 'drg-slider-horizontal' ).removeClass( 'drg-slider-vertical' );
                        }
                    }, true );

                    scope.$on( 'drgSlider.resize', scope.onResize );
                };
            }
        }
    } );
