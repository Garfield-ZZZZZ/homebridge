module.exports = function (homebridge) {
  console.log("Main entry invoked");
  require('./rpiMonitor.js')(homebridge);
  require('./tincMonitor.js')(homebridge);
  require('./v2rayMonitor.js')(homebridge);
};
