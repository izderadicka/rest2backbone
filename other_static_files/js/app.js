
//books application
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
	events: {'click .item_title:not(.new)': 'expandDetail',
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
			var div=item.find('div.item_content').animate({height:0}, function(){this.remove()});
		} else {
			title.addClass('expanded')
			var div=$('<div>').addClass('item_content').appendTo(item)
//			   .append($('<div>').attr('class', 'progress_wheel'));
			if (this.detailViewClass) {
				var view=new this.detailViewClass({model:this.model.get(pk)});
				view.parent=div;
				view.render();
				//animation
				animateHeight(div, 0);
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
		this.$el.find('div.r2b_form_ro').append($('<div>').html('Edit').addClass('r2b_top_form_btn')
				.attr('id', 'r2b_edit_btn'));
		return this;
	},
	
	events: {"click #r2b_edit_btn": 'renderEdit',
		      "click #r2b_view_btn": 'reRender',
		      "click #r2b_save_btn": 'saveModel'},
	
	renderEdit: function() {
		this.$el.html(compileTemplate(this.templateEdit)(this.model.attributes));
		formsAPI.initForm(this);
		$(this.parent).html(this.$el).height('auto') ;
		
		this.$el.find('div.r2b_form').append($('<div>').html('View').addClass('r2b_top_form_btn')
				.attr('id', 'r2b_view_btn'));
		this.$el.find('div.r2b_form').append($('<div>').html('Save').addClass('r2b_form_btn')
				.attr('id', 'r2b_save_btn'));
		
		this.delegateEvents();
		return this
	},
	
	saveModel: function() {
		var dirty=this.model.updateFromForm(this.$el)
		if (dirty) {
			
			this.model.save();
			//not very efficient - should just rerender current item only
			this.model.once('sync', function() {app.currentView.reRender()});
			
			
			};
	}
	
		      
		      

})

var PublisherView= DetailView.extend({
	template:'#r2b_template_publisher_ro',
	templateEdit: '#r2b_template_publisher'
		
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
	template:'#r2b_template_author_ro',
	templateEdit:'#r2b_template_author'
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
	template:'#r2b_template_book_ro',
	templateEdit:'#r2b_template_book'
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

var NewView = BaseView.extend({
	templateItem:'#new_list_item',
	tagName:'div',
	className:'item_content',
	initialize: function() {
		this.model.on('rejected', function(errors){displayErrors(root, errors)});
		BaseView.prototype.initialize.apply(this, arguments);
	},
	render: function() {
		if ($('li.list_item.new').length>0) return;
		var item=$(this.templateItem({name: this.model.modelName}));
		$('div.list_section ul').prepend(item);
		var form= compileTemplate('#r2b_template_'+this.model.modelName.toLowerCase())(this.model.attributes);
		this.$el.html(form);
		this.$el.find('div.r2b_form').append($('<div>').html('Save').addClass('r2b_form_btn')
				.attr('id', 'r2b_save_btn'));
		this.$el.appendTo(item);
		//animation
		animateHeight(this.$el,0);
		
	
	},
	events: {'click #r2b_save_btn': 'saveNew'},
	saveNew: function() {
		this.$el.height('auto');
		var view= app.currentView
		var root=this.$el
		clearErrors(root);
		this.model.updateFromForm(this.$el)
		this.model.save();
		//not very efficient - should just rerender current item only
		this.model.once('sync', function() {
			view.model.unshift(this)
			app.currentView.reRender()});
	}
	
})

//supporting functions for views

animateHeight=function(el, from, to) {
	if (to=== undefined || to==='auto') {
		to=el.height();
	};
	if (from==='auto') {
		from=el.height();
	}
	el.height(from).animate({height:to}, function(){
		if (to=== undefined || to==='auto') {
			el.height('auto')
		}
	});
	
};

var displayErrors=function(root, errors) {
	var list = root.find('ul.r2b_errors');
	for (name in errors) {
		var label =root.find('label[for="id_'+name+'"]').addClass('error');
		var messages=errors[name]
		if (! _.isArray(messages)) {
			messages=[messages]
		};
		for (var i=0;i<messages.length;i+=1) {
			var item=$('<li>').text(name+ ': '+messages[i]);
			list.append(item);
		};
	}
}

var clearErrors= function(root) {
	root.find('ul.r2b_errors').empty();
	root.find('label.error').removeClass('error');
}

var addNew= function() {
	var model=new app.currentView.model.model();
	var view=new NewView({model:model});
	view.render();
	
}

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

//create application

var app=new App();
app.doSearch=doSearch;
app.addNew=addNew;
return app;
}();


//when page loads
$(function(){

//start routing
Backbone.history.start();
if (! Backbone.history.fragment) {
	booksApp.navigate('publisher', {trigger:true});
}

//bind main navigation and search events
$('#publishers_tab').click(function(evt) {booksApp.navigate('publisher', {trigger:true})});
$('#authors_tab').click(function(evt) {booksApp.navigate('author', {trigger:true})});
$('#books_tab').click(function(evt) {booksApp.navigate('book', {trigger:true})});
$('#add_new').click(function(evt) {booksApp.addNew()});

$('.search-field').keypress(function(event) {
	if ( event.which == 13 ) {
		booksApp.doSearch($(this).val())
	}
	});


//UI Tweaks
$('.search-field').focus(function(){$(this).addClass('expanded')})
				  .blur(function(){if (!$(this).val()) {$(this).removeClass('expanded')}});


});

