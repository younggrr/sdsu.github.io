define([
    "dojo/_base/declare", "dojo/dom-construct", "dojo/parser", "dojo/ready",
    "dijit/_WidgetBase", "dijit/_TemplatedMixin", "dojo/_base/lang", "dojo/has", "esri/kernel",
    "dojo/dom-style", "esri/tasks/query", "esri/tasks/QueryTask",
    "dojo/text!./Templates/FilterString.html",
    "dojo/i18n!application/nls/FilterDialog",
], function(
    declare, domConstruct, parser, ready, 
    _WidgetBase, _TemplatedMixin, lang, has, esriNS,
    domStyle, Query, QueryTask,
    FilterItemTemplate, i18n){
    var Widget = declare("FilterString", [_WidgetBase, _TemplatedMixin], {
        templateString: FilterItemTemplate,

        options: {
        },        

        constructor: function(options, srcRefNode){
            var defaults = lang.mixin({}, this.options, options);
            this._i18n = i18n;
            this.domNode = srcRefNode;
            this.set("map", defaults.map);
            this.set("layer", defaults.layer);
            this.set("field", defaults.field);
        },
        
        startup: function () {
            if (!this.map) {
                this.destroy();
                console.log("Filter::map required");
            }
            if (this.map.loaded) {
                this._init();
            } else {
                on.once(this.map, "load", lang.hitch(this, function () {
                    this._init();
                }));
            }
        },

        _init: function () {
            this.domNode = domConstruct.create("div", {innerHTML: this.field.fieldName});
        },

        getListMode : function() {
            return this.criteria.value === ' IN ' || this.criteria.value === ' NOT IN ';
        },

        criteriaChanged: function(ev) {
//             var listMode = ev.target.value === 'In' || ev.target.value === 'NotIn';
            switch(this.getListMode()) {
                case false: 
                    domStyle.set(this.textInput,'display', '');
                    domStyle.set(this.listInput,'display', 'none');
                    break;
                case true: 
                    domStyle.set(this.textInput,'display', 'none');
                    domStyle.set(this.listInput,'display', '');

                    if(this.listInput.innerHTML === '') {
                        var _query = new Query();
                        _query.outFields = [this.field.fieldName];
                        _query.returnGeometry = false;
                        _query.where = "1=1";
                        _query.spatialRelationship = "esriSpatialRelIntersects";
                        _query.returnDistinctValues = true;
                        _query.orderByFields = [this.field.fieldName];
                        var task = new QueryTask(this.layer.layerObject.url);
                        task.execute(_query).then(lang.hitch(this, function(results) {
//                             console.log(results);
                            results.features.map(lang.hitch(this, function(f) { 
                                return f.attributes[this.field.fieldName];})).forEach(lang.hitch(this, function(v) {
                                if(v) {
                                    var id = this.id+'_'+v;
                                    this.listInput.innerHTML += '<input type="checkbox" class="checkbox" value="'+v+'" id="'+id+'"/>';
                                    this.listInput.innerHTML += '<label for="'+id+'" class="checkbox">'+v+'</label>';
                                    this.listInput.innerHTML += '<br />';
                                }
                            }));
                        }));
                    }
                    break;
            }
        },

        getFilterExpresion: function() {
            if(this.getListMode()) {
                var list = Array.prototype.slice.call(this.listInput.children).filter(function(c) {
                    return c.nodeName=="INPUT" && c.checked;
                    }).map(function(c) { return c.value; });
                if(!list || list.length === 0) 
                {
                    return null;
                }
                else if(list.length == 1) {
                    var op = " = ";
                    if(this.criteria.value.indexOf('NOT')>=0) {
                        op = " != ";
                    }
                    return this.field.fieldName+op+"'"+list[0]+"'";
                } else {
                    var comma ='';
                    var inList=list.reduce(function(previousValue, currentValue) {
                        if(previousValue && previousValue!=='') 
                            comma = ', ';
                        return previousValue+"'"+comma+"'"+currentValue;
                    });
                    return this.field.fieldName+this.criteria.value + "('"+inList+"')";
                }
            } else {
                if(this.textInput.value !== '') {
                    var text = this.textInput.value;
                    if(this.criteria.value.indexOf('LIKE')>=0){
                        var re = /(.*%.*)|(.*_.*)|(\[.*\])/gm;
                        var matches = re.exec(text);
                        if(!matches || matches.length === 0) {
                            text += '%';
                        }
                    }
                    return this.field.fieldName+this.criteria.value+"'"+text+"'";
                }
                else {
                    return null;
                }
            }
        }    
    });

    if (has("extend-esri")) {
        lang.setObject("dijit.FilterString", Widget, esriNS);
    }
    return Widget;
});