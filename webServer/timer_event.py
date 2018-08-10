#!/usr/bin/env python
#-*-coding:utf-8-*-

import threading, time, logging, json, urllib2
from dealDb import gettimeoutstreamlist

##TSP callback
URL = "http://tomcat-microservices.stg02.internal.caritc.de:8080/nev-biz-proxy/services/remoteVideoCallback/closePush/"
##定时时长(单位:秒)
TIMESTEP=120
##日志文件
logging.basicConfig(level=logging.DEBUG, filename='webServer.log', filemode='w', format='%(asctime)s - %(levelname)s - %(filename)s - %(funcName)s - %(lineno)s - %(message)s')  


def post_method_2_tps(text):
	if(len(text) == 0):
		logging.debug("timeout list is empty!!!")
	else:
		text = json.dumps(text)
		logging.debug("%s", text)
		header_dict = {"User-Agent":"Apache-HttpClient/4.1.1 (java 1.5)","Content-Type":"application/json","Accept-Encoding": "gzip,deflate"}
		req = urllib2.Request(url=URL,data=text,headers=header_dict)
		result = urllib2.urlopen(req)
		result = result.read()
		logging.debug("%s", result)

def get_timeout_list():
	#调用获取超时接口
	try:
		result = gettimeoutstreamlist()
	except:
		logging.debug("gettimeoutstreamlist callback error")
	list_num = len(result)
	logging.debug("%s", list_num)
	if list_num == 0:
		result_list=[]
	else:
		result_list=result
	logging.debug(result_list)
	#调用TSP callback接口
	try:
		post_method_2_tps(result_list)
	except:
		logging.debug("post_method_2_tps callback error")
	threading.Timer(TIMESTEP, get_timeout_list).start()

