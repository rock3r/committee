#!/usr/bin/env python3
"""Read-only authenticated organiser export. Stdlib only; no browser automation or third-party runtime."""
import sys,json,re,time,hashlib,os,http.cookiejar,urllib.request,urllib.parse,urllib.error
from pathlib import Path
from datetime import datetime,timezone
from html.parser import HTMLParser
BASE='https://sessionize.com'
class AuthError(Exception):pass
class FetchError(Exception):pass
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs):return None
class Node:
 def __init__(self,tag='',attrs=()):self.tag=tag;self.attrs=dict(attrs);self.children=[]
 def find(self,tag=None,cls=None):
  out=[]
  for c in self.children:
   if isinstance(c,Node):
    if (not tag or c.tag==tag) and (not cls or cls in c.attrs.get('class','').split()):out.append(c)
    out+=c.find(tag,cls)
  return out
 def text(self):
  if self.tag in ('script','style'):return ''
  return ''.join(c.text() if isinstance(c,Node) else c for c in self.children)+ ('\n' if self.tag in ('br','p','div','tr','address','h3','h4','li') else '')
class Parser(HTMLParser):
 def __init__(self,s):super().__init__(convert_charrefs=True);self.root=Node();self.stack=[self.root];self.feed(s)
 def handle_starttag(self,t,a):
  n=Node(t,a);self.stack[-1].children.append(n)
  if t not in ('area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'):self.stack.append(n)
 def handle_endtag(self,t):
  for i in range(len(self.stack)-1,0,-1):
   if self.stack[i].tag==t:self.stack=self.stack[:i];break
 def handle_data(self,d):self.stack[-1].children.append(d)
def text(n):return re.sub(r'[ \t\r\f\v]+',' ',n.text()).strip()
def fields(n):
 out={}
 for table in n.find('table'):
  for row in table.find('tr'):
   h=row.find('th');d=row.find('td')
   if h and d:
    labels=d[0].find(cls='label');out[text(h[0])]=[text(x) for x in labels] if labels else text(d[0])
 return out
def parse_detail(html,event,sid,withdrawn):
 d=Parser(html).root
 main=next((b for b in d.find(cls='ibox') if any(text(h)=='Description' for h in b.find('h4'))),None)
 if main is None:raise FetchError('Session detail markup changed or access was denied')
 headings=[h for h in main.find('h3') if h.attrs.get('id')=='js-session-title'];desc=main.find('p',cls='m-b-md')
 if not headings or not desc:raise FetchError('Session title or abstract field missing')
 people=[]
 for box in d.find(cls='contact-box'):
  links=[a for a in box.find('a') if f'/app/organizer/speaker/{event}/' in a.attrs.get('href','')]
  if not links:continue
  a=links[0];bios=box.find('address');tags=box.find('p',cls='font-bold')
  people.append({'id':a.attrs['href'].split('/')[-1],'name':text(a),'bio':text(bios[0]) if bios else '', 'tagline':text(tags[0]) if tags else '', 'fields':fields(box),'links':[{'label':text(a),'url':a.attrs['href']} for a in box.find('a') if a.attrs.get('href','').startswith('https://')]})
 if not people:raise FetchError('Speaker markup missing; import stopped rather than dropping speaker data')
 titles=d.find('title');page_title=text(titles[0]) if titles else ''
 event_name=page_title.rpartition(' - Sessions - ')[2].removesuffix(' @ Sessionize.com') if ' - Sessions - ' in page_title else ''
 f=fields(main)
 def values(keys):
  for k in keys:
   if k in f:return f[k] if isinstance(f[k],list) else [f[k]]
  return []
 return {'id':str(sid),'eventId':str(event),'eventName':event_name,'title':text(headings[0]),'abstract':text(desc[0]),'speakers':[p['name'] for p in people],'speakerProfiles':people,'topics':values(['Tags']),'track':values(['Select Track/Event','Track','Track/Event']),'format':values(['Session format','Session Format']),'withdrawn':withdrawn,'submittedFields':f}
def emit(**data):print(json.dumps(data),flush=True)
def save(path,data):
 temp=path.with_suffix('.tmp');temp.write_text(json.dumps(data,ensure_ascii=False));temp.chmod(0o600);temp.replace(path)
