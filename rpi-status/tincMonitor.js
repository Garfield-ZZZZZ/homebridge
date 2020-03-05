var Characteristic;
var Service;

const AccessoryDisplayName = "Tinc Monitor";
const AccessoryName = "tinc-monitor";
const fs = require("fs");
const execSync = require("child_process").execSync;
const nodeNames = ['hkvm', 'jpvm', 'krvm'];
const graphFilePath = '/etc/tinc/yzvm/current.nodes';

module.exports = function (homebridge) {
  Characteristic = homebridge.hap.Characteristic;
  Service = homebridge.hap.Service;
  uuid = homebridge.hap.uuid;

  homebridge.registerAccessory("rpi-plugins", AccessoryName, TincMonitor); // pluginName, accessoryName, constructor, configurationRequestHandler
}

function TincMonitor(logger, accessoryConfig){
  logger("TincMonitor constructor invoked");
  this.logger = logger;
  this.config = accessoryConfig;
  logger("TincMonitor constructor completed");
}

TincMonitor.prototype.getServices = function() {
  this.logger("TincMonitor.prototype.getServices invoked");
  let informationService = new Service.AccessoryInformation();
  informationService
    .setCharacteristic(Characteristic.Manufacturer, "Garfield")
    .setCharacteristic(Characteristic.Model, AccessoryDisplayName)
    .setCharacteristic(Characteristic.SerialNumber, "000-00-005");

  this.services = {};

  let ret = [informationService];

  this.tincRunningService =  new Service.ContactSensor("Tinc running", "tinc-running");
  ret.push(this.tincRunningService);

  for (let i=0; i<nodeNames.length; i++) {
    let name = nodeNames[i];
    let service = new Service.ContactSensor("Node " + name + " connected", name + "-connected");
    this.services[name] = service;
    ret.push(service);
  }

  this.logger("Registering Update function");
  this.intervalObj = setInterval(this.UpdateNodeStatus.bind(this), 60 * 1000);

  this.logger("TincMonitor.prototype.getServices completed, returning " + ret.length + " item(s)");
  return ret;
}

TincMonitor.prototype.IsTincRunning = function() {
  this.logger("TincMonitor.prototype.IsTincRunning invoked");
  let output = execSync('ps -ef');
  let ret = output.indexOf("tincd -n yzvm") > 0;
  this.logger("TincMonitor.prototype.IsTincRunning completed, returning " + ret);
  return ret;
}

TincMonitor.prototype.UpdateNodeStatus = function() {
  this.logger("TincMonitor.prototype.UpdateNodeStatus invoked");

  let tincRunning = this.IsTincRunning();
  let tincStatus = tincRunning ? 1 : 0;
  this.logger("Updating tinc running with status code " + tincStatus);
  this.tincRunningService.getCharacteristic(Characteristic.ContactSensorState).updateValue(tincStatus);

  this.logger("Loading node graph from " + graphFilePath);
  let graph = fs.readFileSync(graphFilePath, 'utf8');

  for (let i=0; i<nodeNames.length; i++) {
    let nodeName = nodeNames[i];
    let service = this.services[nodeName];
    let status = (tincRunning && graph.indexOf("\"" + nodeName + "\"") > 0) ? 1 : 0;
    this.logger("Updating node " + nodeName + " with status code " + status);
    service.getCharacteristic(Characteristic.ContactSensorState).updateValue(status);
  }

  this.logger("TincMonitor.prototype.UpdateNodeStatus completed");
}
