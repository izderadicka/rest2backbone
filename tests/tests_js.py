'''
Created on Sep 23, 2013

@author: ivan
'''
import unittest
import os
import subprocess
from django import test
import tempfile

curr_dir=os.path.split(__file__)[0]

class Phantom():   
    def __init__(self): 
        self.cmd="phantomjs"
        
    def run(self, script_file):
        p=subprocess.Popen([self.cmd, os.path.join(curr_dir, script_file)], shell=False)
        return p.wait()
        
class TestJS(test.LiveServerTestCase):
    fixtures=('test_data.json', )


    def test_api_forms_runs(self):
        b=Phantom()
        ret=b.run('phantom.js')
        self.assertEqual(ret, 0)
        
    




if __name__ == "__main__":
    #import sys;sys.argv = ['', 'Test.testName']
    unittest.main()