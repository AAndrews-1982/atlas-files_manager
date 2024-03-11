// utils/db.js
const { MongoClient } = require('mongodb');

class DBClient {
  constructor() {
    // Environment variables or default values
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';

    // MongoDB URI and client
    const uri = `mongodb://${host}:${port}/${database}`;
    this.client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

    // Connecting to MongoDB
    this.client.connect()
      .then(() => {
        this.db = this.client.db(database);
        console.log('Successfully connected to MongoDB');
      })
      .catch((err) => console.error(`MongoDB Connection Error: ${err}`));
  }

  // Check if the MongoDB connection is alive
  isAlive() {
    return !!this.client && !!this.client.topology && this.client.topology.isConnected();
  }

  // Get the number of documents in the users collection
  nbUsers() {
    return this.db.collection('users').countDocuments();
  }

  // Get the number of documents in the files collection
  nbFiles() {
    return this.db.collection('files').countDocuments();
  }
}

// Create and export an instance of DBClient
const dbClient = new DBClient();
module.exports = dbClient;
