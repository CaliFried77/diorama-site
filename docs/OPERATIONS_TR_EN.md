# Repository & Cloudflare Operations | Depo ve Cloudflare İşletim Rehberi

**Last reviewed / Son inceleme:** 16 November 2026  
**Source of truth / Tek kaynak dal:** `migration/cloudflare-pages`

---

# Türkçe

## 1. GitHub düzeni

### Ana dal politikası
- Uzun ömürlü tek geliştirme ve yayın dalı: `migration/cloudflare-pages`. Bu dal GitHub varsayılan dalıdır.
- Her iş için kısa ömürlü bir `feature/*`, `fix/*` veya `chore/*` dalı açılır.
- Pull request'lerin hedefi yalnızca `migration/cloudflare-pages` olmalıdır.
- PR birleştirildikten sonra çalışma dalı silinir. Açık PR varken dal silinmez.
- `main`, eski Netlify yayını için geri dönüş noktası olarak belgelenmiştir. Netlify geri dönüşü ve özel alan adı kullanımı doğrulanmadan silinmemelidir.

### Mevcut temizlik durumu
- PR #1, #2 ve #6 birleştirildi.
- PR #3 ve #4, daha kapsamlı çalışmalar tarafından geçersiz kılındığı için kapatıldı.
- PR #5, PR #6'nın birleştirilmiş modüler yapısı ve güncel rehberinden sonra tekrara düştüğü için kapatıldı.
- PR #7 yağmur ormanı/papağan görsel çalışmasıdır; inceleme ve CI düzeltmesi tamamlanana kadar açık kalmalıdır.
- Birleştirilmiş veya geçersiz kılınmış PR'lara ait geçici branch'ler, `migration/cloudflare-pages` üzerinde gerekli kodun bulunduğu doğrulandıktan sonra silinebilir.
- `main` dalı yalnızca Netlify geri dönüşü gerçekten artık gerekmiyorsa kaldırılmalıdır.

### Branch koruması
GitHub branch listesindeki tüm dallar `protected: false` olarak dönüyordu. Üretim dalı için GitHub Settings → Branches bölümünde:
1. `migration/cloudflare-pages` için branch protection/ruleset etkinleştir.
2. Doğrudan push ve force-push'ı kapat.
3. Pull request zorunluluğu koy.
4. Quality gate başarılı olmadan merge'e izin verme.
5. Varsayılan dalın silinmesini engelle.

## 2. Cloudflare mimarisi — Pages değil, Workers Static Assets

Depodaki `wrangler.toml` klasik bir Cloudflare Pages projesi değil, **Cloudflare Worker + Static Assets** yapılandırması tanımlıyor:

| Ayar | Depodaki değer |
|---|---|
| Worker adı | `diorama-site` |
| Worker giriş dosyası | `cloudflare/worker.mjs` |
| Statik build çıktısı | `dist/` |
| Statik dosya binding'i | `ASSETS` |
| Worker öncelikli yollar | `/api/*` |
| SPA fallback | `single-page-application` |
| workers.dev | Etkin |
| Wrangler CLI | `4.162.0` |

Bu nedenle Cloudflare kontrol panelinde proje **Workers & Pages → Workers → diorama-site** altında yönetilmelidir. Pages projesi varmış gibi ikinci bir deployment oluşturma.

### Rate limit binding'leri
`wrangler.toml` iki ayrı rate-limit binding tanımlar:
- `NEWS_RATE_LIMITER`: namespace `271120261501`, 60 saniyede 40 istek.
- `CUSTOM_NEWS_RATE_LIMITER`: namespace `271120261502`, 60 saniyede 40 istek.

Bunlar Cloudflare hesabında gerçekten var olan namespace'lerle eşleşmelidir. Dashboard'da doğrulamadan silme veya yeniden oluşturma.

## 3. Cloudflare Dashboard kontrol listesi

