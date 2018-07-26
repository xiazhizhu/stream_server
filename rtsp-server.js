const net = require('net');
const ip = require('@penggy/internal-ip');
const RTSPSession = require('rtsp-session');
const events = require('events');
const redis= require('redis');
const cfg= require('cfg');

class RTSPServer extends events.EventEmitter {
    
    constructor(port = 554) {
        super();
		
		//-- redis info 
		this.client = redis.createClient(cfg.redis_port,cfg.redis_host);		
		this.client.auth(cfg.redis_passwd, function(error, reply){
		if(error){
			console.log("redis auth error "+error);
		}
		else{
			console.log("redis auth succ ");
		}
		});				
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
            console.log(`EasyDarwin rtsp server listening on rtsp://${host}:${this.port} in ${env} mode`);
        })
    }

    start() {
				
		//=====register easydarwin to redis
		const uuidV1 = require('uuid/v1');
		var uuid = uuidV1();
		console.log("uudi="+uuid); 
		this.easyDarwinKey = "EasyDarwin:"+uuid;
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
		
        this.server.listen(this.port);
        this.stats();
    }

    stats() {
        require('routes/stats').rtspServer = this;
    }

    addSession(session) {
        if(session.type == 'pusher') {
			console.log("111111addSession pusher session.path",session.path);
            this.pushSessions[session.path] = session;
        } else if(session.type == 'player') {
			console.log("111111addSession player session.path",session.path);
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
		console.log("111111removeSession "+session.type+ " session path:" + session.path);
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
		var path=session.path.substring(1);
	//	console.log("111111addSessionToredis  path:",path);
		var sessionKey= "Live:"+path+"/1";
		if(session.type == 'pusher') {
			console.log("111111addSessionToredis pusher sessionKey:",sessionKey);            
			var sessionInfo={};
			sessionInfo.Bitrate= 0;
			sessionInfo.Output = 0;
			var headDarwin="EasyDarwin:";
			sessionInfo.EasyDarwin = cfg.easyDarwinKey.substring(headDarwin.length);
			this.client.hmset(sessionKey,sessionInfo,replyFunc);
        } else if(session.type == 'player') {
			console.log("111111addSessionToredis player sessionKey:",sessionKey);
            this.client.hincrby(sessionKey,'Output',1);
        }	
	}
	
	removeSessionToredis(session){
		var path=session.path.substring(1);
		var sessionKey= "Live:"+path+"/1";
		if(session.type == 'pusher') {
			console.log("111111removeSessionToredis pusher session.path",session.path);            
			var sessionInfo={};
			sessionInfo.Bitrate= 0;
			sessionInfo.Output = 0;
			sessionInfo.EasyDarwin = cfg.easyDarwinKey;
			this.client.del(sessionKey);
        } else if(session.type == 'player') {
			console.log("111111removeSessionToredis player session.path",session.path);
            this.client.hincrby(sessionKey,'Output',-1);
        }	
	}
	
	
	registerDarwininfoRedis(darwinKey){
		
		console.log("registerDarwininfoRedis");
		var darwinInfo = {};
		darwinInfo.IP = cfg.darwinWanip;
		darwinInfo.HTTP = cfg.http_port ;
		darwinInfo.RTSP = cfg.rtsp_tcp_port;
		darwinInfo.Load = 0 ;
		this.client.hmset(darwinKey, darwinInfo, replyFunc);
		this.client.expire(darwinKey, cfg.darwinHeartbeat);		
		
	}
	
	
}
function replyFunc(error,reply){
	if(error){
		console.log(error);
	}
	else{
		console.log(JSON.stringify(reply));
	}
}

function updateDarwinTimeout(){
	var client = redis.createClient(cfg.redis_port,cfg.redis_host);
		
	client.auth(cfg.redis_passwd, function(error, reply){
	if(error){
		console.log("updateDarwinTimeout redis auth error "+error);
	}
	else{
	//	console.log("updateDarwinTimeout redis auth succ ");
	}
	});
	client.expire(cfg.easyDarwinKey,cfg.darwinHeartbeat);
	client.quit();
  //  console.log("updateDarwinTimeout end key:"+cfg.easyDarwinKey);	
}

module.exports = RTSPServer;