const rl = require("readline");
const fs = require("fs");
const os = require("os");
const execSync = require("child_process").execSync;

const fileName = "./temp.txt";
const fileName_bak = "./temp.txt_bak";
if(!fs.exists(fileName)){
	execSync("touch " + fileName);
}
execSync("mv " + fileName+" "+ fileName_bak);

const fRead = fs.createReadStream(fileName_bak,{ "flags": "r"});
const fWrite = fs.createWriteStream(fileName,{ "flags": "a+"});

//读写的文件默认为UTF8编码
const fileObj = {
	fileHandle:null,
	openFile:function(){
		this.fileHandle = rl.createInterface({
		input:fRead,
		output:fWrite
		});	
	},
	init:function(){
		this.openFile();
		const instance = this.fileHandle;
		const readLine = instance.readLine;
		const writeLine = instance.writeLine;

		instance.readLine = function(callback){
			if(callback !== undefined){
				//fRead.setEncoding("UTF8");
				instance.on("line",function(line){
					callback(null,line);
				});
			}
		};
		instance.writeLine = function(buf){
			if(buf !== undefined){
				fWrite.write(buf + os.EOL);//,"UTF8"
			}
		};

		return instance;
	},
};

module.exports = fileObj.init();
