'''
Created on Oct 21, 2013

@author: ivan
'''

from distutils.core import setup

from rest2backbone import __version__ as version

setup(name='rest2backbone',
      version=version,
      author='Ivan',
      author_email='ivan.zderadicka@gmail.com',
      url=['http://zderadicka.eu/projects/python/rest2backbone/'],
      packages=['rest2backbone'],
      package_data={'rest2backbone':[ 'static/js/*', 'templates/rest2backbone/*']},
      requires=['djangorestframework(>=2.3.8)', 'Django(>=1.4.5)'],
      )
