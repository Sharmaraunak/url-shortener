import express from "express";

import { encodeBase62 } from "./utils/base62.js";
import { pool } from "./db/index.js";


const app = express();

app.disable("x-powered-by");

app.use(express.json());

app.get("/health", async (_req, res) => {
  const result = await pool.query("select now()");
  res.json({
    status: "ok",
    database_time: result.rows[0].now,
  });
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`server is running on ${PORT}`);
});


//testing whether my encode function works or not.
console.log(encodeBase62(0));
console.log(encodeBase62(10));
console.log(encodeBase62(61));
console.log(encodeBase62(62));
console.log(encodeBase62(125));
