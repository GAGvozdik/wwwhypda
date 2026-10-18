"""One request to the fixed internal Nginx fixture; not an arbitrary URL proxy."""
import base64,json,sys,http.client
request=json.load(sys.stdin)
connection=http.client.HTTPConnection('nginx',80,timeout=12)
try:
    connection.request(request['method'],request['path'],body=base64.b64decode(request['body']),headers=request['headers'])
    response=connection.getresponse()
    print(json.dumps(dict(status=response.status,headers=response.getheaders(),body=base64.b64encode(response.read()).decode())))
finally:connection.close()
