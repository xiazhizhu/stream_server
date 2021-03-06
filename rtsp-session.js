const net = require('net');
const event = require('events');
const shortid = require('shortid');
const url = require('url');
const path = require('path');
const rtpParser = require('rtp-parser');
const BufferPool = require('buffer-pool');
const sdpParser = require('sdp-transform');
const getPort = require('get-port');
const dgram = require('dgram');
const cfg = require('cfg');
const redis= require('redis');

class RTSPRequest {
    constructor() {
        this.method = '';
        this.url = '';
        this.raw = '';
    }
}

class RTSPSession extends event.EventEmitter {

    constructor(socket, server) {
	console.log("%s  rtsp-session constructor", Date());
        super();
        this.type = '';
        this.url = '';
        this.path = '';
        this.aControl = '';
        this.vControl = '';
        this.pushSession = null;
        this.transType = 'tcp';

        //-- tcp trans params
        this.aRTPChannel = 0;
        this.aRTPControlChannel = 0;
        this.vRTPChannel = 0;
        this.vRTPControlChannel = 0;
        //-- tcp trans params end

        //-- udp trans params
        this.aRTPClientPort = 0;
        this.aRTPClientSocket = null;
        this.aRTPControlClientPort = 0;
        this.aRTPControlClientSocket = null;
        this.vRTPClientPort = 0;
        this.vRTPClientSocket = null;
        this.vRTPControlClientPort = 0;
        this.vRTPControlClientSocket = null;

        this.aRTPServerPort = 0;
        this.aRTPServerSocket = null;
        this.aRTPControlServerPort = 0;
        this.aRTPControlServerSocket = null;
        this.vRTPServerPort = 0;
        this.vRTPServerSocket = null;
        this.vRTPControlServerPort = 0;
        this.vRTPControlserverSokcet = null;
        //-- udp trans params end

        //-- sdp info
        this.sdp = null;
        this.sdpRaw = '';

        this.aCodec = '';
        this.aRate = '';
        this.aPayload = '';

        this.vCodec = '';
        this.vRate = '';
        this.vPayload = '';
        //-- sdp info end

        //-- stats info
        this.inBytes = 0;
        this.outBytes = 0;
        this.startAt = new Date();
        //-- stats info end

		
        this.sid = shortid.generate(); // session id
        this.socket = socket;
        this.host = this.socket.address().address;
        this.server = server;
        this.bp = new BufferPool(this.genHandleData());
        this.bp.init();
        this.gopCache = [];

        this.socket.on("data", data => {
            this.bp.push(data);
        }).on("close", () => {
            this.stop();
        }).on("error", err => {
            this.socket.destroy();
            // console.log(err);
        }).on("timeout", () => {
            this.socket.end();
        })

        this.on("request", this.handleRequest);
    }

