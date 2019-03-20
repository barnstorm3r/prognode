var moment = require('moment');
var express = require('express');

class User {
	/**
	* Class for a user
	* @param {string} name user's name
	* @param {number} permissionLevel the permission level of the user
	* @param {string} email user's email
	*/
	constructor (name, permissionLevel, email) {
		this.name = name;
		this.permissionLevel = permissionLevel;
		this.email = email;
	}
}

var UserList = {};
UserList[1337] = new User('Barnaby Collins', 9, 'barnstormer322@gmail.com');

/**
* Add or update user entry
* @param {number} id ID of the user to add or update
* @param {string} name name to give to the user
*/
function updateUser(id, name) {
	if (id in UserList) {
		UserList[id].name = name;
	}
	else {
		UserList[id] = new User(name, 0);
	}
}

class Booking {
	/**
	* Class for a booking
	* @param {number} booktime unix timestamp for the time the booking was made (used for priority)
	* @param {object} STime JS Date object representing the start time of the booking
	* @param {object} ETime JS Date object representing the end time of the booking
	* @param {string} id the user id of the person that made the booking
	* @param {boolean} recurrence whether or not the booking will recur every week
	*/
	constructor(booktime, STime, ETime, id, recurrence) {
		this.booktime = booktime;
		this.STime = STime;
		this.ETime = ETime;
		this.id = id;
		this.recurrence = recurrence;
	}
}

/**
* Create new booking
* @param {object} STime JS Date.toString() object representing the start time of the booking
* @param {object} ETime JS Date.toString() object representing the end time of the booking
* @param {string} name the name to display on that booking
* @param {string} id the user id of the person that made the booking
* @param {boolean} recurrence whether or not the booking will recur every week
*/
function createBooking(STime, ETime, name, id, recurrence, email) {
	var recurrencedict = {'on': true, 'off': false};
	
	// add the user to the user database if we haven't already
	if (!(id in UserList)) {
		UserList[id] = new User(name, 0, email);
	}

	var start = moment(STime);
	var end = moment(ETime);
	var mintime = start.clone().hour(10).minute(0).second(0).millisecond(0);
	var maxtime = start.clone().hour(22).minute(0).second(0).millisecond(0);

	// make sure that both start and end land in the range of 10 til 10 on the date of the start time
	if (!(start.isBetween(mintime, maxtime, null, '[]') && end.isBetween(mintime, maxtime, null, '[]'))) {
		return false;
	}
	// make sure end is after start (and the session spans at least one hour)
	else if (end.hour() <= start.hour()) {
		return false;
	}

	// make booking object
	var toAdd = new Booking(Date.now(), Date.parse(STime), Date.parse(ETime), id, recurrencedict[recurrence]);
	var bookId = bookingnum;
	if (bookingpool.length > 0) {
		bookId = bookingpool.shift();
	}
	else {
		bookingnum += 1;
	}
	// if the booking doesn't clash, add it to bookings
	if (registerBooking(toAdd, bookId)) {
		bookings[bookId] = toAdd;
	}
	// otherwise, return false
	else {
		return false;
	}
	
	// if we completed successfully, return true
	return true;
}


// object to store what times are booked so we can check for clashes
var bookedTimes = {};

/**
 * Register booking to bookedTimes
 * @param {object} booking booking to add
 * @param {number} id id to give to the booking
 */
function registerBooking(booking, id) {
	var bookingtimes = [moment(booking.STime), moment(booking.ETime)];
	var year = bookingtimes[0].year();
	var day = bookingtimes[0].dayOfYear();
	
	// if we haven't yet got an entry for the year, add one for the year and day
	if (bookedTimes[year] == undefined) {
		bookedTimes[year] = {};
		bookedTimes[year][day] = {};
	}
	// if we haven't yet got an entry for the day, add one for it
	else if (bookedTimes[year][day] == undefined) {
		bookedTimes[year][day] = {};
	}
	// for each hour of the booking
	for (var j = bookingtimes[0].hour(); j < bookingtimes[1].hour(); j++) {
		// if we don't yet have anything else booked then, remember it's booked now
		if (!bookedTimes[year][day][j]) {
			bookedTimes[year][day][j] = id;
		}
		// if there's a clash
		else {
			// if the clashing booking belongs to the same user as the booking being added
			if (bookings[bookedTimes[year][day][j]].id == booking.id) {
				// remove that booking and continue adding the current booking
				removeBooking(bookedTimes[year][day][j]);
				bookedTimes[year][day][j] = id;
			}
			else {
				// if it belongs to someone else
				for (var k = bookingtimes[0].hour(); k < j; k++) {
					// remove past entries in bookedTimes and put the id back in the bookingpool
					delete bookedTimes[year][day][j];
					bookingpool.push(id);
				}
				// return a failure
				return false;
			}
		}
	}
	// if we successfully made a booking, return success
	return true;
}

