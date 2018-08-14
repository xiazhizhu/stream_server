#!/usr/bin/env python
#-*-coding:utf-8-*-

import logging, json, time, threading
from flask import Flask, request, jsonify
from gevent import monkey
from dealDb import getAddress, setAllowStreamlist
from timer_event import get_timeout_list


#防止并发访问阻塞
monkey.patch_all()
#设定服务器ip
HOST="0.0.0.0"
#设定访问端口
PORT=9999
#设置调试模式(on/off)
# DEBUG=False
#TU唯一识别码
VINCODE="123456789"
#时间戳
TIMESTAMP=0


server = Flask(__name__)


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
	else:
		server.logger.debug('ret:%s', ret)
		if ret[0]==0:
			video_stream=str(VINCODE)+str(TIMESTAMP)+".sdp"
		elif ret[0]==1:
			video_stream=str(ret[2])
		if len(str(ret[1])) == 0:
			get_status = 1
		else:
			get_status = 0
			try:
				setAllowStreamlist(video_stream)
			except:
				server.logger.debug('setAllowStreamlist callback error')
		return jsonify(
		status=get_status,
		exist=ret[0],
		liveType=0,
		host=str(ret[1]),
		port=554,
		stream=video_stream
		)

def web_server():
	logging.basicConfig(level=logging.DEBUG)
	handler = logging.FileHandler('/var/log/webServer.log', encoding='UTF-8')
	handler.setLevel(logging.DEBUG)
	logging_format = logging.Formatter('%(asctime)s - %(levelname)s - %(filename)s - %(funcName)s - %(lineno)s - %(message)s')
	handler.setFormatter(logging_format)
	server.logger.addHandler(handler)
	server.run(host=HOST, port=PORT)
	
	
if __name__ == '__main__':
	th_server=threading.Thread(target=web_server)
	th_timer=threading.Thread(target=get_timeout_list)
	th_server.start()
	th_timer.start()
	th_server.join()
	th_timer.join()