    * genHandleData() {
	console.log("%s  rtsp-session genHandleData", Date());
        while (true) {
			//console.log("111111");
            if (this.bp.need(1)) {
                if (yield) return;
            }
            var buf = this.bp.read(1);
            if (buf.readUInt8() == 0x24) { // rtp over tcp
			    //console.log("222222");
                if (this.bp.need(3)) {
                    if (yield) return;
                }
                buf = this.bp.read(3);
                var channel = buf.readUInt8();
                var rtpLen = buf.readUInt16BE(1);
				//console.log("3333333");
                if (this.bp.need(rtpLen)) {
                    if (yield) return;
                }
                var rtpBody = this.bp.read(rtpLen);
                if (channel == this.aRTPChannel) {
                    this.broadcastAudio(rtpBody);
                } else if (channel == this.vRTPChannel) {
                    this.broadcastVideo(rtpBody);
                    if (this.vCodec.toUpperCase() == 'H264') {
                        var rtp = rtpParser.parseRtpPacket(rtpBody);
                        if (rtpParser.isKeyframeStart(rtp.payload)) {
                            // console.log(`find key frame, current gop cache size[${this.gopCache.length}]`);
                            this.gopCache = [];
                        }
                        this.gopCache.push(rtpBody);
                    }
                } else if (channel == this.aRTPControlChannel) {
                    this.broadcastAudioControl(rtpBody);
                } else if (channel == this.vRTPControlChannel) {
                    this.broadcastVideoControl(rtpBody);
                }
                this.inBytes += (rtpLen + 4);
            } 
			
			else 
			{ // rtsp method
		        var reqBuf = Buffer.concat([buf], 1);
				if (this.bp.need(8)) {    //get the rtsp method whole name
                    if (yield) return;
                }
				buf = this.bp.read(8);
				reqBuf = Buffer.concat([reqBuf, buf], reqBuf.length + 8);
				
				if(this.isRstpMethodLega(reqBuf) != 1)
				{
					console.log("%s  buff error :is not rtsp method ,return directly buf is "+reqBuf.toString(), Date());
					if (yield) return;
				}					
			    
              //  var reqBuf = Buffer.concat([buf], 1);
                while (reqBuf.toString().indexOf("\r\n\r\n") < 0) {
					//console.log("444444");
                    if (this.bp.need(1)) {
                        if (yield) return;
                    }
                    buf = this.bp.read(1);
                    reqBuf = Buffer.concat([reqBuf, buf], reqBuf.length + 1);
                }
                var req = this.parseRequestHeader(reqBuf.toString());
                this.inBytes += reqBuf.length;
                if (req['Content-Length']) {
                    var bodyLen = parseInt(req['Content-Length']);
					//console.log("666666");
                    if (this.bp.need(bodyLen)) {
                        if (yield) return;
                    }
                    this.inBytes += bodyLen;
                    buf = this.bp.read(bodyLen);
                    var bodyRaw = buf.toString();
                    if (req.method.toUpperCase() == 'ANNOUNCE') {
                        this.sdp = sdpParser.parse(bodyRaw);
                        // console.log(JSON.stringify(this.sdp, null, 1));
                        this.sdpRaw = bodyRaw;
                        if (this.sdp && this.sdp.media && this.sdp.media.length > 0) {
                            for (var media of this.sdp.media) {
                                if (media.type == 'video') {
                                    this.vControl = media.control;
                                    if (media.rtp && media.rtp.length > 0) {
                                        this.vCodec = media.rtp[0].codec;
                                        this.vRate = media.rtp[0].rate;
                                        this.vPayload = media.rtp[0].payload;
                                    }
                                } else if (media.type == 'audio') {
                                    this.aControl = media.control;
                                    if (media.rtp && media.rtp.length > 0) {
                                        this.aCodec = media.rtp[0].codec;
                                        this.aRate = media.rtp[0].rate;
                                        this.aPayload = media.rtp[0].payload;
                                    }
                                }
                            }
                        }
                    }
                    req.raw += bodyRaw;
                }
                this.emit('request', req);
            }
			
        }

    }
	
	isRstpMethodLega(reqBuf){
		console.log("%s  isRstpMethodLega reqbuf="+reqBuf.toString(), Date());
		if(reqBuf.toString().indexOf("OPTIONS")>=0){
			//console.log("isRstpMethodLega OPTIONS");
			return 1;
		}
		else if(reqBuf.toString().indexOf("ANNOUNCE")>=0){
			return 1;
		}
		else if(reqBuf.toString().indexOf("SETUP")>=0){
			return 1;
		}
		else if(reqBuf.toString().indexOf("DESCRIBE")>=0){
			return 1;
		}
		else if(reqBuf.toString().indexOf("PLAY")>=0){
			return 1;
		}
		else if(reqBuf.toString().indexOf("RECORD")>=0){
			return 1;
		}
		else if(reqBuf.toString().indexOf("TEARDOWN")>=0){
			return 1;
		}
                else if(reqBuf.toString().indexOf("PAUSE")>=0){
                        return 1;
                }
		else{
			return 0;
		}
	}

