import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App.js";
import { createHttpApiClient } from "./api/client.js";
import { createAdminApiClient } from "./api/adminClient.js";
import "./styles.css";

// Backend (Phase 3) now serves the /api/* contract this app was built
// against (backend/src/api/publicApi.ts) — see ../README.md. Set
// VITE_BACKEND_URL in .env for anything other than the local default.
const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3000";
const apiClient = createHttpApiClient(backendUrl);
const adminApiClient = createAdminApiClient(backendUrl);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App apiClient={apiClient} adminApiClient={adminApiClient} />
    </BrowserRouter>
  </React.StrictMode>,
);
