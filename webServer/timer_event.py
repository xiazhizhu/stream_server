#!/usr/bin/env python
#!-*-coding:utf-8-*-

import threading
import time
import logging

from dealDb import gettimeoutstreamlist


#从超时接口获取的list数据,进行封装处理
def list_2_dict_package(result):
	new_list = []
	if len(result) != 0:
		for index in range(len(result)):
			new_dict = {}
			new_dict["vinCode"] = result[index]
			new_list.append(new_dict)
	#server.logger.debug('new_list:%s', new_list)
	return new_list

# def print_output():
	# print "##print_output##"

def get_timeout_list():
	print "***getTimeoutList***"
	#调用获取超时接口
	result = gettimeoutstreamlist()
	#server.logger.debug('result:%s', result)
	list_num = len(result)
	if list_num == 0:
		result_list=[]
	else:
		result_list = list_2_dict_package(result)
	#//yield print_output()
	#//处理TSP相关部分
	#//将结果发送给TSP
	t = threading.Timer(3, get_timeout_list)
	t.start()

if __name__=="__main__":
	get_timeout_list()