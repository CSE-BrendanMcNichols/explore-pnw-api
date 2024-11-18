const express = require('express');
const cors = require('cors');
const path = require('path');
const Joi = require('joi');
const destinations = require('./destinations');

const app = express();
const PORT = process.env.PORT || 3000;

const schedules = [
  { destination: 'Space Needle, WA', date: '2024-09-15', time: '10:00 AM' },
  { destination: 'Olympic National Park, WA', date: '2024-09-16', time: '2:00 PM' },
];

const scheduleSchema = Joi.object({
  destination: Joi.string().min(3).required(),
  date: Joi.string().required(),
  time: Joi.string().required(),
});

app.use(cors());
app.use(express.json());
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(express.static('public'));

app.get('/api/destinations', (req, res) => {
  res.json(destinations);
});

app.get('/api/schedule', (req, res) => {
  res.json(schedules);
});

app.post('/api/schedule', (req, res) => {
  const { error } = scheduleSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const newSchedule = req.body;
  schedules.push(newSchedule);
  res.status(201).json({ message: 'Schedule added successfully', data: newSchedule });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
