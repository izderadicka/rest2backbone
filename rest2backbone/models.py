'''
Created on Sep 9, 2013

@author: ivan
'''

# These are sample models for package testing

from django.db import models

class Publisher(models.Model):
    name = models.CharField(max_length=30)
    international=models.BooleanField()
    address = models.CharField(max_length=50, blank=True, null=True)
    city = models.CharField(max_length=60, blank=True, null=True)
    state_province = models.CharField(max_length=30, blank=True, null=True)
    country = models.CharField(max_length=50, blank=True, null=True)
    website = models.URLField(blank=True, null=True)

    def __unicode__(self):
        return self.name

class Author(models.Model):
    first_name = models.CharField(max_length=30)
    last_name = models.CharField(max_length=40)
    
    email = models.EmailField(blank=True, null=True)

    def __unicode__(self):
        return u'%s %s' % (self.first_name, self.last_name)
    
GENRES=['fiction', 'history', 'science', 'sci-fi', 'fantasy', 'romance', 'other']
GENRES=zip(GENRES, GENRES)
class Book(models.Model):
    title = models.CharField(max_length=100)
    authors = models.ManyToManyField(Author)
    genre = models.CharField(max_length=50, choices=GENRES)
    rating = models.FloatField(blank=True, null=True, default=5.0)
    publisher = models.ForeignKey(Publisher)
    publication_date = models.DateField(blank=True, null=True)
    publication_time = models.TimeField(blank=True, null=True)
    num_pages = models.IntegerField(blank=True, null=True)
    

    def __unicode__(self):
        return self.title