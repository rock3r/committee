import unittest,importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('collector',Path(__file__).parents[1]/'scripts/sessionize_collect.py')
c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
class CollectorTests(unittest.TestCase):
 def test_native_markup_preserves_text_and_multiple_speakers(self):
  html='''<div class="ibox"><h3 id="js-session-title">Cache &amp; build</h3><h4>Description</h4><p class="m-b-md">Line one.<br>Line two.</p><table><tr><th>Tags</th><td><span class="label">Gradle</span></td></tr><tr><th>Session format</th><td>Session</td></tr></table></div><div class="contact-box"><a href="/app/organizer/speaker/12/abc">Example A</a><p class="font-bold">Engineer</p><address>Bio</address></div><div class="contact-box"><a href="/app/organizer/speaker/12/def">Example B</a></div>'''
  s=c.parse_detail(html,'12','34',True)
  self.assertEqual(s['title'],'Cache & build');self.assertEqual(s['abstract'],'Line one.\nLine two.');self.assertEqual(s['speakers'],['Example A','Example B']);self.assertEqual(s['topics'],['Gradle']);self.assertTrue(s['withdrawn'])
 def test_login_or_changed_markup_fails_closed(self):
  for html in ['<h1>Log in</h1>','<div class="ibox"><h4>Description</h4></div>']:
   with self.assertRaises(c.FetchError):c.parse_detail(html,'12','34',False)
if __name__=='__main__':unittest.main()
