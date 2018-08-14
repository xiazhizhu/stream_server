const client = require('./redis_client');

var str = "";

var get_result = function(callback) {
    
        client.keys("stg*", function (err, res) {
            if (!err) {
                callback(JSON.stringify(res));
                console.log(str);//@1 这里输出的是有值的str
            }else {
                console.log(err);
            }
        });
    
}

get_result(function(data){
    console.log(data)
})
