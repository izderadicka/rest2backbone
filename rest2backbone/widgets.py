'''
Created on Sep 16, 2013

@author: ivan
'''
from __future__ import unicode_literals
from django.forms.util import flatatt
from django.utils.html import escape, conditional_escape
from django.utils.encoding import force_unicode
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
        and not  type(mixin_class.__dict__[name])==types.FunctionType:
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
    def render_template(self, name, attrs):
        dummy_value=mark_safe('<%%= %s %%>' % name)
        return self.render(name, dummy_value, attrs)
    
class CheckBoxMixin(object):
    def render_template(self, name, attrs=None):
        final_attrs = self.build_attrs(attrs, type='checkbox', name=name)
        return mark_safe(u'<input<%% if(%s) {print(" checked")}%%>%s />' % (name, flatatt(final_attrs)))
    
class SelectMixin(object):
    def render_template(self, name, attrs=None):
        self.name=name
        return self.render(name, '', attrs)
    
    def render_option(self, selected_choices, option_value, option_label):
        val= escape(option_value)
        if self.allow_multiple_selected:
            js='<%% if ( %(name)s.indexOf("%(val)s")>-1|| %(name)s.indexOf(+"%(val)s")>-1) { print(" selected")}%%>' % \
            {'name': self.name, 'val': val}
        else:
            js='<%% if ( %s == "%s") { print(" selected")}%%>' %( self.name, val)
        return u'<option value="%s"%s>%s</option>' % (
           val, js, conditional_escape(force_unicode(option_label)))
    
class DummyMixin (object):
    def render_template(self, name, attrs):
        return mark_safe('<span id="%s">Widget for %s is not ready for templates</span>' % (name, attrs.get('id') or ''))

#defines patches tuples of Original_Widget_Class,  Patch_Mixin_Class    
PATCHES=[(widgets.Input, InputMixin),
          (widgets.CheckboxInput, CheckBoxMixin),
          (widgets.Select, SelectMixin)]
        
