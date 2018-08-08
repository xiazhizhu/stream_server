#!/usr/bin/env python
#!-*-*coding:utf-8-*-*
import json,urllib2

URL = "http://tomcat-microservices.stg02.internal.caritc.de:8080/nev-biz-proxy/services/remoteVideoCallback/closePush/"

def post_method_2_tps():
	text = [{"vinCode":"1234567890",
	"liveType":0}]
	text = json.dumps(text)
	print text
	header_dict = {"User-Agent":"Apache-HttpClient/4.1.1 (java 1.5)","Content-Type":"application/json","Accept-Encoding": "gzip,deflate"}
	#url = "http://172.16.1.222:8080/v1/darwin/getaddress/"
	req = urllib2.Request(url=URL,data=text,headers=header_dict)
	result = urllib2.urlopen(req)
	result = result.read()
	print result

if __name__=="__main__":
	post_methon_2_tps()
	

