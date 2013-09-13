from django.contrib import admin
from models import Author, Publisher, Book

class AuthorAdmin(admin.ModelAdmin):
    search_field=['first_name', 'last_name']
    
class PublisherAdmin(admin.ModelAdmin):
    search_field=['name']
    
class BookAdmin(admin.ModelAdmin):
    search_field=['title']
    
admin.site.register(Author, AuthorAdmin)
admin.site.register(Publisher, PublisherAdmin)
admin.site.register(Book, BookAdmin)