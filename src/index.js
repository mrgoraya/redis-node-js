import dotenv from "dotenv";
dotenv.config();

import express from "express";
import fetch from "node-fetch";
import redis from "redis";

import { setResponse } from "./setResponse.js";

const { PORT, REDIS_PORT } = process.env;

const client = redis.createClient({
  legacyMode: true,
  REDIS_PORT,
});
client.connect().catch((error) => {
  console.error(error);
});
client.on("connect", () => {
  console.log("connected");
});

const app = express();

// Make request to Github for repos
const getRepos = async (req, res, next) => {
  try {
    console.log("Fetching data from github api...");

    const { username } = req.params;

    const response = await fetch(`https://api.github.com/users/${username}`);
    const data = await response.json();

    const repos = data.public_repos;

    // Set data key to Redis
    client.setEx(username, 3600, repos);

    res.send(setResponse(username, repos));
  } catch (error) {
    console.error(error);
    res.status(500);
  }
};

// Cache middleware
const cache = (req, res, next) => {
  const { username } = req.params;

  client.get(username, (error, data) => {
    if (error) throw error;

    if (data != null) {
      res.send(setResponse(username, data));
    } else {
      next();
    }
  });
};

app.get("/repos/:username", cache, getRepos);

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
