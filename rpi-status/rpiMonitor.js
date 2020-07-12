const Name = "rpi-monitor";
const Model = "RPi system monitor"
const fs = require("fs");
const consts = require("../common/constants")

module.exports.init = function (api) {
    console.log("init() in rpiMonitor.js invoked");
    api.registerAccessory(Name, RpiMonitor);
}

class RpiMonitor {
    constructor(log, config, api) {
        this.log = log;
        this.config = config;
        this.api = api

        this.log.debug("RpiMonitor constructor invoked");
        this.informationService = new this.api.hap.Service.AccessoryInformation();
        this.informationService
            .setCharacteristic(this.api.hap.Characteristic.Manufacturer, consts.Manufacturer)
            .setCharacteristic(this.api.hap.Characteristic.Model, Model);
    
        this.cpuTempService = new this.api.hap.Service.TemperatureSensor("CPU temperature");
        this.cpuTempService.getCharacteristic(this.api.hap.Characteristic.CurrentTemperature)
            .on('get', this.handleCurrentTemperatureGet.bind(this));
        
        this.log.debug("Registering Update function");
        this.intervalObj = setInterval(this.updateCpuTemperature.bind(this), 60 * 1000);

        this.log.debug("RpiMonitor constructor completed");
    }

    getServices() {
        this.log.debug("RpiMonitor.getServices invoked");
        return [
            this.informationService,
            this.cpuTempService,
        ];
    }

    handleCurrentTemperatureGet(callback) {
        this.log.debug('RpiMonitor.handleCurrentTemperatureGet invoked');
        const value = this.getCpuTemperature();
        callback(null, value);
    }
    
    updateCpuTemperature = function() {
        this.log.debug("RpiMonitor.updateCpuTemperature invoked");
        let value = this.getCpuTemperature();
        this.cpuTempService.updateCharacteristic(this.api.hap.Characteristic.CurrentTemperature, value);
        this.log.debug("RpiMonitor.updateCpuTemperature completed");
    }

    getCpuTemperature = function() {
        let path = '/sys/class/thermal/thermal_zone0/temp';
        this.log.debug("Reading " + path);
        let temperature = fs.readFileSync(path, 'utf8').trim();
        this.log.debug("raw output is " + temperature);
        let value = Number(temperature) / 1000.0;
        this.log.info("CPU temperature is " + value);
        return value
    }
}
