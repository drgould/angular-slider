describe( "Unit: Slider Directive", function () {

    var $compile;
    var $rootScope;
    var $timeout;
    var $document;
    var element;

    beforeEach( module( 'drg.slider' ) );

    beforeEach( inject( function ( _$compile_, _$rootScope_, _$timeout_, _$document_ ) {
        $compile = _$compile_;
        $rootScope = _$rootScope_;
        $timeout = _$timeout_;
        $document = _$document_;
    } ) );

    beforeEach( function () {
        $rootScope.slider = {
            floor : 0,
            ceiling : 10,
            opts : {},
            knobs : [ { value : 5 } ]
        };
        element = angular.element(
            '<drg-slider floor="{{ slider.floor }}" ceiling="{{ slider.ceiling }}" drg-slider-options="slider.opts">' +
                '<drg-slider-knob ng-model="knob.value" ng-repeat="knob in slider.knobs"><span style="display: none;">{{ $viewValue }}</span></drg-slider-knob>' +
            '</drg-slider>'
        );
        element.css( 'width', 100 );
        angular.element( 'body' ).css( { margin : 0, padding : 0 } ).append( element );
        element = $compile( element )( $rootScope );
        $rootScope.$digest();
        $timeout.flush();
    } );

    it( 'should set slider to be horizontal', function () {
        expect( element.hasClass( 'drg-slider-horizontal' ) ).toBeTruthy();
    } );

    it( 'should create a slider with one knob and two bars', function () {
        expect( element.find( 'drg-slider-knob' ).length ).toBe( 1 );
        expect( element.find( 'drg-slider-bar' ).length ).toBe( 2 );
    } );

    it( 'should not change the model value', function () {
        expect( $rootScope.slider.knobs[ 0 ].value ).toBe( 5 );
    } );

    it( 'should place the knob in the middle', function () {
        expect( parseInt( element.find( 'drg-slider-knob' ).position().x ) ).toBe( 50 );
    } );

    it( 'should place the bars according to the knob', function () {
        var bars = element.find( 'drg-slider-bar' );
        expect( parseInt( bars.eq( 0 ).css( 'left' ) ) ).toBe( 0 );
        expect( parseInt( bars.eq( 0 ).css( 'width' ) ) ).toBe( 50 );
        expect( parseInt( bars.eq( 1 ).css( 'left' ) ) ).toBe( 50 );
        expect( parseInt( bars.eq( 1 ).css( 'width' ) ) ).toBe( 50 );
    } );

    it( 'should have the correct view value', function () {
        expect( element.find( 'drg-slider-knob' ).text() ).toBe( '5' );
    } );

    describe( 'when the value is changed', function () {
        beforeEach( function () {
            $rootScope.slider.knobs[ 0 ].value = 5.1;
            $rootScope.$apply();
        } );

        it( 'should normalize the value', function () {
            expect( $rootScope.slider.knobs[ 0 ].value ).toBe( 5 );
        } );
    } );

    describe( 'when the knob is dragged', function () {
        beforeEach( function () {
            var knob = element.find( 'drg-slider-knob' );
            // click and drag
            knob.trigger( $.Event( 'mousedown', { clientX : 50 } ) );
            $document.trigger( $.Event( 'mousemove', { clientX : 76 } ) );
            $document.trigger( $.Event( 'mouseup', { clientX : 76 } ) );
        } );

        it( 'should move the knob to the correct position', function () {
            expect( parseInt( element.find( 'drg-slider-knob' ).css( 'left' ) ) ).toBe( 80 );
        } );

        it( 'should update the model', function () {
            expect( $rootScope.slider.knobs[ 0 ].value ).toBe( 8 );
        } );
    } );

    describe( 'when a knob is added', function () {
        beforeEach( function () {
            $rootScope.$apply( function () {
                $rootScope.slider.knobs.push( { value : 8 } );
            } );
        } );

        it( 'should add the knob and a bar', function () {
            expect( element.find( 'drg-slider-knob' ).length ).toBe( 2 );
            expect( element.find( 'drg-slider-bar' ).length ).toBe( 3 );
        } );

        it( 'should keep the values the same', function () {
            expect( $rootScope.slider.knobs[ 0 ].value ).toBe( 5 );
            expect( $rootScope.slider.knobs[ 1 ].value ).toBe( 8 );
        } );

        it( 'should place the knobs correctly', function () {
            var knobs = element.find( 'drg-slider-knob' );
            expect( parseInt( knobs.eq( 0 ).css( 'left' ) ) ).toBe( 50 );
            expect( parseInt( knobs.eq( 1 ).css( 'left' ) ) ).toBe( 80 );
        } );

        it( 'should place the bars according to the knobs', function () {
            var bars = element.find( 'drg-slider-bar' );
            expect( parseInt( bars.eq( 0 ).css( 'left' ) ) ).toBe( 0 );
            expect( parseInt( bars.eq( 0 ).css( 'width' ) ) ).toBe( 50 );
            expect( parseInt( bars.eq( 1 ).css( 'left' ) ) ).toBe( 50 );
            expect( parseInt( bars.eq( 1 ).css( 'width' ) ) ).toBe( 30 );
            expect( parseInt( bars.eq( 2 ).css( 'left' ) ) ).toBe( 80 );
            expect( parseInt( bars.eq( 2 ).css( 'width' ) ) ).toBe( 20 );
        } );

        describe( 'and a knob is dragged', function () {
            beforeEach( function () {
                var knob = element.find( 'drg-slider-knob' ).eq( 1 );
                // click and drag
                knob.trigger( $.Event( 'mousedown', { clientX : 80 } ) );
                $document.trigger( $.Event( 'mousemove', { clientX : 61 } ) );
                $document.trigger( $.Event( 'mouseup', { clientX : 61 } ) );
            } );

            it( 'should move the knob to the correct position', function () {
                expect( parseInt( element.find( 'drg-slider-knob' ).eq( 1 ).css( 'left' ) ) ).toBe( 60 );
            } );

            it( 'should update the model', function () {
                expect( $rootScope.slider.knobs[ 1 ].value ).toBe( 6 );
            } );
        } );
    } );
} );
