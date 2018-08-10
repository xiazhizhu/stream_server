#!/usr/bin/env python
#!-*-coding:utf-8-*-

import threading
import time
import logging
import json,urllib2

from dealDb import gettimeoutstreamlist

URL = "http://tomcat-microservices.stg02.internal.caritc.de:8080/nev-biz-proxy/services/remoteVideoCallback/closePush/"
TIMESTEP=120

def post_method_2_tps(text):
	if(len(text) == 0):
		print "timeout list is empty!!!"
	else:
		text = json.dumps(text)
		#print text
		print "post_method_2_tps: %s", text
		header_dict = {"User-Agent":"Apache-HttpClient/4.1.1 (java 1.5)","Content-Type":"application/json","Accept-Encoding": "gzip,deflate"}
		req = urllib2.Request(url=URL,data=text,headers=header_dict)
		result = urllib2.urlopen(req)
		result = result.read()
		print "post_method_2_tps: %s", result

def get_timeout_list():
	# logger.debug("get_timeout_list")
	# logging.basicConfig(level=logging.DEBUG)
	# handler = logging.FileHandler('server_timeout.log', encoding='UTF-8')
	# handler.setLevel(logging.DEBUG)
	# logging_format = logging.Formatter('%(asctime)s - %(levelname)s - %(filename)s - %(funcName)s - %(lineno)s - %(message)s')
	# handler.setFormatter(logging_format)
	# logger.addHandler(handler)
	#调用获取超时接口
	result = gettimeoutstreamlist()
	list_num = len(result)
	print "get_timeout_list: %s", list_num
	if list_num == 0:
		result_list=[]
	else:
		result_list=result
	print result_list
	post_method_2_tps(result_list)
	#//处理TSP相关部分
	#//将结果发送给TSP
	t = threading.Timer(TIMESTEP, get_timeout_list).start()

