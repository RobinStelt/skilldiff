import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import type { MarketplaceApiClient } from "./api/client.js";
import type { AdminApiClient } from "./api/adminClient.js";
import { MarketplaceOverviewPage } from "./pages/MarketplaceOverviewPage.js";
import { SkillDetailPage } from "./pages/SkillDetailPage.js";
import { AdminLoginPage } from "./pages/AdminLoginPage.js";
import { AdminSkillsPage } from "./pages/AdminSkillsPage.js";
import { AdminSkillEditPage } from "./pages/AdminSkillEditPage.js";
import { PrivacyPage } from "./pages/PrivacyPage.js";
import { TermsPage } from "./pages/TermsPage.js";
import { ImpressumPage } from "./pages/ImpressumPage.js";
import { SiteFooter } from "./components/SiteFooter.js";
import { SiteHeader } from "./components/SiteHeader.js";

export function App({
  apiClient,
  adminApiClient,
}: {
  apiClient: MarketplaceApiClient;
  adminApiClient: AdminApiClient;
}) {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);

  return (
    <>
      <SiteHeader />
      <div id="main-content" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<MarketplaceOverviewPage apiClient={apiClient} />} />
          <Route path="/skills/:skillId" element={<SkillDetailPage apiClient={apiClient} />} />
          <Route path="/admin/login" element={<AdminLoginPage adminApiClient={adminApiClient} />} />
          <Route path="/admin/skills" element={<AdminSkillsPage adminApiClient={adminApiClient} />} />
          <Route
            path="/admin/skills/:skillId"
            element={<AdminSkillEditPage adminApiClient={adminApiClient} />}
          />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/impressum" element={<ImpressumPage />} />
        </Routes>
      </div>
      <SiteFooter />
    </>
  );
}
