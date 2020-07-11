module.exports = function (homebridge) {
  console.log("Main entry invoked");
  require('./rpi-status/rpiMonitor.js').init(homebridge);
};
