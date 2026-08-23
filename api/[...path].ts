import serverless from "serverless-http";
import app from "../server/server";

export default serverless(app);
