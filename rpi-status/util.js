const execSync = require("child_process").execSync;

module.exports.checkProcess = function (name) {
  return execSync('ps -ef').indexOf(name) > 0;
}

module.exports.checkProxy = function (proxy) {
  try {
    execSync("curl -v -x " + proxy + " https://www.google.com/", {stdio: 'pipe'});
    return true;
  } catch (e) {
    return false;
  }
}
