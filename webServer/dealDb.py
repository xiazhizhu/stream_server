#!/usr/bin/env python
#!/-*-coding:utf-8-*-
import redis
r = redis.Redis(host='127.0.0.1', port=6379,password='111111')
print "redis r=",r

def list_iter(servername):
	#return r.hmget("EasyDarwin:4b577dd1c1794628a6ac1378396387da","IP", "Load")
	dirc={}
        for t in servername:
		m=r.hmget(t,"IP","Load") 
		print "m=",m
        	dirc[m[0]]=int(m[1])
	return dirc 

#获取流媒体地址 getAddress  输入vincode  输出 ["流媒体地址"  "是否存在" "stream值"]
def getAddress(vinCode,isExist=0):
	stream=r.keys("Live:*"+vinCode+"*")
	print "stream",stream,"and vincode is",vinCode
	if len(stream):
		#the stream is existed
		isExist=1
		darwinInfo=r.hmget(stream[0],"EasyDarwin")
		#print "darwinInfo",darwinInfo
		listDarwin=r.keys("EasyDarwin:"+darwinInfo[0]);
		print "listDarwin",listDarwin
		darwinIp=r.hmget(listDarwin[0],"IP")
		print "darwinIp",darwinIp
		return isExist, darwinIp[0],stream[0][5:-2]
	listDarwin=r.keys("EasyDarwin:*")
	print "list",listDarwin
	ipstr = list_iter(listDarwin) 
	print "ip=",ipstr
	f = zip(ipstr.values(),ipstr.keys())
	print "before sort=",f
	afterSF=sorted(f)
	print "after sort=",afterSF
	return isExist,afterSF[0][1],""

#获取没有pull的流媒体链接 gettimeoutstreamlist 输入 无  输出["vincode1" "vincode2" ...]
def gettimeoutstreamlist():
	allStream=r.keys("Live:*")
	print "allStream=",allStream
	result =[]
	if len(allStream) == 0:
		print "have none stream"
		return allStream
	for stream in allStream:
		out=r.hmget(stream,"Output")
		print "out=",out[0]
		if int(out[0]) == 0:
			print "out is 0"
			result.append(stream[5:-6])
		
	return result			
print "start test getAddress!"
isExist=0
result=getAddress("0000",isExist)
print "address=",result[1],"isExist =",result[0],"stream=",result[2]

print "start gettimeoutstreamlist--------------------------"
print "LIST IS",gettimeoutstreamlist()
