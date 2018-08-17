const Readable = require('stream').Readable;

class BufferPool extends Readable {
  constructor(genFun, options) {
    super(options);
    this.gFun = genFun;
  }

  _read(size) {

  }

  init() {
    //console.log("buffer-pool init");
    this.readBytes = 0;
    this.poolBytes = 0;
    this.needBytes = 0;
    this.gFun.next(false);
  }

  stop() {
	console.log("buffer-pool stop");
    try {
      this.gFun.next(true);
    } catch (e) {
      // console.log(e);
    }
  }

  push(buf) {
//	console.log("buffer-pool push");
    super.push(buf);
    this.poolBytes += buf.length;
    this.readBytes += buf.length;
    if (this.needBytes > 0 && this.needBytes <= this.poolBytes) {
      this.gFun.next(false);
    }
  }

  read(size) {
//	console.log("buffer-pool read "+size);
    this.poolBytes -= size;
    return super.read(size);
  }

  need(size) {
//	console.log("buffer-pool need" + size);
    let ret = this.poolBytes < size;
    if (ret) {
      this.needBytes = size;
    } else {
      this.needBytes = 0;
    }
    return ret;
  }
}

module.exports = BufferPool
