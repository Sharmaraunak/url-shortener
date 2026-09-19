import express from "express";

import { decodeBase62, encodeBase62 } from "./utils/base62.js";
import { pool } from "./db/index.js";
import cors from "cors";

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
    const id = decodeBase62(shortCode);
    const result = await pool.query("select long_url from urls where id=$1", [
      id,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "URl not found",
      });
    }
    const url = result.rows[0].long_url;
    return res.redirect(url);
  } catch (e) {
    console.error("Operation failed", e);
    return res.status(404).json({
      error: "URl not found",
    });
  }
});



app.post("/urls", async (_req, res) => {
  // get the url from the request
  const url = _req.body.url;

  // insert it into db
  const result = await pool.query(
    `insert into urls (long_url) values ($1) returning id`,
    [url],
  );

  const id = result.rows[0].id;

  // encode the urls
  const encodedUrl = encodeBase62(id);

  return res.status(201).json({
    short_code: encodedUrl,
    short_url: `${BASE_URL}/${encodedUrl}`,
    long_url: url,
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
