'''
Created on Sep 16, 2013

@author: ivan
'''
from __future__ import unicode_literals
from django.forms.util import flatatt
from django.utils.html import escape, conditional_escape
from django.utils.encoding import force_unicode
from rest_framework.templatetags.rest_framework import add_class
""" Django forms widgets will not work for rendering templates
Here we define adapter mixins - that have method render_template.
This mixins will be rendered patched into existinng instances of widgets
by patch function
"""


from django.utils.safestring import mark_safe
import types
from django.forms import widgets

def mixin(instance, mixin_class):
    """Dynamic mixin of methods into instance - works only for new style classes"""
    for name in mixin_class.__dict__:
        if name.startswith('__') and name.endswith('__') \
        or not  type(mixin_class.__dict__[name])==types.FunctionType:
            continue
        
        instance.__dict__[name]=mixin_class.__dict__[name].__get__(instance)


def patch(widget):
    is_patched=False
    for widget_class, extra in PATCHES:
        if isinstance(widget, widget_class):
            mixin(widget, extra)
            is_patched=True
    if not is_patched:
        mixin(widget, DummyMixin)
        

class InputMixin(object):
    
    def render_template(self, name, attrs=None, field=None):
        types_map={'date':'date', 'time':'time', 'datetime':'datetime', 
               'email':'email', 'url':'url', 'integer': 'number', 'float':'number'}
        
        # lets do some html5 types mapping
        if self.input_type=='text':
            if types_map.has_key(field.type):
                self.input_type=types_map[field.type]
                
        if self.input_type in ('number', 'range'):
            if not self.attrs.get('min') and field.min_value:
                self.attrs['min']=unicode(field.min_value)
                
            if not self.attrs.get('max') and field.max_value:
                self.attrs['max']=unicode(field.max_value)
        
        dummy_value=mark_safe('<%%= %s %%>' % name)
        return self.render(name, dummy_value, attrs=None)
    
class CheckBoxMixin(object):
    def render_template(self, name, attrs=None, field=None):
        final_attrs = self.build_attrs(attrs, type='checkbox', name=name)
        return mark_safe(u'<input<%% if(%s) {print(" checked")}%%>%s />' % (name, flatatt(final_attrs)))
    
class SelectMixin(object):
    def render_template(self, name, attrs=None, field=None):
        self.name=name
        return self.render(name, '', attrs)
    
    def render_option(self, selected_choices, option_value, option_label):
        val= escape(option_value)
        if self.allow_multiple_selected:
            js='<%% if ( %(name)s && (%(name)s.indexOf("%(val)s")>-1|| %(name)s.indexOf(+"%(val)s")>-1)) { print(" selected")}%%>' % \
            {'name': self.name, 'val': val}
        else:
            js='<%% if ( %s == "%s") { print(" selected")}%%>' %( self.name, val)
        return u'<option value="%s"%s>%s</option>' % (
           val, js, conditional_escape(force_unicode(option_label)))
    
class DummyMixin (object):
    def render_template(self, name, attrs=None, field=None):
        return mark_safe('<span id="%s">Widget for %s is not ready for templates</span>' % (name, attrs.get('id') or ''))

#defines patches tuples of Original_Widget_Class,  Patch_Mixin_Class    
PATCHES=[(widgets.Input, InputMixin),
          (widgets.CheckboxInput, CheckBoxMixin),
          (widgets.Select, SelectMixin)]

class DynamicWidget(widgets.Widget):
    
    def render_template(self, name,  attrs , field):
        """ renders js template using underscore.js syntax"""
        raise NotImplemented
    
    def render_javascript(self, name, attrs, field):
        """ Should render any JS to enable dynamic behaviour
JS is call by refresh event, should return code for anonymous function:
function(value) {
//this is bind to input/select element with class r2b_dynamic and name 
}

"""
        return None
        

class DynamicSelect(DynamicWidget):
    def __init__(self, *args, **kwargs):
        
        self.index_model_js=kwargs.pop('index_model_js') if kwargs.has_key('index_model_js') else None
        super(DynamicSelect, self).__init__(*args,**kwargs)
        
        
    def render_template(self, name,  attrs , field):
        multiple=field.many
        model_js=self.index_model_js 
        if not model_js:
            try:
                model_js=field.choices.queryset.model._meta.object_name+'Index'
            except AttributeError:
                pass
        if not model_js:
            raise ValueError('Cannot detect related model name')
        attrs['data-index-name']=model_js
        final_attrs = self.build_attrs(attrs, name=name)
        if multiple:
            final_attrs['multiple']=''
        final_attrs['class']= 'r2b_dynamic' if not final_attrs.has_key('class') else final_attrs['class']+' r2b_dynamic_select'
        output = [u'<select%s>' % flatatt(final_attrs)]
        if not field.required and not multiple:
            output.append(u'<option></option>')
            
        output.append(u'</select>')
        #output.append(u'<script>alert("'+final_attrs['id']+'")</script>')
        return mark_safe(u'\n'.join(output))
    
    def render_javascript(self, name, attrs, field):
        empty_option=''
        if not field.required:
            empty_option="select.append($('<option>');"
        
        js="""function(e, obj) {
var select=$(this),
value=obj.value,
progress=$('<div>').addClass('r2b_progress-small').insertAfter(select),
index=new restAPI[select.attr('data-index-name')];
select.empty();
"""+empty_option+\
"""
index.on('reset', function() {
index.forEach(function(item) {
var o=$('<option>').attr('value', item.id).html(item.get('name'));
if (_.isArray(value) && (value.indexOf(item.id)>-1 || value.indexOf(item.id.toString())>-1)  
  || item.id==value) { o.attr('selected', '') };
o.appendTo(select);
});
progress.remove();
}); 
index.fetch({reset:true});
}      
"""
        return js
    
        