Workers Builds kullanılıyorsa Overview → Worker → Settings → Build → Branch control altında production branch `migration/cloudflare-pages` olarak seçilmelidir. Preview builds açık olduğunda production dışındaki branch'lere yapılan her push preview build oluşturabilir. Temizlik süresince bu özelliği kapalı tut; yalnızca bilinçli olarak PR preview URL'lerine ihtiyaç duyduğunda aç. Production deploy'un tek bir sahibi olmalı: Workers Builds deploy yapıyorsa GitHub Actions yalnızca kalite kontrolleri ve Wrangler dry-run çalıştırmalıdır.

Aşağıdaki hesap düzeyi ayarlar yalnızca depo dosyalarından doğrulanamaz; Cloudflare hesabında tek tek kontrol edilmelidir:

- GitHub bağlantısı `CaliFried77/diorama-site` deposunu gösteriyor mu?
- Production branch `migration/cloudflare-pages` mi?
- Build command `npm run build` mi?
- Deploy command `npx --yes wrangler@4.162.0 deploy` mı?
- Worker adı `diorama-site` mı?
- `ASSETS`, `NEWS_RATE_LIMITER` ve `CUSTOM_NEWS_RATE_LIMITER` binding'leri eşleşiyor mu?
- Production routes, custom domains ve DNS kayıtları tam olarak hangileri?
- Environment variables ve secrets doğru ortamda mı? Secret değerleri GitHub'a veya dokümana yazılmamalı.
- Worker logs, metrics ve hata görünürlüğü etkin mi?
- Preview/production ayrımı var mı? Preview deploy'ları gerçek kullanıcı domain'ine bağlanmamalı.

`workers_dev = true` ayarı workers.dev erişimini etkinleştirir; ancak depo dosyası özel domain veya DNS route'unu tek başına kanıtlamaz. Bu ayarlar doğrulanmadan domain, DNS, route veya Netlify fallback değiştirilmemelidir.

## 4. Önerilen yayın akışı

1. Değişiklik kısa ömürlü çalışma dalında hazırlanır.
2. PR yalnızca `migration/cloudflare-pages` hedefine açılır.
3. GitHub quality gate: sözdizimi/modül grafiği, testler, güvenlik taraması, Wrangler dry-run ve Chromium smoke kontrolü.
4. Cloudflare preview'da API, RSS, rate limit, cache, güvenlik başlıkları, Firefox ve Chromium kontrol edilir.
5. PR birleştirilir; ardından production Worker yayını doğrulanır.
6. Önceki sürüm ve Netlify geri dönüşü doğrulanana kadar eski fallback korunur.
7. Birleştirme sonrası geçici çalışma dalı silinir.

Gerçek deploy, yalnızca `npm run deploy` komutuyla veya doğrulanmış Cloudflare Git entegrasyonuyla yapılmalıdır. `deploy:dry-run` yayın yapmaz.

---

# English

## 1. GitHub repository structure

### Primary branch policy
- The only long-lived development and release branch is `migration/cloudflare-pages`. It is already the GitHub default branch.
- Create short-lived `feature/*`, `fix/*`, or `chore/*` branches for individual tasks.
- Target pull requests only at `migration/cloudflare-pages`.
- Delete a task branch after its PR has been merged. Never delete a branch while its PR is still active.
- `main` is documented as the rollback reference for the legacy Netlify deployment. Keep it until the Netlify fallback and custom-domain dependency have been verified as unnecessary.

### Current cleanup status
- PRs #1, #2 and #6 were merged.
- PRs #3 and #4 were closed as superseded.
- PR #5 was closed as redundant after the modular refactor and current editing guide from PR #6 had been merged.
- PR #7 contains the rainforest/macaw visual work; keep it open until its review and CI updates are complete.
- Temporary branches belonging to merged or superseded PRs can be deleted after confirming that the required code exists on `migration/cloudflare-pages`.
- Remove `main` only after confirming that the Netlify rollback is no longer required.

