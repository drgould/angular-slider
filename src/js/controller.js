angular.module( 'drg.slider' )
    .controller( 'SliderCtrl', function ( $scope, $timeout ) {

        var SPACING_EQUAL = 'equal';
        var SPACING_RELATIVE = 'relative';

        // keep track of the registered knobs
        $scope.knobs = [];

        // keep track of the bars that have been created
        $scope.bars = [];

        // store the bars registered
        var registeredBars = [];

        // we'll use this to tell which knob is currently being moved
        $scope.currentKnobs = [];
        $scope.startOffsets = [];
        $scope.sliding = false;

        // set the default options
        this.defaultOptions = {
            precision : 0,
            buffer : 0,
            steps : 0,
            values : [],
            spacing : SPACING_RELATIVE, // how to space the notches on the slider "relative" or "equal"
            continuous : false,
            vertical : false
        };
        // reference the options locally to avoid any scoping issues
        this.options = this.defaultOptions;

        var ctrl = this;

        function knobSort( a, b ) {
            var a_val = a.ngModel.$modelValue;
            var b_val = b.ngModel.$modelValue;
            return a_val > b_val ? 1 : (b_val > a_val ? -1 : 0);
        }

        function sortKnobs() {
            $scope.knobs.sort( knobSort );
        }

        /**
         * Sort the knobs by model value
         */
        function updateKnobs() {
            sortKnobs();
            angular.forEach( $scope.knobs, function ( knob ) {
                knob.ngModel.$modelValue = Math.max( $scope.floor, Math.min( knob.ngModel.$modelValue, $scope.ceiling ) );
            } );
        }

        /**
         * Add a bar
         */
        function addBar() {
            $scope.bars.push( {
                low : function () {
                    return 0;
                },
                high : function () {
                    return 0;
                }
            } );
        }

        /**
         * Remove a bar
         */
        function removeBar() {
            $scope.bars.splice( 0, 1 );
        }

        /**
         * Make sure the correct number of bars exist and all have the right data
         */
        function updateBars() {
            // get the knob count
            var numKnobs = $scope.knobs.length;

            // add bars so we have one more bar than knobs
            while ( $scope.bars.length < numKnobs + 1 ) {
                addBar();
            }

            // remove bars so we have one more bar than knobs
            while ( $scope.bars.length > numKnobs + 1 ) {
                removeBar();
            }

            /**
             * Isolate the index from the for loop below so the low value is always correct
             * @param index {number}
             * @returns {Function}
             */
            function lowFn( index ) {
                /**
                 * Get the low value for the bar
                 * @returns {number}
                 */
                return function () {
                    return index > 0 ? $scope.knobs[ index - 1 ].ngModel.$modelValue : $scope.floor;
                }
            }

            /**
             * Isolate the index from the for loop below so the high value is always correct
             * @param index {number}
             * @returns {Function}
             */
            function highFn( index ) {
                /**
                 * Get the high value for the bar
                 * @returns {number}
                 */
                return function () {
                    return index < $scope.knobs.length ? $scope.knobs[ index ].ngModel.$modelValue : $scope.ceiling;
                }
            }

            // update the low and high values for the bars
            angular.forEach( $scope.bars, function ( bar, b ) {
                bar.low = lowFn( b );
                bar.high = highFn( b );
            } );

            // update the knobs and fire the change callback for all registered bars
            angular.forEach( registeredBars, function ( bar, index ) {
                bar.scope.lowKnob = index > 0 ? $scope.knobs[ index - 1 ] : null;
                bar.scope.highKnob = index < $scope.knobs.length ? $scope.knobs[ index ] : null;
                bar.onChange && bar.onChange();
            } );
        }

        var fixDebounce;

        /**
         * Call this to refresh the slider
         */
        $scope.fix = function () {
            $timeout.cancel( fixDebounce );
            fixDebounce = $timeout( function() {
                updateKnobs();
                updateBars();
            }, 25 );
        };

        /**
         * Find the nearest value in the list of values
         * @param position {number}
         * @param [floor] {number}
         * @param [ceiling] {number}
         * @param [isValue] {boolean}
         * @param [values] {number[]}
         * @returns {number|undefined}
         */
        function nearestValue( position, floor=$scope.floor, ceiling=$scope.ceiling, isValue=false, values=ctrl.options.values ) {
            if( ctrl.isEqualSpacing() && !isValue ) {
                // using equal spacing strategy
                var percent = ( position - $scope.floor ) / ( $scope.ceiling - $scope.floor );
                var index = Math.round( percent * ( values.length - 1 ) );

                while( index >= 0 && index < values.length ) {
                    if( values[ index ] < floor ) {
                        if( values[ index + 1 ] > ceiling ) {
                            console.warn( 'Raise your roof!', position, values[ index ], values[ index + 1 ], ceiling );
                            return undefined;
                        }
                        index++;
                    } else if( values[ index ] > ceiling ) {
                        if( values[ index - 1 ] < floor ) {
                            console.warn( 'You\'re giving me vertigo!', position, values[ index - 1 ], values[ index ], floor );
                            return undefined;
                        }
                        index--;
                    } else {
                        return values[ index ];
                    }
                }

                console.warn( 'I don\'t fit anywhere :(', position, $scope.knobs.map( knob => knob.ngModel.$modelValue ), values, floor, ceiling );
                return undefined;
            }

            // using relative spacing strategy
            for( var i = 0; i < values.length - 1; i++ ) {
                // find where the value fits in
                if( position >= values[ i ] && position <= values[ i + 1 ]  ) {
                    if( values[ i ] < floor && values[ i + 1 ] > ceiling ) {
                        console.warn( 'BOONDOGGLE!', position, values[ i ], values[ i + 1 ], floor, ceiling );
                        return undefined;
                    } else if( values[ i ] < floor ) {
                        return values[ i + 1 ];
                    } else if( values[ i + 1 ] > ceiling ) {
                        return values[ i ];
                    }

                    // and return the nearest value
                    return values[ i + Math.round( ( position - values[ i ] ) / ( values[ i + 1 ] - values[ i ] ) ) ];
                }
            }

            if( values[ values.length - 1 ] > ceiling ) {
                console.warn( 'Tsk tsk!', position, values[ values.length - 1 ], ceiling );
                return undefined;
            }
            // the value doesn't fit anywhere so just return the max value
            return values[ values.length - 1 ];
        }

        /**
         * Convert a value to the correct percentage for display purposes
         * @param value {number}
         * @param knob {angular.element}
         * @param bar {boolean}
         * @returns {number}
         */
        this.valueToPercent = function ( value, knob, bar ) {
            // default the knob to a size of 0
            var knobSize = 0;

            if ( knob ) {
                // we've been given a knob, get the size
                knobSize = this.options.vertical ? knob[ 0 ].offsetHeight : knob[ 0 ].offsetWidth;
            }

            // compute the percentage size of the knob
            var knobPercent = knobSize / $scope.dimensions().sliderSize * 100;

            var percent = 1;

            value = parseFloat( value );

            if( ctrl.useValues() ) {
                var values = ctrl.options.values;

                for ( var i = 0; i < values.length - 1; i++ ) {
                    // find where the value fits in
                    if ( value >= values[ i ] && value <= values[ i + 1 ] ) {
                        // and compute the relative percent
                        var index = i + Math.round( ( value - values[ i ] ) / ( values[ i + 1 ] - values[ i ] ) );
                        if( ctrl.isEqualSpacing() ) {
                            percent = index / ( values.length - 1 );
                        } else {
                            percent = ( values[ index ] - $scope.floor ) / ( $scope.ceiling - $scope.floor );
                        }
                    }
                }
            } else {
                percent = ( value - $scope.floor ) / ( $scope.ceiling - $scope.floor );
            }

            // compute the percent offset of the knob taking into account the size of the knob
            percent = percent * ( 100 - knobPercent );

            if ( bar && knob ) {
                // we're computing this for a bar and we've been given a knob, add half of the knob back to keep the bar in the middle of the knob
                percent += knobPercent / 2;
            }

            return percent;
        };

        /**
         * Convert a percentage to a value
         * @param percent {number}
         * @param [floor] {number}
         * @param [ceiling] {number}
         * @returns {number}
         */
        this.percentToValue = function ( percent, floor=$scope.floor, ceiling=$scope.ceiling ) {
            // compute the relative value
            var value = ( percent * ( ceiling - floor ) ) + floor;

            if( ctrl.useValues() ) {
                // we have some specific values
                return nearestValue( value, floor, ceiling );
            }

            // no specific values have been specified so just return the relative value
            return value;
        };

        /**
         * Compute the percent from the given value
         * @param value {number}
         * @returns {number}
         */
        this.toPercent = function( value ) {
            return ( value - $scope.floor ) / ( $scope.ceiling - $scope.floor );
        };

        /**
         * Add the knob to the slider and return some useful functions
         * @param knob {object}
         * @returns {{start: start, disabled: disabled}}
         */
        this.registerKnob = function ( knob ) {

            // is this knob enabled?
            var enabled = true;

            // add the knob to the list
            $scope.knobs.push( knob );
            sortKnobs();

            /**
             * Normalize the value so it adheres to these criteria:
             *    - within bounds of the slider
             *    - if not continuous, previous and next knobs are <= or >=, respectively
             *    - if > 1 step, falls on a step
             *    - has the given decimal precision
             * Then fire this knob's onChange callback if the normalized value is the same as the given value
             * @param value {number}
             */
            function normalizeModel( value ) {
                sortKnobs();

                // initialize the bounds
                var ceiling = $scope.ceiling;
                var floor = $scope.floor;

                // start with the original value
                var normalized = parseFloat( value );

                // get the index of the knob so we know the surrounding knobs
                var index = $scope.knobs.indexOf( knob );

                if ( !ctrl.options.continuous ) {
                    // keep the knobs contained to their section of the slider

                    if ( index > 0 ) {
                        // this isn't the knob with the lowest value, set the floor to the value of the knob lower than this
                        floor = parseFloat( $scope.knobs[ index - 1 ].ngModel.$modelValue ) + (ctrl.options.buffer > 0 ? ctrl.options.buffer : 0);
                    }
                    if ( index < $scope.knobs.length - 1 ) {
                        // this isn't the knob with the highest value, set the ceiling to the value of the knob higher than this
                        ceiling = parseFloat( $scope.knobs[ index + 1 ].ngModel.$modelValue ) - (ctrl.options.buffer > 0 ? ctrl.options.buffer : 0);
                    }
                }

                if( ctrl.useValues() ) {
                    // a specific set of values has been specified
                    normalized = nearestValue( value, floor, ceiling, true );
                } else if ( ctrl.options.steps > 1 ) {
                    // there should be more than one step

                    // get the width of a step
                    var stepWidth = ($scope.ceiling - $scope.floor) / (ctrl.options.steps - 1);

                    if ( index > 0 ) {
                        // this isn't the knob with the lowest value, make sure the floor aligns with a step
                        var floorMod = (floor - $scope.floor) % stepWidth;
                        if ( floorMod > 0 ) {
                            floor += stepWidth - floorMod;
                        }
                    }

                    if ( index < $scope.knobs.length - 1 ) {
                        // this isn't the knob with the highest value, make sure the ceiling aligns with a step
                        var ceilingMod = (ceiling - $scope.floor) % stepWidth;
                        if ( ceilingMod > 0 ) {
                            ceiling -= ceilingMod;
                        }
                    }

                    // align the value with a step
                    var mod = (normalized - $scope.floor) % stepWidth;
                    if ( mod < stepWidth / 2 ) {
                        normalized -= mod;
                    } else {
                        normalized += stepWidth - mod;
                    }
                }

                // ensure the value is within the bounds
                normalized = Math.min( ceiling, Math.max( normalized, floor ) );

                if ( ctrl.options.precision >= 0 ) {
                    // format the value to the correct decimal precision
                    normalized = parseFloat( normalized.toFixed( ctrl.options.precision ) );
                }

                if ( normalized === value ) {
                    // the normalized value is the same as the original, fire the onChange callback for this knob
                    knob.onChange && knob.onChange( value );
                } else if ( !isNaN( normalized ) ) {
                    // the normalized value is different than the original (an it's a number), update the model
                    knob.ngModel.$setViewValue( normalized );
                    if ( !$scope.$$phase ) {
                        $scope.$apply();
                    }
                }
            }

            /**
             * Do what's needed to update the DOM
             * @param value
             */
            function update( value ) {
                if ( enabled ) {
                    // normalize
                    normalizeModel( value );

                    // fix the DOM
                    $scope.fix();

                    // make sure the changes are digested
                    if ( !$scope.$$phase ) {
                        $scope.$apply();
                    }
                }
            }

            // watch this knob's model for changes
            $scope.$watch( function () {
                return knob.ngModel.$modelValue;
            }, function ( value ) {
                update( value );
            } );

            $scope.$watch( function () {
                return ctrl.options;
            }, function () {
                update( knob.ngModel.$modelValue );
            }, true );

            // initialize the bars
            updateBars();

            // listen for when this knob is removed from the DOM, remove it from the list and set to disabled
            knob.elem.on( '$destroy', function () {
                $scope.knobs.splice( $scope.knobs.indexOf( knob ), 1 );
                enabled = false;
            } );

            // give the knob some useful functions
            return {
                start : function ( ev ) {
                    if ( !$scope.disabled ) {
                        if ( angular.isDefined( ev.targetTouches ) ) {
                            $scope.currentKnobs[ ev.targetTouches[ 0 ].identifier ] = [ knob ];
                        } else {
                            $scope.currentKnobs[ 0 ] = [ knob ];
                        }
                        $scope.sliding = true;
                        $scope.onStart( ev );
                        knob.onStart();
                    }
                },
                disabled : function () {
                    var index = $scope.currentKnobs.indexOf( knob );
                    if ( $scope.sliding && index >= 0 ) {
                        $scope.onEnd( index );
                    }
                }
            }
        };

        /**
         * Add the bar to the slider
         * @param bar {object}
         * @return {{start: start}}
         */
        this.registerBar = function ( bar ) {
            // add the bar to the list
            registeredBars.push( bar );

            // listen for when this bar is removed from the DOM and remove it from the list
            bar.elem.on( '$destroy', function () {
                var index = registeredBars.indexOf( bar );
                if ( index >= 0 ) {
                    registeredBars.splice( index, 1 );
                }
            } );

            return {
                start : function ( ev ) {
                    if ( !$scope.disabled ) {
                        var knobs = [];
                        if ( bar.scope.lowKnob ) {
                            knobs.push( bar.scope.lowKnob );
                        }
                        if ( bar.scope.highKnob ) {
                            knobs.push( bar.scope.highKnob );
                        }
                        if ( angular.isDefined( ev.targetTouches ) ) {
                            $scope.currentKnobs[ ev.targetTouches[ 0 ].identifier ] = knobs;
                        } else {
                            $scope.currentKnobs[ 0 ] = knobs;
                        }
                        $scope.sliding = true;
                        $scope.onStart( ev );
                        bar.onStart();
                    }
                }
            }
        };

        this.isEqualSpacing = () => this.options.spacing === SPACING_EQUAL;
        this.isRelativeSpacing = () => this.options.spacing === SPACING_RELATIVE;

        this.useValues = () => ctrl.options.values.length > 1;
    } );
