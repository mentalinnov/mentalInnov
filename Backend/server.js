const express = require("express");
const app = express();
require("dotenv").config();

// enable parsing on request bodies
app.use(express.json());

const watsonRoutes = require("./routes/api/watson");
app.use("/api/watson", watsonRoutes);

// start server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log("Server started on port: ",port);
});