import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.VITE_HERE_API_KEY;
if (!API_KEY) {
  console.error("Missing HERE_API_KEY in server/.env");
  process.exit(1);
}

const HERE = {
  ROUTING: "https://router.hereapi.com/v8/routes",
  AUTOSUGGEST: "https://autosuggest.search.hereapi.com/v1/autosuggest",
  GEOCODE: "https://geocode.search.hereapi.com/v1/geocode",
};

// proxy: car route
app.get("/api/route", async (req, res) => {
  try {
    const { origin, destination } = req.query;
    if (!origin || !destination) {
      return res.status(400).json({ error: "origin and destination are required" });
    }
    const url = new URL(HERE.ROUTING);
    url.searchParams.set("transportMode", "car");
    url.searchParams.set("origin", origin);
    url.searchParams.set("destination", destination);
    url.searchParams.set("return", "polyline,summary");
    url.searchParams.set("departureTime", "now");
    url.searchParams.set("apiKey", API_KEY);

    const r = await fetch(url);
    const j = await r.json();
    return res.status(r.status).json(j);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// proxy: autosuggest
app.get("/api/autosuggest", async (req, res) => {
  try {
    const { q, at, limit = "8", lang = "he" } = req.query;
    if (!q || !at) {
      return res.status(400).json({ error: "q and at are required" });
    }
    const url = new URL(HERE.AUTOSUGGEST);
    url.searchParams.set("q", q);
    url.searchParams.set("at", at);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("lang", String(lang));
    url.searchParams.set("apiKey", API_KEY);

    const r = await fetch(url);
    const j = await r.json();
    return res.status(r.status).json(j);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// proxy: geocode (חיפוש כתובת מלאה)
app.get("/api/geocode", async (req, res) => {
  try {
    const { q, lang = "he" } = req.query;
    if (!q) return res.status(400).json({ error: "q is required" });
    const url = new URL(HERE.GEOCODE);
    url.searchParams.set("q", q);
    url.searchParams.set("lang", String(lang));
    url.searchParams.set("apiKey", API_KEY);

    const r = await fetch(url);
    const j = await r.json();
    return res.status(r.status).json(j);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

const PORT = Number(process.env.PORT || 8787);
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
