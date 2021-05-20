const client = require('twilio')(process.env.SID, process.env.AUTH_TOKEN);
const axios = require("axios").default;

module.exports = {
	// Use Twilio's helper library to send WhatsApp message
	sendMessage: (message, clientNumber) => {
		client.messages
			.create({
				body: message,
				from: 'whatsapp:+14155238886',
				to: `whatsapp:${clientNumber}`
			})
			.catch(err => console.log(err))
			.then(console.log(`Sent a message to ${clientNumber}`))
			.done();
	},
	// Send multiple messages to same client
	sendMessages: (messages, clientNumber) => {
		for (var i = 0; i < messages.length; i++) {
			((i) => { setTimeout(() => { module.exports.sendMessage(messages[i], clientNumber) }, 1000 * i); })(i)
		}
	},
	// Send multiple message(s) to multiple client(s)
	sendMessagesToDiffClients: (val) => {
		for (var i = 0; i < val.length; i++) {
			((i) => { setTimeout(() => { module.exports.sendMessage(val[i].message, val[i].clientNumber) }, 1000 * i); })(i)
		}
	},
	// Verify pincode
	checkPincodeValidity: (pinCode) => {
		var regex = new RegExp("^[1-9][0-9]{5}$");
		return regex.test(pinCode);
	}
};