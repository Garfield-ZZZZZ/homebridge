const Name = "bravia-remote";
const Model = "Sony Bravia TV Remote";
const tvName = "Sony X8500G";
const fs = require("fs");
const consts = require("../common/constants")
const Bravia = require("./bravia");

module.exports.init = function (api) {
	console.log("init() in remote.js invoked");
	api.registerPlatform(Name, BriviaRemote);
}

class BriviaRemote {
	constructor(log, config, api) {
		this.log = log;
		this.config = config;
		this.api = api
		this.bravia = new Bravia(log, config.psk, config.hostname);

		this.log.debug("BriviaRemote constructor invoked");
		this.informationService = new this.api.hap.Service.AccessoryInformation();
		this.informationService
			.setCharacteristic(this.api.hap.Characteristic.Manufacturer, consts.Manufacturer)
			.setCharacteristic(this.api.hap.Characteristic.Model, Model);
	
		this.uuid = this.api.hap.uuid.generate('homebridge:my-tv-plugin' + tvName);

	
		this.api.on('didFinishLaunching', () => {
			log.debug('Executed didFinishLaunching callback');
			this.registerPlatform();
		});
	}

	registerPlatform() {
		if (this.theOldOne) {
			this.log.info("Removing old one")
			this.api.unregisterPlatformAccessories("homebridge-plugin-garfield", Name, [this.theOldOne]);
		}
		this.tvAccessory = new this.api.platformAccessory(tvName, this.uuid);
		this.tvAccessory.category = this.api.hap.Categories.TELEVISION;

		const tvService = this.tvAccessory.addService(this.api.hap.Service.Television);
		tvService.setCharacteristic(this.api.hap.Characteristic.ConfiguredName, tvName);
		tvService.setCharacteristic(this.api.hap.Characteristic.SleepDiscoveryMode, this.api.hap.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE);

		tvService.getCharacteristic(this.api.hap.Characteristic.Active)
			.on('get', this.getPowerStatusHandler.bind(this))
			.on('set', this.setPowerStatusHandler.bind(this));

		tvService.setCharacteristic(this.api.hap.Characteristic.ActiveIdentifier, 1);

		tvService.getCharacteristic(this.api.hap.Characteristic.ActiveIdentifier)
			.on('set', this.setActiveIdentifierHandler.bind(this));

		tvService.getCharacteristic(this.api.hap.Characteristic.RemoteKey)
			.on('set', this.setRemoteKeyHandler.bind(this));

		// Volume Control 
		const speakerService = this.tvAccessory.addService(this.api.hap.Service.TelevisionSpeaker, "tv-speaker", "TV Speaker");

		speakerService
			.setCharacteristic(this.api.hap.Characteristic.Active, this.api.hap.Characteristic.Active.ACTIVE)
			.setCharacteristic(this.api.hap.Characteristic.VolumeControlType, this.api.hap.Characteristic.VolumeControlType.ABSOLUTE);

		speakerService.getCharacteristic(this.api.hap.Characteristic.VolumeSelector)
			.on('set', this.setVolumeSelectorHandler.bind(this));

		tvService.addLinkedService(speakerService);

		// HDMI 1 Input Source
		const hdmi1InputService = this.tvAccessory.addService(this.api.hap.Service.InputSource, 'hdmi1', 'HDMI 1');
		hdmi1InputService
			.setCharacteristic(this.api.hap.Characteristic.Identifier, 1)
			.setCharacteristic(this.api.hap.Characteristic.ConfiguredName, 'HDMI 1')
			.setCharacteristic(this.api.hap.Characteristic.IsConfigured, this.api.hap.Characteristic.IsConfigured.CONFIGURED)
			.setCharacteristic(this.api.hap.Characteristic.InputSourceType, this.api.hap.Characteristic.InputSourceType.HDMI);
		tvService.addLinkedService(hdmi1InputService); // link to tv service

		// HDMI 2 Input Source
		const hdmi2InputService = this.tvAccessory.addService(this.api.hap.Service.InputSource, 'hdmi2', 'HDMI 2');
		hdmi2InputService
			.setCharacteristic(this.api.hap.Characteristic.Identifier, 2)
			.setCharacteristic(this.api.hap.Characteristic.ConfiguredName, 'HDMI 2')
			.setCharacteristic(this.api.hap.Characteristic.IsConfigured, this.api.hap.Characteristic.IsConfigured.CONFIGURED)
			.setCharacteristic(this.api.hap.Characteristic.InputSourceType, this.api.hap.Characteristic.InputSourceType.HDMI);
		tvService.addLinkedService(hdmi2InputService); // link to tv service

		// Netflix Input Source
		const netflixInputService = this.tvAccessory.addService(this.api.hap.Service.InputSource, 'netflix', 'Netflix');
		netflixInputService
			.setCharacteristic(this.api.hap.Characteristic.Identifier, 3)
			.setCharacteristic(this.api.hap.Characteristic.ConfiguredName, 'Netflix')
			.setCharacteristic(this.api.hap.Characteristic.IsConfigured, this.api.hap.Characteristic.IsConfigured.CONFIGURED)
			.setCharacteristic(this.api.hap.Characteristic.InputSourceType, this.api.hap.Characteristic.InputSourceType.HDMI);
		tvService.addLinkedService(netflixInputService); // link to tv service

		this.api.registerPlatformAccessories("homebridge-plugin-garfield", Name, [this.tvAccessory]);

		this.log.debug("BriviaRemote constructor completed");
	}

