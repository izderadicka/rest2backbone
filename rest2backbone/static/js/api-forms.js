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
	return api;
}();