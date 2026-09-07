// Mirrors ../../../IMPRESSUM.md — kept in sync manually (see PrivacyPage.tsx for why).
export function ImpressumPage() {
  return (
    <main className="legal-page">
      <p className="legal-page__draft-notice">
        <strong>Draft — keine Rechtsberatung.</strong> Diese Angaben sollten von einer qualifizierten Person
        (Anwalt/Anwältin für IT-/Medienrecht) geprüft werden, bevor dieses Angebot öffentlich beworben wird —
        insbesondere ob für ein nicht-kommerzielles Community-Tool wie dieses weitere Pflichten bestehen (z. B. nach
        § 18 Abs. 2 Medienstaatsvertrag, falls die redaktionell gepflegten Skill-Metadaten als
        journalistisch-redaktioneller Inhalt gelten könnten — hier bewusst nicht abschließend beurteilt).
      </p>

      <h1>Impressum</h1>
      <p className="legal-page__meta">Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG, vormals § 5 TMG).</p>

      <h2>Angaben zum Betreiber</h2>
      <p>
        Robin Steltmann
        <br />
        Schulstraße 13
        <br />
        34479 Breuna
        <br />
        Deutschland
      </p>

      <h2>Kontakt</h2>
      <p>E-Mail: robin.steltmann@googlemail.com</p>

      <h2>Verantwortlich für den Inhalt</h2>
      <p>Robin Steltmann (Anschrift wie oben).</p>

      <h2>Haftungshinweis</h2>
      <p>
        Dieses Projekt (SkillDiff) ist ein unabhängiges, nicht-kommerzielles Mess-Tool für Claude-Code-Skills. Für die
        inhaltliche Richtigkeit der von Mitwirkenden hochgeladenen Messdaten sowie der von Administratoren gepflegten
        Katalog-Metadaten (Name, Lizenz, Maintainer, GitHub-Link) wird keine Gewähr übernommen; siehe{" "}
        <a href="/terms">Terms of Use</a>, Abschnitt „No warranty on skill quality".
      </p>

      <h2>Streitschlichtung</h2>
      <p>
        Prüfen: Bei einem rein nicht-kommerziellen Community-Tool ohne Verbraucherverträge entfällt die Pflicht zum
        Hinweis auf die OS-Plattform der EU (Art. 14 ODR-VO) und zur Teilnahme an einer Verbraucherschlichtungsstelle
        vermutlich — das sollte aber von einer qualifizierten Person bestätigt werden, bevor dieser Abschnitt entfällt
        oder ergänzt wird.
      </p>
    </main>
  );
}
