# Reviewed skill catalog seed

`seed-skill-metadata.json` contains metadata for the three skills identified in
`../../07-vorbefuellung-methodik-batch1.md`. Repository URLs, owners, licenses,
and star counts were checked against the GitHub REST repository API on
2026-09-06; timestamps accompany the counts. Descriptions are concise editorial
summaries, not claims about measured performance. A license that GitHub cannot
identify is stored as `null`.

With the usual backend environment configured, import the snapshot using:

```sh
npx tsx scripts/import-skill-metadata.ts
```

The import is transactional and preserves existing catalog entries, including
admin edits. It creates neither accounts nor measurement records. Run
`scripts/refresh-github-stars.ts` separately to refresh counts from GitHub.
