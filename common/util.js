const execSync = require("child_process").execSync;

module.exports = class Utils {
  static checkProcess(name) {
    return execSync('ps -ef').indexOf(name) > 0;
  }

  static checkProxy(name) {
    try {
      execSync("curl -v -x " + proxy + " https://www.google.com/", {stdio: 'pipe'});
      return true;
    } catch (e) {
      return false;
    }
  }
}