def collect(event,cookie_path,out):
 if not re.fullmatch(r'[1-9][0-9]{0,9}',event):raise FetchError('Invalid event ID')
 jar=http.cookiejar.MozillaCookieJar(cookie_path)
 try:jar.load(ignore_discard=True,ignore_expires=False)
 except (OSError,http.cookiejar.LoadError):raise AuthError('Sessionize cookie file is missing or invalid; reconnect locally')
 opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar),NoRedirect())
 def request(path,data=None,json_response=False):
  if not path.startswith('/app/organizer/'):raise FetchError('Unsupported endpoint')
  for attempt in range(3):
   req=urllib.request.Request(BASE+path,data=urllib.parse.urlencode(data).encode() if data is not None else None,headers={'X-Requested-With':'XMLHttpRequest','User-Agent':'Committee-Local-Sync/0.1'})
   try:
    with opener.open(req,timeout=35) as r:
     raw=r.read(12_000_001)
     if len(raw)>12_000_000:raise FetchError('Response exceeds size limit')
     body=raw.decode('utf-8')
     if 'You have no access to this page' in body:raise AuthError('This login cannot access the selected event')
     if json_response:
      if 'json' not in r.headers.get('Content-Type',''):raise AuthError('Sessionize login expired or access denied')
      return json.loads(body)
     if 'Log in @ Sessionize' in body:raise AuthError('Sessionize login expired; reconnect locally')
     return body
   except urllib.error.HTTPError as e:
    if e.code in (301,302,303,307,308,401,403):raise AuthError('Sessionize login expired or event access denied')
    if e.code==429 or 500<=e.code<600:
     if attempt<2:
      retry=e.headers.get('Retry-After','');delay=min(60,int(retry)) if retry.isdigit() else 2**(attempt+1);time.sleep(delay);continue
    raise FetchError('Sessionize request failed (HTTP %s)'%e.code)
   except (urllib.error.URLError,TimeoutError):
    if attempt<2:time.sleep(2**attempt);continue
    raise FetchError('Sessionize could not be reached; retry when online')
 def listing():
  items={};first=request(f'/app/organizer/sessions/list/{event}',{'hash':'p=0&o=DateDesc'},True)
  pages=first.get('totalPages');total=first.get('totalCount')
  if not isinstance(total,int) or total<0 or not isinstance(pages,int) or pages<0 or pages>1000 or not isinstance(first.get('items'),list):raise FetchError('Unexpected Sessionize list format')
  for page in range(max(1,pages)):
   data=first if page==0 else request(f'/app/organizer/sessions/list/{event}',{'hash':f'p={page}&o=DateDesc'},True)
   if not isinstance(data.get('items'),list):raise FetchError('Missing list page')
   for s in data['items']:
    key=str(s['id'])
    if key in items:raise FetchError('Session list changed during pagination; retry')
    items[key]=s
   emit(stage='listing',completed=page+1,total=max(1,pages));time.sleep(.15)
  if isinstance(total,int) and total!=len(items):raise FetchError('Incomplete list; no import performed')
  stats=request(f'/app/organizer/sessions/stats/{event}',{},True)
  if not isinstance(stats.get('withdrawnSessions'),list):raise FetchError('Withdrawn status could not be verified')
  withdrawn={str(s['id']) for s in stats['withdrawnSessions']}
  for s in stats['withdrawnSessions']:items.setdefault(str(s['id']),s)
  return items,withdrawn
 items,withdrawn=listing();out.mkdir(parents=True,exist_ok=True,mode=0o700)
 stamp=datetime.now(timezone.utc).isoformat();fingerprint=hashlib.sha256(json.dumps([items,sorted(withdrawn)],sort_keys=True).encode()).hexdigest()
 checkpoint=out/'checkpoint.json';cached={}
 if checkpoint.exists():
  prior=json.loads(checkpoint.read_text())
  if prior.get('fingerprint')==fingerprint and time.time()-checkpoint.stat().st_mtime<3600 and not prior.get('complete'):cached=prior.get('details',{})
 details={}
 for sid in sorted(items):
  if not re.fullmatch(r'[0-9]+',sid):raise FetchError('Invalid session identifier')
  html=cached.get(sid) or request(f'/app/organizer/session/{event}/{sid}')
  parse_detail(html,event,sid,sid in withdrawn);details[sid]=html
  if len(details)%10==0:save(checkpoint,{'fingerprint':fingerprint,'details':details,'complete':False})
  emit(stage='details',completed=len(details),total=len(items));time.sleep(.15)
 # Verify membership/title/status did not change while detail pages were collected.
 final,final_withdrawn=listing()
 def membership(values):return sorted((k,v.get('title'),v.get('status')) for k,v in values.items())
 if membership(final)!=membership(items) or withdrawn!=final_withdrawn:raise FetchError('Session list changed during collection; no import performed')
 sessions=[parse_detail(html,event,sid,sid in withdrawn) for sid,html in details.items()]
 payload={'eventId':event,'capturedAt':stamp,'completedAt':datetime.now(timezone.utc).isoformat(),'sessions':sessions,'complete':True,'source':'authenticated-organiser'}
 save(out/'snapshot.json',payload);save(checkpoint,{'fingerprint':fingerprint,'details':{},'complete':True});emit(stage='done',completed=len(sessions),total=len(sessions))
if __name__=='__main__':
 os.umask(0o077)
 try:collect(sys.argv[1],sys.argv[2],Path(sys.argv[3]))
 except AuthError as e:emit(error=str(e),code='auth_required');sys.exit(3)
 except Exception as e:emit(error=str(e) if isinstance(e,FetchError) else 'Collection failed; cached dataset is unchanged',code='failed');sys.exit(1)
