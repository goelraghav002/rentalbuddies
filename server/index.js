import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import listingRoutes from "./routes/listing.routes.js";
import connectToMongoDB from "./db/connectToMongodb.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/listing", listingRoutes);

app.get("/", (req, res) => {
    res.send("<h1>Hello World</h1>")
})

app.listen(PORT, () => {
  connectToMongoDB();
  console.log(`Server running on: http://localhost:${PORT}`);
});