var formsAPI= function () {
	api={forms:{}};
	api.initForm=function(formView, form_id) {
		var dynamicInputs= $('input.r2b_dynamic, select.r2b_dynamic', formView.$el);
		if (!form_id) {
			form_id=$('.r2b_form', formView.$el).attr('id') || 'id_form_'+formView.model.modelName.toLowerCase();
		}
		dynamicInputs.each(function(){
			var input=$(this),
			value=null,
			id=input.attr('id');
			if (formView.model) {
				value=formView.model.get(input.attr('name'));
			}
			if (api.forms[form_id] && api.forms[form_id][id]) {
				input.on('refresh', api.forms[form_id][id]);
			}
			input.trigger('refresh', {value:value});
			
		});
	};
	
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
								view.templateItem({title: view.getTitle(item), id:item.id}));
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
		saveModel : function() {
			var dirty = this.model.updateFromForm(this.$el),
			view = this,
			root = this.$el;
			if (dirty) {
				this.clearErrors();
				this.model.once('sync', function() {
					if (view.afterSave) {
						view.afterSave();
					}
				});
				this.model.save();
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

	return api;
}();