const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

require('dotenv').config()

app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html')
});

app.use(bodyParser.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// User Schema
const userSchema = new mongoose.Schema({
    username: String,
    exercise: [{
        username: String,
        description: String,
        duration: Number,
        date: Date,
        _id: String
    }]
});

const User = mongoose.model('User', userSchema);

// POST /api/users - Create a new user
app.post('/api/users', async (req, res) => {
    const { username } = req.body;
    const newUser = new User({ username });
    await newUser.save();
    res.json({ username: newUser.username, _id: newUser._id });
});

// GET /api/users - Get all users
app.get('/api/users', async (req, res) => {
    const users = await User.find({}, { username: 1, _id: 1 });
    res.json(users);
});

// POST /api/users/:_id/exercise - Add an exercise to a user
app.post('/api/users/:_id/exercises', async (req, res) => {
    const { description, duration, date } = req.body;
    const userId = req.params._id;

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Create the exercise object
    const exercise = {
        description,
        duration: Number(duration), // Ensure duration is a number
        date: date ? new Date(date) : new Date() // Default to current date if no date provided
    };

    // Add the exercise to the user's exercise array
    user.exercise.push(exercise);

    // Save the updated user object
    await user.save();

    // Return the user object with the added exercise field
    res.json({
        username: user.username,
        description : description,
        duration: Number(duration), // Ensure duration is a number
        date: date ? new Date(date) : new Date(), // Default to current date if no date provided
        _id: user._id,
    });
});


// GET /api/users/:_id/logs - Retrieve a user's exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
    const userId = req.params._id;
    const { from, to, limit } = req.query;

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Filter the exercises based on query parameters
    let filteredLog = user.exercise;

    if (from) {
        const fromDate = new Date(from);
        filteredLog = filteredLog.filter(ex => new Date(ex.date) >= fromDate);
    }

    if (to) {
        const toDate = new Date(to);
        filteredLog = filteredLog.filter(ex => new Date(ex.date) <= toDate);
    }

    if (limit) {
        filteredLog = filteredLog.slice(0, Number(limit));
    }

    // Format the response
    const formattedLog = filteredLog.map(ex => ({
        description: ex.description,
        duration: ex.duration,
        date: new Date(ex.date).toDateString(),
    }));

    res.json({
        username: user.username,
        count: formattedLog.length,
        _id: user._id,
        log: formattedLog,
    });
});




const listener = app.listen(process.env.PORT || 3001, () => {
    console.log('Your app is listening on port ' + listener.address().port)
})
