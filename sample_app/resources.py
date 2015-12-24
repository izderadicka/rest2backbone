'''
Created on Sep 23, 2013

@author: ivan
'''
from rest2backbone.resources import ModelSerializer, ViewSetWithIndex,\
    FloatField
from sample_app.models import Author, Publisher, Book
from django.db.models import Q
from rest_framework import serializers
from rest2backbone.widgets import DynamicSelect
from django.utils.translation import gettext_lazy as _

class AuthorSerializer(ModelSerializer):
    class Meta:
        model=Author
        index=('last_name', 'first_name',)
        index_format='{last_name}, {first_name}'
        
class AuthorView(ViewSetWithIndex):
    model=Author
    serializer_class=AuthorSerializer
    
    def get_queryset(self): 
        qs=self.model.objects.all()
        q=self.request.QUERY_PARAMS.get('q')
        
        if q:
            qs=qs.filter(Q(first_name__icontains=q) | Q(last_name__icontains=q))
        return qs
    
class PublisherSerializer(ModelSerializer):
    class Meta:
        model= Publisher
    
class PublisherView(ViewSetWithIndex):
    model= Publisher
    serializer_class=PublisherSerializer
    
    def get_queryset(self): 
        qs=self.model.objects.all()
        q=self.request.QUERY_PARAMS.get('q')
        
        if q:
            qs=qs.filter(name__icontains=q)
        return qs
    
    
class BookSerializer(ModelSerializer):
    author_names=serializers.RelatedField(source='authors', many=True, label=_("Authors"))
    num_pages=serializers.IntegerField(min_value=1, max_value="99999", required=False, label=_('Pages'))
    rating=FloatField(min_value=0, max_value=10, required=False, label=_('Rating'))
    publisher=serializers.PrimaryKeyRelatedField(label=_("Publisher"), required=True, widget=DynamicSelect())
    authors=serializers.PrimaryKeyRelatedField(label=_("Authors"), required=True, widget=DynamicSelect(), many=True)
    class Meta:
        model=Book
        fields=('id', 'title', 'author_names', 'authors', 'genre', 'rating', 'num_pages', 'publisher', 'publication_date', 'publication_time')

class BookView(ViewSetWithIndex):
    model=Book
    serializer_class=BookSerializer
    
    def get_queryset(self): 
        qs=self.model.objects.all()
        q=self.request.QUERY_PARAMS.get('q')
        
        if q:
            qs=qs.filter(title__icontains=q)
        return qs
    