'use strict';

const Name = "rock-vacuum-v1";
const Model = "Rockrobo Vacuum V1"

const CMD_START = "app_start"
const CMD_PAUSE = "app_pause"
const CMD_STOP = "app_stop"
const CMD_CHARGE = "app_charge"
const CMD_GET_STATUS = "get_status"

const STATE_PAUSED = 2
const STATE_IDLING = 3
const STATE_CLEANING = 5
const STATE_GO_CHARGING = 6
const STATE_CHARGING = 8
const STATE_STOPPED = 10

const consts = require("../common/constants")
const util = require("../common/util")

module.exports.init = function (api) {
    console.log("init() in vacuum.js invoked");
    api.registerAccessory(Name, RockRoboVacuum);
}

class RockRoboVacuum {
    constructor(log, config, api) {
        console.log('rock constructor invoked')
        this.log = log;
        this.config = config;
        this.api = api

        this.log.debug("RockRoboVacuum constructor invoked");

        this.address = this.config.address
        this.token = this.config.token
        this.log.debug("address: " + this.address)
        this.log.debug("part of the token: " + this.token.substring(0, 8))

        this.log.debug("Setting up services");
        this.informationService = new this.api.hap.Service.AccessoryInformation();
        this.informationService
            .setCharacteristic(this.api.hap.Characteristic.Manufacturer, consts.Manufacturer)
            .setCharacteristic(this.api.hap.Characteristic.Model, Model);
    
        this.fanService = new this.api.hap.Service.Fan("Vacuum");
        this.fanService.getCharacteristic(this.api.hap.Characteristic.On)
            .on('get', this.getOnHandler.bind(this));
        this.fanService.getCharacteristic(this.api.hap.Characteristic.On)
            .on('set', this.setOnHandler.bind(this));

        this.batteryService = new this.api.hap.Service.BatteryService("device battery");
        this.batteryService.getCharacteristic(this.api.hap.Characteristic.BatteryLevel)
            .on('get', this.getBatteryLevelHandler.bind(this));
        this.batteryService.getCharacteristic(this.api.hap.Characteristic.ChargingState)
            .on('get', this.getChargingStateHandler.bind(this));
        // this.batteryService.getCharacteristic(this.api.hap.Characteristic.StatusLowBattery)
        //     .on('get', this.getStatusLowBatteryHandler.bind(this));

        this.device = null
        this.connect()
        this.log.debug("RockRoboVacuum constructor completed");

        this.status = null
    }

    async connect() {
        const miio = require('miio');
        var cnt = 0
        while (cnt++ < 10){
            try {
                this.log.debug("Connecting to device");
                var d = await miio.device({ address: this.address, token: this.token })
                this.log.debug(d)
                this.device = d
                return
            } catch (err) {
                this.log.error(err)
                util.sleep(60 * 1000)
            }
        }
    }

    getServices() {
        this.log.debug("RockRoboVacuum.getServices invoked");
        return [
            this.informationService,
            this.fanService,
            this.batteryService,
        ];
    }

    getOnHandler(callback) {
        this.log.debug('RockRoboVacuum.handleOnGet invoked');
        this.updateStatus().then((() => {
            var ret = (this.status.state === STATE_CLEANING)
            this.log.debug('device ' + (ret ? "is" : "isn't") + ' cleaning')
            callback(null, ret)
        }).bind(this)).catch((e => {
            this.log.error('failed to update status: ' + e)
            callback(e, 0)
        }).bind(this));
    }

	setOnHandler(newValue, callback) {
		this.log.info('RockRoboVacuum.setOnHandler invoked, setNewValue: ' + newValue);
        this.setOnHandlerAsync(newValue).then(() => {
            callback(null)
        }).catch(err => {
            this.log.error('got error when setting the status: ' + err)
            callback(err)
        })
	}

    async setOnHandlerAsync(newValue) {
        var cnt = 0
        while (cnt++ < 10) {
            await this.updateStatus()
            this.log.debug('current state is ' + this.status.state)
            if (newValue) {
                this.log.debug('starting cleaning')
                // set to cleaning
                switch (this.status.state) {
                    case STATE_CLEANING:
                        return
                    case STATE_GO_CHARGING:
                        await this.callApi(CMD_PAUSE, true)
                        break
                    case STATE_PAUSED:
                    case STATE_IDLING:
                    case STATE_CHARGING:
                    case STATE_STOPPED:
                        await this.callApi(CMD_START, true)
                        break
                    default:
                        this.log.error('Unexpected state: ' + this.status.state)
                        // wait for next cycle to see if it go away
                        await util.sleep(1000)
                        continue
                }
            } else {
                // stop and go charging if needed
                switch (this.status.state) {
                    case STATE_GO_CHARGING:
                    case STATE_CHARGING:
                        return
                    case STATE_CLEANING:
                        await this.callApi(CMD_STOP, true)
                        break
                    case STATE_PAUSED:
                    case STATE_IDLING:
                    case STATE_STOPPED:
                        await this.callApi(CMD_CHARGE, true)
                        break
                    default:
                        this.log.error('Unexpected state: ' + this.status.state)
                        // wait for next cycle to see if it go away
                        await util.sleep(2000)
                        continue
                }
            }
            // wait for the device to respond
            await util.sleep(500)
        }

        throw new Error('Too many iterations')
    }

    getBatteryLevelHandler(callback) {
        this.log.debug('querying battery status')
        this.updateStatus().then((() => {
            var ret = this.status.battery
            this.log.debug('battery level is ' + ret)
            callback(null, ret)
            this.getStatusLowBatteryHandler(((err, value) => {
                if (err) {
                    this.log.error('got error while getting battery low status: ' + err)
                } else {
                    this.batteryService.updateCharacteristic(this.api.hap.Characteristic.ChargingState, value);
                }
            }).bind(this))
        }).bind(this)).catch((e => {
            this.log.error('failed to update status: ' + e)
            callback(e, 0)
        }).bind(this));
    }

    getChargingStateHandler(callback) {
        this.log.debug('querying charging status')
        this.updateStatus().then((() => {
            var ret = this.api.hap.Characteristic.ChargingState.NOT_CHARGING
            if (this.status.state === STATE_CHARGING) {
                ret = this.api.hap.Characteristic.ChargingState.CHARGING
            }
            this.log.debug('charging status is ' + ret)
            callback(null, ret)
        }).bind(this)).catch((e => {
            this.log.error('failed to update status: ' + e)
            callback(e, this.api.hap.Characteristic.ChargingState.NOT_CHARGING)
        }).bind(this));
    }

    getStatusLowBatteryHandler(callback) {
        this.log.debug('checking low battery')
        if (this.status && this.status.battery >= 50) {
            this.log.debug('battery is good')
            callback(null, this.api.hap.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL)
        } else {
            this.log.debug('battery is low')
            callback(null, this.api.hap.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW)
        }
    }

    async updateStatus() {
        this.log.debug('getting status')
        var status = await this.callApi(CMD_GET_STATUS)
        this.status = status[0]
        this.log.debug('status updated')
    }

    async callApi(cmd, checkResult = false) {
        if (this.device === null) {
            throw new Error('device is not ready')
        }
        this.log.debug('invoking ' + cmd)
        var ret = await this.device.call(cmd)
        this.log.debug(ret)
        // {"result":0,"id":17} 	  = Firmware 3.3.9_003095 (Gen1)
        // {"result":["ok"],"id":11}  = Firmware 3.3.9_003194 (Gen1), 3.3.9_001168 (Gen2)
        if( checkResult && ret !== 0 && ret[0] !== 'ok' ) {
            throw new Error('API call failed');
        }
        return ret
    }
}
