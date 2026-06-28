import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScheduleSharePanel } from "@/components/scheduler/schedule-share-panel";
import {
	getMyScheduleShare,
	regenerateMyScheduleShare,
} from "@/utils/sharing.functions";

vi.mock("@/utils/sharing.functions", () => ({
	createMyScheduleShare: vi.fn(),
	getMyScheduleShare: vi.fn(async () => null),
	regenerateMyScheduleShare: vi.fn(),
	revokeMyScheduleShare: vi.fn(),
}));

const share = {
	shareId: "share_123",
	term: "202609",
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

function renderPanel() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
		},
	});

	return render(
		<QueryClientProvider client={queryClient}>
			<div>
				<ScheduleSharePanel term="202609" disabled={false} />
				<button type="button">Calendar area</button>
			</div>
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	vi.mocked(getMyScheduleShare).mockResolvedValue(null);
	Object.defineProperty(navigator, "clipboard", {
		configurable: true,
		value: {
			writeText: vi.fn(async () => undefined),
		},
	});
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	vi.useRealTimers();
});

describe("ScheduleSharePanel", () => {
	it("dismisses the share card when the user clicks elsewhere in the app", async () => {
		renderPanel();

		fireEvent.click(screen.getByRole("button", { name: "Share" }));
		expect(await screen.findByText("Share schedule")).not.toBeNull();

		fireEvent.pointerDown(
			screen.getByRole("button", { name: "Calendar area" }),
		);

		expect(screen.queryByText("Share schedule")).toBeNull();
	});

	it("briefly shows copied feedback on the copy button", async () => {
		vi.mocked(getMyScheduleShare).mockResolvedValue(share);
		renderPanel();

		fireEvent.click(screen.getByRole("button", { name: "Share" }));
		fireEvent.click(await screen.findByRole("button", { name: "Copy link" }));

		expect(
			await screen.findByRole("button", { name: "Copied!" }),
		).not.toBeNull();
		expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
			expect.stringContaining("/share/share_123"),
		);
	});

	it("spins the regenerate icon while regenerating", async () => {
		vi.mocked(getMyScheduleShare).mockResolvedValue(share);
		let finishRegenerate: (next: typeof share) => void = () => {};
		vi.mocked(regenerateMyScheduleShare).mockImplementation(
			() =>
				new Promise((resolve) => {
					finishRegenerate = resolve;
				}),
		);
		renderPanel();

		fireEvent.click(screen.getByRole("button", { name: "Share" }));
		const regenerateButton = await screen.findByRole("button", {
			name: "Regenerate link",
		});
		fireEvent.click(regenerateButton);

		expect(
			regenerateButton.querySelector("svg")?.getAttribute("class"),
		).toContain("animate-spin");

		finishRegenerate({ ...share, shareId: "share_456" });
		await waitFor(() =>
			expect(regenerateButton.hasAttribute("disabled")).toBe(false),
		);
	});
});
