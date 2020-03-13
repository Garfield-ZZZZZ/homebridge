const consts = require("./consts");

module.exports.create = function (homebridge, accessoryName, accessoryDisplayName, serialNumber, updateFunc) {
  let constructor = function(logger, accessoryConfig) {
    return new ContactSensor(homebridge, accessoryName, accessoryDisplayName, serialNumber, updateFunc, logger)
  }
  homebridge.registerAccessory(consts.PluginName, accessoryName, constructor); // pluginName, accessoryName, constructor, configurationRequestHandler
}

function ContactSensor(homebridge, accessoryName, accessoryDisplayName, serialNumber, updateFunc, logger){
  logger("[ContactSensor] Constructor invoked");
  this.characteristic = homebridge.hap.Characteristic;
  this.service = homebridge.hap.Service;
  this.accessoryName = accessoryName;
  this.accessoryDisplayName = accessoryDisplayName;
  this.serialNumber = serialNumber;
  this.updateFunc = updateFunc;
  this.logger = logger;
}

ContactSensor.prototype.getServices = function() {
  this.logger("[ContactSensor] getServices invoked");
  let informationService = new this.service.AccessoryInformation();
  informationService
    .setCharacteristic(this.characteristic.Manufacturer, consts.Manufacturer)
    .setCharacteristic(this.characteristic.Model, this.accessoryDisplayName)
    .setCharacteristic(this.characteristic.SerialNumber, this.serialNumber);

  this.sensorService = new this.service.ContactSensor(this.accessoryDisplayName, this.accessoryName);

  this.logger("[ContactSensor] Registering Update function");
  this.intervalObj = setInterval(this.updateStatus.bind(this), 60 * 1000);

  return [informationService, this.sensorService];
}

ContactSensor.prototype.updateStatus = function() {
  this.logger("[ContactSensor] updateStatus invoked");

  let status = this.updateFunc(this.logger) ? 1 : 0;
  this.logger("[ContactSensor] Updating with status code " + status);
  this.sensorService.getCharacteristic(this.characteristic.ContactSensorState).updateValue(status);

  this.logger("[ContactSensor] updateStatus completed");
}
