const express = require('express');
const bs = require('./booksys');
const verify = require('./assets/verify');
//const testbk = require('./assets/testbk');
const compression = require('compression');

// wait until the booking system is initialised before continuing
while (!bs.ready) {
	continue;
}

// create default bookings to play with
/*try {
	testbk.addTestBookings();
}
catch (error) {
	// eslint-disable-next-line no-console
	console.log('Failed to create test bookings: ' + error);
}*/

// NODE SERVER
const app = express();

app.use(express.static('static'));
app.use(express.json());
app.use(compression());

/* GETTING BOOKINGS */
app.get('/bookings', async function(req, resp) {
	let user;
	let token = req.header('token');
	if (token) {
		try {
			user = await verify(token);
			user = user['sub'];
		}
		catch(error) {
			resp.status(401).send('Error: Failed to verify your Google account');
			return;
		}
	}
	resp.type('json').send(JSON.stringify(bs.getBookings(user), null, 4));
});

/* NEW BOOKING */
app.post('/bookings', async function(req, resp) {
	try {
		var user = await verify(req.header('token'));
	}
	catch (error) {
		resp.status(401).send('Error: Failed to verify your Google account');
		return;
	}
	try {
		bs.createBooking(req.body.date, req.body.stime, req.body.etime, req.body.name, user, req.body.recurrence);
	}
	catch(error) {
		resp.status(400).send('Error: failed to create your booking - ' + error);
		return;
	}
	resp.status(201).type('json').send(JSON.stringify(bs.getBookings(user['sub']), null, 4));
});

/* REMOVE BOOKING */
app.delete('/bookings', async function(req, resp) {
	try {
		let user = await verify(req.header('token'));
		var id = user['sub'];
	}
	catch (error) {
		resp.status(401).send('Error: failed to verify your Google account');
		return;
	}
	try {
		bs.removeBooking(req.body.id, id);
	}
	catch (error) {
		resp.status(400).send('Error: ' + error);
		return;
	}
	resp.status(204).send('Successfully removed booking ' + req.header('id'));
});

/* GET PERMS FOR A USER ACCOUNT */
app.get('/perms', async function(req, resp) {
	try {
		let user = await verify(req.header('token'));
		var id = user['sub'];
	}
	catch (error) {
		resp.status(401).send('Error: failed to verify your Google account');
		return;
	}
	resp.type('json').send(JSON.stringify({'perms': bs.getPerms(id)}, null, 4));
});

/* ADD OR UPDATE USER ENTRY */
app.post('/perms', async function(req, resp) {
	try {
		var user = await verify(req.header('token'));
	}
	catch (error) {
		resp.status(401).send('Error: Failed to verify your Google account');
		return;
	}
	try {
		bs.updateUser(user['sub'], req.body.id, req.body.perms);
	}
	catch (error) {
		resp.status(400).send('Error: Could not update user - ' + error);
		return;
	}
	resp.send('User successfully updated');
});

/* ADMIN: GET FULL STATE */
app.get('/all', async function(req, resp) {
	try {
		var user = await verify(req.header('token'));
	}
	catch (error) {
		resp.status(401).send('Error: failed to verify your Google account');
		return;
	}
	try {
		var struct = bs.getState(user['sub']);
	}
	catch (error) {
		resp.status(401).send('Error: ' + error);
		return;
	}
	resp.type('json').send(JSON.stringify(struct, null, 4));
});

/* OTHERWISE */
app.get('*', function(req, resp) {
	resp.status(404).send('404: No resource found at this location');
});

module.exports = app;