    /**
     * 
     * @param {Object} opt 
     * @param {Number} [opt.code=200]
     * @param {String} [opt.msg='OK']
     * @param {Object} [opt.headers={}]
     */
    makeResponseAndSend(opt = {}) {
	console.log("%s  rtsp-session makeResponseAndSend", Date());
        var def = { code: 200, msg: 'OK', headers: {} };
        var opt = Object.assign({}, def, opt);
        var raw = `RTSP/1.0 ${opt.code} ${opt.msg}\r\n`;
        for (var key in opt.headers) {
            raw += `${key}: ${opt.headers[key]}\r\n`;
        }
        raw += `\r\n`;
        console.log(`%s  >>>>>>>>>>>>> response[${opt.method}] >>>>>>>>>>>>>`, Date());
        console.log(Date() + raw);
        this.socket.write(raw);
        this.outBytes += raw.length;
        if (opt.body) {
            // console.log(new String(opt.body).toString());
            this.socket.write(opt.body);
            this.outBytes += opt.body.length;
        }
        return raw;
    }

    parseRequestHeader(header = '') {
		console.log("%s  rtsp-session parseRequestHeader", Date());
        var ret = new RTSPRequest();
        ret.raw = header;
        var lines = header.trim().split("\r\n");
        if (lines.length == 0) {
            return ret;
        }
        var line = lines[0];
        var items = line.split(/\s+/);
        ret.method = items[0];
        ret.url = items[1];
        for (var i = 1; i < lines.length; i++) {
            line = lines[i];
            items = line.split(/:\s+/);
            ret[items[0]] = items[1];
        }
        return ret;
    }

