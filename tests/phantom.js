var tests = {
	basic : function() {
		if (!restAPI) return "restAPI is missing";
		if (!formsAPI) return "formsAPI is missing";
	},
	
	loadCollections: function() {
		
		var publishers=new restAPI.PublisherList();
		publishers.fetch({reset:true});
		publishers.on('reset', function () {
			
			if (publishers.length!==3)
			window.callPhantom('Publishers should be 3, but are'+ publishers.length);
		});
		
		var idx=new restAPI.PublisherIndex();
		idx.on('sync', function(){
			if(idx.length!==3) window.callPhantom("Publishers index should be 3")
		});
		idx.fetch();
		
		
	}
};

var errors = [];

var page = require('webpage').create();

page.onError = function(msg, trace) {
	// do not log JS errors
	console.log('Error: ' + msg);
	errors.push(['error', msg]);
};

page.onCallback=function(msg) {
	console.log('Callback: '+msg );
	errors.push(['callback', msg]);
};

page.open('http://localhost:8081/', function(status) {

	for ( var key in tests) {
		if (tests.hasOwnProperty(key)) {
			console.log('Running test: ' + key);
			var result = page.evaluate(tests[key]);
			if (result) {
				errors.push([ key, result ]);
			}
		}
	}
	
	setInterval(function () {
	if (errors.length > 0) {
		console.log(errors);
		console.log('PhantomJS ERRORS: ' + errors.length);
		phantom.exit(1);

	} else {
		console.log('PhantomJS OK');
		phantom.exit(0);
	}
	}, 1000);
});
