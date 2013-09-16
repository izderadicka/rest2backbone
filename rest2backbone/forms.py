'''
Created on Sep 14, 2013

@author: ivan
'''

from api import RouterAdapter
from django.utils.datastructures import SortedDict
import copy
from django.utils.safestring import mark_safe
from django.utils.encoding import StrAndUnicode
from django.template.loader import render_to_string
import widgets


class Field(StrAndUnicode):
    _attrs=['read_only', 'fields', 'label', 'widget', 'required', 'choices', 'regexp', 'help_text']
    def __init__(self, name, ser_field, auto_id="id_%s", ro_class='r2b_field_value_ro'):
        self.name=name
        self.ro_class=ro_class
        self.force_ro=False
        self.auto_id=auto_id
        for atr in self._attrs:
            if hasattr(ser_field, atr):
                if atr in ('widget',):
                    setattr(self, atr, self._get_widget(getattr(ser_field, atr)))
                else:
                    setattr(self, atr, getattr(ser_field, atr))
            else:
                setattr(self, atr, None)
        # widget must be supplied        
        assert self.widget
                
    def _get_widget(self, widget):
        if isinstance(widget, type):
            widget=()
        else:
            widget=copy.deepcopy(widget)
        #monkey patch to adapt to template rendering
        if not hasattr(widget, 'render_template'):
            widgets.patch(widget)    
        return widget
        
                    
    def render_ro(self):
        return mark_safe(u'<span id="id_'+self.name+'" class="'+self.ro_class+'"><%= '+self.name+' %></span>')
    
    def label_tag(self):
        req=u' class="required"' if self.required else ''
        id=self.auto_id % self.name
        return mark_safe(u'<label for="'+id+'"'+req+'>'+(self.label or self.name)+'</label>')
    
    def render(self):
        attrs={}
        attrs['id']=self.auto_id%self.name
        assert hasattr(self.widget, 'render_template') # widget was patched
        return mark_safe(self.widget.render_template(self.name, attrs))
        
    
    def __unicode__(self):
        if self.force_ro:
            return self.render_ro()
        else:
            return self.render()


class Form(object):
    
    def __init__(self, name, serializer_class, template_name=None, template_name_ro=None):
        self.name=name
        self._fields= SortedDict()
        fields=serializer_class().fields
        for f in fields:
            self._fields[f]=Field(f,fields[f])
            
        self.template_name= template_name or 'rest2backbone/form.html'
        self.template_name_ro= template_name_ro or 'rest2backbone/form_ro.html'
        self.force_ro=False
     
    @property        
    def fields(self):
        if self.force_ro:
            fields=[copy.copy(f) for m,f in self._fields.iteritems()]
            for form in fields:
                form.force_ro=True
        else:
            fields=[copy.copy(f) for m,f in self._fields.iteritems() if (not f.read_only and not f.fields)]
        return fields
    
    def get(self, name):
        return self._fields.get(name)
    
    def render_ro(self):
        self.force_ro=True
        try:
            res=render_to_string(self.template_name_ro, {'form':self})
            return mark_safe(res)
        finally:    
            self.force_ro=False
            
    def render(self):
            res=render_to_string(self.template_name, {'form':self})
            return mark_safe(res)
        
        

class FormFactory(object):
    def __init__(self, router, template_name=None, template_name_ro=None):
        self._forms={}
        self.template_name=template_name
        self.template_name_ro=template_name_ro
        if router:
            self._list_router(router)
            
    def _list_router(self, router):
        for name, serializer_class, url in RouterAdapter(router):
            self.add_form(name, serializer_class)
            
    def add_form(self, name, serializer_class):
        self._forms[name]=Form(name, serializer_class, self.template_name, self.template_name_ro)
        
        
    def render_form(self,name):
        return self._forms(name).render()
    
    def render_form_ro(self,name):
        return self._forms(name).render(read_only=True)
    
    @property
    def forms(self):
        return self._forms.values()
    
    def get(self, name):
        return self._forms.get(name)
    
    def render_all(self, read_only=True):
        res=[]
        for f in self.forms:
            res.append(u'<script type="text/template" id="r2b_template_%s">'% f.name.lower())
            res.append(f.render())
            res.append(u'</script>')
            if read_only:
                res.append(u'<script type="text/template" id="r2b_template_%s_ro">'% f.name.lower())
                res.append(f.render_ro())
                res.append(u'</script>')
                
            
                
        return mark_safe(u'\n'.join(res))
            
            
