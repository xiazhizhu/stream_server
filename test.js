const RedisC = require('ioredis');
const redis = require("redis");
var async = require('async');

client = redis.createClient(6379,"127.0.0.1");
	// this.client = redis.createClient("6379","127.0.0.1");
client.on("error",function(err){
	console.log("redisCache Error " + err);
});
client.on("ready", function(){
	console.log("redisCache connection succeed");
});

var str = "";

var get_result = function(key,callback) {
    
	console.log("key="+key);
        client.get(key, function (err, res) {
            if (!err) {
                callback(JSON.stringify(res));
//                console.log(str);//@1 这里输出的是有值的str
            }else {
                console.log(err);
            }
        });
    
}

key="stg_aaa_333333"
get_result(key,function(data){
	console.log("test start")
        console.log(data)
	console.log("test end")
})

