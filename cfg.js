const path = require("path");
const os = require("os");

module.exports = {
    http_port: 10008,
    rtsp_tcp_port: 554,
	redis_host: '127.0.0.1',
	redis_passwd: '111111',
    defaultPwd: '123456',
    rootDir: __dirname,
    wwwDir: path.resolve(__dirname, "www"),
    dataDir: path.resolve(os.homedir(), ".easydarwin")
}