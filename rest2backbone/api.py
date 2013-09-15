'''
Created on Sep 9, 2013

@author: ivan
'''

from django.template.loader import render_to_string
import json
from django.utils.safestring import mark_safe

class RouterAdapter(object):
    def __init__(self, router):
        self.registry_iter=iter(router.registry)
            
    def _get_model_name(self, view):
        model_cls = getattr(view, 'model', None)
        queryset = getattr(view, 'queryset', None)
        if model_cls is None and queryset is not None:
            model_cls = queryset.model
        assert model_cls
        return model_cls._meta.object_name
    
    def next(self):
        url, view_set, _name = next(self.registry_iter)
        return self._get_model_name(view_set), view_set().get_serializer_class(), url
    
    def __iter__(self):
        return self
        

class Field(object):
    _attrs=['type_label', 'read_only', 'default', 'max_length', 'min_length', 'min_value', 'max_value', 'required' ]
    _map={'type_label':'type'}
    
    def __init__(self, name, ser_field):
        self.name=name
        self._attributes={}
        for atr in self._attrs:
            if hasattr(ser_field, atr):

                self._attributes[self._map.get(atr) or atr]=getattr(ser_field, atr)
                
    @property
    def attributes(self):
        return self._attributes
        
        
class Model(object):
            
    def __init__(self, name, serializer, url, url_prefix=''):
        self.url=url_prefix+('/' if not (url.startswith('/') or url_prefix.endswith('/')) else '') + url
        self.name=name
        self._fields=[]
        for name, field in serializer().fields.iteritems():
            self._fields.append(Field(name, field))
    
    @property        
    def fields(self):
        return self._fields
    
    def fields_json(self):
        def fn(o,f):  
            o[f.name]= f.attributes        
            return o 
        return mark_safe(json.dumps(reduce(fn , self.fields, {})))
    
    def toJS(self):
        return render_to_string('rest2backbone/api-model.js', {'m':self})
        
        
    
class Collection(object):
    def __init__(self,model):
        self.url=model.url
        self.name=model.name+'List'
        self.model_name= model.name
        
    def toJS(self):
        return render_to_string('rest2backbone/api-collection.js', {'c':self})
        
        
class ModelMaker(object):
    def __init__(self, router=None, url_prefix=None):
        self.url_prefix=url_prefix or ''
        self._models =[]
        self._collections=[]
        if router:
            self._list_router(router)
            
    def _list_router(self, router):
        for name, serializer_class, url in RouterAdapter(router):
            self.add_model(name, serializer_class, url)
            
    def add_model(self,name, serializer_class, url, no_collection=False):
            model= Model(name, serializer_class, url, self.url_prefix)
            self._models.append(model)
            if not no_collection:
                self._collections.append(Collection(model))
        
    @property    
    def models(self):
        return self._models
    @property
    def collections(self):
        return self._collections
    
    def toJS(self):
        objects=[]
        for m in self.models:
            objects.append(m.toJS())
        for c in self.collections:
            objects.append(c.toJS())
        
            
        return '\n'.join(objects)


