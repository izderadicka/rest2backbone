'''
Created on Sep 9, 2013

@author: ivan
'''

from rest_framework import serializers, viewsets, permissions, exceptions
from models import Author, Publisher, Book

from django.db.models import  Q


class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model=Author
        
class AuthorView(viewsets.ModelViewSet):
    model=Author
    serializer_class=AuthorSerializer
    
    def get_queryset(self): 
        qs=self.model.objects.all()
        q=self.request.QUERY_PARAMS.get('q')
        
        if q:
            qs=qs.filter(Q(first_name__icontains=q) | Q(last_name__icontains=q))
        return qs
    
class PublisherSerializer(serializers.ModelSerializer):
    class Meta:
        model= Publisher
    
class PublisherView(viewsets.ModelViewSet):
    model= Publisher
    serializer_class=PublisherSerializer
    
    def get_queryset(self): 
        qs=self.model.objects.all()
        q=self.request.QUERY_PARAMS.get('q')
        
        if q:
            qs=qs.filter(name__icontains=q)
        return qs
    
    
class BookSerializer(serializers.ModelSerializer):
    author_names=serializers.RelatedField(source='authors', many=True, label="Authors")
    class Meta:
        model=Book

class BookView(viewsets.ModelViewSet):
    model=Book
    serializer_class=BookSerializer
    
    def get_queryset(self): 
        qs=self.model.objects.all()
        q=self.request.QUERY_PARAMS.get('q')
        
        if q:
            qs=qs.filter(title__icontains=q)
        return qs
    