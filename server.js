require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const path    = require("path");

const authRoutes = require("./server/authRoutes");
const apiRoutes  = require("./server/apiRoutes");

const app = express();

app.set("trust proxy", 1);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use("/auth", authRoutes);
app.use("/api",  apiRoutes);

app.get(/.*/, (_req, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Sunucu hatası." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀  Study Tracker  →  http://localhost:${PORT}`)
);
