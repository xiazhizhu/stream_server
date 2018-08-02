const redis = require("redis");
const cfg= require('cfg');
const RedisC = require('ioredis'); 

const redisObj = {
	client:null,
	connect:function(){
//	this.client = redis.createClient(cfg.redis_port,cfg.redis_host);
//	this.client = redis.createClient("6379","180.76.196.70");
/*	this.client.auth("111111", function(error, reply){
	if(error){
		console.log("redis auth error "+error);
	}
	else{
		console.log("redis auth succ ");
	}
	});	
	*/
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
	
	this.client.on("error",function(err){
		console.log("redisCache Error " + err);
	});
	this.client.on("ready", function(){
		console.log("redisCache connection succeed");
	});
	},
	init:function(){
		this.connect();
		const instance = this.client;
		// const get = instance.get;
		// const set = instance.set;
		const hmset = instance.hmset;
		const hgetall = instance.hgetall;
		const hincrby = instance.hincrby;
		const del = instance.del;
		const expire = instance.expire;
		const ttl = instance.ttl;
		const quit = instance.quit;
		////写入基本类型数据
		// instance.set = function(key, value, callback){
			// if(value !== undefined){
				//set.call(instance, key, JSON.stringify(value),callback);
				// set.call(instance, key, value,callback);
			// }
		// };
		////读取基本类型数据
		// instance.get = function(key, callback){
			// get.call(instance, key,function(err,val){
				// if(err){
					// console.log("redis.get ",key,err);
				// }
				// callback(null, val);
			// });
		// };
		////写入hash对象数据
		instance.hmset = function(key, value, callback){
			if(value !== undefined){
				hmset.call(instance, key, value,callback);
			}
		};
		////读取hash对象数据
		instance.hgetall = function(key, callback){
			hgetall.call(instance, key,function(err,val){
				if(err){
					console.log("redis.hgetall ",key,err);
				}
				callback(null, val);
			});
		};
		////更新指定键值对象[hash对象](hkey)的对应字段(skey)的值
		/*
		instance.hincrby = function(hkey, skey, value, callback){
			if(skey !== undefined){
				hincrby.call(instance, hkey, skey, value, callback);
			}
		};
		*/
		////删除指定键值对象
	/*
		instance.del = function(key, callback){
			del.call(instance, key, function(err,val){
				if(err){
					console.log("redis.del ", key, err);
				}
				callback(null, val);
			});
		};
		*/
		////设定指定键值对象的key的有效期
		/*
		instance.expire = function(key, value, callback){
			if(value !== undefined){
				expire.call(instance, key, value,callback);
			}
		};
		*/
		////查看指定键值对象的有效期
		instance.ttl = function(key, callback){
			ttl.call(instance, key, function(err,val){
				if(err){
					console.log("redis.ttl ", key, err);
				}
				callback(null, val);
			});
		};
		////关闭当前连接
		instance.quit = function(){
			quit.call(instance,function(err,val){
				if(err){
					console.log("redis.quit ", err);
				}
			});
		};
		return instance;
	},
};

module.exports = redisObj.init();