### Branch protection
The GitHub branch listing reported `protected: false` for every listed branch. In GitHub Settings → Branches, configure protection/rules for `migration/cloudflare-pages`:
1. Require pull requests.
2. Block direct pushes and force pushes.
3. Require the quality gate before merging.
4. Prevent deletion of the default branch.

## 2. Cloudflare architecture — Workers Static Assets, not Pages

The repository's `wrangler.toml` describes a **Cloudflare Worker with Static Assets**, not a classic Cloudflare Pages project:

| Setting | Repository value |
|---|---|
| Worker name | `diorama-site` |
| Worker entrypoint | `cloudflare/worker.mjs` |
| Static build output | `dist/` |
| Static asset binding | `ASSETS` |
| Worker-first paths | `/api/*` |
| SPA fallback | `single-page-application` |
| workers.dev | Enabled |
| Wrangler CLI | `4.162.0` |

Manage this application under **Workers & Pages → Workers → diorama-site** in the Cloudflare dashboard. Do not create a second Pages deployment merely because the Git branch contains the word `cloudflare-pages`.

### Rate-limit bindings
`wrangler.toml` defines two separate rate-limit bindings:
- `NEWS_RATE_LIMITER`: namespace `271120261501`, 40 requests per 60 seconds.
- `CUSTOM_NEWS_RATE_LIMITER`: namespace `271120261502`, 40 requests per 60 seconds.

They must match namespaces that actually exist in the Cloudflare account. Do not delete or recreate them without checking the dashboard first.

## 3. Cloudflare dashboard verification checklist

If using Workers Builds, open Overview → Worker → Settings → Build → Branch control and set the production branch to `migration/cloudflare-pages`. When Preview Builds are enabled, pushes to every non-production branch can create preview builds. Keep previews disabled while cleaning up unless you deliberately need preview URLs for PR review. Use one owner for production deployment: when Workers Builds deploys the Worker, GitHub Actions should remain the quality-check and Wrangler dry-run pipeline.

These account-level settings cannot be confirmed from repository files alone and must be checked in the Cloudflare account:

- Is the GitHub connection pointing to `CaliFried77/diorama-site`?
- Is the production branch `migration/cloudflare-pages`?
- Is the build command `npm run build`?
- Is the deploy command `npx --yes wrangler@4.162.0 deploy`?
- Is the Worker named `diorama-site`?
- Are `ASSETS`, `NEWS_RATE_LIMITER` and `CUSTOM_NEWS_RATE_LIMITER` correctly bound?
- Which production routes, custom domains and DNS records are attached?
- Are environment variables and secrets assigned to the correct environment? Never commit secret values to GitHub or documentation.
- Are Worker logs, metrics and error visibility enabled?
- Is preview isolated from production? Preview deployments must not be attached to the public production domain.

`workers_dev = true` enables workers.dev access, but the repository does not prove which custom domain or DNS route is attached. Do not change domains, DNS, routes or the Netlify fallback until these account settings are verified.

## 4. Recommended release flow

1. Implement one task on a short-lived branch.
2. Open a PR targeting `migration/cloudflare-pages`.
3. Require the GitHub quality gate: module/syntax checks, tests, security audit, Wrangler dry-run and Chromium smoke check.
4. Verify the Cloudflare preview: API, RSS, rate limits, cache, security headers, Firefox and Chromium.
5. Merge the PR and verify the production Worker deployment.
6. Keep the previous Worker version and Netlify rollback available until the new deployment is confirmed.
7. Delete the temporary task branch after merge.

A production deployment should use `npm run deploy` or a verified Cloudflare Git integration. `deploy:dry-run` validates the bundle and does not publish it.

## Resmî kaynaklar / Official Cloudflare references

- [Workers Builds — branch control](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/)
- [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Workers CI/CD](https://developers.cloudflare.com/workers/ci-cd/)
