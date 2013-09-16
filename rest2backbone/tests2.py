'''
Created on Sep 16, 2013

@author: ivan
'''
import unittest
from rest2backbone.forms import FormFactory
from django import test
__all__=('TestForms',)

class TestForms(unittest.TestCase):
    fixtures=('test_data.json', )
    def test_ro(self):
        from urls import router
        ff=FormFactory(router)
        for f in ff.forms:
            self.assertTrue(f.name)
            html=f.render_ro()
            self.assertTrue(len(html)>50)
            
    def test_render(self):
        from urls import router
        ff=FormFactory(router)
        for f in ff.forms:
            self.assertTrue(f.name)
            html=f.render()
            print html
            self.assertTrue(len(html)>50)
                
    def test_all(self):  
        from urls import router
        ff=FormFactory(router)
        templates=ff.render_all()
        self.assertTrue(len(templates), 500)


    def test_select(self):
        from urls import router
        ff=FormFactory(router)
        book=ff.get('Book')
        
        
        publisher=book.get('publisher')
        publisher_html=publisher.render()
        self.assertTrue(publisher_html.find('option')>0)
        authors=book.get('authors')
        authors_html=authors.render()
        self.assertTrue(authors_html.find('option')>0)
        print publisher_html
        print authors_html


if __name__ == "__main__":
    #import sys;sys.argv = ['', 'Test.testName']
    unittest.main()