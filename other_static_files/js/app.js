//books application
var booksApp = function() {

	// main collections
	var collections = {};

	var compileTemplate = function(templateElem) {
		return _.template($(templateElem).html());
	};

	// base views
	var BaseView = Backbone.View.extend({

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
			$(this.parent).html(this.$el);
			return this;
		},
		reRender : function() {
			this.render();
			this.delegateEvents();
			return this;
		}

	});
	
	var BaseListView = BaseView
			.extend({
				tagName : 'div',
				className : 'list_section',
				parent : 'div#main', // must overide
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
					$(this.parent).html(this.$el);
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

	var BaseDynamicListView = BaseListView
			.extend({
				
				className : 'list_section',
				parent : 'div#main',
				template : '#general_list',
				templateItem : '#template_list_item',
				events : $.extend ( {
					'click .item_title:not(.new)' : 'expandDetail',
					'click .item_delete': 'deleteItem'
				},BaseListView.prototype.events),
				
				expandDetail : function(evt) {
					var title = $(evt.currentTarget), item = title
							.parents('li'), pk = parseInt(item.attr('data-pk'),10),
						div;
					if (title.hasClass('expanded')) {
						title.removeClass('expanded');
//						if (pk && !this.model.get(pk).isValid()) {
//							this.model.get(pk).fetch();
//						}
						div = item.find('div.item_content').animate({
							height : 0
						}, function() {
							this.remove();
						});
					} else {
						title.addClass('expanded');
						div = $('<div>').addClass('item_content').appendTo(
								item);
						// .append($('<div>').attr('class', 'progress_wheel'));
						if (this.detailViewClass) {
							var view = new this.detailViewClass({
								model : this.model.get(pk)
							});
							view.parent = div;
							view.render();
							// animation
							animateHeight(div, 0);
						}
					}
				},
				
				deleteItem: function(evt) {
					var li=$(evt.currentTarget).parents('li.list_item'),
					pk=li.attr('data-pk');
					if (pk) {
						var model=this.model.get(pk);
						model.destroy();
					}
					li.remove();
					
				}

			});

	// app views
	
	var FormView= BaseView.extend({
		
		initialize : function() {
			BaseView.prototype.initialize.apply(this, arguments);
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

	var DetailView = FormView.extend({
		render : function() {
			FormView.prototype.render.apply(this, arguments);
			this.$el.find('div.r2b_form_ro').append(
					$('<div>').html('Edit').addClass('r2b_top_form_btn').attr(
							'id', 'r2b_edit_btn'));
			return this;
		},

		

		events : {
			"click #r2b_edit_btn" : 'renderEdit',
			"click #r2b_view_btn" : 'reRender',
			"click #r2b_save_btn" : 'saveModel'
		},

		renderEdit : function() {
			this.$el.html(compileTemplate(this.templateEdit)(
					this.model.attributes));
			formsAPI.initForm(this);
			$(this.parent).html(this.$el).height('auto');

			this.$el.find('div.r2b_form').append(
					$('<div>').html('View').addClass('r2b_top_form_btn').attr(
							'id', 'r2b_view_btn'));
			this.$el.find('div.r2b_form').append(
					$('<div>').html('Save').addClass('r2b_form_btn').attr('id',
							'r2b_save_btn'));

			this.delegateEvents();
			return this;
		},

		
		afterSave: function() {
			// not very efficient - should just rerender current item only
			app.currentView.reRender();
		}

	});

	var PublisherView = DetailView.extend({
		template : '#r2b_template_publisher_ro',
		templateEdit : '#r2b_template_publisher'

	});

	var PublishersListView = BaseDynamicListView.extend({

		id : "publishers_section",
		templateItemTitle : '#publisher_list_title',
		detailViewClass : PublisherView,

		render : function() {
			BaseDynamicListView.prototype.render.apply(this, arguments);
			toggleMainMenu('publisher');
		}

	});

	var AuthorView = DetailView.extend({
		template : '#r2b_template_author_ro',
		templateEdit : '#r2b_template_author'
	});

	var AuthorsListView = BaseDynamicListView.extend({
		id : "authors_section",
		templateItemTitle : '#author_list_title',
		detailViewClass : AuthorView,

		render : function() {
			BaseDynamicListView.prototype.render.apply(this, arguments);
			toggleMainMenu('author');
		}
	});

	var BookView = DetailView.extend({
		template : '#r2b_template_book_ro',
		templateEdit : '#r2b_template_book'
	});

	var BooksListView = BaseDynamicListView.extend({
		id : "books_section",
		templateItemTitle : '#book_list_title',
		detailViewClass : BookView,

		render : function() {
			BaseDynamicListView.prototype.render.apply(this, arguments);
			toggleMainMenu('book');
		}
	});

	var NewView = FormView.extend({
		templateItem : '#new_list_item',
		tagName : 'div',
		className : 'item_content',
		
		render : function() {
			if ($('li.list_item.new').length > 0)
				return;
			var item = $(this.templateItem({
				name : this.model.modelName
			}));
			$('div.list_section > ul.list').prepend(item);
			var form = compileTemplate(
					'#r2b_template_' + this.model.modelName.toLowerCase())(
					this.model.attributes);
			this.$el.html(form);
			formsAPI.initForm(this);
			this.$el.find('div.r2b_form').append(
					$('<div>').html('Save').addClass('r2b_form_btn').attr('id',
							'r2b_save_btn'));
			this.$el.appendTo(item);
			// animation
			animateHeight(this.$el);

		},
		events : {
			'click #r2b_save_btn' : 'saveModel'
		},
		
		afterSave: function() {
			
			this.masterCollection.unshift(this.model);
			app.currentView.reRender();
		}

	});

	// supporting functions for views

	animateHeight = function(el, from, to) {
		var toAuto;
		if (to === undefined || to === 'auto') {
			toAuto=true;
			to = el.height();
		}
		if (from === 'auto') {
			from = el.height();
		}
		el.height(from).animate({
			height : to
		}, function() {
			if (toAuto) {
				el.height('auto');
			}
		});

	};

	var addNew = function() {
		var list = app.currentView.model,
		model=new list.model();
		var view = new NewView({
			model : model
		});
		view.masterCollection=list;
		view.render();

	};

	var toggleMainMenu = function(item) {
		$('#main_tabs li').removeClass('selected');
		$('#' + item + 's_tab').addClass('selected');
	};

	var resetSearch = function(search) {
		field = $('.search-field');
		if (!search) {
			field.val('');
		} else {
			field.val(search);
		}
		if (!field.val()) {
			field.removeClass('expanded');
		} else {
			field.addClass('expanded');
		}
	};

	var currSearch = function() {
		return app.currentView.model && app.currentView.model.query && 
		app.currentView.model.query.q;
	};
	
	var doSearch = function(search) {
		// alert(search);
		var prevSearch = currSearch();
		if (prevSearch !== search) {
			var view = app.currentView, m = view.model;
			// reset pagination
			if (m.page) { 
				delete m.page;
			}
			if (search) {
				m.query = {
					q : search
				};
			} else if (m.query) {
				delete m.query.q;
			}
			m.once('reset', function() {
				if (view === app.currentView) {
					view.reRender();
				}
			});
			m.fetch({
				reset : true
			});
		}
	};

	var listAction = function(collectionName, collectionClass, viewClass) {
		var wrapped = function() {

			var view;
			if (!collections[collectionName]) {
				var c = new collectionClass();
				view = new viewClass({
					model : c
				});
				collections[collectionName] = c;
				c.fetch();
				c.once('sync', function(evt) {

					view.render();
				});
			} else {
				view = new viewClass({
					model : collections[collectionName]
				});
				view.render();
			}

			this.currentView = view;
			resetSearch(currSearch());
			return this;
		};
		return wrapped;
	};

	// Application router
	var App = Backbone.Router
			.extend({
				routes : {
					'publisher' : 'listPublishers',
					'author' : 'listAuthors',
					'book' : 'listBooks'
				},

				listPublishers : listAction('publishers',
						restAPI.PublisherList, PublishersListView),
				listAuthors : listAction('authors', restAPI.AuthorList,
						AuthorsListView),
				listBooks : listAction('books', restAPI.BookList, BooksListView)
			});

	// create application

	var app = new App();
	app.doSearch = doSearch;
	app.addNew = addNew;
	return app;
}();

// when page loads
$(function() {

	// start routing
	Backbone.history.start();
	if (!Backbone.history.fragment) {
		booksApp.navigate('publisher', {
			trigger : true
		});
	}

	// bind main navigation and search events
	$('#publishers_tab').click(function(evt) {
		booksApp.navigate('publisher', {
			trigger : true
		});
	});
	$('#authors_tab').click(function(evt) {
		booksApp.navigate('author', {
			trigger : true
		});
	});
	$('#books_tab').click(function(evt) {
		booksApp.navigate('book', {
			trigger : true
		});
	});
	$('#add_new').click(function(evt) {
		booksApp.addNew();
	});

	$('.search-field').keypress(function(event) {
		if (event.which == 13) {
			booksApp.doSearch($(this).val());
		}
	});

	// UI Tweaks
	$('.search-field').focus(function() {
		$(this).addClass('expanded');
	}).blur(function() {
		if (!$(this).val()) {
			$(this).removeClass('expanded');
		}
	});

});
