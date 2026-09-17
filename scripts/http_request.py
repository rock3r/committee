"""Bounded HTTPS transport. Request/credentials arrive on stdin, never argv or logs."""
import json, sys, urllib.request, urllib.error, urllib.parse, socket, ipaddress, http.client
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None
try:
    d=json.loads(sys.stdin.read(2*1024*1024))
    url=urllib.parse.urlparse(d['url'])
    if url.scheme!='https' or url.username or url.password:
        raise ValueError('HTTPS required')
    body=d.get('body')
    req=urllib.request.Request(d['url'], data=body.encode('utf8') if body is not None else None, headers=d.get('headers',{}), method=d.get('method','GET'))
    if d.get('publicOnly'):
        if url.port not in (None,443):
            raise ValueError('HTTPS port required')
        addresses=list(dict.fromkeys(x[4][0] for x in socket.getaddrinfo(url.hostname,443,type=socket.SOCK_STREAM)))
        if not addresses or any(not ipaddress.ip_address(a).is_global for a in addresses):
            raise ValueError('Public address required')
        addresses.sort(key=lambda a: ':' in a)
        connection=http.client.HTTPSConnection(url.hostname,timeout=15)
        connection._create_connection=lambda address,timeout,source_address=None: socket.create_connection((addresses[0],443),timeout,source_address)
        connection.request('GET',urllib.parse.urlunparse(('', '', url.path or '/', url.params, url.query, '')),headers=d.get('headers',{}))
        response=connection.getresponse()
        response.code=response.status
    else:
        try:
            response=urllib.request.build_opener(NoRedirect()).open(req,timeout=90)
        except urllib.error.HTTPError as error:
            response=error
    with response:
        body=response.read(16*1024*1024+1)
        if len(body)>16*1024*1024:
            raise ValueError('Response too large')
        print(json.dumps({'status':response.code,'headers':dict(response.headers.items()),'body':body.decode('utf8')}))
except Exception:
    print(json.dumps({'error':'HTTPS request failed'}))
    sys.exit(1)
