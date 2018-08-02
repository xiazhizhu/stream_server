#!/usr/bin/env python
#!-*-coding:utf-8-*-
from flask import Flask
from flask import request
from flask import jsonify
from gevent import monkey
import logging
import json
import time
from dealDb import getAddress, gettimeoutstreamlist

#防止并发访问阻塞
monkey.patch_all()
#设定服务器ip
HOST="0.0.0.0"
#设定访问端口
PORT="9999"
#设置调试模式(on/off)
DEBUG=True
#TU唯一识别码
VINCODE="123456789"
#时间戳
TIMESTAMP=0


#从超时接口获取的list数据,进行封装处理
def list_2_dict_package(result):
	new_list = []
	if len(result) != 0:
		for index in range(len(result)):
			new_dict = {}
			new_dict["vinCode"] = result[index]
			new_list.append(new_dict)
	server.logger.debug('new_list:%s', new_list)
	return new_list





server = Flask(__name__)

@server.route('/', methods=['GET', 'POST'])
def index():
	server.logger.debug('index')
	return jsonify(
	index="请输入正确的访问URL"
	)

@server.route('/v1/darwin/gettimeoutstreamlist/', methods=['GET'])
def get_method_info():
	server.logger.debug('request.host:%s', request.host)
	server.logger.debug('request.url:%s', request.url)
	#调用获取超时接口
	try:
		result = gettimeoutstreamlist()
	except:
		server.logger.debug('gettimeoutstreamlist callback error')
		return jsonify(
		error='gettimeoutstreamlist callback error')
	else:
		server.logger.debug('result:%s', result)
		list_num = len(result)
		if list_num == 0:
			result_list=[]
		else:
			result_list = list_2_dict_package(result)
		return jsonify(
		status=0,
		number=list_num,
		list=result_list
		)

@server.route('/v1/darwin/getaddress/', methods=['POST'])
def post_method_info():
	server.logger.debug('request.headers:%s', request.headers)
	server.logger.debug('request.host:%s', request.host)
	server.logger.debug('request.url:%s', request.url)
	#获取原始post数据
	data = request.get_data()
	server.logger.debug('request.data:%s', data)
	#转成Python数据结构
	data_str = json.loads(data)
	server.logger.debug('request.data[vinCode]:%s', data_str['vinCode'])
	VINCODE = data_str['vinCode']
	server.logger.debug('VINCODE:%s', VINCODE)
	server.logger.debug('request.data[liveType]:%s', data_str['liveType'])
	
	TIMESTAMP=int(time.time())
	server.logger.debug('TIMESTAMP:%s', TIMESTAMP)
	
	#调用检测接口
	try:
		ret = getAddress(VINCODE)
	except:
		server.logger.debug('getAddress callback error')
		return jsonify(
		error='getAddress callback error')
	else:
		server.logger.debug('ret:%s', ret)
		if ret[0]==0:
			get_status = 1
			video_stream=str(VINCODE)+str(TIMESTAMP)+".sdp"
		elif ret[0]==1:
			get_status = 0
			video_stream=str(ret[2])
		return jsonify(
		status=get_status,
		exist=ret[0],
		liveType=0,
		host=str(ret[1]),
		port=554,
		stream=video_stream
		)

if __name__ == '__main__':
	server.debug=DEBUG	#debug模式开启才能写日志
	handler = logging.FileHandler('server.log', encoding='UTF-8')
	handler.setLevel(logging.DEBUG)
	logging_format = logging.Formatter('%(asctime)s - %(levelname)s - %(filename)s - %(funcName)s - %(lineno)s - %(message)s')
	handler.setFormatter(logging_format)
	server.logger.addHandler(handler)
	server.run(host=HOST, port=PORT)
