import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { iniciarTema } from "./lib/theme.js";

iniciarTema();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
