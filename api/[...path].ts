import type { IncomingMessage, ServerResponse } from "node:http";

type VercelRequest = IncomingMessage & { body?: unknown };
type VercelResponse = ServerResponse & { status: (code: number) => VercelResponse; json: (body: unknown) => void };

export default async function handler(req: VercelRequest, res: VercelResponse) {
	try {
		const { default: app } = await import("../server/server");
		return app(req, res);
	} catch (error) {
		console.error("API startup failed", error);
		return res.status(500).json({ error: "API startup failed." });
	}
}
