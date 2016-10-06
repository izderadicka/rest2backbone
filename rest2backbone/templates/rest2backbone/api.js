//set CSRF support

(function() {
	function csrfSafeMethod(method) {
		// these HTTP methods do not require CSRF protection
		return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
	}

	function getCookie(name) {
		var cookieValue = null;
		if (document.cookie && document.cookie !== '') {
			var cookies = document.cookie.split(';');
			for ( var i = 0; i < cookies.length; i++) {
				var cookie = jQuery.trim(cookies[i]);
				// Does this cookie string begin with the name we want?
				if (cookie.substring(0, name.length + 1) == (name + '=')) {
					cookieValue = decodeURIComponent(cookie
							.substring(name.length + 1));
					break;
				}
			}
		}
		return cookieValue;
	}

	$.ajaxSetup({
		crossDomain : false,
		cache: false,
		beforeSend : function(xhr, settings) {
			if (!csrfSafeMethod(settings.type)) {
				xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
			}
		}
	});
})();

var restAPI = function() {
	"use strict";
	var api = {};

	var validators = {
		required : function(value) {
			if (!value) {
				return gettext('Value is required');
			}
		},
		minmax : function(value, min, max) {
			if (!value && value !== 0) {
				return;
			}
			// we take numbers only
			value = +value;
			if (isNaN(value)) {
				return;
			}

			if ((min || min === 0) && value < min) {
				return gettext('Value is smaller then required minimum:') + min;
			}
			if ((max || max === 0) && value > max) {
				return gettext('Value is geater then required maximum:') + max;
			}
		},
		minmaxLength : function(value, min, max) {
			if (!value || value.length === undefined) {
				return;
			}

			if ((min || min === 0) && value.length < min) {
				return gettext('Length of value is smaller then required minimum:') + min;
			}

			if ((max || max === 0) && value.length > max) {
				return gettext('Length of value is greater then required maximum:') + max;
			}
		},
		
		type: {
			float: function(value) {
				if (! value) {
					return;
				}
				if (isNaN(+value)) {
					return gettext('Value is not a number');
				}
			},
			integer: function(value) {
				if (!value) {
					return;
				}
				if (isNaN(+value) || ! /^[+-]?\d+$/.test(value.toString())) {
					return gettext('Value is not an integer number');
				}
			},
			date: function(value) {
				if (!value) {
					return;
				}
				if (! _.isString(value) && !_.isDate(value))  {
					return gettext('Date must be either string or Date type');
				}
				var validFormat=/^(\d{4})-(\d{1,2})-(\d{1,2})$/;
				if (!validFormat.test(value)) {
					return gettext("Invalid date format (correct YYYY-MM-DD)");
				} else { 
					var splitDate=validFormat.exec(value),
					date = new Date(splitDate[1], splitDate[2]-1, splitDate[3]);
					if ((date.getMonth()+1!=splitDate[2])||(date.getDate()!=splitDate[3])||
							(date.getFullYear()!=splitDate[1]))
					return gettext("Invalid day, month, or year range");
					
				}
			},
			time: function(value) {
				if (!value) {
					return;
				}
				if (! _.isString(value))  {
					return gettext('Time must be string type');
				}
				var validFormat=/^(\d{1,2}):(\d{1,2}):?(\d{1,2})?\.?(\d{1,6})?$/;
				if (! validFormat.test(value)) {
					return gettext("Invalid time format");
				} else {
					var splitTime= validFormat.exec(value),
					hours=+splitTime[1],
					minutes=+splitTime[2],
					seconds=+splitTime[3];
					
					if (!(hours>=0 && hours<=23 && minutes>=0 && minutes<=59 )) {
						return gettext('Invalid range of hours or  minutes');
					}
					if (seconds && !(seconds>=0 && seconds<=59)) {
						return gettext('Invalid range of seconds');
					}
					
				}
			},
			email: function(value) {
				if (! value) return;
				var validFormat=/^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
				if (! validFormat.test(value)) {
					return gettext('Invalid email format');
				}
			}
		}
	};

	api.BaseCollection = Backbone.Collection.extend({

		constructor : function() {
			var opts = arguments[1] || arguments[0];
			if (_.isObject(opts) && !_.isArray(opts)) {
				var additionalOpts = [ 'query', 'page', 'pageSize',
						'pageSizeParam' ];
				_.each(additionalOpts, function(item) {
					if (opts[item]) {
						this[item] = opts[item];
					}
				}, this);
			}
			Backbone.Collection.apply(this, arguments);
		},
		initialize: function() {
			this.on('error', function(model, xhr, options) {
				if (xhr.errorHandled) return;
				alert('Server Error on Collection: '+xhr.status + ' -'+xhr.statusText);
			});
		},

		url : function() {
			var qs = [];
			if (this.pageSizeParam) {
				var psParam = {};
				psParam[this.pageSizeParam] = this.pageSize || 
					this._defaultPageSize;
				qs.push(psParam);
			}
			if (this.page) {
				qs.push({
					page : this.page
				});
			}
			if (this.query) {
				qs.push(this.query);
			}
			qs = _.map(qs, $.param).join('&');

			if (qs.length > 0) {
				return this.urlRoot + '?' + qs;
			} else {
				return this.urlRoot;
			}
		},
		_pageRe : /page=(\d+)/,
		_defaultPageSize : 20,
		parse : function(response) {

			this.pages = Math.ceil(response.count /
					(this.pageSize || this._defaultPageSize));
			this.nextPage = null;
			this.previousPage = null;
			if (response.next) {
				this.nextPage = parseInt(this._pageRe.exec(response.next)[1],10);
			}
			if (response.previous) {
				this.previousPage = parseInt(this._pageRe
						.exec(response.previous)[1],10);
			}
			return response.results;
		},

		fetchNext : function(options) {
			if (this.nextPage) {
				this.page = this.nextPage;
				this.fetch(options);
				return true;
			}
		},

		fetchPrevious : function(options) {
			if (this.previousPage) {
				this.page = this.previousPage;
				this.fetch(options);
				return true;
			}
		}

	});

	api.BaseModel = Backbone.Model.extend({

		initialize : function() {
			var model=this;
			this.on('error', function(model, xhr, options) {
				xhr.errorHandled=true;
				if (xhr.status == 400 && xhr.responseJSON &&
						!$.isEmptyObject(xhr.responseJSON)) {
					this.trigger('rejected', xhr.responseJSON);
				} else {
					model.ajaxFailed=true;
					alert('Server Error on Model: ' + xhr.status + ' - ' + 
							xhr.statusText);
				}
			});
			
			this.on('sync', function(){model.ajaxFailed=false;});
		},

		defaults : function() {
			var defs = {};
			for ( var name in this.fields) {
				if (!this.fields[name].read_only) {
					if (this.fields[name]['default']) {
						defs[name] = this.fields[name]['default'];
					} else {
						defs[name] = null;
					}
				}
			}
			return defs;
		},

		validate : function(attrs, options) {
		
			var allErrors = {},
			prevErrors=options.errors || {},
			addError = function(err) {
				if (!err) {
					return;
				}
				if (!_.isArray(err)) {
					err = [ err ];
				}
				errors = errors.concat(err);
			};
			for ( var name in this.fields) {
				if (_.has(prevErrors,name)) {
					allErrors[name]=prevErrors[name];
				} else {
				var errors = [];
				var field = this.fields[name], value = attrs[name];
				if (field.required) {
					addError(validators.required(value));
				}

				if (field.min_value || field.min_value === 0 || field.max_value || 
						field.max_value === 0) {
					addError(validators.minmax(value, field.min_value,
							field.max_value));
				}

				if (field.min_length || field.min_length === 0 || 
						field.max_length || field.max_length === 0) {
					addError(validators.minmaxLength(value, field.min_length,
							field.max_length));
				}
				
				if (field.type && validators.type[field.type] && value) {
					addError(validators.type[field.type](value));
				}

				if (errors.length > 0) {
					allErrors[name] = errors;
				}
				}
			}

			if (_.size(allErrors) > 0) {
				return allErrors;
			}
		},

		readOnly : function() {
			var ro = [];
			for ( var name in this.fields) {
				if (this.fields[name].read_only) {
					ro.push(name);
				}
			}
			return ro;
		}

	});

	{{models}}
	return api;
}();