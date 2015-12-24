'''
Created on Sep 9, 2013

@author: ivan
'''
from django.utils.translation import gettext_lazy as _

# These are sample models for package testing

from django.db import models

class Publisher(models.Model):
    name = models.CharField(max_length=30, verbose_name=_('Name'))
    international=models.BooleanField( verbose_name=_('International'), default=False)
    address = models.CharField(max_length=50, blank=True, null=True, verbose_name=_('Street Address'))
    city = models.CharField(max_length=60, blank=True, null=True , verbose_name=_('City'))
    state_province = models.CharField(max_length=30, blank=True, null=True,  verbose_name=_('State/Province'))
    country = models.CharField(max_length=50, blank=True, null=True, verbose_name=_('Country'))
    website = models.URLField(blank=True, null=True, verbose_name=_('Web Site'))

    def __unicode__(self):
        return self.name

class Author(models.Model):
    first_name = models.CharField(max_length=30, verbose_name=_('First Name'))
    last_name = models.CharField(max_length=40, verbose_name=_('Last Name'))
    
    email = models.EmailField(blank=True, null=True, verbose_name=_('Email'))

    def __unicode__(self):
        return u'%s %s' % (self.first_name, self.last_name)
    
GENRES=['fiction', 'history', 'science', 'sci-fi', 'fantasy', 'romance', 'other']
GENRES=zip(GENRES, GENRES)
class Book(models.Model):
    title = models.CharField(max_length=100, verbose_name=_('Title'))
    authors = models.ManyToManyField(Author, verbose_name=_('Authors IDs'))
    genre = models.CharField(max_length=50, choices=GENRES, verbose_name=_('Genre'))
    rating = models.FloatField(blank=True, null=True, default=5.0, verbose_name=_('Rating'))
    publisher = models.ForeignKey(Publisher, verbose_name=_('Publisher ID'))
    publication_date = models.DateField(blank=True, null=True, verbose_name=_('Publication Date'))
    publication_time = models.TimeField(blank=True, null=True, verbose_name=_('Publication Time'))
    num_pages = models.IntegerField(blank=True, null=True, verbose_name=_('Pages'))
    

    def __unicode__(self):
        return self.title