require('dotenv').config();
const express = require("express")
const app = express();
const cors = require("cors");
const mongoose = require('mongoose')
const bodyParser = require('body-parser');
const Schema = mongoose.Schema;

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

mongoose.connect(process.env.MONGO_URI, {

  useNewUrlParser: true,
  useUnifiedTopology: true

});

// Tipos

const userSchema = new Schema({
  username: {
    type: String,
    required: true
  }
})

const db = mongoose.connection;

const exerciseSchema = new Schema({
  userId: {type: mongoose.Schema.Types.ObjectId, ref: 'user'},
  description: String,
  duration: Number,
  date: Date
})

const User = mongoose.model('User', userSchema)
const Exercise = mongoose.model('Exercise', exerciseSchema)

// Testando conexão

db.on('Error', (err) => {
  console.log("error")
})

db.once('open', () => {
  console.log("We're so on")
})

app.post("/api/users", async (req, res) => {

  const user = new User({username: req.body.username});
  const savedUser = await user.save();

  res.json({username: savedUser.username, _id: savedUser._id})

})


app.get("/api/users", async (req, res) => {

  const users = await User.find({});
  res.json(users);

})

app.post('/api/users/:_id/exercises', async (req, res) => {

  const {description, duration, date} = req.body;
  const user = await User.findById(req.params._id);

  if(!user) return res.status(404).send('User not found');

  const exercise = new Exercise({
    userId: user._id,
    description,
    duration: parseInt(duration),
    date: date ? new Date(date): new Date(),
  })

  const savedExercise = await exercise.save();


  res.json({
    _id: user._id,
    username: user.username,
    date: savedExercise.date.toDateString(),
    duration: savedExercise.duration,
    description: savedExercise.description,
  })
})

app.get('/api/users/:_id/logs', async (req, res) => {
  const { from, to, limit } = req.query;
  const { _id } = req.params;

  try {
    const user = await User.findById(_id);
    if (!user) return res.status(404).send('User not found');

    let filter = { userId: _id };

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    let query = Exercise.find(filter).select('description duration date');
    if (limit) query = query.limit(parseInt(limit));

    const exercises = await query.exec();

    const log = exercises.map((e) => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString(),
    }));

    res.json({
      username: user.username,
      count: log.length,
      _id: user._id,
      log,
    });

  } catch (err) {
    res.status(500).send('Server error');
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {

  console.log('Your app is listening on the following port:' + listener.address().port)

})