import "@fontsource-variable/inter";
import "./styles.css";
import { render } from "preact";
import { App } from "./App.tsx";

const root = document.getElementById("app");
if (!root) throw new Error("index.html is missing #app");

render(<App />, root);
