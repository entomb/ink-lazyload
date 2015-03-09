/**
 * LazyLoad
 * A true async lazy loader made by a lazy coder.
 *
 * @module Ink.EXT.LazyLoad_1
 * @author jtavares <Jonathan.tavares@telecom.pt>
 * @version 1
 */
Ink.createExt('LazyLoad', 1,  [ 'Ink.Dom.Event_1',
                                'Ink.UI.Common_1',
                                'Ink.Dom.Element_1',
                                'Ink.Dom.Css_1',
                                'Ink.Net.Ajax_1',
                                'Ink.Util.Array_1' ], function( InkEvent, InkCommon, InkElement, InkCss, InkAjax, InkArray ){



    /**
     * LazyLoad is a true async content loader.
     *
     * @class Ink.EXT.LazyLoad
     * @constructor
     * @version 1
     * @param {Object}      [options] Options
     * @param {Integer}     [options.delay] throttle delay to the onScroll event in seconds
     * @param {Boolean}     [options.failretry] retry failed loads
     * @param {Integer}     [options.faildelay] seconds to wait before retrying fails
     * @param {Boolean}     [options.debug] console.log debug data
     *
     * @sample Ink_UI_Spy_1.html
     */
    var LazyLoad = function(options) {
        this.options = InkCommon.options('LazyLoad', {
              //'anobject': ['Object', null],  // Defaults to null
              //'target': ['Element', null],
              //'stuff': ['Number', 0.1],
              'delay': ['Integer', 200],
              'failretry': ['Boolean', true],
              'faildelay': ['Integer', 2000],
              'debug': ['Boolean', false],
              'cacheTime': ['Integer', 15],
              'cache': ['Boolean', true],
              //'targets': ['Elements'], // Required option since no default was given
            }, options || {});

        this._init();
    };


    Ink.extendObj(LazyLoad.prototype , {

        /**
         * Logs stuff to the console if [options.debug] is set
         *
         * @method log
         * @public
        */
        log:  function(){
            if(this.options.debug){
                if(typeof arguments[0] == 'string'){
                    arguments[0] = 'LazyLoad > '+arguments[0];
                }
                //Ink.bindMethod(console,'log',arguments)()
                console.log.apply(console,arguments)
            }
        },


        /**
         * INIT
         *
         * @method _init
         * @private
        */
        _init: function() {
            this.log('> _INIT');
            this._registerLazyLoads();
            this._retryTimeout = false;
            this._working = false;
            InkEvent.observe(window, 'scroll', InkEvent.throttle(Ink.bindEvent(this._onScroll,this),this.options.delay));

            this.options.cacheTime*=(1000*60);

            setInterval(Ink.bind(this._cacheClean,this),this.options.cacheTime/3);
        },



        /**
         * searches and stores to-be-loaded elements based on the .lazy classname
         *
         * @method _registerLazyLoads
         * @private
        */
        _registerLazyLoads: function(){
            this.log('> _registerLazyLoads');
            this._lazyElements = [];
            this._lazyErrors = [];

            var findLazyElements = Ink.ss('.lazy');
            InkArray.each(findLazyElements,Ink.bind(function(elem){

                if(InkElement.hasAttribute(elem, 'data-lazyload')){
                    this._lazyElements.push(elem);
                   /* this._lazyElements = this._lazyElements.filter(function (e, i, arr) {
                        return arr.lastIndexOf(e) === i;
                    });
*/
                    this._lazyElements = InkArray.unique(this._lazyElements);

                    this.log('register '+InkElement.data(elem).lazyload);
                }

            },this));


            return this._onScroll();
        },

        /**
         * Public alias to the _registerLazyLoads function.
         *
         * @method _registerLazyLoads
         * @public
        */
        register: function(){
            return this._registerLazyLoads();
        },


        /**
         * called on every onScroll event
         *
         * @method _onScroll
         * @private
        */
        _onScroll:  function(){
            this.log('> _onScroll',this._lazyElements);
            if(this._working) return;


            InkArray.each(this._lazyElements,Ink.bind(function(elem,index){
                if(this._isVisible(elem)){
                    this.log('> found!',elem);
                    this._loadLazyElement(elem);
                    //this._lazyElements = InkArray.remove(this._lazyElements, index, 1);
                }
            },this));

        },


        /**
         * checks if an element is visible
         *
         * @method _isVisible
         * @param {DOMElement}   elem       target element
         * @private
        */
        _isVisible: function(elem){
            return InkElement.inViewport(elem,{partial:true, margin:25}) && InkElement.isVisible(elem);
        },



        /**
         * creates the AJAX request to load the element
         *
         * @method _loadLazyElement
         * @param {DOMElement}   elem       target element
         * @private
        */
        _loadLazyElement: function(elem){
            this.log('> _loadLazyElement');
            this._working = true;

            var lazyLoadUrl = InkElement.data(elem).lazyload;
            var cacheKey = 'lazy_'+lazyLoadUrl;

            if(this.options.cache && InkElement.hasAttribute(elem,'data-lazycache')) {
                InkCss.removeClassName(elem,'lazy');
                InkCss.addClassName(elem,'lazy-loading');
                var cached = this._cacheGet(cacheKey);
                if(cached){
                    return this._loadingSuccess(elem,cached.result);
                }
            }

            new InkAjax(lazyLoadUrl, {
                method: 'GET',

                requestHeaders: {'X-CSRF-Token': Ink.i("X-CSRF-Token").getAttribute('content')},

                onInit: Ink.bind(this._loadingStart,this,elem),

                onSuccess: Ink.bind(function(xhrObj, req) {

                    if(xhrObj.status!=200){
                        return this._loadingError(elem);
                    }

                    if(this.options.cache && InkElement.hasAttribute(elem,'data-lazycache')) {
                        this._cacheSet(cacheKey,req);
                    }

                    this._loadingSuccess(elem,req);

                },this),


                onFailure: Ink.bind(this._loadingError,this,elem),
                //on404:  Ink.bind(this._loadingError,this,elem),
                //onTimeout:  Ink.bind(this._loadingError,this,elem),

                timeout: 5
            });

        },


        _cacheGet: function(key){
            if(!this.options.cache){
                return {};
            }

            try{
                var cacheItem = JSON.parse(sessionStorage.getItem(key));
            }catch(e){
                return {time:0}
            }

            return cacheItem;
        },

        _cacheSet: function(key,value){
            if(!this.options.cache){
                return true;
            }
            this.log('> _cacheSet: '+key);



            try{
                sessionStorage.setItem(key,JSON.stringify({
                            time: new Date().getTime(),
                            result: value
                        }));
            }catch(e){
                return  false;
            }

            return  true;
        },

        _cacheDel: function(key){
            this.log('> _cacheDel: '+key);

            try{
                sessionStorage.removeItem(key);
            }catch(e){
                return  false;
            }

            return true;
        },

        _cacheClean: function(){
            if(!this.options.cache){
                return;
            }
            this.log('> _cacheClean');
            var now = new Date().getTime();
            var cacheTime = this.options.cacheTime;
            for(key in sessionStorage){
                if(key.indexOf('lazy_')===0){
                    if((this._cacheGet(key).time+cacheTime) < now){
                        this._cacheDel(key);
                    }
                }
            }
        },


        /**
         * marks an element as lazy-loading
         *
         * @method _loadingStart
         * @param {DOMElement}   elem       target element
         * @private
        */
        _loadingStart: function(elem){
            this.log('> _loadingStart');
            InkEvent.fire(elem, 'lazy-loading');

            InkCss.removeClassName(elem,'lazy');
            InkCss.addClassName(elem,'lazy-loading');
        },


        /**
         * marks an element as lazy-failed
         *
         * @method _loadingError
         * @param {DOMElement}   elem       target element
         * @private
        */
        _loadingError: function(elem){
            this.log(' AJAX: error :(');
            InkCss.addClassName(elem,'lazy-failed');
            InkCss.removeClassName(elem,'lazy-loading');
            this._working = false;

            InkEvent.fire(elem, 'lazy-failed');

            this._lazyErrors.push(elem);
            this._lazyErrors = this._lazyErrors.filter(function (e, i, arr) {
                            return arr.lastIndexOf(e) === i;
                        });


            clearTimeout(this._retryTimeout);
            this._retryTimeout = setTimeout(Ink.bind(this._retryErrors,this),this.options.faildelay);

        },


        /**
         * sets the element's innerHTML with the loaded data. if the element has the data-lazyparent the data will be appended to the parentNode and the element removed instead
         *
         * @method _loadingSuccess
         * @param {DOMElement}   elem       target element
         * @param {String}   content        HTML content to set or append
         * @private
        */
        _loadingSuccess: function(elem,content){
            this.log(' AJAX: yay! :)',elem);
            InkCss.addClassName(elem,'lazy-loaded');
            InkCss.removeClassName(elem,'lazy-loading');
            this._working = false;


            if(InkElement.hasAttribute(elem, 'data-lazymiddleware')){
                content = Ink.bindMethod(window,InkElement.data(elem).lazymiddleware,elem,content)(elem,content);
            }

            if(InkElement.hasAttribute(elem, 'data-lazyparent')){
                var old_elem = elem;
                elem = elem.parentElement;
                InkElement.appendHTML(elem,content);

                if(InkElement.hasAttribute(old_elem, 'data-lazycallback')){
                    var cb = InkElement.data(old_elem).lazycallback;
                    if(cb in window){
                        Ink.bindMethod(window,cb,elem)();
                    }
                }

                InkElement.remove(old_elem);
            }else{
                InkElement.setHTML(elem,content);

                if(InkElement.hasAttribute(elem, 'data-lazycallback')){
                    var cb = InkElement.data(elem).lazycallback;
                    if(cb in window){
                        Ink.bindMethod(window,cb,elem)();
                    }
                }
            }



            InkEvent.fire(elem, 'lazy-loaded');

            return this._registerLazyLoads();
        },


        /**
         * Recovers .lazy-failed errors. will not triget if [options.failretry] is false
         *
         * @method _retryErrors
         * @private
        */
        _retryErrors: function(){
            if(this.options.failretry){
                return;
            }

            this.log('> _retryErrors');
            clearTimeout(this._retryTimeout);


            var findLazyErrors = Ink.ss('.lazy-failed');
            InkArray.each(findLazyErrors,function(elem){
                InkCss.removeClassName(elem,'lazy-failed');
                InkCss.addClassName(elem,'lazy');
            });

            return this._registerLazyLoads();
        },



        /**
         * Delegates on(lazy-loaded) events to a given selector.
         *
         * @method onLazyLoad
         * @param {String|DOMElement}   selector
         * @param {Funcion}   callback
         * @public
        */
        onLazyLoad: function(selector,callback){
            this.log('> onLazyLoad ('+selector+')');
            return Ink.Dom.Event.observeDelegated(document,'lazy-loaded',selector,callback);
        }


    });

    return LazyLoad;
});
