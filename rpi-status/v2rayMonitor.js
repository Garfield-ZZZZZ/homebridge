var Characteristic;
var Service;

const AccessoryDisplayName = "V2ray Monitor";
const AccessoryName = "v2ray-monitor";
const util = require("./util");

module.exports = function (homebridge) {
  Characteristic = homebridge.hap.Characteristic;
  Service = homebridge.hap.Service;
  uuid = homebridge.hap.uuid;

  homebridge.registerAccessory("rpi-plugins", AccessoryName, V2rayMonitor); // pluginName, accessoryName, constructor, configurationRequestHandler
}

function V2rayMonitor(logger, accessoryConfig){
  logger("V2rayMonitor constructor invoked");
  this.logger = logger;
  this.config = accessoryConfig;
  logger("V2rayMonitor constructor completed");
}

V2rayMonitor.prototype.getServices = function() {
  this.logger("V2rayMonitor.prototype.getServices invoked");
  let informationService = new Service.AccessoryInformation();
  informationService
    .setCharacteristic(Characteristic.Manufacturer, "Garfield")
    .setCharacteristic(Characteristic.Model, AccessoryDisplayName)
    .setCharacteristic(Characteristic.SerialNumber, "000-00-006");

  this.services = {};

  let ret = [informationService];

  this.v2rayRunningService =  new Service.ContactSensor("V2ray running", "v2ray-running");
  ret.push(this.v2rayRunningService);

  this.logger("Registering Update function");
  this.intervalObj = setInterval(this.UpdateStatus.bind(this), 60 * 1000);

  this.logger("V2rayMonitor.prototype.getServices completed, returning " + ret.length + " item(s)");
  return ret;
}

V2rayMonitor.prototype.UpdateStatus = function() {
  this.logger("V2rayMonitor.prototype.UpdateStatus invoked");

  let v2rayRunning = util.checkProcess("/usr/bin/v2ray/v2ray");
  let v2rayStatus = v2rayRunning ? 1 : 0;
  this.logger("Updating v2ray running with status code " + v2rayStatus);
  this.v2rayRunningService.getCharacteristic(Characteristic.ContactSensorState).updateValue(v2rayStatus);

  this.logger("V2rayMonitor.prototype.UpdateStatus completed");
}
