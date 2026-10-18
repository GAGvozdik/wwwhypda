"""Minimal synthetic upstream for Nginx checks; no DB/providers/env loader."""
from flask import Flask,jsonify,request
app=Flask(__name__)
@app.route('/api/<path:path>',methods=['GET','POST','OPTIONS'])
def api(path):
    return jsonify(message='Synthetic request'),401 if path=='users/check' else 400
if __name__=='__main__':app.run(host='0.0.0.0',port=8084,debug=False,use_reloader=False)
