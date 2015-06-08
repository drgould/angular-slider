/**
 * angular-slider
 * @version 1.0.0-alpha.1
 * @copyright Derek Gould 2015
 * @license MIT
 */
'use strict';

angular.module('drg.slider', []);
'use strict';

angular.module('drg.slider').directive('drgSliderBar', function () {
    return {
        restrict: 'EA',
        require: '^drgSlider',
        compile: function compile(elem, attr) {
            return function (scope, elem, attr, ngSliderCtrl) {
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
                    var offset = ngSliderCtrl.valueToPercent(scope.low, scope.lowKnob ? scope.lowKnob.elem : null, true);

                    // compute the size of the bar
                    var size = ngSliderCtrl.valueToPercent(scope.high, scope.highKnob ? scope.highKnob.elem : null, true) - offset;

                    // set the CSS
                    if (ngSliderCtrl.options.vertical) {
                        elem.css({
                            top: offset + '%',
                            height: size + '%'
                        });
                    } else {
                        elem.css({
                            left: offset + '%',
                            width: size + '%'
                        });
                    }
                }

                // register this bar with the slider
                var bar = ngSliderCtrl.registerBar({
                    elem: elem,
                    scope: scope,
                    onStart: function onStart() {
                        elem.addClass('active');
                    },
                    onChange: function onChange() {
                        updateBar();
                    },
                    onEnd: function onEnd() {
                        elem.removeClass('active');
                    }
                });

                // watch the attributes for updates
                attr.$observe('low', function (low) {
                    scope.low = low;
                    updateBar();
                });
                attr.$observe('high', function (high) {
                    scope.high = high;
                    updateBar();
                });

                // set the default events
                var events = ['mousedown', 'touchstart'];
                if (window.PointerEvent) {
                    // the browser supports javascript Pointer Events (currently only IE11), use those
                    events = ['pointerdown'];
                } else if (window.navigator.MSPointerEnabled) {
                    // the browser supports M$'s javascript Pointer Events (IE10), use those
                    events = ['MSPointerDown'];
                }

                // bind the start events
                angular.forEach(events, function (event) {
                    elem.bind(event, function (ev) {
                        ev.preventDefault();
                        ev.stopPropagation();
                        bar.start(ev);
                    });
                });
            };
        }
    };
});
'use strict';

