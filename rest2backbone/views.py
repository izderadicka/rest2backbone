'''
Created on Sep 9, 2013

@author: ivan
'''

from django.views.generic import TemplateView
from api import ModelLister
from django.utils.safestring import SafeString

class restApi(TemplateView):
    template_name='rest2backbone/api.js'
    
    def render_to_response(self, context, **response_kwargs):
        if (not context.get('params') and not context.get('params').get('router')):
            raise ValueError('router param missing')
        lister=ModelLister(context['params']['router'], context['params'].get('url_prefix'))
        context['models']=SafeString(lister.toJS()) 
        return TemplateView.render_to_response(self, context, mimetype='text/javascript')
    
    