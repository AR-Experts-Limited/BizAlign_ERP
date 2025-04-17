// sseService.js
let clientsMap = new Map();

// SSE endpoint to register clients
const registerClient = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const dbName = req.db; // Assume req.db contains the database name

  if (!clientsMap.has(dbName)) {
    clientsMap.set(dbName, []);
  }

  // Add client to the corresponding database group
  clientsMap.get(dbName).push(res);

  console.log(`Client connected to ${dbName}`);

  // Cleanup when client disconnects
  res.on('close', () => {
    clientsMap.set(
      dbName,
      clientsMap.get(dbName).filter(client => client !== res)
    );

    // Remove empty db entries
    if (clientsMap.get(dbName).length === 0) {
      clientsMap.delete(dbName);
    }
  });
};

// Helper function to send updates to clients of a specific db
const sendToClients = (db, data) => {
  if (clientsMap.has(db)) {
    clientsMap.get(db).forEach(client => {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    });
  }
};

module.exports = { registerClient, sendToClients };

