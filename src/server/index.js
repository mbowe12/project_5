const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const path = require("path");
const { JsonDB, Config } = require("node-json-db");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// start JSON DB
const db = new JsonDB(new Config("moodCritterDB", true, true, "/"));

// serve static files from public directory
app.use(express.static(path.join(__dirname, "../../public")));

// start DB with default structure
try {
  db.push("/interactions", []);
} catch (error) {
  console.log("DB already initialized");
}

// set initial mood state
let moodState = {
  level: 50,
  lastUpdate: Date.now(),
  recentInteractions: [],
  decayRate: 1, // Amount to decrease per minute
};

// mood decay interval
setInterval(() => {
  const now = Date.now();
  const minutesPassed = (now - moodState.lastUpdate) / (1000 * 60);

  // calculate mood level with decay
  const decayAmount = minutesPassed * moodState.decayRate;
  moodState.level = Math.max(0, moodState.level - decayAmount);
  moodState.lastUpdate = now;

  io.emit("moodUpdate", moodState);
}, 30000); // check every 30 seconds

// Socket.io connection handling
io.on("connection", async (socket) => {
  console.log("User connected");

  try {
    // Load recent interactions from DB when client connects
    const interactions = (await db.getData("/interactions")) || [];
    moodState.recentInteractions = interactions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);

    // send current mood state with recent interactions to new connections
    socket.emit("moodUpdate", moodState);
  } catch (error) {
    console.error("Error loading initial interactions:", error);
    socket.emit("moodUpdate", moodState);
  }

  // handle user interactions
  socket.on("interaction", async (action) => {
    try {
      const now = Date.now();
      const moodBefore = moodState.level;

      // update mood based on action
      switch (action) {
        case "feed":
          moodState.level = Math.min(100, moodState.level + 10);
          break;
        case "pet":
          moodState.level = Math.min(100, moodState.level + 5);
          break;
        case "gift":
          moodState.level = Math.min(100, moodState.level + 15);
          break;
      }

      // create new interaction object
      const interaction = {
        action,
        timestamp: now,
        moodBefore,
        moodAfter: moodState.level,
      };

      console.log("Saving interaction:", interaction);

      // update DB and recent interactions
      await db.push("/interactions[]", interaction);

      // verify data was saved
      const savedInteractions = await db.getData("/interactions");
      console.log("Current interactions in DB:", savedInteractions);

      // update recent interactions
      moodState.recentInteractions = savedInteractions
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5);

      moodState.lastUpdate = now;

      // log the state being sent
      console.log("Sending mood update:", moodState);
      io.emit("moodUpdate", moodState);
    } catch (error) {
      console.error("Error handling interaction:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// start server
httpServer.listen(3000, () => {
  console.log("Server running on port 3000");
});
