var formsAPI= function () {
	"use strict";
	var api={forms:{}};
	
	var compileTemplate = function(templateElem) {
		return _.template($(templateElem).html());
	};
	
	api.compileTemplate=compileTemplate;

	// base views
	api.BaseView = Backbone.View.extend({

		constructor : function() {
			Backbone.View.apply(this, arguments);
			if (this.template && !_.isFunction(this.template)) {
				this.template = compileTemplate(this.template);
			}
			
			if (this.templateItem && !_.isFunction(this.templateItem)) {
				this.templateItem = compileTemplate(this.templateItem);
			}
			

		},
		render : function() {
			this.$el.html(this.template(this.model.attributes));
			return this;
		},
		reRender : function() {
			this.render();
			this.delegateEvents();
			return this;
		}

	});
	
	api.BaseListView = api.BaseView
			.extend({
				tagName : 'div',
				className : 'list_section',
				template : '#general_list', // must overide, template must contain one ul
				templateItem : '#template_list_item', //must overide.
//				templateItemTitle : '#item_tile'   //useful to overide 
				events : {
					'click #previous' : 'previousPage',
					'click #next' : 'nextPage',
				},
				
				render : function() {
					var view = this;
					this.$el.html(view.template(this.model));
					this.model.forEach(function(item) {
						view.$el.find('ul').append(
								view.templateItem({title: view.getTitle(item), 
										id:item.id, 
										attributes:item.attributes}));
					});
					return this;
				},
				getTitle: function(model) {
					if (this.templateItemTitle) {
						return compileTemplate(this.templateItemTitle)(model.attributes);
					}
					return model.toString();
				},
				
				previousPage : function() {
					var view = this;
					this.model.once('reset', function() {
						view.reRender();
					});
					this.model.fetchPrevious({
						reset : true
					});
				},

				nextPage : function() {
					var view = this;
					this.model.once('reset', function() {
						view.reRender();
					});
					this.model.fetchNext({
						reset : true
					});
				},
				
			});
	
	api.FormView= api.BaseView.extend({
		
		initialize : function() {
			api.BaseView.prototype.initialize.apply(this, arguments);
			var view = this;
			this.model.on('rejected', function(errors) {
				view.displayErrors(errors);
			});
			this.model.on('invalid', function(model, errors) {
				view.displayErrors(errors);
			});
		},
		
		initForm: function(form_id) {
			var dynamicInputs= $('input.r2b_dynamic, select.r2b_dynamic, textarea.r2b_dynamic', this.$el);
			if (!form_id) {
				form_id=$('.r2b_form', this.$el).attr('id') || 'id_form_'+this.model.modelName.toLowerCase();
			}
			var view=this;
			dynamicInputs.each(function(){
				var el=$(this),
				widget,
				value=null,
				id=el.attr('id');
				
				if (api.forms[form_id] && api.forms[form_id][id]) {
					var def=api.forms[form_id][id];
					widget=new def.cls(el, def.options);
					el.data('widget', widget);
					
				}
				
				// trigger refresh for dynamic inputs
				if (view.model) {
					var name=widget.getName() || el.attr('name');
					value=view.model.get(name);
				}
				el.trigger('refresh', {value:value});
				
			});
		},
		
		updateModel : function() {
			var dirty = false;
			var diff = function(old, newer) {

				var compareArrays = function(a1, a2) {

					if (!a1 || !a2)
						return false;
					if (a1.length !== a2.length)
						return false;

					for ( var i = 0; i < a1.length; i++) {
						if (_.isArray(a1[i]) && _.isArray(a2[i])) {
							if (!compareArrays(a1[i], a2[i]))
								return false;
						} else if (a1[i] != a2[i]) {
							return false;
						}
					}
					return true;
				};

				// to have null == ''
				if (!old && !newer) {
					return false;
				}

				return !(old == newer || _.isArray(old) && 
						compareArrays(old, newer));
			};
			var changes={};
			for ( var key in this.model.attributes) {
				var readOnly = this.model.readOnly();
				if (readOnly.indexOf(key) >= 0) {
					continue;
				}
				var input = this.$el.find('#id_'+key+':not(.r2b_field_value_ro)');
				if (input.length < 1) {
					throw "Input for attribute " + key + " is missing";
				}
				var widget= input.data('widget');
				if (! widget) {
					widget=new api.Widget(input);
					input.data('widget', widget);
				}
				var newVal = widget.get();
				if (diff(this.model.get(key), newVal)) {
					changes[key]=newVal
					dirty = true;
				}
			}
			if (dirty) {
				this.model.set(changes);
			}
			return dirty;
		},
		saveModel : function() {
			var dirty = this.updateModel(),
			view = this,
			root = this.$el;
			if (dirty) {
				this.clearErrors();
				this.model.once('sync', function() {
					if (view.afterSave) {
						view.afterSave();
					}
				});
				if (this.model.isNew()) {
					this.model.save();
				} else {
					this.model.save(this.model.changedAttributes(), {patch:true});
				}
			}
		},
		
		displayErrors : function(errors) {
			var root=this.$el,
			list = root.find('ul.r2b_errors');
			for (var name in errors) {
				var label = root.find('label[for="id_' + name + '"]').addClass(
						'error');
				var messages = errors[name];
				if (!_.isArray(messages)) {
					messages = [ messages ];
				}
				for ( var i = 0; i < messages.length; i += 1) {
					var item = $('<li>').text(name + ': ' + messages[i]);
					list.append(item);
				}
			}
		},

		clearErrors : function() {
			var root=this.$el;
			root.find('ul.r2b_errors').empty();
			root.find('label.error').removeClass('error');
		},
		
	});
	
	api.Widget=function(selector, opts) {
		this.options=_.extend({}, opts);
		this.elem=$(selector);
	if (this.events && !this.options.noBind) {
		this.bindEvents();
	}
	};
	
	_.extend(api.Widget.prototype, 
		{_isInput:function() {
			return  _.contains(['INPUT', 'SELECT', 'TEXTAREA'], this.elem.prop('tagName').toUpperCase());
		},
		
		get: function() {
			if (! this._isInput()) {
				throw "Don't know how to get value for " + this.elem.prop('tagName').toUpperCase();
			}
			if (this.elem.attr('type') === "checkbox") {
					return this.elem.prop('checked');
				}
			return this.elem.val();
	
				},
	
		set: function(value) {
			if (! this._isInput()) {
				throw "Don't know how to set value for " + this.elem.prop('tagName').toUpperCase();
			}
			if (this.elem.attr('type') === "checkbox") {
				if (value) {
					this.elem.prop('checked', true);
				}  else {
					this.elem.prop('checked', false);
				}
			} else {
				this.elem.val(value);
			}
		 
				},
				
		getName: function() {
			return this.options.name;
		},
		
		bindEvents: function() {
			for (var k in this.events) {
				if (_.has(this.events, k)) {
					var elems=k.split(" "), 
					evt=elems[0],
					el=elems[1],
					fn=this.events[k];
					fn=_.isFunction(fn)?fn: this[fn];
					this.elem.on(evt, el, _.bind(fn,this));
				}
				}
		}
				
		});
				
	api.Widget.extend=function(instanceProps, staticProps) {
		var parent=this,
		child;
		// to get object with parent prototype set
		var F=function(){};
		F.prototype=parent.prototype;
		//new prototype for child
		var proto=_.extend(new F(),instanceProps);
		//create new Class/Constructor
		// can have additional constuctor method, that can add stuff to instance
		if (_.has(instanceProps,'constructor')) {
			delete proto.constructor;
			child=function() {
			parent.apply(this, arguments);  
			instanceProps.constructor.apply(this, arguments);
			};
		} else {
			child=function() {parent.apply(this, arguments);
			};
		}
		// set constructor and prototype for child class
		proto.constructor=child;
		child.prototype=proto;
		//in case true parent class/constructor is needed	
		child.__super__=parent;
		//copy parent static properties
		for (var k in parent) {
			if (_.has(parent,k)) {
				child[k]=parent[k];
			}
		}
		 
		// and add new static properties
		if (staticProps) {
			_.extend(child, staticProps);
		}
		 
	return child;
	};
		
		
	api.DynamicSelect = api.Widget
			.extend({
				events : {
					"refresh" : "refresh"
				},
				refresh : function(e, obj) {
					var select = this.elem, 
					value = obj.value, 
					progress = $(
							'<div>').addClass('r2b_progress-small')
							.insertAfter(select), 
					index = new restAPI[this.options.indexModel]();
					select.empty();
					if (! this.options.required) {
						select.append($('<option>'));
					}
					index.on('reset', function() {
						index.forEach(function(item) {
							var o = $('<option>').attr('value', item.id).html(
									item.get('name'));
							if (_.isArray(value) &&
									(value.indexOf(item.id) > -1 || value
											.indexOf(item.id.toString()) > -1) ||
									item.id == value) {
								o.attr('selected', '');
							}
							
							o.appendTo(select);
						});
						progress.remove();
					});
					index.fetch({
						reset : true
					});
				}
			});
    

	return api;
}();