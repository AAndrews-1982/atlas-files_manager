import express from 'express'
import controllerRouting from './routes/index';

const PORT = process.env.PORT || 5000;
const app = express();

// Load routes from routes/index.js
app.use(express.json);

controllerRouting(app);

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});