angular.module('drg.slider').controller('SliderCtrl', ["$scope", "$timeout", function ($scope, $timeout) {
    var _this = this;

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
        precision: 0,
        buffer: 0,
        steps: 0,
        values: [],
        spacing: SPACING_RELATIVE, // how to space the notches on the slider "relative" or "equal"
        continuous: false,
        vertical: false
    };
    // reference the options locally to avoid any scoping issues
    this.options = this.defaultOptions;

    var ctrl = this;

    function knobSort(a, b) {
        var a_val = a.ngModel.$modelValue;
        var b_val = b.ngModel.$modelValue;
        return a_val > b_val ? 1 : b_val > a_val ? -1 : 0;
    }

    function sortKnobs() {
        $scope.knobs.sort(knobSort);
    }

    /**
     * Sort the knobs by model value
     */
    function updateKnobs() {
        sortKnobs();
        angular.forEach($scope.knobs, function (knob) {
            knob.ngModel.$modelValue = Math.max($scope.floor, Math.min(knob.ngModel.$modelValue, $scope.ceiling));
        });
    }

    /**
     * Add a bar
     */
    function addBar() {
        $scope.bars.push({
            low: function low() {
                return 0;
            },
            high: function high() {
                return 0;
            }
        });
    }

    /**
     * Remove a bar
     */
    function removeBar() {
        $scope.bars.splice(0, 1);
    }

    /**
     * Make sure the correct number of bars exist and all have the right data
     */
    function updateBars() {
        // get the knob count
        var numKnobs = $scope.knobs.length;

        // add bars so we have one more bar than knobs
        while ($scope.bars.length < numKnobs + 1) {
            addBar();
        }

        // remove bars so we have one more bar than knobs
        while ($scope.bars.length > numKnobs + 1) {
            removeBar();
        }

        /**
         * Isolate the index from the for loop below so the low value is always correct
         * @param index {number}
         * @returns {Function}
         */
        function lowFn(index) {
            /**
             * Get the low value for the bar
             * @returns {number}
             */
            return function () {
                return index > 0 ? $scope.knobs[index - 1].ngModel.$modelValue : $scope.floor;
            };
        }

        /**
         * Isolate the index from the for loop below so the high value is always correct
         * @param index {number}
         * @returns {Function}
         */
        function highFn(index) {
            /**
             * Get the high value for the bar
             * @returns {number}
             */
            return function () {
                return index < $scope.knobs.length ? $scope.knobs[index].ngModel.$modelValue : $scope.ceiling;
            };
        }

        // update the low and high values for the bars
        angular.forEach($scope.bars, function (bar, b) {
            bar.low = lowFn(b);
            bar.high = highFn(b);
        });

        // update the knobs and fire the change callback for all registered bars
        angular.forEach(registeredBars, function (bar, index) {
            bar.scope.lowKnob = index > 0 ? $scope.knobs[index - 1] : null;
            bar.scope.highKnob = index < $scope.knobs.length ? $scope.knobs[index] : null;
            bar.onChange && bar.onChange();
        });
    }

    var fixDebounce;

    /**
     * Call this to refresh the slider
     */
    $scope.fix = function () {
        $timeout.cancel(fixDebounce);
        fixDebounce = $timeout(function () {
            updateKnobs();
            updateBars();
        }, 25);
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
    function nearestValue(position) {
        var floor = arguments[1] === undefined ? $scope.floor : arguments[1];
        var ceiling = arguments[2] === undefined ? $scope.ceiling : arguments[2];
        var isValue = arguments[3] === undefined ? false : arguments[3];
        var values = arguments[4] === undefined ? ctrl.options.values : arguments[4];

        if (ctrl.isEqualSpacing() && !isValue) {
            // using equal spacing strategy
            var percent = (position - $scope.floor) / ($scope.ceiling - $scope.floor);
            var index = Math.round(percent * (values.length - 1));

            while (index >= 0 && index < values.length) {
                if (values[index] < floor) {
                    if (values[index + 1] > ceiling) {
                        console.warn('Raise your roof!', position, values[index], values[index + 1], ceiling);
                        return undefined;
                    }
                    index++;
                } else if (values[index] > ceiling) {
                    if (values[index - 1] < floor) {
                        console.warn('You\'re giving me vertigo!', position, values[index - 1], values[index], floor);
                        return undefined;
                    }
                    index--;
                } else {
                    return values[index];
                }
            }

            console.warn('I don\'t fit anywhere :(', position, $scope.knobs.map(function (knob) {
                return knob.ngModel.$modelValue;
            }), values, floor, ceiling);
            return undefined;
        }

        // using relative spacing strategy
        for (var i = 0; i < values.length - 1; i++) {
            // find where the value fits in
            if (position >= values[i] && position <= values[i + 1]) {
                if (values[i] < floor && values[i + 1] > ceiling) {
                    console.warn('BOONDOGGLE!', position, values[i], values[i + 1], floor, ceiling);
                    return undefined;
                } else if (values[i] < floor) {
                    return values[i + 1];
                } else if (values[i + 1] > ceiling) {
                    return values[i];
                }

                // and return the nearest value
                return values[i + Math.round((position - values[i]) / (values[i + 1] - values[i]))];
            }
        }

        if (values[values.length - 1] > ceiling) {
            console.warn('Tsk tsk!', position, values[values.length - 1], ceiling);
            return undefined;
        }
        // the value doesn't fit anywhere so just return the max value
        return values[values.length - 1];
    }

    /**
     * Convert a value to the correct percentage for display purposes
     * @param value {number}
     * @param knob {angular.element}
     * @param bar {boolean}
     * @returns {number}
     */
    this.valueToPercent = function (value, knob, bar) {
        // default the knob to a size of 0
        var knobSize = 0;

        if (knob) {
            // we've been given a knob, get the size
            knobSize = this.options.vertical ? knob[0].offsetHeight : knob[0].offsetWidth;
        }

        // compute the percentage size of the knob
        var knobPercent = knobSize / $scope.dimensions().sliderSize * 100;

        var percent = 1;

        value = parseFloat(value);

        if (ctrl.useValues()) {
            var values = ctrl.options.values;

            for (var i = 0; i < values.length - 1; i++) {
                // find where the value fits in
                if (value >= values[i] && value <= values[i + 1]) {
                    // and compute the relative percent
                    var index = i + Math.round((value - values[i]) / (values[i + 1] - values[i]));
                    if (ctrl.isEqualSpacing()) {
                        percent = index / (values.length - 1);
                    } else {
                        percent = (values[index] - $scope.floor) / ($scope.ceiling - $scope.floor);
                    }
                }
            }
        } else {
            percent = (value - $scope.floor) / ($scope.ceiling - $scope.floor);
        }

        // compute the percent offset of the knob taking into account the size of the knob
        percent = percent * (100 - knobPercent);

        if (bar && knob) {
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
    this.percentToValue = function (percent) {
        var floor = arguments[1] === undefined ? $scope.floor : arguments[1];
        var ceiling = arguments[2] === undefined ? $scope.ceiling : arguments[2];

        // compute the relative value
        var value = percent * (ceiling - floor) + floor;

        if (ctrl.useValues()) {
            // we have some specific values
            return nearestValue(value, floor, ceiling);
        }

        // no specific values have been specified so just return the relative value
        return value;
    };

    /**
     * Compute the percent from the given value
     * @param value {number}
     * @returns {number}
     */
    this.toPercent = function (value) {
        return (value - $scope.floor) / ($scope.ceiling - $scope.floor);
    };

    /**
     * Add the knob to the slider and return some useful functions
     * @param knob {object}
     * @returns {{start: start, disabled: disabled}}
     */
    this.registerKnob = function (knob) {

        // is this knob enabled?
        var enabled = true;

        // add the knob to the list
        $scope.knobs.push(knob);
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
        function normalizeModel(value) {
            sortKnobs();

            // initialize the bounds
            var ceiling = $scope.ceiling;
            var floor = $scope.floor;

            // start with the original value
            var normalized = parseFloat(value);

            // get the index of the knob so we know the surrounding knobs
            var index = $scope.knobs.indexOf(knob);

            if (!ctrl.options.continuous) {
                // keep the knobs contained to their section of the slider

                if (index > 0) {
                    // this isn't the knob with the lowest value, set the floor to the value of the knob lower than this
                    floor = parseFloat($scope.knobs[index - 1].ngModel.$modelValue) + (ctrl.options.buffer > 0 ? ctrl.options.buffer : 0);
                }
                if (index < $scope.knobs.length - 1) {
                    // this isn't the knob with the highest value, set the ceiling to the value of the knob higher than this
                    ceiling = parseFloat($scope.knobs[index + 1].ngModel.$modelValue) - (ctrl.options.buffer > 0 ? ctrl.options.buffer : 0);
                }
            }

            if (ctrl.useValues()) {
                // a specific set of values has been specified
                normalized = nearestValue(value, floor, ceiling, true);
            } else if (ctrl.options.steps > 1) {
                // there should be more than one step

                // get the width of a step
                var stepWidth = ($scope.ceiling - $scope.floor) / (ctrl.options.steps - 1);

                if (index > 0) {
                    // this isn't the knob with the lowest value, make sure the floor aligns with a step
                    var floorMod = (floor - $scope.floor) % stepWidth;
                    if (floorMod > 0) {
                        floor += stepWidth - floorMod;
                    }
                }

                if (index < $scope.knobs.length - 1) {
                    // this isn't the knob with the highest value, make sure the ceiling aligns with a step
                    var ceilingMod = (ceiling - $scope.floor) % stepWidth;
                    if (ceilingMod > 0) {
                        ceiling -= ceilingMod;
                    }
                }

                // align the value with a step
                var mod = (normalized - $scope.floor) % stepWidth;
                if (mod < stepWidth / 2) {
                    normalized -= mod;
                } else {
                    normalized += stepWidth - mod;
                }
            }

            // ensure the value is within the bounds
            normalized = Math.min(ceiling, Math.max(normalized, floor));

            if (ctrl.options.precision >= 0) {
                // format the value to the correct decimal precision
                normalized = parseFloat(normalized.toFixed(ctrl.options.precision));
            }

            if (normalized === value) {
                // the normalized value is the same as the original, fire the onChange callback for this knob
                knob.onChange && knob.onChange(value);
            } else if (!isNaN(normalized)) {
                // the normalized value is different than the original (an it's a number), update the model
                knob.ngModel.$setViewValue(normalized);
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            }
        }

        /**
         * Do what's needed to update the DOM
         * @param value
         */
        function update(value) {
            if (enabled) {
                // normalize
                normalizeModel(value);

                // fix the DOM
                $scope.fix();

                // make sure the changes are digested
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            }
        }

        // watch this knob's model for changes
        $scope.$watch(function () {
            return knob.ngModel.$modelValue;
        }, function (value) {
            update(value);
        });

        $scope.$watch(function () {
            return ctrl.options;
        }, function () {
            update(knob.ngModel.$modelValue);
        }, true);

        // initialize the bars
        updateBars();

        // listen for when this knob is removed from the DOM, remove it from the list and set to disabled
        knob.elem.on('$destroy', function () {
            $scope.knobs.splice($scope.knobs.indexOf(knob), 1);
            enabled = false;
        });

        // give the knob some useful functions
        return {
            start: function start(ev) {
                if (!$scope.disabled) {
                    if (angular.isDefined(ev.targetTouches)) {
                        $scope.currentKnobs[ev.targetTouches[0].identifier] = [knob];
                    } else {
                        $scope.currentKnobs[0] = [knob];
                    }
                    $scope.sliding = true;
                    $scope.onStart(ev);
                    knob.onStart();
                }
            },
            disabled: function disabled() {
                var index = $scope.currentKnobs.indexOf(knob);
                if ($scope.sliding && index >= 0) {
                    $scope.onEnd(index);
                }
            }
        };
    };

    /**
     * Add the bar to the slider
     * @param bar {object}
     * @return {{start: start}}
     */
    this.registerBar = function (bar) {
        // add the bar to the list
        registeredBars.push(bar);

        // listen for when this bar is removed from the DOM and remove it from the list
        bar.elem.on('$destroy', function () {
            var index = registeredBars.indexOf(bar);
            if (index >= 0) {
                registeredBars.splice(index, 1);
            }
        });

        return {
            start: function start(ev) {
                if (!$scope.disabled) {
                    var knobs = [];
                    if (bar.scope.lowKnob) {
                        knobs.push(bar.scope.lowKnob);
                    }
                    if (bar.scope.highKnob) {
                        knobs.push(bar.scope.highKnob);
                    }
                    if (angular.isDefined(ev.targetTouches)) {
                        $scope.currentKnobs[ev.targetTouches[0].identifier] = knobs;
                    } else {
                        $scope.currentKnobs[0] = knobs;
                    }
                    $scope.sliding = true;
                    $scope.onStart(ev);
                    bar.onStart();
                }
            }
        };
    };

    this.isEqualSpacing = function () {
        return _this.options.spacing === SPACING_EQUAL;
    };
    this.isRelativeSpacing = function () {
        return _this.options.spacing === SPACING_RELATIVE;
    };

    this.useValues = function () {
        return ctrl.options.values.length > 1;
    };
}]);
'use strict';

angular.module('drg.slider').directive('drgSlider', ["$document", "$compile", "$interpolate", function ($document, $compile, $interpolate) {
    return {
        restrict: 'EA',
        controller: 'SliderCtrl',
        scope: true,
        link: function link(scope, elem, attr, ctrl) {

            /**
             * Get the current relative position of the cursor at the given index
             * @param ev {Event}
             * @param index {number}
             * @returns {number}
             */
            function cursorPosition(ev, index) {
                var position = -1 * scope.dimensions().sliderOffset;
                if (ctrl.options.vertical) {
                    position += ev.touches ? ev.touches[index].pageY : ev.pageY;
                } else {
                    position += ev.touches ? ev.touches[index].pageX : ev.pageX;
                }
                return position;
            }

            /**
             * Get the current position of the given knob
             * @param knob {angular.element}
             * @returns {number}
             */
            function knobPosition(knob) {
                var offset = ctrl.options.vertical ? knob[0].offsetTop : knob[0].offsetLeft;
                return offset - scope.dimensions().sliderOffset;
            }

            // add the bars
            elem.prepend($compile('<drg-slider-bar low="' + $interpolate.startSymbol() + ' bar.low() ' + $interpolate.endSymbol() + '" high="' + $interpolate.startSymbol() + ' bar.high() ' + $interpolate.endSymbol() + '" ng-repeat="bar in bars"></ng-slider-bar>')(scope));

            /**
             * Get the current slider size and offset
             * @returns {{sliderSize: number, sliderOffset: number}}
             */
            scope.dimensions = function () {
                // get the offset for the slider
                var offset = ctrl.options.vertical ? elem[0].offsetTop : elem[0].offsetLeft;

                if (elem[0].offsetParent) {
                    // take into account the offset of this element's parent
                    offset += ctrl.options.vertical ? elem[0].offsetParent.offsetTop : elem[0].offsetParent.offsetLeft;
                }

                return {
                    sliderSize: ctrl.options.vertical ? elem[0].offsetHeight : elem[0].offsetWidth, // get the size of the slider
                    sliderOffset: offset
                };
            };

            /**
             * What to do when the user starts sliding
             * @param ev {Event}
             */
            scope.onStart = function (ev) {
                // get the index of the touch/mouse
                var index = 0;
                if (ev.targetTouches) {
                    index = ev.targetTouches[0].identifier;
                }

                // save the starting position(s)
                if (angular.isArray(scope.currentKnobs[index]) && scope.currentKnobs[index].length > 1) {
                    var cursorPos = cursorPosition(ev, index);
                    scope.startOffsets[index] = scope.currentKnobs[index].map(function (knob) {
                        return knobPosition(knob.elem) - cursorPos;
                    });
                } else {
                    scope.startOffsets[index] = [0];
                }

                // fire a "move"
                scope.onMove(ev);
            };

            /**
             * What to do when a knob is moved
             * @param ev {Event}
             */
            scope.onMove = function (ev) {
                // get the current dimensions
                var dimensions = scope.dimensions();

                angular.forEach(scope.currentKnobs, function (knobs, index) {
                    if (scope.currentKnobs[index]) {
                        // get the current mouse position
                        var position = cursorPosition(ev, index);

                        var startOffsets = scope.startOffsets[index];

                        if (!angular.isArray(knobs)) {
                            knobs = [knobs];
                        }

                        // get the size of the knob(s) being dragged
                        for (var i = 0; i < knobs.length; i++) {
                            // get the size of the knob
                            var knobSize = ctrl.options.vertical ? knobs[i].elem[0].offsetHeight : knobs[i].elem[0].offsetWidth;

                            var min = 0;
                            var max = 1;

                            if (!ctrl.options.continuous) {
                                var index = scope.knobs.indexOf(knobs[i]);
                                if (index > 0) {
                                    min = ctrl.toPercent(scope.knobs[index - 1].ngModel.$modelValue);
                                }
                                if (index < scope.knobs.length - 1) {
                                    max = ctrl.toPercent(scope.knobs[index + 1].ngModel.$modelValue);
                                }
                            }

                            // get the current mouse/finger position as a percentage
                            var percent = Math.max(min, Math.min((position + startOffsets[i] - knobSize / 2) / (dimensions.sliderSize - knobSize), max));

                            // compute the value from the percentage
                            var value = ctrl.percentToValue(percent).toFixed(ctrl.options.precision);

                            // update the model for the knob being dragged
                            knobs[i].ngModel.$setViewValue(value);
                            if (!scope.$$phase) {
                                scope.$apply();
                            }
                        }
                    }
                });
            };

            /**
             * What to do when the slide is finished
             */
            scope.onEnd = function (index) {
                // remove the knob from the list of knobs currently being dragged
                var knobs = scope.currentKnobs[index] || [];
                if (index < scope.currentKnobs.length) {
                    delete scope.currentKnobs[index];
                }

                if (!angular.isArray(knobs)) {
                    knobs = [knobs];
                }

                angular.forEach(knobs, function (knob) {
                    // fire the knob's onEnd callback
                    knob.onEnd();
                });

                if (scope.currentKnobs.length == 0) {
                    // we're no longer sliding
                    scope.sliding = false;
                }
            };

            scope.onResize = function () {
                scope.fix();
            };

            // set the default events
            var moveEvents = ['mousemove', 'touchmove'];
            var cancelEvents = ['mousecancel', 'touchcancel'];
            var endEvents = ['mouseup', 'touchend'];

            if (window.PointerEvent) {
                // the browser supports javascript Pointer Events (currently only IE11), use those
                moveEvents = ['pointermove'];
                cancelEvents = ['pointercancel'];
                endEvents = ['pointerup'];
            } else if (window.navigator.msPointerEnabled) {
                // the browser supports M$'s javascript Pointer Events (IE10), use those
                moveEvents = ['MSPointerMove'];
                cancelEvents = ['MSPointerCancel'];
                endEvents = ['MSPointerUp'];
            }

            // bind the move events
            angular.forEach(moveEvents, function (event) {
                $document.bind(event, function (ev) {
                    if (scope.sliding) {
                        // they see me slidin', they hatin'
                        ev.preventDefault();
                        ev.stopPropagation();
                        scope.onMove(ev);
                    }
                });
            });

            // bind the end and cancel events
            angular.forEach(cancelEvents.concat(endEvents), function (event) {
                $document.bind(event, function (ev) {
                    if (scope.sliding) {
                        // it's electric, boogie woogie, woogie

                        // fire the end events for the drags that are ending
                        if (ev.changedTouches) {
                            for (var i = 0; i < ev.changedTouches.length; i++) {
                                scope.onEnd(ev.changedTouches[i].identifier);
                            }
                        } else {
                            scope.onEnd(0);
                        }
                    }
                });
            });

            // watch for disabilities
            scope.$watch(function () {
                return scope.$eval(attr.ngDisabled);
            }, function (disabled) {
                // do we have disabilities?
                scope.disabled = angular.isDefined(disabled) && disabled;

                // tell the DOM
                if (scope.disabled) {
                    elem.addClass('disabled');
                } else {
                    elem.removeClass('disabled');
                }

                if (scope.sliding) {
                    // I wanna wake up where you are, I won't say anything at all
                    angular.forEach(scope.currentKnobs.keys(), function (index) {
                        scope.onEnd(index);
                    });
                }
            });

            // watch the attributes and update as necessary
            attr.$observe('ceiling', function (ceiling) {
                if (!ctrl.useValues()) {
                    ceiling = angular.isDefined(ceiling) ? parseFloat(ceiling) : 0;
                    scope.ceiling = isNaN(ceiling) ? 0 : ceiling;
                    scope.onResize();
                }
            });
            attr.$observe('floor', function (floor) {
                if (!ctrl.useValues()) {
                    floor = angular.isDefined(floor) ? parseFloat(floor) : 0;
                    scope.floor = isNaN(floor) ? 0 : floor;
                    scope.onResize();
                }
            });
            scope.$watch(function () {
                return scope.$eval(attr.drgSliderOptions);
            }, function (opts) {
                ctrl.options = angular.extend({}, ctrl.defaultOptions, angular.isDefined(opts) && angular.isObject(opts) ? opts : {});
                ctrl.options.values.sort(function (a, b) {
                    return a - b;
                });
                if (ctrl.useValues()) {
                    scope.floor = ctrl.options.values[0];
                    scope.ceiling = ctrl.options.values[ctrl.options.values.length - 1];
                }
                if (ctrl.options.vertical) {
                    elem.addClass('drg-slider-vertical').removeClass('drg-slider-horizontal');
                } else {
                    elem.addClass('drg-slider-horizontal').removeClass('drg-slider-vertical');
                }
            }, true);

            scope.$on('drgSlider.resize', scope.onResize);
        }
    };
}]);
'use strict';

angular.module('drg.slider').directive('drgSliderKnob', ["$parse", function ($parse) {
    return {
        restrict: 'EA',
        require: ['^drgSlider', '^ngModel'],
        scope: true,
        compile: function compile(elem, attr) {
            // make sure we have a model
            if (angular.isUndefined(attr.ngModel)) {
                throw 'ngSliderKnob Error: ngModel not specified';
            }

            return function (scope, elem, attr, ctrls) {
                // get the controllers
                var ngSliderCtrl = ctrls[0];
                var ngModelCtrl = ctrls[1];

                // is the knob enabled?
                scope.enabled = true;

                /**
                 * Make sure the value gets applied up the hierarchy
                 * @param value {number}
                 */
                function updateModel(value) {
                    $parse(attr.ngModel).assign(scope.$parent.$parent, parseFloat(value));
                    if (!scope.$$phase) {
                        scope.$apply();
                    }
                }

                // register the knob
                var knob = ngSliderCtrl.registerKnob({
                    ngModel: ngModelCtrl, // the model
                    elem: elem, // the knob DOM element
                    onChange: function onChange(value) {
                        // what to do when the model changes
                        // sync the model
                        updateModel(value);

                        // expose the value to the scope
                        scope.$viewValue = value;

                        // set the CSS as needed
                        elem.css(ngSliderCtrl.options.vertical ? 'top' : 'left', ngSliderCtrl.valueToPercent(value, elem) + '%');
                    },
                    onStart: function onStart() {
                        // what to do when the user starts dragging this knob
                        elem.addClass('active');
                    },
                    onEnd: function onEnd() {
                        // what to do when the user stops dragging this knob
                        elem.removeClass('active');
                    }
                });

                // watch for disabilities
                scope.$watch(function () {
                    return scope.$eval(attr.ngDisabled);
                }, function (disabled) {
                    // is the knob disabled?
                    scope.enabled = !disabled;

                    // tell the DOM
                    if (disabled) {
                        elem.addClass('disabled');
                    } else {
                        elem.removeClass('disabled');
                    }

                    // tell the slider this knob is disabled
                    scope.enabled || knob.disabled();
                });

                // set the default events
                var events = ['mousedown', 'touchstart'];
                if (window.PointerEvent) {
                    // the browser supports javascript Pointer Events (currently only IE11), use those
                    events = ['pointerdown'];
                } else if (window.navigator.MSPointerEnabled) {
                    // the browser supports M$'s javascript Pointer Events (IE10), use those
                    events = ['MSPointerDown'];
                }

                // bind the start events
                angular.forEach(events, function (event) {
                    elem.bind(event, function (ev) {
                        ev.preventDefault();
                        ev.stopPropagation();
                        knob.start(ev);
                    });
                });
            };
        }
    };
}]);
//# sourceMappingURL=drg-slider.js.map