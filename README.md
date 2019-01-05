Intro
=====
**PROJECT IS NOT MAINTAINED ANY MORE**

**Due to essential changes between djangorest framework versions this version works only with djangorest framework 2 and Django < 1.9.**

This project aims to made easier to develop django application with REST API and rich clients, 
that are using this API via **[backbone.js](http://backbonejs.org)**.  
In Django it uses **[djangorestframework](http://django-rest-framework.org)**  to quickly define RESTful API.

Due to essential changes between djangorest framework this version works only with djangorest framework 2 and Django < 1.9.

Key features:
-------------
- Generates models and collection definitions in JS from resources and models definitions in Django.
- Backbone Models should contain (as per models/resources definitions in Django):
 * default values
 * validations
 * support to load values from HTML form
- Collections:
 * support paging and searches and ordering 
 * special 'index' collections - just ID and representation of object - can be used in dynamic selects, autocompletes etc.

- Can generate forms templates (based on models and resources definitions) for use in pages
  (also read only forms)
- Forms can:
 * update validation result to form
 * save modified form to server (via rest API - using Backbone models and collections).
- A sample application - showing how it should be used.


Quick Start
===========

[Get code from GitHub](https://github.com/izderadicka/rest2backbone/archive/master.zip)

Extract

Get dependencies - django, djangorestframwork

`pip -r requirements.txt`

Load sample data
```
rm sqlite.db
./manage.py migrate
./manage.py loaddata sample_data.json
```

Run server

`./manage.py runserver`

In browser open http://localhost:8000/

In browser (Firefox/Chrome) open developer tools - to see API requests to server - on load/change of models

Look into `sample_app` directory to see how to use.


More Info
=========

More info will be on [project page on my web](http://zderadicka.eu/projects/python/rest2backbone/) 
 

Versions:
========
1.0 - first release

1.0.1 - minor fixes, 
	added support for Textarea widget in templates

1.1 - revamped dynamic widgets to more flexible and extensible model,
    save - use PATCH when possible

1.2 - more refactoring of dynamic widgets,
DynamicEditor (edit related object in place),
small fixes

1.2.1 - setup script

1.2.2 - small fixes in forms-api

1.2.3 -   added possibility to defer save in FormView,   DynamicEditor widget

1.2.4 -  some changes to JS -   better handling of errors when server is not responding

1.2.5 -  fixed to work with django 1.5+ and newer django-rest-framework

License:
=========
[BSD license](http://opensource.org/licenses/BSD-3-Clause) (same as Django)
