const net = require('net');
const ip = require('@penggy/internal-ip');
const RTSPSession = require('rtsp-session');
const events = require('events');
const redis= require('redis');
const cfg= require('cfg');
const RedisC = require('ioredis');
const client = require('./redis_client');
const file = require("./fileModule");

class RTSPServer extends events.EventEmitter {
    
    constructor(port = 554) {
	console.log("%s  rtsp-server constructor", Date);
        super();
		
		//-- redis info 
		/*
		this.client = new RedisC.Cluster([
		{
			port:cfg.redis_port,
			host:cfg.redis_host1
		},
		{
			port:cfg.redis_port,
			host:cfg.redis_host2
		},
		{
			port:cfg.redis_port,
			host:cfg.redis_host3
		}
		]);
	
*/
		 /*
		this.client = redis.createClient(cfg.redis_port,cfg.redis_host);		
		this.client.auth(cfg.redis_passwd, function(error, reply){
		if(error){
			console.log("redis auth error "+error);
		}
		else{
			console.log("redis auth succ ");
		}
		});		
       */		
		//-- redis end		
		
		this.easyDarwinKey = "";
        this.port = port;
        // path <-> session
        this.pushSessions = {};
        // path <-> [sessions]
        this.playSessions = {};
        this.server = net.createServer();
        this.server.on("connection", socket => {
            new RTSPSession(socket, this);
        }).on("error", err => {
            console.error('rtsp server error:', err);
        }).on("listening", async () => {
            var host = await ip.v4();
            var env = process.env.NODE_ENV || "development";
            console.log(`%s  EasyDarwin rtsp server listening on rtsp://${host}:${this.port} in ${env} mode`, Date());
        })
    }

    start() {
				
		//=====register easydarwin to redis
		console.log("%s  rtsp-server start", Date());
		const uuidV1 = require('uuid/v1');
		var uuid = uuidV1();
		console.log("%s  uudi="+uuid, Date()); 
		this.easyDarwinKey = cfg.redis_key_prefix+'_'+cfg.redis_key_prefix_sub+'_'+"EasyDarwin:"+uuid;
		cfg.easyDarwinKey = this.easyDarwinKey ;
		//send redis heartbeat to redis
		var schedule = require('node-schedule');
		this.registerDarwininfoRedis(this.easyDarwinKey);
		var rule = new schedule.RecurrenceRule();
		rule.second = [0,5,10,15,20,25,30,35,40,45,50,55];
		var j = schedule.scheduleJob(rule, function(){
		    updateDarwinTimeout();
		});		
		//=====end
		
		//del unuse data from redis
		this.delUnuseDataRedis();
		//end
        this.server.listen(this.port);
        this.stats();
    }

    stats() {
        require('routes/stats').rtspServer = this;
    }

    addSession(session) {
	console.log("%s  rtsp-server addSession", Date());
        if(session.type == 'pusher') {
			console.log("%s  addSession pusher session.path " + session.path, Date());
            this.pushSessions[session.path] = session;
        } else if(session.type == 'player') {
			console.log("%s  addSession player session.path" + session.path, Date());
            var playSessions = this.playSessions[session.path];
            if(!playSessions) {
                playSessions = [];
                this.playSessions[session.path] = playSessions;
            }
            if(playSessions.indexOf(session) < 0) {
                playSessions.push(session);
            }
        }
    }

    removeSession(session) {
		console.log("%s  rtsp-server removersession", Date());
		console.log("%s  removeSession "+session.type+ " session path:" + session.path, Date());
        if(session.type == 'pusher') {			
            delete this.pushSessions[session.path];
        } else if(session.type == 'player') {
            var playSessions = this.playSessions[session.path];
            if(playSessions && playSessions.length > 0) {
                var idx = playSessions.indexOf(session);
                if(idx >= 0) {
                    playSessions.splice(idx, 1);
                }
            }
        }
    }
	
	addSessionToredis(session){
		console.log("%s  rtsp-server addSessionToredis", Date());
		var path=session.path.substring(1);
	//	console.log("111111addSessionToredis  path:",path);
		var sessionKey= cfg.redis_key_prefix+'_'+cfg.redis_key_prefix_sub+'_'+"Live:"+path;
		if(session.type == 'pusher') {
			console.log("%s  addSessionToredis pusher sessionKey: " + sessionKey, Date());            
			var sessionInfo={};
			sessionInfo.Bitrate= 0;
			sessionInfo.Output = 0;
//			var headDarwin="EasyDarwin:";
			sessionInfo.EasyDarwin = cfg.easyDarwinKey;
			client.hmset(sessionKey,sessionInfo,replyFunc);
			//add a data to local file
			file.writeLine(sessionKey);
        } else if(session.type == 'player') {
			console.log("%s  addSessionToredis player sessionKey: " + sessionKey, Date());
            client.hincrby(sessionKey,'Output',1);
        }	
	}
	
