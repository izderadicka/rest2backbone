var booksApp=function() {

// main collections
var collections={},
    books=null,
	publishers=null,
	authors=null;

var compileTemplate=function(templateElem) {
	return _.template($(templateElem).html())
};

//base views	
var BaseView= Backbone.View.extend({
	    
		
	 	constructor: function() {
	 		Backbone.View.apply(this,arguments);
	 		if (this.template && !  _.isFunction(this.template)) {
	 			this.template=compileTemplate(this.template)
	 		};
	 		if (this.templateItem && !  _.isFunction(this.templateItem)) {
	 			this.templateItem=compileTemplate(this.templateItem)
	 		};
	 		
	 	},
		render: function() {
			this.$el.html(this.template(this.model.attributes))
			$(this.parent).html(this.$el)
			return this
		},
		reRender: function() {
			this.render();
			this.delegateEvents();
			return this
		}
		
		
	});	

var BaseListView = BaseView.extend({
	tagName:'div',
	className:'list_section',
	parent:'div#main',
	template:'#general_list',
	events: {'click .item_title': 'expandDetail',
			'click #previous': 'previousPage',
			'click #next': 'nextPage'
			},
	render: function() {
		var view=this;
		this.$el.html(view.template(this.model));
		this.model.forEach(function(item){
			view.$el.find('ul').append(view.templateItem(item.attributes));
		});
		$(this.parent).html(this.$el);
		return this;
	},
	expandDetail: function(evt) {
		var title=$(evt.currentTarget),
		 item= title.parents('li'),
		 pk=parseInt(item.attr('data-pk'));
		if (title.hasClass('expanded')) {
			title.removeClass('expanded');
			item.find('div.item_content').remove();
		} else {
			title.addClass('expanded')
			var div=$('<div>').addClass('item_content').appendTo(item)
			   .append($('<div>').attr('class', 'progress_wheel'));
			if (this.detailViewClass) {
				var view=new this.detailViewClass({model:this.model.get(pk)});
				view.parent=div;
				view.render();
			}
		}
	},
	
	previousPage: function() {
		var view=this;
		this.model.once('reset', function() {view.reRender()});
		this.model.fetchPrevious({reset:true})
	},
	
	nextPage: function() {
		var view=this
		this.model.once('reset', function() {view.reRender()});
		this.model.fetchNext({reset:true})
	}
	
});

// app views

var DetailView = BaseView.extend({
	render: function() {
		BaseView.prototype.render.apply(this, arguments);
		this.$el.find('div.r2b_form_ro').append($('<div>').html('Edit').addClass('r2b_edit_form_btn'));
	}
})

var PublisherView= DetailView.extend({
	template:'#r2b_template_publisher_ro'
});

var PublishersListView=BaseListView.extend({
	
	id:"publishers_section",
	templateItem:'#publisher_list_item',
	detailViewClass:PublisherView,
	
	
	render: function() {
		BaseListView.prototype.render.apply(this, arguments);
		toggleMainMenu('publisher');
	}
	
	
});

var AuthorView= DetailView.extend({
	template:'#r2b_template_author_ro'
});

var AuthorsListView=BaseListView.extend({
	tagName:'div',
	className:'list_section',
	id:"authors_section",
	parent:'div#main',
	template:'#general_list',
	templateItem:'#author_list_item',
	detailViewClass:AuthorView,
	
	render: function() {
		BaseListView.prototype.render.apply(this, arguments);
		toggleMainMenu('author');
	}
});

var BookView= DetailView.extend({
	template:'#r2b_template_book_ro'
});

var BooksListView=BaseListView.extend({
	tagName:'div',
	className:'list_section',
	id:"books_section",
	parent:'div#main',
	template:'#general_list',
	templateItem:'#book_list_item',
	detailViewClass: BookView,
	
	render: function() {
		BaseListView.prototype.render.apply(this, arguments);
		toggleMainMenu('book');
	}
});

//supporting functions for views

var toggleMainMenu = function(item) {
	$('#main_tabs li').removeClass('selected');
	$('#'+item+'s_tab').addClass('selected');
};

var resetSearch =function(search) {
	field=$('.search-field');
	if (! search) {
		field.val('');
	} else {
		field.val(search);
	}
	if (! field.val()) {
	 field.removeClass('expanded');
	} else {
		field.addClass('expanded');
	}
};

var currSearch = function() {
	return app.currentView.model && app.currentView.model.query && app.currentView.model.query.q;
}
var doSearch= function(search) {
	//alert(search);
	var prevSearch= currSearch();
	if (prevSearch !== search) {
		var view=app.currentView,
		m=view.model;
		//reset pagination
		m.page && delete m.page
		if (search) {
		m.query={q:search};
		} else if (m.query){
			delete m.query.q
		}
		m.once('reset', function() {
			if (view===app.currentView) {
				view.reRender()
			}
		}) ;
		m.fetch({reset:true});
	}
};

var listAction = function(collectionName, collectionClass, viewClass) {
	var wrapped=function() {
		
		var view;
		if ( ! collections[collectionName]) {
			var c= new collectionClass()
			view=new viewClass({model:c});
			collections[collectionName]=c;
			c.fetch();
			c.once('sync', function(evt){
			
			view.render();
			});
		} else {
			view=new viewClass({model:collections[collectionName]});
			view.render();
		};
	
	this.currentView=view;
	resetSearch(currSearch());
	return this;
	};
	return wrapped;
};

	


// Application router
var App=Backbone.Router.extend({
	routes:{'publisher': 'listPublishers',
		    'author': 'listAuthors',
		    'book': 'listBooks'
		    	},
	
    listPublishers: listAction('publishers', restAPI.PublisherList, PublishersListView),
	listAuthors: listAction('authors', restAPI.AuthorList, AuthorsListView),
	listBooks: listAction('books', restAPI.BookList, BooksListView)
});

//start application

var app=new App();
app.doSearch=doSearch;
return app;
}();

$(function(){

Backbone.history.start();
if (! Backbone.history.fragment) {
	booksApp.navigate('publisher', {trigger:true});
}
$('#publishers_tab').click(function(evt) {booksApp.navigate('publisher', {trigger:true})});
$('#authors_tab').click(function(evt) {booksApp.navigate('author', {trigger:true})});
$('#books_tab').click(function(evt) {booksApp.navigate('book', {trigger:true})});

$('.search-field').keypress(function(event) {
	if ( event.which == 13 ) {
		booksApp.doSearch($(this).val())
	}
	});
//UI Tweaks
$('.search-field').focus(function(){$(this).addClass('expanded')})
				  .blur(function(){if (!$(this).val()) {$(this).removeClass('expanded')}});


});

