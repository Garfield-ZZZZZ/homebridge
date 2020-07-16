const request = require("request");

module.exports = class Bravia {
	constructor(log, psk, hostname) {
		this.log = log;
		this.psk = psk;
		this.hostname = hostname;
		this.requestId = 1;
		this.log.debug("Bravia constructor invoked, hostname is " + hostname);
	}

	async getPowerStatus() {
		this.log.debug("Querying power status");
		try {
			const result = await this.sendApiRequest("system", "getPowerStatus", "1.0", []);
			const s = result[0].status;
			this.log.debug("Got status: " + s);
			return s == "active";
		} catch (error) {
			if(error.code == "EHOSTUNREACH") {
				// host unreachable, seems to be normal for TV in standby
				this.log.debug("Caught host unreachable error: " + JSON.stringify(error));
			} else {
				this.log.error("Caught error: " + JSON.stringify(error));
			}
			return false;
		}
	}
	
	async setPowerStatus(on) {
		this.log.debug("Setting power status to " + (on ? "ON" : "OFF"));
		try {
			await this.sendApiRequest("system", "setPowerStatus", "1.0", [{"status": on}]);
		} catch (error) {
			this.log.error("Caught error: " + JSON.stringify(error));
		}
	}

	async sendApiRequest(controller, method, version, params) {
		if (this.requestId > 10000) {
			this.log.debug("Resetting request ID");
			this.requestId = 1;
		}
		if (!Array.isArray(params)) {
			params = [params]
		}
		const data = '{"method":"' + method + '","version":"' + version + '","id":' + this.requestId++ + ',"params":' + JSON.stringify(params) + '}'
		const headers = {"X-Auth-PSK" : this.psk}
		return await this.sendRequest(controller, headers, data, true);
	}

	async sendIrccRequest(command) {
		this.log.debug("Sending IRCC command " + command);
		const headers = {"X-Auth-PSK" : this.psk, 'Content-Type': 'text/xml;charset=UTF-8', "SOAPACTION": '"urn:schemas-sony-com:service:IRCC:1#X_SendIRCC"'};
		const translatedCommand = IrccMap[command];
		this.log.debug("The actual command is " + translatedCommand);
		const data = '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"> <s:Body> <u:X_SendIRCC xmlns:u="urn:schemas-sony-com:service:IRCC:1"> <IRCCCode>' + translatedCommand + '</IRCCCode> </u:X_SendIRCC> </s:Body> </s:Envelope>';
		await this.sendRequest("ircc", headers, data, false);
	}

	async sendRequest(controller, headers, data, needResponse) {
		const url = "http://" + this.hostname + "/sony/" + controller;
		this.log.debug("Sending " + data + " to " + url);
		const result = await new Promise((resolve, reject) => {
			request.post({
				headers: headers,
				url: url,
				body: data
			}, function(error, response, body){
				if (error) {
					this.log.debug("Got error while sending " + data + " to " + url);
					this.log.debug(error);
					reject(error);
					return;
				}
				if (response.statusCode != 200) {
					this.log.debug("Got non-200 while sending " + data + " to " + url);
					this.log.debug("status code: " + response.statusCode);
					this.log.debug(body);
					reject("Invalid status code <" + response.statusCode + ">");
					return;
				}
				this.log.debug("Got response: " + body);
				if (needResponse) {
					const ret = JSON.parse(body).result;
					resolve(ret);
				} else {
					resolve();
				}
			}.bind(this));
		});
		this.log.debug("Returning result: " + JSON.stringify(result))
		return result;
	}
}

IrccMap = {
        "ARROW_UP": "AAAAAQAAAAEAAAB0Aw==",
        "ARROW_DOWN": "AAAAAQAAAAEAAAB1Aw==",
        "ARROW_LEFT": "AAAAAQAAAAEAAAA0Aw==",
        "ARROW_RIGHT": "AAAAAQAAAAEAAAAzAw==",
        "SELECT": "AAAAAQAAAAEAAABlAw==",
        "BACK": "AAAAAgAAAJcAAAAjAw==",
        "INFORMATION": "AAAAAQAAAAEAAABgAw==", // HOME
        "PLAY_PAUSE": "AAAAAQAAAAEAAAAlAw==", // INPUT
        "INCREMENT": "AAAAAQAAAAEAAAASAw==",
        "DECREMENT": "AAAAAQAAAAEAAAATAw=="
}

