import express from "express";

import { generateShortCodes } from "./utils/base62.js";
import { pool } from "./db/index.js";
import cors from "cors";
import { DatabaseError } from "pg";
import { normalizeUrl, ValidationError } from "./utils/normalize-url.js";


const BASE_URL = process.env.BASE_URL;


const app = express();

app.disable("x-powered-by");

app.use(express.json());

app.use(
  cors({
    origin: "https://localhost:5173",
  }),
);

app.get("/health", async (_req, res) => {
  const result = await pool.query("select now()");
  res.json({
    status: "ok",
    database_time: result.rows[0].now,
  });
});


app.get("/:shortcode", async (_req, res) => {
  //get short code from param
  const shortCode = _req.params.shortcode;

  try {
    const result = await pool.query(
      "select long_url from urls where short_code=$1",
      [shortCode],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "URl not found",
      });
    }
    const url = result.rows[0].long_url;
    return res.redirect(url);
  } catch (e) {
    if (e instanceof DatabaseError) {
      return res.status(500).json({
        error: "Internal server error",
      });
    }

    console.error("Operation failed", e);
    return res.status(404).json({
      error: "URl not found",
    });
  }
});



app.post("/urls", async (_req, res) => {
  // get the url from the request
  let url;
  try {
    url = normalizeUrl(_req.body.url);
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        error: error?.message,
      });
    }
    throw error;
  }

  let retries = 0;

  while (retries < 5) {
    try {
      //generate random code
      const shortCode = generateShortCodes(8);
      await pool.query(
        `insert into urls (short_code, long_url) values ($1, $2)`,
        [shortCode, url],
      );
      return res.status(201).json({
        short_code: shortCode,
        short_url: `${BASE_URL}/${shortCode}`,
        long_url: url,
      });
    } catch (error: unknown) {
      if (
        error instanceof DatabaseError &&
        error?.code === "23505" &&
        error?.constraint === "urls_short_code_key"
      ) {
        retries += 1;
        continue;
      }
      console.error("Maximum retry count of 5 reached.");
      throw error;
    }
  }
  res.status(500).json({
    error: "failed to create url",
  });
});







const PORT = 3000;

app.listen(PORT, () => {
  console.log(`server is running on ${BASE_URL}`);
});





//testing whether my encode function works or not.
// console.log(encodeBase62(0));
// console.log(encodeBase62(10));
// console.log(encodeBase62(61));
// console.log(encodeBase62(62));
// console.log(encodeBase62(125));

// console.log(generateRandomCodes(8));
// console.log(generateRandomCodes(8));
// console.log(generateRandomCodes(8));
// console.log(generateRandomCodes(8));
// console.log(generateRandomCodes(8));
// console.log(generateRandomCodes(8));
// console.log(generateRandomCodes(8));
// console.log(generateRandomCodes(8));
// console.log(generateRandomCodes(8));
