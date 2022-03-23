const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const corsOptions = {
    "origin": "*",
    optionsSuccessStatus: 200
}
//middlewares
app.use(cors(corsOptions));

// enable parsing on request bodies
app.use(express.json());

const watsonRoutes = require("./routes/api/watson");
app.use("/api/watson", watsonRoutes);

// start server
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log("Server started on port: ",port);
});
