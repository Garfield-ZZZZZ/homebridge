module.exports = function (api) {
  console.log("Main entry invoked");
  require('./rpi-status/rpiMonitor').init(api);
  require('./sony-bravia-remote/remote').init(api);
};