    /**
     * 
     * @param {RTSPRequest} req 
     */
    async handleRequest(req) {
	console.log("%s  rtsp-session handleRequest", Date());
        console.log(`%s  <<<<<<<<<<< request[${req.method}] <<<<<<<<<<<<<`, Date());
        console.log(Date() + req.raw);
        var res = {
            method: req.method,
            headers: {
                CSeq: req['CSeq'],
                Session: this.sid
            }
        };
        switch (req.method) {
            case 'OPTIONS':
                res.headers['Public'] = "DESCRIBE, SETUP, TEARDOWN, PLAY, PAUSE, OPTIONS, ANNOUNCE, RECORD";
                break;
            case 'ANNOUNCE':
                this.type = 'pusher';
                this.url = req.url;
                this.path = url.parse(this.url).path;
                var pushSession = this.server.pushSessions[this.path];
                if (pushSession) {
                    res.code = 406;
                    res.msg = 'Not Acceptable';
                } else {
				console.log("%s  handleRequest pushSession path="+this.path, Date());
					if (this.server.isLegalPathFromRedis(this.path)==0){
						res.code = 405;
						res.msg = 'Path Illegal';
						console.log("%s  code="+res.code+";res.msg"+res.msg, Date());
					}else{
						this.server.addSession(this);
						this.server.addSessionToredis(this);
						
					}
                    
                }
                break;
            case 'SETUP':
                var ts = req['Transport'] || "";
                var control = req.url.substring(req.url.lastIndexOf('/') + 1);
                var mtcp = ts.match(/interleaved=(\d+)(-(\d+))?/);
                var mudp = ts.match(/client_port=(\d+)(-(\d+))?/);
                if (mtcp) {
                    this.transType = 'tcp';
                    if (control == this.vControl) {
                        this.vRTPChannel = parseInt(mtcp[1]) || 0;
                        this.vRTPControlChannel = parseInt(mtcp[3]) || 0;
                    }
                    if (control == this.aControl) {
                        this.aRTPChannel = parseInt(mtcp[1]) || 0;
                        this.aRTPControlChannel = parseInt(mtcp[3]) || 0;
                    }
                } else if (mudp) {
                    this.transType = 'udp';
                    if (control == this.aControl) {
                        this.aRTPClientPort = parseInt(mudp[1]) || 0;
                        this.aRTPClientSocket = dgram.createSocket(this.getUDPType());
                        this.aRTPControlClientPort = parseInt(mudp[3]) || 0;
                        if(this.aRTPControlClientPort) {
                            this.aRTPControlClientSocket = dgram.createSocket(this.getUDPType());
                        }
                        if (this.type == 'pusher') {
                            this.aRTPServerPort = await getPort();
                            this.aRTPServerSocket = dgram.createSocket(this.getUDPType());
                            this.aRTPServerSocket.on('message', buf => {
                                this.inBytes += buf.length;
                                this.broadcastAudio(buf);
                            }).on('error', err => {
                                console.log(Date() + err);
                            })
                            await this.bindUDPPort(this.aRTPServerSocket, this.aRTPServerPort);
                            this.aRTPControlServerPort = await getPort();
                            this.aRTPControlServerSocket = dgram.createSocket(this.getUDPType());
                            this.aRTPControlServerSocket.on('message', buf => {
                                this.inBytes += buf.length;
                                this.broadcastAudioControl(buf);
                            }).on('error', err => {
                                console.log(Date() + err);
                            })
                            await this.bindUDPPort(this.aRTPControlServerSocket, this.aRTPControlServerPort);
                            ts = ts.split(';');
                            ts.splice(ts.indexOf(mudp[0]) + 1, 0, `server_port=${this.aRTPServerPort}-${this.aRTPControlServerPort}`);
                            ts = ts.join(';');
                        }
                    }
                    if (control == this.vControl) {
                        this.vRTPClientPort = parseInt(mudp[1]) || 0;
                        this.vRTPClientSocket = dgram.createSocket(this.getUDPType());
                        this.vRTPControlClientPort = parseInt(mudp[3]) || 0;
                        if(this.vRTPControlClientPort) {
                            this.vRTPControlClientSocket = dgram.createSocket(this.getUDPType());
                        }
                        if (this.type == 'pusher') {
                            this.vRTPServerPort = await getPort();
                            this.vRTPServerSocket = dgram.createSocket(this.getUDPType());
                            this.vRTPServerSocket.on('message', buf => {
                                this.inBytes += buf.length;
                                this.broadcastVideo(buf);
                                if (this.vCodec.toUpperCase() == 'H264') {
                                    var rtp = rtpParser.parseRtpPacket(buf);
                                    if (rtpParser.isKeyframeStart(rtp.payload)) {
                                        // console.log(`find key frame, current gop cache size[${this.gopCache.length}]`);
                                        this.gopCache = [];
                                    }
                                    this.gopCache.push(buf);
                                }
                            }).on('error', err => {
                                console.log(Date() + err);
                            })
                            await this.bindUDPPort(this.vRTPServerSocket, this.vRTPServerPort);
                            this.vRTPControlServerPort = await getPort();
                            this.vRTPControlserverSokcet = dgram.createSocket(this.getUDPType());
                            this.vRTPControlserverSokcet.on('message', buf => {
                                this.inBytes += buf.length;
                                this.broadcastVideoControl(buf);
                            })
                            await this.bindUDPPort(this.vRTPControlserverSokcet, this.vRTPControlServerPort);
                            ts = ts.split(';');
                            ts.splice(ts.indexOf(mudp[0]) + 1, 0, `server_port=${this.vRTPServerPort}-${this.vRTPControlServerPort}`);
                            ts = ts.join(';');
                        }
                    }
                }
                res.headers['Transport'] = ts;
                break;
            case 'DESCRIBE':
                this.type = 'player';
                this.url = req.url;
                this.path = url.parse(this.url).path;
                var pushSession = this.server.pushSessions[this.path];
                if (pushSession && pushSession.sdpRaw) {
                    res.headers['Content-Length'] = pushSession.sdpRaw.length;
                    res.body = pushSession.sdpRaw;
                    this.sdp = pushSession.sdp;
                    this.sdpRaw = pushSession.sdpRaw;
                    this.pushSession = pushSession;
                    if (this.sdp && this.sdp.media && this.sdp.media.length > 0) {
                        for (var media of this.sdp.media) {
                            if (media.type == 'video') {
                                this.vControl = media.control;
                                if (media.rtp && media.rtp.length > 0) {
                                    this.vCodec = media.rtp[0].codec;
                                    this.vRate = media.rtp[0].rate;
                                    this.vPayload = media.rtp[0].payload;
                                }
                            } else if (media.type == 'audio') {
                                this.aControl = media.control;
                                if (media.rtp && media.rtp.length > 0) {
                                    this.aCodec = media.rtp[0].codec;
                                    this.aRate = media.rtp[0].rate;
                                    this.aPayload = media.rtp[0].payload;
                                }
                            }
                        }
                    }
                } else {
                    res.code = 404;
                    res.msg = 'NOT FOUND';
                }
                break;
            case 'PLAY':
                process.nextTick(async () => {
                    await this.sendGOPCache();
                    this.server.addSession(this);
					this.server.addSessionToredis(this);
                })
                res.headers['Range'] = req['Range'];
                break;
            case 'RECORD':
                break;
            case 'TEARDOWN':
                this.makeResponseAndSend(res);
                this.socket.end();
                return;
        }
        this.makeResponseAndSend(res);
    }

