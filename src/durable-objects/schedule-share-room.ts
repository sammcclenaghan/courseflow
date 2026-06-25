import { DurableObject } from "cloudflare:workers";

export type ScheduleShareEvent =
	| {
			type: "schedule.updated";
			shareId: string;
			updatedAt: string;
	  }
	| {
			type: "schedule.deleted" | "schedule.share_revoked";
			shareId: string;
	  };

export class ScheduleShareRoom extends DurableObject<Cloudflare.Env> {
	async fetch(request: Request): Promise<Response> {
		const upgradeHeader = request.headers.get("Upgrade");
		if (upgradeHeader?.toLowerCase() !== "websocket") {
			return new Response("Expected Upgrade: websocket", { status: 426 });
		}

		const pair = new WebSocketPair();
		const client = pair[0];
		const server = pair[1];

		this.ctx.acceptWebSocket(server);

		return new Response(null, {
			status: 101,
			webSocket: client,
		});
	}

	broadcastUpdate(event: ScheduleShareEvent): number {
		const message = JSON.stringify(event);
		let sent = 0;

		for (const socket of this.ctx.getWebSockets()) {
			try {
				socket.send(message);
				sent += 1;
			} catch (error) {
				console.warn("Failed to send shared schedule update", {
					shareId: event.shareId,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		return sent;
	}

	webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): void {
		if (message === "ping") {
			socket.send("pong");
		}
	}

	webSocketClose(
		socket: WebSocket,
		code: number,
		reason: string,
		_wasClean: boolean,
	): void {
		socket.close(code, reason);
	}
}
