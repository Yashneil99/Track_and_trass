

module.exports = function (io) {
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("raiseRequest", async (data, callback) => {
      try {
        // Here: Save to PostgreSQL
        // const req = await db.query('INSERT INTO requests...');
        
        console.log("New Request Raised:", data);
        
        // Broadcast to ALL connected clients (Web + Android)
        io.emit("broadcastRequest", {
          id: Date.now(), // Use DB ID in production
          ...data,
          timestamp: new Date().toISOString()
        });

        callback({ status: 200, message: "Broadcasted successfully" });
      } catch (err) {
        callback({ status: 500, message: "Server error" });
      }
    });

    socket.on("disconnect", () => console.log("Client Disconnected"));
  });
};