    stop() {
	 console.log("%s  rtsp-session stop", Date());
        this.bp.stop();
        this.server.removeSession(this);
		this.server.removeSessionToredis(this);

        this.aRTPClientSocket && this.aRTPClientSocket.close();
        this.aRTPControlClientSocket && this.aRTPControlClientSocket.close();
        this.vRTPClientSocket && this.vRTPClientSocket.close();
        this.vRTPControlClientSocket && this.vRTPControlClientSocket.close();

        this.aRTPServerSocket && this.aRTPServerSocket.close();
        this.aRTPControlServerSocket && this.aRTPControlServerSocket.close();
        this.vRTPServerSocket && this.vRTPServerSocket.close();
        this.vRTPControlserverSokcet && this.vRTPControlserverSokcet.close();

        console.log(`%s  rtsp session[type=${this.type}, path=${this.path}, sid=${this.sid}] end`, Date());
    }

    sendGOPCache() {
		console.log("%s  rtsp-session sendGOPCache", Date());
        return new Promise(async (resolve, reject) => {
            if (!this.pushSession) {
                resolve();
                return;
            }
            for (var rtpBuf of this.pushSession.gopCache) {
                if (this.transType == 'tcp') {
                    var len = rtpBuf.length + 4;
                    var headerBuf = Buffer.allocUnsafe(4);
                    headerBuf.writeUInt8(0x24, 0);
                    headerBuf.writeUInt8(this.vRTPChannel, 1);
                    headerBuf.writeUInt16BE(rtpBuf.length, 2);
                    this.socket.write(Buffer.concat([headerBuf, rtpBuf], len));
                    this.outBytes += len;
                    this.pushSession.outBytes += len;
                } else if (this.transType == 'udp' && this.vRTPClientSocket) {
                    await this.sendUDPPack(rtpBuf, this.vRTPClientSocket, this.vRTPClientPort, this.host);
                    // this.vRTPClientSocket.send(rtpBuf, this.vRTPClientPort, this.host);
                    await this.sleep(1);
                    this.outBytes += rtpBuf.length;
                    this.pushSession.outBytes += rtpBuf.length;
                }
            }
            resolve();
        })
    }

    async sendVideo(rtpBuf) {
	console.log("%s  rtsp-session sendVideo", Date());
        if (this.transType == 'tcp') {
            var len = rtpBuf.length + 4;
            var headerBuf = Buffer.allocUnsafe(4);
            headerBuf.writeUInt8(0x24, 0);
            headerBuf.writeUInt8(this.vRTPChannel, 1);
            headerBuf.writeUInt16BE(rtpBuf.length, 2);
            this.socket.write(Buffer.concat([headerBuf, rtpBuf], len));
            this.outBytes += len;
            this.pushSession.outBytes += len;
        } else if (this.transType == 'udp' && this.vRTPClientSocket) {
            this.vRTPClientSocket.send(rtpBuf, this.vRTPClientPort, this.host);
            this.outBytes += rtpBuf.length;
            this.pushSession.outBytes += rtpBuf.length;
        }
    }

    sendVideoControl(rtpBuf) {
		console.log("%s  rtsp-session sendVideoControl", Date());
        if (this.transType == 'tcp') {
            var len = rtpBuf.length + 4;
            var headerBuf = Buffer.allocUnsafe(4);
            headerBuf.writeUInt8(0x24, 0);
            headerBuf.writeUInt8(this.vRTPControlChannel, 1);
            headerBuf.writeUInt16BE(rtpBuf.length, 2);
            this.socket.write(Buffer.concat([headerBuf, rtpBuf], len));
            this.outBytes += len;
            this.pushSession.outBytes += len;
        } else if (this.transType == 'udp' && this.vRTPControlClientSocket) {
            this.vRTPControlClientSocket.send(rtpBuf, this.vRTPControlClientPort, this.host);
            this.outBytes += rtpBuf.length;
            this.pushSession.outBytes += rtpBuf.length;
        }
    }

