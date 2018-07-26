const path = require("path");
const os = require("os");

module.exports = {
    http_port: 10008,
    rtsp_tcp_port: 554,
	redis_host: '180.76.196.70',
	redis_port: '6379',
	redis_passwd: '111111',
	darwinWanip: '172.16.0.225',
    	defaultPwd: '123456',
	easyDarwinKey: '' ,  //
	darwinHeartbeat : 7,   //the timeout of darwin ，been bigger than 5 
    rootDir: __dirname,
    wwwDir: path.resolve(__dirname, "www"),
    dataDir: path.resolve(os.homedir(), ".easydarwin")
}
