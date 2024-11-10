// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const destinations = require('./destinations');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); // Enable CORS for cross-origin requests
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(express.static('public'));

// API endpoint to fetch destinations data
app.get('/api/destinations', (req, res) => {
  res.json(destinations);
});

// Serve the index.html for API instructions
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
