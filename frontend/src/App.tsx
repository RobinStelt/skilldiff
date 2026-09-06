import { Route, Routes } from "react-router-dom";
import type { MarketplaceApiClient } from "./api/client.js";
import type { AdminApiClient } from "./api/adminClient.js";
import { MarketplaceOverviewPage } from "./pages/MarketplaceOverviewPage.js";
import { SkillDetailPage } from "./pages/SkillDetailPage.js";
import { AdminLoginPage } from "./pages/AdminLoginPage.js";
import { AdminSkillsPage } from "./pages/AdminSkillsPage.js";
import { AdminSkillEditPage } from "./pages/AdminSkillEditPage.js";
import { PrivacyPage } from "./pages/PrivacyPage.js";
import { TermsPage } from "./pages/TermsPage.js";
import { SiteFooter } from "./components/SiteFooter.js";

export function App({
  apiClient,
  adminApiClient,
}: {
  apiClient: MarketplaceApiClient;
  adminApiClient: AdminApiClient;
}) {
  return (
    <>
      <Routes>
        <Route path="/" element={<MarketplaceOverviewPage apiClient={apiClient} />} />
        <Route path="/skills/:skillId" element={<SkillDetailPage apiClient={apiClient} />} />
        <Route path="/admin/login" element={<AdminLoginPage adminApiClient={adminApiClient} />} />
        <Route path="/admin/skills" element={<AdminSkillsPage adminApiClient={adminApiClient} />} />
        <Route path="/admin/skills/:skillId" element={<AdminSkillEditPage adminApiClient={adminApiClient} />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
      </Routes>
      <SiteFooter />
    </>
  );
}
