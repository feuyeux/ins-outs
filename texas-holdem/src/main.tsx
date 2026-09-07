import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
if (
  "serviceWorker" in navigator &&
  import.meta.env.PROD &&
  location.protocol !== "file:"
) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
