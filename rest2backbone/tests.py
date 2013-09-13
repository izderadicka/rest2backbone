'''
Created on Sep 9, 2013

@author: ivan
'''
import unittest
import api

def find_pos(list, name):
    for i in range(len(list)):
        if list[i].name==name:
            return i
    

class TestApi(unittest.TestCase):


    def test_router_listing(self):
        from urls import router
        lister= api.ModelLister(router, '/api')
        self.assertEqual(len(lister.models), 3)
        self.assertEqual(len(lister.collections), 3)
        
        m= lister.models[0]
        self.assertEqual(m.name, 'Author')
        self.assertEqual(len(m.fields), 4)
        
        m= lister.models[1]
        self.assertEqual(m.name, 'Book')
        self.assertEqual(len(m.fields), 9)
        title_index=find_pos(m.fields, 'title')
        self.assertTrue(title_index is not None)
        self.assertEqual(m.fields[title_index].attributes['type'], 'string')
        num_pages_index=find_pos(m.fields, 'num_pages')
        self.assertTrue(num_pages_index is not None)
        
    def test_js(self):
        from urls import router
        lister= api.ModelLister(router, '/api')
        
            
        for m in lister.models:
            js=m.toJS()
            self.assertTrue(len(js)>10)
            
        for c in lister.collections:
            js=c.toJS()
            self.assertTrue(len(js)>10)
            
    def test_fields_def(self):
        from urls import router
        lister= api.ModelLister(router, '/api')
        for m in lister.models:
            self.assertTrue(m.fields_json().startswith('{'))


if __name__ == "__main__":
    #import sys;sys.argv = ['', 'Test.testApi']
    unittest.main()