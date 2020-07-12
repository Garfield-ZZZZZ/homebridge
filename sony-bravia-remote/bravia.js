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
			const result = await this.sendApiRequest("system", "getPowerStatus", []);
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
			await this.sendApiRequest("system", "setPowerStatus", [{"status": on}]);
		} catch (error) {
			this.log.error("Caught error: " + JSON.stringify(error));
		}
	}

	async sendApiRequest(controller, method, params) {
		if (!Array.isArray(params)) {
			params = [params]
		}
		const data = '{"method":"' + method + '","version":"1.0","id":' + this.requestId++ + ',"params":' + JSON.stringify(params) + '}'
		return await this.sendRequest(controller, data);
	}

	async sendRequest(controller, data) {
		const url = "http://" + this.hostname + "/sony/" + controller;
		this.log.debug("Sending " + data + " to " + url);
		const result = await new Promise((resolve, reject) => {
			request.post({
				headers: {
					"content-type": "text/plain;charset=UTF-8",
					"X-Auth-PSK" : this.psk
				},
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
				const ret = JSON.parse(body).result;
				resolve(ret)
			}.bind(this));
		});
		this.log.debug("Returning result: " + JSON.stringify(result))
		return result;
	}
}
