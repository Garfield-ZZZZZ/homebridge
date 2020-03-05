var Characteristic;
var Service;

const AccessoryDisplayName = "Raspberry Pi Monitor";
const AccessoryName = "rpi-monitor";
const fs = require("fs");

module.exports = function (homebridge) {
  Characteristic = homebridge.hap.Characteristic;
  Service = homebridge.hap.Service;
  uuid = homebridge.hap.uuid;

  homebridge.registerAccessory("rpi-plugins", AccessoryName, RpiMonitor); // pluginName, accessoryName, constructor, configurationRequestHandler
}

function RpiMonitor(logger, accessoryConfig){
  logger("RpiMonitor constructor invoked");
  this.logger = logger;
  this.config = accessoryConfig;
  logger("RpiMonitor constructor completed");
}

RpiMonitor.prototype.getServices = function() {
  this.logger("RpiMonitor.prototype.getServices invoked");
  let informationService = new Service.AccessoryInformation();
  informationService
    .setCharacteristic(Characteristic.Manufacturer, "Garfield")
    .setCharacteristic(Characteristic.Model, AccessoryDisplayName)
    .setCharacteristic(Characteristic.SerialNumber, "000-00-004");

  let cpuTempService = new Service.TemperatureSensor("CPU temperature", "rpi-cpu-temp");

  this.informationService = informationService;
  this.cpuTempService = cpuTempService;
  
  this.logger("Registering Update function");
  this.intervalObj = setInterval(this.UpdateCpuTemperature.bind(this), 60 * 1000);

  this.logger("RpiMonitor.prototype.getServices completed");
  return [informationService, cpuTempService];
}

RpiMonitor.prototype.UpdateCpuTemperature = function(callback) {
  this.logger("RpiMonitor.prototype.UpdateCpuTemperature invoked");
  let path = '/sys/class/thermal/thermal_zone0/temp';
  this.logger("reading from " + path);
  let temperature = fs.readFileSync(path, 'utf8');
  this.logger("raw output is " + temperature);
  let value = Number(temperature) / 1000.0;
  this.logger("Updating CPU temperature as " + value);
  this.cpuTempService.getCharacteristic(Characteristic.CurrentTemperature).updateValue(value);
  this.logger("RpiMonitor.prototype.UpdateCpuTemperature completed");
}
