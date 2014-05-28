#Ink.EXT.LazyLoad
A true async lazy loader made by a lazy coder.


##Instance
Load as an Ink plugin. only 1 instance should be running at a time.
```html
<script type="text/javascript" src="/js/ink.LazyLoad.js"></script>
<script type="text/javascript">
    Ink.requireModules(['Ink.Ext.LazyLoad_1'], function(Lazy) {
        var Lazy = new Lazy({
                        'delay': 200
                        'failretry': true,
                        'faildelay': 2000,
                        'debug': false
                    });
    });
</script>
```


###options
- `delay (int)` throttle delay to the onScroll event in seconds
- `failretry (bool)` should LazyLoad retry failed ajax requests?
- `faildelay (int)` seconds to wait before retrying failed requests
- `debug (bool)` will show alot of console.log debug data

###data-attributes
- `data-lazyload` the URL for the ajax request
- `data-lazymiddleware` a function that parses the response before setting it as teh innerHTML
- `data-lazyparent` if set, will append to the element's parent instead fo setting the innerHTML
- `data-lazycallback` a callback to be called AFTER the element is loaded



##to-be-loaded elements
You can set an URL to be loaded by ajax when this element hits the screen. all `.lazy` elements will be watched
```html
<div class="lazy"  data-lazyload="/content/highlights/15">
```

Using `data-lazyparent` the content is loaded the the `parentNode` instead and the `div.lazy` is then removed
```html
<div class="lazy"  data-lazyload="/content/highlights/15" data-lazyparent>
```

##Events
LazyLoad throws custom events using `Ink.Dom.Event` that can later be observed

- `lazy-loading` fired when the element is being loaded
- `lazy-failed` fired when the element failed to load
- `lazy-loaded` fired when the element has finished loading

Besides firing events, LazyLoad also sets the className of the element so you can style it accordingly.
```css
    .lazy{
        width: 100%;
    }


    .lazy-loading{
        width: 100%;
        background-image: url('/imgs/load.gif');
        background-repeat: repeat-x;
        height: 20px;
    }

    .lazy-failed{
        width: 100%;
        background-color:#FF999A;
        height: 20px;
    }

    .lazy-loaded{

    }

```

##AJAX Fails
Failed loads are stored to be re-tryed later (depending on the option `failretry` and `faildelay`).

##onLazyLoad callbacks
you can use `onLazyLoad` to delegate observers

```html
<div class="lazy foo"  data-lazyload="/content/foo">
<div class="lazy bar"  data-lazyload="/content/bar">
```

```js
    Ink.requireModules(['Ink.Ext.LazyLoad_1'], function(Lazy) {
        var Lazy = new Lazy();

        Lazy.onLazyLoad('div.foo',function(ev){
                var elem = Ink.Dom.Event.element(ev);
                //elem = div.foo

            });

        Lazy.onLazyLoad('div.bar',function(ev){
                var elem = Ink.Dom.Event.element(ev);
                //elem = div.bar

            });

    });
```


##Middleware
If you want to do any kind of transformations before setting the innerHTML, or if your content is JSON and you need to parse it, set a middleware function.
```html
<div class="lazy" data-lazyload="/content/highlights" data-lazymiddleware="fooBar"></div>
<script type="text/javascript">
function fooBar(element,content){
    return "<h1>foo</h1>"+content;
}
</script>
```
