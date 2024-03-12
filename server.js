import router from './routes/index';

const express = require('express');

const app = express();
const PORT = process.env.PORT || 5000;

// Load routes from routes/index.js
router(app);

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});