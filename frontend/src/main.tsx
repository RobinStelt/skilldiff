import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App.js";
import { createMockApiClient } from "./api/mockClient.js";
import { fixtureSkills } from "./api/fixtures.js";
import "./styles.css";

// TODO(Phase 3 dependency): swap for createHttpApiClient(BACKEND_URL) once
// the backend exposes the endpoints documented in README.md, section
// "Backend gap". Fixture data lets the frontend be fully built and
// reviewed today instead of blocking on the backend HTTP layer.
const apiClient = createMockApiClient(fixtureSkills);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App apiClient={apiClient} />
    </BrowserRouter>
  </React.StrictMode>,
);