    sendAudio(rtpBuf) {
	console.log("%s  rtsp-session sendAudio", Date());
        if (this.transType == 'tcp') {
            var len = rtpBuf.length + 4;
            var headerBuf = Buffer.allocUnsafe(4);
            headerBuf.writeUInt8(0x24, 0);
            headerBuf.writeUInt8(this.aRTPChannel, 1);
            headerBuf.writeUInt16BE(rtpBuf.length, 2);
            this.socket.write(Buffer.concat([headerBuf, rtpBuf], len));
            this.outBytes += len;
            this.pushSession.outBytes += len;
        } else if (this.transType == 'udp' && this.aRTPClientSocket) {
            this.aRTPClientSocket.send(rtpBuf, this.aRTPClientPort, this.host);
            this.outBytes += rtpBuf.length;
            this.pushSession.outBytes += rtpBuf.length;
        }
    }

    sendAudioControl(rtpBuf) {
		console.log("%s  rtsp-session sendAudioControl", Date());
        if (this.transType == 'tcp') {
            var len = rtpBuf.length + 4;
            var headerBuf = Buffer.allocUnsafe(4);
            headerBuf.writeUInt8(0x24, 0);
            headerBuf.writeUInt8(this.aRTPControlChannel, 1);
            headerBuf.writeUInt16BE(rtpBuf.length, 2);
            this.socket.write(Buffer.concat([headerBuf, rtpBuf], len));
            this.outBytes += len;
            this.pushSession.outBytes += len;
        } else if (this.transType == 'udp' && this.aRTPControlClientSocket) {
            this.aRTPControlClientSocket.send(rtpBuf, this.aRTPControlClientPort, this.host);
            this.outBytes += rtpBuf.length;
            this.pushSession.outBytes += rtpBuf.length;
        }
    }

    broadcastVideo(rtpBuf) {
	console.log("%s  rtsp-session broadcastVideo", Date());
        var playSessions = this.server.playSessions[this.path] || [];
        for (var playSession of playSessions) {
            playSession.sendVideo(rtpBuf);
        }
    }

    broadcastVideoControl(rtpBuf) {
	console.log("%s  rtsp-session broadcastVideoControl", Date());
        var playSessions = this.server.playSessions[this.path] || [];
        for (var playSession of playSessions) {
            playSession.sendVideoControl(rtpBuf);
        }
    }

    broadcastAudio(rtpBuf) {
	console.log("%s  rtsp-session broadcastAudio", Date());
        var playSessions = this.server.playSessions[this.path] || [];
        for (var playSession of playSessions) {
            playSession.sendAudio(rtpBuf);
        }
    }

    broadcastAudioControl(rtpBuf) {
	console.log("%s  rtsp-session broadcastAudioControl", Date());
        var playSessions = this.server.playSessions[this.path] || [];
        for (var playSession of playSessions) {
            playSession.sendAudioControl(rtpBuf);
        }
    }

    sleep(timeout = 1000) {
	console.log("%s  rtsp-session sleep", Date());
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve();
            }, timeout);
        })
    }

    getUDPType() {
	console.log("%s  rtsp-session getUDPType", Date());
        return this.socket.address().family == 'IPv6' ? 'udp6' : 'udp4';
    }

    sendUDPPack(buf, socket, port, host) {
	console.log("%s  rtsp-session sendUDPPack", Date());
        return new Promise((resolve, reject) => {
            socket.send(buf, port, host, (err, len) => {
                resolve();
            })
        })
    }

    bindUDPPort(socket, port) {
	console.log("%s  rtsp-session bindUDPPort", Date());
        return new Promise((resolve, reject) => {
            socket.bind(port, () => {
                // console.log(`UDP socket bind on ${port} done.`);
                resolve();
            })
        })
    }
}

module.exports = RTSPSession;
