import { Route, Routes } from "react-router-dom";
import type { MarketplaceApiClient } from "./api/client.js";
import { MarketplaceOverviewPage } from "./pages/MarketplaceOverviewPage.js";
import { SkillDetailPage } from "./pages/SkillDetailPage.js";

export function App({ apiClient }: { apiClient: MarketplaceApiClient }) {
  return (
    <Routes>
      <Route path="/" element={<MarketplaceOverviewPage apiClient={apiClient} />} />
      <Route path="/skills/:skillId" element={<SkillDetailPage apiClient={apiClient} />} />
    </Routes>
  );
}
