//books application
var booksApp = function() {

	// main collections
	var collections = {};
	var BaseDynamicListView = formsAPI.BaseListView
			.extend({
				
				className : 'list_section',
				template : '#general_list',
				templateItem : '#template_list_item',
				events : $.extend ( {
					'click .item_title:not(.new)' : 'expandDetail',
					'click .item_delete': 'deleteItem'
				},formsAPI.BaseListView.prototype.events),
				
				expandDetail : function(evt) {
					var title = $(evt.currentTarget), item = title
							.parents('li'), pk = parseInt(item.attr('data-pk'),10),
						div;
					if (title.hasClass('expanded')) {
						title.removeClass('expanded');
						div = item.find('div.item_content');
						div.trigger('hidden').animate({
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
								model : this.model.get(pk),
								el:div
							});
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
	
	var DetailView = formsAPI.FormView.extend({
		template: '#detail_template',
		render : function() {
			var view= formsAPI.compileTemplate(this.templateView)(this.model.attributes),
			edit=formsAPI.compileTemplate(this.templateEdit)(this.model.attributes);
			this.$el.html(this.template({form_ro:view, form:edit}));
			this.initForm();
			return this;
		},

		events : {
			"click #r2b_edit_btn" : 'displayForm',
			"click #r2b_view_btn" : 'displayView',
			"click #r2b_save_btn" : 'saveModel',
			"hidden": "formHidden"
		},
		
		formHidden: function() {
			
		},
		
		switchForm: function(ro) {
			var form=$('div.edit_form', this.$el),
			view=$('div.view_only', this.$el);
			if (ro) {
				form.hide();
				view.show();
			} else {
				view.hide();
				form.show();
			}
		},
		displayForm: function() {this.switchForm(false);},
		displayView: function() {this.switchForm(true);},
		
		afterSave: function() {
			// not very efficient - should just rerender current item only
			app.currentView.reRender();
		}

	});

	var PublisherView = DetailView.extend({
		templateView : '#r2b_template_publisher_ro',
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
		templateView : '#r2b_template_author_ro',
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
		templateView : '#r2b_template_book_ro',
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

	var NewView = formsAPI.FormView.extend({
		templateItem : '#new_list_item',
		tagName : 'div',
		className : 'item_content',
		
		render : function() {
			if ($('li.list_item.new').length > 0)
				return;
			var item = $(this.templateItem({
				name : this.model.modelName
			}));
			$('div.list_section ul.list').prepend(item);
			var form = formsAPI.compileTemplate(
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

			var view,
			root=$('#main div.list_section'),
			list=$('<div>').attr('id', 'id_list_'+collectionName),
			doRender=function() {
				view.render();
				root.empty().append(list);
			};
			if (!collections[collectionName]) {
				var c = new collectionClass();
				view = new viewClass({
					model : c,
					el:list
				});
				collections[collectionName] = c;
				c.fetch();
				c.once('sync', function(evt) {
					doRender();
				});
			} else {
				view = new viewClass({
					model : collections[collectionName],
					el:list
				});
				doRender();
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
