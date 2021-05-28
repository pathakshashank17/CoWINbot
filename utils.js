const client = require('twilio')(process.env.SID, process.env.AUTH_TOKEN);

module.exports = {
  // Use Twilio to send WhatsApp message
  sendMessage: async (message, clientNumber) => {
    await client.messages
    .create({
      body: message,
      from: 'whatsapp:+14155238886',
      to: `whatsapp:${clientNumber}`
    })
    try {
      console.log(`Sent a message to ${clientNumber}`)
    } catch (err) {
      console.log(err);
    }
  },
  // Send multiple messages to same client
  sendMessages: (messages, clientNumber) => {
    for (let i = 0; i < messages.length; i++) {
      ((i) => { setTimeout(() => { module.exports.sendMessage(messages[i], clientNumber) }, 1000 * i); })(i)
    }
  },
  // Send multiple message(s) to multiple client(s)
  sendMessagesToDiffClients: (val) => {
    for (let i = 0; i < val.length; i++) {
      ((i) => { setTimeout(() => { module.exports.sendMessage(val[i].message, val[i].clientNumber) }, 1000 * i); })(i)
    }
  },
  // Verify pincode
  checkPincodeValidity: (pinCode) => {
    let regex = new RegExp("^[1-9][0-9]{5}$");
    return regex.test(pinCode);
  }
};