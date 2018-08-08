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
		header_dict = {"User-Agent":"Apache-HttpClient/4.1.1 (java 1.5)","Content-Type":"application/json","Accept-Encoding": "gzip,deflate"}
		req = urllib2.Request(url=URL,data=text,headers=header_dict)
		result = urllib2.urlopen(req)
		result = result.read()
		print result


#从超时接口获取的list数据,进行封装处理
# def list_2_dict_package(result):
	# print "***list_2_dict_package***"
	# new_list = []
	# if len(result) != 0:
		# for index in range(len(result)):
			# new_dict = {}
			# new_dict["vinCode"] = result[index]
			# new_list.append(new_dict)
	# return new_list


def get_timeout_list():
	#调用获取超时接口
	result = gettimeoutstreamlist()
	list_num = len(result)
	if list_num == 0:
		result_list=[]
	else:
		result_list=result
	print result_list
	post_method_2_tps(result_list)
	#//处理TSP相关部分
	#//将结果发送给TSP
	t = threading.Timer(TIMESTEP, get_timeout_list)
	t.start()

	
	
if __name__=="__main__":
	get_timeout_list()