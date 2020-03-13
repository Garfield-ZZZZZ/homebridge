const util = require("./util");

console.log("/usr/sbin/sshd is " + (util.checkProcess("/usr/sbin/sshd") ? "" : "NOT ") + "running");
console.log("/usr/sbin/asdf is " + (util.checkProcess("/usr/sbin/asdf") ? "" : "NOT ") + "running");

console.log("Proxy http://proxy.server:8888 is " + (util.checkProxy("http://proxy.server:8888") ? "" : "NOT ") + "running");
console.log("Proxy http://proxy.server:1080 is " + (util.checkProxy("http://proxy.server:1080") ? "" : "NOT ") + "running");
console.log("Proxy http://proxy.server:1234 is " + (util.checkProxy("http://proxy.server:1234") ? "" : "NOT ") + "running");
