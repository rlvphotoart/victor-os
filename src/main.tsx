import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "@fontsource-variable/inter/wght.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "./styles.css";
import "./redesign.css";

registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
