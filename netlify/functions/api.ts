import serverless from "serverless-http";
import app from "../../server/server";

export const handler = serverless(app);
