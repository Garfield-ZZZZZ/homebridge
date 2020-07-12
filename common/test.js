const util = require("./util");

const testCheckProcess = function() {
	console.log("/usr/sbin/sshd is " + (util.checkProcess("/usr/sbin/sshd") ? "" : "NOT ") + "running");
	console.log("/usr/sbin/asdf is " + (util.checkProcess("/usr/sbin/asdf") ? "" : "NOT ") + "running");
}

const testCheckProxy = function() {
	console.log("Proxy http://proxy.server:8888 is " + (util.checkProxy("http://proxy.server:8888") ? "" : "NOT ") + "running");
	console.log("Proxy http://proxy.server:1080 is " + (util.checkProxy("http://proxy.server:1080") ? "" : "NOT ") + "running");
	console.log("Proxy http://proxy.server:1234 is " + (util.checkProxy("http://proxy.server:1234") ? "" : "NOT ") + "running");
}

const testBravia = function() {
	const Bravia = require("../sony-bravia-remote/bravia");
	const bravia = new Bravia(new FakeLogger(), process.env.PSK, "sonyx8500");
	const target = false;
	console.log("Setting the power status to " + target)
	bravia.setPowerStatus(target).then( () => {
		bravia.getPowerStatus().then( (ret) => {
			if (ret == target) {
				console.log("Succeeded");
			} else {
				console.log("Something went wrong. Expecting: " + target + ", actual: " + ret)
			}
		},
		(error) => {
			console.log("Got error: " + JSON.stringify(error));
		});
	});
}

class FakeLogger {
	debug(msg) {
		console.log("debug: " + msg);
	}
	info(msg) {
		console.log("info: " + msg);
	}
	warn(msg) {
		console.log("warn: " + msg);
	}
	error(msg) {
		console.log("error: " + msg);
	}
}

if (process.env.PSK) {
	testBravia();
} else {
	console.log("NO PSK found in env var");
}
