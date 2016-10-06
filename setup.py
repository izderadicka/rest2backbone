'''
Created on Oct 21, 2013

@author: ivan
'''

try:
    from setuptools import setup
except ImportError:
    from distutils.core import setup

from rest2backbone import __version__ as version

setup(name='rest2backbone',
      version=version,
      author='Ivan',
      author_email='ivan.zderadicka@gmail.com',
      url=['http://zderadicka.eu/projects/python/rest2backbone/'],
      packages=['rest2backbone'],
      package_data={'rest2backbone':[ 'static/js/*', 'templates/rest2backbone/*']},
      )
