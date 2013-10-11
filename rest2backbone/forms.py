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
    _attrs=['read_only', 'fields', 'label', 'widget', 'required', 'choices', 'regexp', 'help_text', 
            ('type_label', 'type'), 'min_value', 'max_value', 'many']
    def __init__(self, form, name, ser_field, auto_id="id_%s", ro_class='r2b_field_value_ro'):
        self.name=name
        self.form=form
        self.ro_class=ro_class
        self.force_ro=False
        self.auto_id=auto_id
        self._rendered=False
        self.widget_attrs={'id':self.id}
        for atr in self._attrs:
            new_atr=atr
            if isinstance(atr, (tuple, list)):
                atr, new_atr=atr[0], atr[1]
            if hasattr(ser_field, atr):
                if atr in ('widget',):
                    setattr(self, new_atr, self._get_widget(getattr(ser_field, atr)))
                else:
                    setattr(self, new_atr, getattr(ser_field, atr))
            else:
                setattr(self, new_atr, None)
        # widget must be supplied  for not writable fields    
        assert self.widget or self.read_only
    
    @property
    def id(self):
        return  self.auto_id%self.name.lower()          
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
        return mark_safe(u'<label for="%s"%s>%s</label>'% (id, req, (self.label and unicode(self.label)) or (u'&lt;%s&gt;'%self.name)))
    
    def render(self):
        assert hasattr(self.widget, 'render_template') # widget was patched
        self._rendered=True
        return mark_safe(self.widget.render_template(self.name, self.widget_attrs, self))
    
    def render_js(self):
        if not self._rendered:
            raise RuntimeError('Has not been rendered yet')
        if hasattr(self.widget,'render_javascript'):
            return self.widget.render_javascript(self.name, self.widget_attrs, self)
        
    
    def __unicode__(self):
        if self.force_ro:
            return self.render_ro()
        else:
            return self.render()


class Form(object):
    
    def __init__(self, name, serializer_class, template_name=None, template_name_ro=None, auto_id="id_form_%s"):
        self.name=name
        self.auto_id=auto_id
        self._fields= SortedDict()
        fields=serializer_class().fields
        for f in fields:
            self.add_field(f, fields[f])
            
        self.template_name= template_name or 'rest2backbone/form.html'
        self.template_name_ro= template_name_ro or 'rest2backbone/form_ro.html'
        self.force_ro=False
    
    def add_field(self, name, serializer_field ): 
        self._fields[name]=Field(self,name, serializer_field)
    @property
    def id(self):
        return self.auto_id%self.name.lower() 
       
    @property        
    def fields(self):
        if self.force_ro:
            fields=[copy.copy(f) for m,f in self._fields.iteritems()]
            for form in fields:
                form.force_ro=True
        else:
            fields=[f for m,f in self._fields.iteritems() if (not f.read_only and not f.fields)]
        return fields
    
    def get(self, name):
        return self._fields.get(name)
    
    def render_ro(self):
        self.force_ro=True
        try:
            res=[]
            res.append(u'<script type="text/template" id="r2b_template_%s_ro">'% self.name.lower())
            res.append(render_to_string(self.template_name_ro, {'form':self}))
            res.append(u'</script>')
            return mark_safe('\n'.join(res))
        finally:    
            self.force_ro=False
    JS_TEMPLATE="""if (!formsAPI.forms['%(form_id)s']) { formsAPI.forms['%(form_id)s']={} };
formsAPI.forms['%(form_id)s']['%(field_id)s']=%(script)s;"""       
    def render(self):
            res=[]
            res.append(u'<script type="text/template" id="r2b_template_%s">'% self.name.lower())
            t=render_to_string(self.template_name, {'form':self})
            res.append(t)
            res.append(u'</script>')
            js=[]
            for f in self.fields:
                script=f.render_js()
                if script: 
                    script=self.JS_TEMPLATE% {'script':script, 'field_id':f.id, 'form_id':self.id} 
                    js.append(script)
            if js:
                res.append('<script>')
                res.append('\n'.join(js))
                res.append('</script>')
            return mark_safe('\n'.join(res))
        
        

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
            res.append(f.render())
            if read_only:
                res.append(f.render_ro())
        return mark_safe(u'\n'.join(res))
            
            
