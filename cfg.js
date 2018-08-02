const path = require("path");
const os = require("os");

module.exports = {
    http_port: 10008,
    rtsp_tcp_port: 554,
	redis_host1: 'concar-redis01',
	redis_host2: 'concar-redis02',
	redis_host3: 'concar-redis03',
	redis_port: '6379',
	//redis_passwd: '111111',
	redis_key_prefix: 'stg02',
	redis_key_prefix_sub: 'rtsp',
	darwinWanip: '172.16.0.225',
	defaultPwd: '123456',
	easyDarwinKey: '' ,  //
	darwinHeartbeat : 12,   //the timeout of darwin ，been bigger than 10 
    rootDir: __dirname,
    wwwDir: path.resolve(__dirname, "www"),
    dataDir: path.resolve(os.homedir(), ".easydarwin")
}