/**
 * Removes a booking from bookings and bookedTimes
 * @param {number} id id of the booking to remove
 * @param {string} user id of the user removing the booking
 */
function removeBooking(id, user) {
	if (!(id in bookings)) {
		throw 'Booking does not exist';
	}

	var booking = bookings[id];
	if (user != booking.id) {
		throw 'You don\'t have permission to delete that booking';
	}

	var bookingtimes = [moment(booking.STime), moment(booking.ETime)];
	var year = bookingtimes[0].year();
	var day = bookingtimes[0].dayOfYear();

	for (var i = bookingtimes[0].hour(); i < bookingtimes[1].hour(); i++) {
		delete bookedTimes[year][day][i];
	}

	// tidy up any empty entries in bookedTimes
	if (Object.keys(bookedTimes[year][day]).length == 0) {
		delete bookedTimes[year][day];

		if (Object.keys(bookedTimes[year]).length == 0) {
			delete bookedTimes[year];
		}
	}

	// remove booking from bookings database and release the id back to the pool
	delete bookings[id];
	bookingpool.push(id);

	return true;
}

var bookings = {};		// object to store bookings in
var bookingnum = 1;		// counter to store the current booking index
var bookingpool = [];	// queue to store the pool of free booking numbers
createBooking('13 Mar 2019 10:00:00 GMT', '13 Mar 2019 12:00:00 GMT', 'steve', '80', 'off');

const CLIENT_ID = '149049213874-0g5d6qbds8th0f1snmhap4n0a05cssp2.apps.googleusercontent.com';

const {OAuth2Client} = require('google-auth-library');
const client = new OAuth2Client(CLIENT_ID);
async function verify(token) {
	const ticket = await client.verifyIdToken({
		idToken: token,
		audience: CLIENT_ID,  // Specify the CLIENT_ID of the app that accesses the backend
		// Or, if multiple clients access the backend:
		//[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
	});
	const payload = await ticket.getPayload();
	return payload;
}

// NODE SERVER
var app = express();

app.use(express.urlencoded({extended: false}));
app.use(express.static('static'));

/* GETTING BOOKINGS */
app.get('/bookings', function(req, resp) {
	var content = [];
	for (var i = 0; i < Object.keys(bookings).length; i++) {
		// j = current booking object
		var j = Object.assign({}, bookings[Object.keys(bookings)[i]]);
		j['name'] = UserList[j.id].name;
		delete j.id;
		content.push(j);
	}
	resp.send(content);
});

/* GETTING USER LIST */
app.get('/users', function(req, resp) {
	resp.send(UserList);
});

/* ADD OR UPDATE USER ENTRY */
app.post('/updateuser', async function(req, resp) {
	try {
		var user = await verify(req.body.id);
	}
	catch (error) {
		resp.status(401).send('Error: Failed to verify your Google account');
		return;
	}

	updateUser(user['sub'], req.body.name);
	resp.send('User successfully updated');
});

/* NEW BOOKING */
app.post('/new', async function(req, resp) {
	console.log(req.body);
	try {
		var user = await verify(req.body.id);
		var id = user['sub'];
		var email = user['email'];
	}
	catch (error) {
		resp.status(401).send('Error: Failed to verify your Google account');
		return;
	}

	try {
		createBooking(req.body.stime, req.body.etime, req.body.name, id, req.body.recurrence, email);
	}
	catch(error) {
		resp.status(409).send('Error: Failed to add your booking, likely because of a clash with an existing booking. Please check the timetable before making your booking! Alternatively, this could be because your booking lands outside the 10-til-10 range allowed.');
	}
	resp.send('Successfully added your booking to the database.');
});

/* REMOVE BOOKING */
app.post('/remove', async function(req, resp) {
	try {
		var user = await verify(req.body.user);
		var id = user['sub'];
	}
	catch (error) {
		resp.status(401).send('Error: failed to verify your Google account');
	}
	try {
		removeBooking(req.body.id, id);
	}
	catch (error) {
		resp.send('Error:', error);
		return;
	}
	resp.send('Successfully removed booking ' + req.body.id);
});

/* DEBUG: GET FULL STATE */
app.get('/all', function(req, resp) {
	var body = {'bookings': bookings, 'bookedTimes': bookedTimes, 'bookingnum': bookingnum, 'bookingpool': bookingpool, 'UserList': UserList};
	resp.send(body);
});

/* OTHERWISE */
app.get('*', function(req, resp) {
	resp.send('no');
});

app.listen(8080);