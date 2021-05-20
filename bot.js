// Init requires and imports
require('dotenv').config()
const express = require("express");
const mongoose = require("mongoose");
const cron = require("node-cron");
const axios = require("axios").default;
const { sendMessage, sendMessages, sendMessagesToDiffClients, checkPincodeValidity } = require("./utils");
const app = express();

app.use(express.urlencoded({ extended: false }));

// Common data for query URL
const today = new Date();
const day = today.getDate();
const month = ((today.getMonth() < 10) ? "0" : "") + (today.getMonth() + 1);
const year = today.getFullYear();
const DATE = `${day}-${month}-${year}`;
const CONFIG = {
	headers: {
		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36"
	}
}

// Create MongoDB schema and connect with MongoDB Atlas
const taskSchema = new mongoose.Schema({ pinCode: Number, clientNumber: Number });
const Task = mongoose.model('Task', taskSchema);
mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true }).catch(err => console.log(err));

// Root route
app.get("/", (req, res) => {
	res.send("Roses are red, Violets are blue, There's nothing to see here, What will you do?");
});

// Starts the bot
app.listen(process.env.PORT || 8000, () => {
	console.log("Server started.");
});

// Handles incoming messages
app.post("/incoming", (req, res) => {

	// Parse user query
	const query = req.body.Body.split(' ');
	var action = query[0];
	var pinCode = query[1];
	var clientNumber = req.body.From.split(':')[1];

	var isValidPincode = checkPincodeValidity(pinCode);

	// Create new tracking task
	if (action === "track" && isValidPincode == true) {

		// Create new task
		const taskInfo = new Task({ pinCode: pinCode, clientNumber: clientNumber });

		// Save the task
		taskInfo.save((err) => {
			if (err) {
				console.log(err)
			} else {
				sendMessage(`Tracking empty vaccination slots for *${pinCode}*`, clientNumber);
			}
		});
	}

	// Handle checking
	else if (action === "check" && isValidPincode == true) {

		const URL = `https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByPin?pincode=${pinCode}&date=${DATE}`

		// Send GET request to CoWIN API and process it
		axios.get(URL, CONFIG)
			.then(res => res.data.centers)
			.then(data => {
				// Cherrypick data, create the message and store them
				var messages = data.map((center) => {
					var sessionsInfo = ``;
					center.sessions.forEach((session, index) => {
						var msg = `\n${index + 1}. ${session.date}:\nDose 1 = ${session.available_capacity_dose1}\nDose 2 = ${session.available_capacity_dose2}\nMin Age = ${session.min_age_limit}\n`;
						sessionsInfo = sessionsInfo + msg;
					});
					var msgTemplate = `\`\`\`Name: ${center.name}\nFee Type: ${center.fee_type}\nSessions: \n${sessionsInfo}\`\`\``;
					return msgTemplate;
				})

				// Send the stored messages
				sendMessages(messages, clientNumber);
			})
			.catch(err => console.log(err))
	}

	// Remove a tracking task for a given clientNumber & pinCode
	else if (action === "stop" && isValidPincode == true) {
		Task.deleteOne({ pinCode: pinCode, clientNumber: clientNumber })
			.then(sendMessage(`Tracking for ${pinCode} stopped`, clientNumber))
			.catch(err => console.log(err))
	}

	// Handle invalid input
	else
		sendMessage(`I can't understand your query 🙁. Please check that you typed it correctly`, clientNumber);
});

// Cron task to check availablity for saved tasks
cron.schedule('* * * * *', () => {
	console.log("Searching...");
	Task.find({}, (err, tasks) => {
		if (!err) {
			tasks.forEach(task => {
				var messagesForDiffClients = [];
				var URL = `https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByPin?pincode=${task.pinCode}&date=${DATE}`
				axios.get(URL, CONFIG)
					.then(res => res.data.centers)
					.then(data => {
						// If any center in the region can administer a dose, inform client
						data.every(center => {
							var regionCanServe = false;
							center.sessions.every(session => {
								if (session.available_capacity_dose1 != 0 || session.available_capacity_dose2 != 0) {
									regionCanServe = true;
									return false;
								}
								return true;
							})
							// TODO - Remember to change this to true before deployment
							if (regionCanServe == false) {
								var msg = `A session may be available at ${task.pinCode}. Please visit CoWIN for more details`;
								messagesForDiffClients.push({
									message: msg,
									clientNumber: task.clientNumber
								});
								return false;
							}
							return true;
						})
					})
					.then(() => { sendMessagesToDiffClients(messagesForDiffClients) })
					.catch(err => console.log(err))
			})
		}
		console.log("Search ended!")
	})
})