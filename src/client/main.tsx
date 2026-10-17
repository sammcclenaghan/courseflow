import { render } from "preact";
import { health } from "./health.ts";

function App() {
	const h = health.value;
	if (h.kind === "loading") return <p>Checking API…</p>;
	if (h.kind === "error") return <p>API unreachable: {h.reason}</p>;
	return <h1>{h.message}</h1>;
}

const root = document.getElementById("app");
if (!root) throw new Error("index.html is missing #app");

render(<App />, root);
