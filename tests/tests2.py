'''
Created on Sep 16, 2013

@author: ivan
'''
import unittest
from rest2backbone.forms import FormFactory
from django import test
import re
__all__=('TestForms',)

class TestForms(test.TestCase):
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
        
    def test_js(self):
        from urls import router
        ff=FormFactory(router) 
        html=ff.get('Book').render()
        self.assertTrue(re.search('<script>.*options', html, re.DOTALL))

    def test_id(self):
        from urls import router
        ff=FormFactory(router) 
        html=ff.get('Book').render()
        print html
        self.assertTrue(re.search(r'<input .*?id="id_publication_date.*?/>', html))
        
    def test_select(self):
        from urls import router
        ff=FormFactory(router)
        book=ff.get('Book')
        
        
        publisher=book.get('publisher')
        publisher_html=publisher.render()
        print publisher_html
        self.assertTrue(publisher_html.find('r2b_dynamic')>0)
        authors=book.get('authors')
        authors_html=authors.render()
        self.assertTrue(authors_html.find('select')>0)
        print publisher_html
        print authors_html
        
    def test_html5(self):
        from urls import router
        ff=FormFactory(router)
        email=ff.get('Author').get('email').render()
        self.assertTrue(email.find('type="email')>0)
        date=ff.get('Book').get('publication_date').render()
        self.assertTrue(date.find('type="date')>0, date)
        time=ff.get('Book').get('publication_time').render()
        self.assertTrue(time.find('type="time')>0)
        number=ff.get('Book').get('num_pages').render()
        self.assertTrue(number.find('type="number')>0)
        self.assertTrue(number.find('min="1"')>0)
        self.assertTrue(number.find('max="99999"')>0)
        number=ff.get('Book').get('rating').render()
        self.assertTrue(number.find('type="number')>0)
        url=ff.get('Publisher').get('website').render()
        self.assertTrue(url.find('type="url')>0)


if __name__ == "__main__":
    #import sys;sys.argv = ['', 'Test.testName']
    unittest.main()