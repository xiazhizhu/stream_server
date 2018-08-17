#!/usr/bin/env python
#!/-*-coding:utf-8-*-
import redis ,logging

redisKeyPrefix= 'stg02'   #redis前缀1
redisKeyPrefixSub= 'rtsp'   #redis前缀2
tempKeyTtl=120  # 推流路径有效时间 单位秒

##日志文件
logging.basicConfig(level=logging.DEBUG, filename='/var/log/webServer.log', filemode='w', format='%(asctime)s - %(levelname)s - %(filename)s - %(funcName)s - %(lineno)s - %(message)s') 

from rediscluster import StrictRedisCluster
import sys

redis_nodes =  [{"host":"concar-redis01","port":"6379"},
                    {"host":"concar-redis02","port":"6379"},
                    {"host":"concar-redis03","port":"6379"}
                   ]

#r = redis.Redis(host=redis_host, port=redis_port,password=redis_password)
r = StrictRedisCluster(startup_nodes=redis_nodes)
# print "redis r=",r
logging.debug("redis %s", r)

def list_iter(servername):
	#return r.hmget("EasyDarwin:4b577dd1c1794628a6ac1378396387da","IP", "Load")
	dirc={}
        for t in servername:
		m=r.hmget(t,"IP","Load") 
		# print "m=",m
		logging.debug("m= %s", m)
        	dirc[m[0]]=int(m[1])
	return dirc 

#获取流媒体地址 getAddress  输入vincode  输出 ["是否存在" "HOST地址" "stream值"]
def getAddress(vinCode,isExist=0):
	keyinfo= redisKeyPrefix+"_"+redisKeyPrefixSub+"_"+"Live:*"+vinCode+"*"
	stream=r.keys(keyinfo)
	# print "stream",stream,"and vincode is",vinCode
	logging.debug("stream= %s, and vincode is %s", stream, vinCode)
	if len(stream):
		#the stream is existed
		# print "stream has been exist",stream
		logging.debug("stream has been exist %s", stream)
		isExist=1
		darwinInfo=r.hmget(stream[0],"EasyDarwin")
		# print "darwinInfo",darwinInfo
		logging.debug("darwinInfo %s", darwinInfo)
		listDarwin=r.keys(darwinInfo[0]);
		# print "listDarwin",listDarwin
		logging.debug("listDarwin %s", listDarwin)
		darwinIp=r.hmget(listDarwin[0],"IP")
		# print "darwinIp",darwinIp
		logging.debug("darwinIp %s", darwinIp)
		len_prefix= len(redisKeyPrefix)+len(redisKeyPrefixSub)+2+len("Live:")
		return isExist, darwinIp[0],stream[0][len_prefix:]
	listDarwin=r.keys(redisKeyPrefix+"_"+redisKeyPrefixSub+"_"+"EasyDarwin:*")
	# print "list",listDarwin
	logging.debug("list %s", listDarwin)
	ipstr = list_iter(listDarwin) 
	# print "ip=",ipstr
	logging.debug("ip= %s", ipstr)
	f = zip(ipstr.values(),ipstr.keys())
	# print "before sort=",f
	logging.debug("before sort= %s", f)
	afterSF=sorted(f)
	print "after sort=",afterSF
	if len(afterSF)==0:
		return isExist,"",""
	return isExist,afterSF[0][1],""

#获取没有pull的流媒体链接 gettimeoutstreamlist 输入 无  输出["vincode1" "vincode2" ...]
def gettimeoutstreamlist():
	len_prefix= len(redisKeyPrefix)+len(redisKeyPrefixSub)+2+len("Live:")
	allStream=r.keys(redisKeyPrefix+"_"+redisKeyPrefixSub+"_"+"Live:*")
	# print "allStream=",allStream
	logging.debug("allStream= %s", allStream)
	result =[]
	if len(allStream) == 0:
		# print "have none stream"
		logging.debug("have none stream")
		return allStream
	for stream in allStream:
		out=r.hmget(stream,"Output","EasyDarwin")
		print "out=",out[0]
		if int(out[0]) == 0:
			print "out is 0"
			resultinfo={}
			listDarwin=r.keys(out[1]);
			print "listDarwin",listDarwin
			darwinIp=r.hmget(listDarwin[0],"IP","RTSP")
			if len(darwinIp)==0:
				resultinfo["host"]="";
				resultinfo["port"]='554'
			else:
				resultinfo["host"]=darwinIp[0]
			    	resultinfo["port"]=darwinIp[1]
			resultinfo["vinCode"]=stream[len_prefix:len_prefix+17]
			resultinfo["liveType"]=0			
			resultinfo["stream"]=stream[len_prefix:]
			#result.append(stream[len_prefix:len_prefix+17])
			print "resultinfo="+str(resultinfo)
			result.append(resultinfo)
		
	return result	

#set有效流列表
def setAllowStreamlist(stream):
	streamKey=redisKeyPrefix+"_"+redisKeyPrefixSub+"_"+"Temp:"+stream;
	r.set(streamKey,"OK",ex=tempKeyTtl);
	return ;


	
if(__name__=="__main__"):
	print "start test getAddress!"
	isExist=0
	result=getAddress("0000",isExist)
	print "address=",result[1],"isExist =",result[0],"stream=",result[2]

	print "start gettimeoutstreamlist--------------------------"
	list=gettimeoutstreamlist()
	i=0
	while i < len(list):
		print "LIST IS "+str(list[i])
		i=i+1


	print "start test setAllowStreamlist ----------------------"
	setAllowStreamlist("111111111");
