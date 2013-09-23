'''
Created on Sep 9, 2013

@author: ivan
'''

from rest_framework import serializers, viewsets, permissions, exceptions,\
    routers, fields, six
from django.utils.translation import gettext_lazy as _

from django.db.models import  Q
from rest_framework.relations import PrimaryKeyRelatedField
from rest_framework.response import Response
from rest_framework.routers import Route
from rest_framework.generics import strict_positive_int
from django.http import Http404
from django.core.paginator import InvalidPage
from django.utils.encoding import smart_text
from django.utils.datastructures import SortedDict
from django.utils.html import escape
from rest2backbone.widgets import DynamicSelect
from django.core import validators

class ModelSerializer(serializers.ModelSerializer):
    def get_related_field(self, model_field, related_model, to_many):
        """
        Creates a default instance of a flat relational field.

        Note that model_field will be `None` for reverse relationships.
        """
        # TODO: filter queryset using:
        # .using(db).complex_filter(self.rel.limit_choices_to)

        kwargs = {
            'queryset': related_model._default_manager,
            'many': to_many
        }

        if model_field:
            kwargs['required'] = not(model_field.null or model_field.blank)
        
        # I believe we can use these also for related fields    
        if model_field.verbose_name is not None:
            kwargs['label'] = model_field.verbose_name

        if model_field.help_text is not None:
            kwargs['help_text'] = model_field.help_text

        return PrimaryKeyRelatedField(**kwargs)
    
class ConcatField(fields.CharField):
        
    def __init__(self, *args, **kwargs):
        self.fields=kwargs.pop('fields') if kwargs.has_key('fields') else None
        self.format=kwargs.pop('format') if kwargs.has_key('format') else None
        kwargs['source']='*'
        super(ConcatField, self).__init__(*args, **kwargs)
        
        
    def to_native(self, instance):
        vals=SortedDict()
        for name in self.fields:
            try:
                vals[name]= self._to_string(getattr(instance, name))
            except AttributeError:
                raise ValueError('unknown instance field %s for instance of %s') %(name, str(instance))
        if self.format:
            return self.format.format(**vals)
        else:
            return u' '.join(vals.values())
        
    def _to_string(self, value):
        if isinstance(value, six.string_types) or value is None:
            return value
        value= smart_text(value)
        return escape(value)
        
class EscapedCharField(fields.CharField):
    def to_native(self, value):
        return escape(fields.CharField.to_native(self, value))

class FloatField(fields.FloatField):
    default_error_messages = {
        'invalid': _("'%s' value must be a float."),
        'max_value': _('Ensure this value is less than or equal to %(limit_value)s.'),
        'min_value': _('Ensure this value is greater than or equal to %(limit_value)s.'),
    }
    
    def __init__(self, max_value=None, min_value=None, *args, **kwargs):
        self.max_value, self.min_value = max_value, min_value
        super(FloatField, self).__init__(*args, **kwargs)

        if max_value is not None:
            self.validators.append(validators.MaxValueValidator(max_value))
        if min_value is not None:
            self.validators.append(validators.MinValueValidator(min_value))
            
    
class IndexMixin(object):
    class DefaultIndexSerializer(serializers.Serializer):
        id=fields.Field(source='pk')
        name= EscapedCharField(source='*', read_only=True)
        
    def index(self, request, *args, **kwargs):
        self.object_list = self.filter_queryset(self.get_queryset())
        main_serializer= self.get_serializer_class()
        
        if hasattr(main_serializer.Meta, 'index'):
            index=getattr(main_serializer.Meta, 'index')
            try:
                format=getattr(main_serializer.Meta, 'index_format')
            except AttributeError:
                format=None
            if not isinstance(index, (list, tuple)) and len(index)<1:
                raise ValueError('index must be list of fields names, with at least one entry')
            serializer_class=type('IndexSerializer', (serializers.Serializer,), 
                              {'id': fields.Field(source='pk'),
                               'name':ConcatField(fields=index, format=format)})
        else:    
        
            serializer_class=self.DefaultIndexSerializer

        page = self.get_page_index(self.object_list)
        if page:
            class SerializerClass(self.pagination_serializer_class):
                class Meta:
                    object_serializer_class = serializer_class
    
            pagination_serializer_class = SerializerClass
            context = self.get_serializer_context()
            serializer= pagination_serializer_class(instance=page, context=context)
        else:
            context = self.get_serializer_context()
            serializer =  serializer_class(self.object_list, context=context, many=True)
        return Response(serializer.data)
    
    def get_page_index(self, qs):
        page_size=self.max_paginate_by or 9999
        if self.paginate_by_param:
            try:
                page_size= strict_positive_int(
                    self.request.QUERY_PARAMS[self.paginate_by_param],
                    cutoff=self.max_paginate_by
                )
            except (KeyError, ValueError):
                pass
            
        paginator = self.paginator_class(qs, page_size,
                                         allow_empty_first_page=True)
        page_kwarg = self.kwargs.get(self.page_kwarg)
        page_query_param = self.request.QUERY_PARAMS.get(self.page_kwarg)
        page = page_kwarg or page_query_param or 1
        try:
            page_number = strict_positive_int(page)
        except ValueError:
            if page == 'last':
                page_number = paginator.num_pages
            else:
                raise Http404(_("Page is not 'last', nor can it be converted to an int."))
        try:
            page = paginator.page(page_number)
            return page
        except InvalidPage as e:
            raise Http404(_('Invalid page (%(page_number)s): %(message)s') % {
                                'page_number': page_number,
                                'message': str(e)
            })
        
        
    
class IndexedRouter(routers.DefaultRouter):
    
    routes=routers.DefaultRouter.routes+ \
    [Route(
            url=r'^{prefix}-index{trailing_slash}$',
            mapping={
                'get': 'index',
            },
            name='{basename}-index',
            initkwargs={'suffix': 'Index'}
        )]
    
class ViewSetWithIndex(viewsets.ModelViewSet, IndexMixin):
    pass

