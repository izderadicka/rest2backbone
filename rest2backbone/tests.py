'''
Created on Sep 9, 2013

@author: ivan
'''
import unittest
import api
from rest2backbone.forms import FormFactory
from rest_framework import test as api_test
import types
import json
from django.test.utils import override_settings
from models import Author

def find_pos(list, name):
    for i in range(len(list)):
        if list[i].name==name:
            return i
        
class ServerError(Exception):
    def __init__(self, msg, code, response):
        super(ServerError,self).__init__(msg)
        self.code=code
        self.response=response
def to_json(resp):
    if resp.status_code>=400:
        raise ServerError('Server error %d \n %s' %(resp.status_code, resp.content ), resp.status_code, resp.content)
    return json.loads(resp.content)

REST_FRAMEWORK_TEST = {
#     'DEFAULT_PERMISSION_CLASSES': (
#         'rest_framework.permissions.DjangoModelPermissions',
#     ),
    'PAGINATE_BY': 2,
    'PAGINATE_BY_PARAM':'page_size',
    
    'DEFAULT_FILTER_BACKENDS': ('rest_framework.filters.DjangoFilterBackend','rest_framework.filters.OrderingFilter')
}
        
class TestApi(api_test.APITestCase):   
    fixtures=['test_data.json']
        
    def test_browse(self):
        publishers=to_json(self.client.get('/api/publisher'))
        self.assertEqual(publishers['count'], 3)
        
        for p in publishers['results']:
            if p['id']==1:
                self.assertTrue(p['name'],'Apress')
        
        publisher=to_json(self.client.get('/api/publisher/1'))
        self.assertEqual(publisher['name'], 'Apress')
        
        authors=to_json(self.client.get('/api/author'))
        self.assertEqual(authors['count'], 5)
        
        author=to_json(self.client.get('/api/author/2'))
        self.assertEqual(author['last_name'], 'Pohan')
        
        books=to_json(self.client.get('/api/book'))
        self.assertEqual(books['count'], 6)
        
        book=to_json(self.client.get('/api/book/3'))
        self.assertEqual(book['title'], 'Umlauft')
        
        self.assertTrue(book['author_names'])
     
    @override_settings(REST_FRAMEWORK=REST_FRAMEWORK_TEST)    
    def test_paging(self):
        books=to_json(self.client.get('/api/book'))
        self.assertEqual(books['count'], 6)
        pages=1
        while books['next']:
            books=to_json(self.client.get(books['next']))
            pages+=1
            
        self.assertEqual(pages,3)
        
    @override_settings(REST_FRAMEWORK=REST_FRAMEWORK_TEST)       
    def test_filters(self):
        publishers=to_json(self.client.get('/api/publisher?q=press'))
        self.assertEqual(publishers['count'], 2)
        
        books=to_json(self.client.get('/api/book?page=2&q=a'))
        self.assertEqual(books['count'], 4)
        self.assertTrue(not books['next'])
        
        
        
    def test_modify(self):
        new_publisher=to_json(self.client.post('/api/publisher', {'name':'New Press', 'address': 'Dolni Lhota 5',
                                                        'city':'Kocourkov', 'website':'https://u.nas.doma.cz'},
                                               'json'))
        self.assertTrue(new_publisher['id'])
        
        try:
            new_author=to_json(self.client.post('/api/author', {'fist_name':'Honza', 'last_name':'Dolejsi', 
                                            'email':'honza@dolejsi.tv'}, 'json'))
            self.fail('should require first name')
        except Exception, e:
            pass
        
        new_author=to_json(self.client.post('/api/author', {'first_name':'Honza', 'last_name':'Dolejsi', 
                                            'email':'honza@dolejsi.tv'}, 'json'))
        self.assertTrue(new_author['id'])
        
        new_book=to_json(self.client.post('/api/book', {'title':'Sedm lumpu slohlo pumpu', 'genre':'romance',
                            'publisher':new_publisher['id'], 'authors':[new_author['id']]}, 'json'))
        
        self.assertTrue(new_book['id'])
        self.assertEqual(new_book['author_names'][0], 'Honza Dolejsi')
        
        res=to_json(self.client.put('/api/author/%d' % new_author['id'], {'first_name':'Jan', 'last_name':'Dolejsi', 
                                            'email':'honza@dolejsi.tv'}, 'json'))
        self.assertEqual(res['first_name'], 'Jan')
        
        a=Author.objects.get(id=new_author['id'])
        self.assertEqual(a.first_name, 'Jan')
        
        b= to_json(self.client.get('/api/book/%d'% new_book['id']))
        
        self.assertEqual(b['author_names'][0], 'Jan Dolejsi')
        
        
        self.client.delete('/api/book/%d'% new_book['id'])
        
        try:
            b= to_json(self.client.get('/api/book/%d'% new_book['id']))
        except ServerError, e:
            self.assertEqual(e.code, 404)
            
       
     

class TestApiJS(unittest.TestCase):


    def test_router_listing(self):
        from urls import router
        lister= api.ModelMaker(router, '/api')
        self.assertEqual(len(lister.models), 3)
        self.assertEqual(len(lister.collections), 3)
        
        m= lister.models[0]
        self.assertEqual(m.name, 'Author')
        self.assertEqual(len(m.fields), 4)
        
        m= lister.models[1]
        self.assertEqual(m.name, 'Book')
        self.assertEqual(len(m.fields), 10)
        title_index=find_pos(m.fields, 'title')
        self.assertTrue(title_index is not None)
        self.assertEqual(m.fields[title_index].attributes['type'], 'string')
        num_pages_index=find_pos(m.fields, 'num_pages')
        self.assertTrue(num_pages_index is not None)
        
    def test_js(self):
        from urls import router
        lister= api.ModelMaker(router, '/api')
        
            
        for m in lister.models:
            js=m.toJS()
            self.assertTrue(len(js)>10)
            
        for c in lister.collections:
            js=c.toJS()
            self.assertTrue(len(js)>10)
            
    def test_fields_def(self):
        from urls import router
        lister= api.ModelMaker(router, '/api')
        for m in lister.models:
            self.assertTrue(m.fields_json().startswith('{'))
            
class TestForms(unittest.TestCase):
    def test_ro(self):
        from urls import router
        ff=FormFactory(router)
        for f in ff.forms:
            self.assertTrue(f.name)
            html=f.render_ro()
            self.assertTrue(len(html)>50)
            
    def test_all(self):  
        from urls import router
        ff=FormFactory(router)
        templates=ff.render_all()
        self.assertTrue(len(templates), 500)


if __name__ == "__main__":
    #import sys;sys.argv = ['', 'Test.testApi']
    unittest.main()