import { render } from "preact";
import { catalog } from "./catalog.ts";
import { health } from "./health.ts";

function App() {
  const h = health.value;
  const c = catalog.value;
  return (
    <>
      <p>
        {h.kind === "loading" && "Checking API…"}
        {h.kind === "error" && `API unreachable: ${h.reason}`}
        {h.kind === "ok" && h.data.message}
      </p>
      <p>
        {c.kind === "loading" && "Loading catalog…"}
        {c.kind === "error" && `Catalog failed to load: ${c.reason}`}
        {c.kind === "ok" &&
          `${c.data.courses.length.toLocaleString()} courses loaded for ${c.data.term}`}
      </p>
    </>
  );
}

const root = document.getElementById("app");
if (!root) throw new Error("index.html is missing #app");

render(<App />, root);
