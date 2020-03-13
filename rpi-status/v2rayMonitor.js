const AccessoryDisplayName = "V2ray Monitor";
const AccessoryName = "v2ray-monitor";
const serialNumber = "000-00-006";

const util = require("./util");
const contactSensor = require("./contactSensor")

module.exports.init = function (homebridge) {
  contactSensor.create(homebridge, AccessoryName, AccessoryDisplayName, serialNumber, updateStatus);
}

function updateStatus(logger) {
  logger("Checking v2ray process");

  let v2rayRunning = util.checkProcess("/usr/bin/v2ray/v2ray");
  logger("V2ray is " + (v2rayRunning ? "" : "NOT ") + "running");

  return v2rayRunning;
}