	configureAccessory(accessory) {
		this.log.info('Loading accessory from cache:', accessory.displayName, accessory.UUID);
		if (accessory.UUID == this.uuid) {
			this.log.info("Found old one to remove");
			this.theOldOne = accessory;
		}
	}

	getPowerStatusHandler(callback) {
		this.bravia.getPowerStatus().then( ret => {
			callback(null, ret ? 1 : 0);
		},
		error => {
			callback(error, null);
		})
	}

	setPowerStatusHandler(newValue, callback) {
		this.log.info('set Active => setNewValue: ' + newValue);
		this.bravia.setPowerStatus(newValue == 1).then( ret => {
			callback(null);
		},
		error => {
			callback(error);
		});
	}

	getActiveIdentifierHandler(callback) {
		callback(null, value)
	}

	setActiveIdentifierHandler(newValue, callback) {
		this.log.info('set Active Identifier => setNewValue: ' + newValue);
		callback(null);
	}

	setRemoteKeyHandler(newValue, callback) {
		switch(newValue) {
			case this.api.hap.Characteristic.RemoteKey.REWIND: {
				this.log.info('set Remote Key Pressed: REWIND');
				break;
			}
			case this.api.hap.Characteristic.RemoteKey.FAST_FORWARD: {
				this.log.info('set Remote Key Pressed: FAST_FORWARD');
				break;
			}
			case this.api.hap.Characteristic.RemoteKey.NEXT_TRACK: {
				this.log.info('set Remote Key Pressed: NEXT_TRACK');
				break;
			}
			case this.api.hap.Characteristic.RemoteKey.PREVIOUS_TRACK: {
				this.log.info('set Remote Key Pressed: PREVIOUS_TRACK');
				break;
			}
			case this.api.hap.Characteristic.RemoteKey.ARROW_UP: {
				this.log.info('set Remote Key Pressed: ARROW_UP');
				break;
			}
			case this.api.hap.Characteristic.RemoteKey.ARROW_DOWN: {
				this.log.info('set Remote Key Pressed: ARROW_DOWN');
				break;
			}
			case this.api.hap.Characteristic.RemoteKey.ARROW_LEFT: {
				this.log.info('set Remote Key Pressed: ARROW_LEFT');
				break;
			}
			case this.api.hap.Characteristic.RemoteKey.ARROW_RIGHT: {
				this.log.info('set Remote Key Pressed: ARROW_RIGHT');
				break;
			}
			case this.api.hap.Characteristic.RemoteKey.SELECT: {
				this.log.info('set Remote Key Pressed: SELECT');
				break;
			}
			case this.api.hap.Characteristic.RemoteKey.BACK: {
				this.log.info('set Remote Key Pressed: BACK');
				break;
			}
			case this.api.hap.Characteristic.RemoteKey.EXIT: {
				this.log.info('set Remote Key Pressed: EXIT');
				break;
			}
			case this.api.hap.Characteristic.RemoteKey.PLAY_PAUSE: {
				this.log.info('set Remote Key Pressed: PLAY_PAUSE');
				break;
			}
			case this.api.hap.Characteristic.RemoteKey.INFORMATION: {
				this.log.info('set Remote Key Pressed: INFORMATION');
				break;
			}
		}
		callback(null);
	}

	setVolumeSelectorHandler(newValue, callback) {
		switch(newValue) {
			case this.api.hap.Characteristic.VolumeSelector.INCREMENT: {
				this.log.info("Volume Up pressed");
				break;
			}
			case this.api.hap.Characteristic.VolumeSelector.DECREMENT: {
				this.log.info("Volume down pressed");
				break;
			}
		}
		callback(null);
	}

}
