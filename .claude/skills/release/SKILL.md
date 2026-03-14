---
name: release
description: Release a new version of pig. Verifies tests, checks changelog, bumps version in package.json, commits, builds a self-contained JS bundle, creates a GitHub release, and updates the Homebrew tap.
---

# pig Release Skill

Full release lifecycle for the `pig` project at `personal/pig/`.

## Steps

Work through these in order. Stop and tell the user if any step fails.

### 1. Confirm version

Ask the user what the new version number is if they have not already provided it (e.g. `0.1.1`). Call it `NEW_VERSION` throughout.

### 2. Run tests

```sh
cd /Users/joe/WebDev/personal/pig && pnpm test
```

All tests must pass. If any fail, stop and report — do not proceed.

### 3. Verify changelog is ready

Read `docs/changelog.html`. Check that:
- There is a release entry with `release-version` matching `v{NEW_VERSION}`
- The entry has a date set (not a placeholder)
- It has at least one `change-group` with actual content

If the changelog entry is missing or incomplete, tell the user what needs to be added and stop. The changelog must be written before shipping — it becomes the source of truth for the GitHub release notes.

### 4. Bump version in package.json

Edit `package.json`, changing the `version` field to `NEW_VERSION`.

### 5. Commit

Stage only the release files:

```sh
git add package.json docs/changelog.html docs/index.html docs/docs.html
git status --short  # confirm only expected files are staged
```

Write a concise commit message: `Bump to v{NEW_VERSION}: <one-line summary>` followed by a bullet-point body drawn from the changelog entry.

Commit and push in the same shell to keep the SSH agent available:
```sh
eval $(ssh-agent -s) && ssh-add --apple-load-keychain 2>/dev/null && git commit -m "..." && git push origin main
```

### 6. Build bundle

```sh
cd /Users/joe/WebDev/personal/pig && pnpm build
```

This produces `dist/index.js` — a single self-contained ESM bundle with shebang, all deps inlined, targeting Node 22.

Create the tarball:
```sh
mkdir -p /tmp/pig-release
cp dist/index.js /tmp/pig-release/pig
chmod +x /tmp/pig-release/pig
cd /tmp && tar -czf pig-{NEW_VERSION}.tar.gz -C pig-release pig
shasum -a 256 /tmp/pig-{NEW_VERSION}.tar.gz
```

Record the SHA256 — you will need it for steps 8 and 9.

### 7. Extract release notes from docs/changelog.html

Read the `v{NEW_VERSION}` entry from `docs/changelog.html` and convert it to markdown for the GitHub release body:

- Use the `<h2>` inside the entry as the first line
- Each `change-group-label` becomes a `##` heading
- Each `<li>` becomes a bullet, with any `.tag` span rendered as a bold label e.g. `**fix**`
- Strip all HTML tags from the text

### 8. Create GitHub release

```sh
gh release create v{NEW_VERSION} /tmp/pig-{NEW_VERSION}.tar.gz \
  --repo joeinnes/pig \
  --title "v{NEW_VERSION}" \
  --notes "<markdown release notes from step 7>"
```

Clean up:
```sh
rm -rf /tmp/pig-release /tmp/pig-{NEW_VERSION}.tar.gz
```

### 9. Update Homebrew tap

Get the current formula file SHA:
```sh
gh api repos/joeinnes/homebrew-tap/contents/Formula/pig.rb --jq '.sha'
```

Build the new formula:

```ruby
class Pig < Formula
  desc "PNPM Interactive Groomer — manage package versions across pnpm projects"
  homepage "https://github.com/joeinnes/pig"
  url "https://github.com/joeinnes/pig/releases/download/v{NEW_VERSION}/pig-{NEW_VERSION}.tar.gz"
  sha256 "<sha256 from step 6>"
  version "{NEW_VERSION}"
  license "MIT"

  depends_on "node@22"

  def install
    bin.install "pig"
  end

  test do
    assert_match "pig", shell_output("#{bin}/pig --version")
  end
end
```

Push via the GitHub API:
```sh
gh api --method PUT repos/joeinnes/homebrew-tap/contents/Formula/pig.rb \
  --field message="pig {NEW_VERSION}" \
  --field content="<base64-encoded formula>" \
  --field sha="<sha from above>"
```

### 10. Done

Confirm both destinations are updated:
- GitHub release: `https://github.com/joeinnes/pig/releases/tag/v{NEW_VERSION}`
- Homebrew: `joeinnes/homebrew-tap` Formula/pig.rb

Run `say` to announce completion.
