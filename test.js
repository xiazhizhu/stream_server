const cache = require('./cache');
//*****************set 方法***********************
// cache.set("cacheTest","cacheTestOK",function(err, res){
	// if(err){
		// console.log("set value error");
	// }
	// else{
		// console.log("set succeed");
	// }
// });
//get 方法
// cache.get("cacheTest",function(err, val){
	// if(err){
		// console.log("get value error");
	// }
	// else
	// {
		// console.log(val);
	// }
// });

//*****************hmset 方法**********************
var testData  = {};
testData.Bitrate   = 0;
testData.Output = 0;
testData.EasyDarwin = "test";
	
cache.hmset("test", testData, function(err,res){
	if(err){
		console.log("hmset value error");
	}
	else{
		console.log("hmset succeed");
	}
});

//*****************hgetall 方法********************
cache.hgetall("test",function(err, val){
	if(err){
		console.log("hgetall value error");
	}
	else
	{
		console.log(val);
	}
});
//*****************hincrby 方法********************
cache.hincrby("test","Output",1,function(err, val){
	if(err){
		console.log("hincrby value error");
	}
	else
	{
		console.log(val);
	}
});
cache.hgetall("test",function(err, val){
	if(err){
		console.log("hgetall value error");
	}
	else
	{
		console.log(val);
	}
});

//*****************del 方法********************
// cache.del("test",function(err, val){
	// if(err){
		// console.log("del value error");
	// }
	// else
	// {
		// console.log(val);
	// }
// });

// cache.hgetall("test",function(err, val){
	// if(err){
		// console.log("hgetall value error");
	// }
	// else
	// {
		// console.log(val);
	// }
// });

//*****************expire 方法********************
cache.expire("test", 30,function(err, val){
	if(err){
		console.log("expire value error");
	}
	else
	{
		console.log(val);
	}
});

//*****************ttl 方法********************
cache.ttl("test", function(err, val){
	if(err){
		console.log("expire value error");
	}
	else
	{
		console.log(val);
	}
});
cache.expire("test", 500,function(err, val){
	if(err){
		console.log("expire value error");
	}
	else
	{
		console.log(val);
	}
});

cache.ttl("test",function(err, val){
	if(err){
		console.log("expire value error");
	}
	else
	{
		console.log(val);
	}
});
//*****************quit 方法********************
cache.quit();