	removeSessionToredis(session){
		console.log("%s  rtsp-server removeSessionToredis", Date());
		var path=session.path.substring(1);
		var sessionKey= cfg.redis_key_prefix+'_'+cfg.redis_key_prefix_sub+'_'+"Live:"+path;
		if(session.type == 'pusher') {
			console.log("%s  removeSessionToredis pusher sessionKey " + sessionKey, Date());            
			var sessionInfo={};
			sessionInfo.Bitrate= 0;
			sessionInfo.Output = 0;
			sessionInfo.EasyDarwin = cfg.easyDarwinKey;
			client.del(sessionKey);
        } else if(session.type == 'player') {
			console.log("%s  removeSessionToredis player sessionKey" + sessionKey, Date());
			client.hexists(sessionKey,"Output",function(err,val){
			if(val){
				client.hincrby(sessionKey,'Output',-1);
			}
			else{				
				console.log("%s  the sessionKey is deleted", Date())
			}
					
			});
            
        }	
	}
	
	
	registerDarwininfoRedis(darwinKey){
		
		console.log("%s  rtsp-server registerDarwininfoRedis", Date());
		var darwinInfo = {};
		darwinInfo.IP = cfg.darwinWanip;
		darwinInfo.HTTP = cfg.http_port ;
		darwinInfo.RTSP = cfg.rtsp_tcp_port;
		darwinInfo.Load = 0 ;
		client.hmset(darwinKey, darwinInfo, replyFunc);
		client.expire(darwinKey, cfg.darwinHeartbeat);		
		
	}
	
	
	isLegalPathFromRedis(path){
		return 1 ;
		console.log("%s  rtsp-server isLegalPathFromRedis", Date());
		if (path.length == 0){
			return 0;
		}
		var streamKey = cfg.redis_key_prefix+'_'+cfg.redis_key_prefix_sub+'_'+"Temp:"+path.substring(1);
		console.log("%s  isLegalPathFromRedis streamKey="+streamKey, Date());
		var value = client.get(streamKey);
		console.log("%s  isLegalPathFromRedis value"+value, Date())
			
	}
	
	delUnuseDataRedis(){
		console.log("%s  delUnuseDataRedis start", Date());
		file.readLine(function(err,val){
			if(err){
				
			}
			else{
				console.log("%s  delUnuseDataRedis del from redis key="+val, Date());
				client.del(val);
			}			
		});
	}
	
	
}
function replyFunc(error,reply){
	//console.log("rtsp-server replyFunc");
	if(error){
		console.log(Date() + error);
	}
	else{
	//	console.log(JSON.stringify(reply));
	}
}

function updateDarwinTimeout(){
	console.log("%s  rtsp-server updateDarwinTimeout", Date());
	
	var darwinInfo = {};
	darwinInfo.IP = cfg.darwinWanip;
	darwinInfo.HTTP = cfg.http_port ;
	darwinInfo.RTSP = cfg.rtsp_tcp_port;
	darwinInfo.Load = 0 ;
	client.hmset(cfg.easyDarwinKey, darwinInfo, replyFunc);
	client.expire(cfg.easyDarwinKey, cfg.darwinHeartbeat);	
/*
	client.expire(cfg.easyDarwinKey,cfg.darwinHeartbeat,function(error,reply){
	if(error){
		console.log("updateDarwinTimeout redis expire error "+error);
	}
	else{
	//	console.log("updateDarwinTimeout redis auth succ ");
	}
	});
	*/
	/*
	var keyIndex= cfg.redis_key_prefix+'_'+cfg.redis_key_prefix_sub+'_'+"Temp:*"
	client.keys(keyIndex,function(error,reply){
		if(error)
		{
			console.log("updateDarwinTimeout get key error "+error);
		}
		else{
			console.log("updateDarwinTimeout get key succ "+reply);
		}
	})
	*/
	
}

module.exports = RTSPServer;
