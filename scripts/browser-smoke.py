#!/usr/bin/env python3
"""Cross-browser smoke tests for the built Diorama app (Playwright required)."""
from __future__ import annotations

import asyncio
import json
import re
import threading
from datetime import datetime, timedelta, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
ARTIFACTS = ROOT / "browser-artifacts"


def load_deployment_headers(request_path: str) -> dict[str, str]:
    """Apply the matching Netlify _headers blocks for one request path."""
    result: dict[str, str] = {}
    current_pattern: str | None = None
    for line in (ROOT / "_headers").read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if not line[0].isspace():
            current_pattern = line.strip()
            continue
        stripped = line.strip()
        matches = current_pattern == "/*" or current_pattern == request_path
        if matches and ":" in stripped:
            key, value = stripped.split(":", 1)
            result[key.strip()] = value.strip()

    # Netlify serves the real site over HTTPS. This smoke server intentionally uses
    # localhost HTTP; WebKit upgrades even loopback module requests when this CSP
    # directive is present, but the local server has no TLS listener.
    csp_key = "Content-Security-Policy"
    if csp_key in result:
        result[csp_key] = "; ".join(
            directive.strip()
            for directive in result[csp_key].split(";")
            if directive.strip().lower() != "upgrade-insecure-requests"
        )
    return result


class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST), **kwargs)

    def end_headers(self):
        path = urlparse(getattr(self, "path", "/")).path or "/"
        for key, value in load_deployment_headers(path).items():
            self.send_header(key, value)
        super().end_headers()

    def log_message(self, *_args):
        pass


def weather_payload() -> dict:
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    days = [(now + timedelta(days=i)).date().isoformat() for i in range(5)]
    hourly_times = [(now + timedelta(hours=i)).strftime("%Y-%m-%dT%H:00") for i in range(48)]
    return {
        "current": {
            "time": now.strftime("%Y-%m-%dT%H:%M"),
            "temperature_2m": 18.0,
            "apparent_temperature": 17.0,
            "relative_humidity_2m": 58.0,
            "weather_code": 2,
            "wind_speed_10m": 9.0,
            "wind_direction_10m": 230.0,
            "is_day": 1,
            "cloud_cover": 35.0,
            "precipitation": 0.0,
        },
        "hourly": {
            "time": hourly_times,
            "temperature_2m": [18.0 - (i % 8) * 0.3 for i in range(48)],
            "weather_code": [2 for _ in range(48)],
            "precipitation_probability": [10 for _ in range(48)],
        },
        "daily": {
            "time": days,
            "weather_code": [2, 1, 3, 2, 1],
            "temperature_2m_max": [21.0, 22.0, 19.0, 20.0, 21.0],
            "temperature_2m_min": [12.0, 13.0, 11.0, 12.0, 13.0],
            "sunrise": [f"{day}T06:30" for day in days],
            "sunset": [f"{day}T18:00" for day in days],
            "uv_index_max": [3.0, 4.0, 2.0, 3.0, 4.0],
            "precipitation_probability_max": [10.0, 5.0, 40.0, 20.0, 10.0],
        },
    }


async def mock_external_request(route):
    url = route.request.url
    parsed = urlparse(url)
    if parsed.path == "/api/news":
        from urllib.parse import parse_qs
        query = parse_qs(parsed.query)
        source_ids = [item for item in query.get("sources", [""])[0].split(",") if item]
        article = {
            "title": "Diorama tarayıcı testi — örnek haber",
            "link": "https://example.test/diorama-smoke-article",
            "publishedAt": datetime.now(timezone.utc).isoformat(),
            "description": "Yerel API taklit yanıtı",
        }
        payload = {
            "status": "ok",
            "category": query.get("category", ["gundem"])[0],
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "sourceCount": len(source_ids),
            "successCount": len(source_ids),
            "results": [{"sourceId": source_id, "status": "ok", "items": [article]} for source_id in source_ids],
        }
        await route.fulfill(status=200, content_type="application/json", body=json.dumps(payload))
        return
    if parsed.path == "/api/custom-news":
        payload = {
            "status": "ok",
            "fetchedAt": datetime.now(timezone.utc).isoformat(),
            "items": [{
                "title": "Diorama özel RSS testi — örnek haber",
                "link": "https://example.test/diorama-custom-smoke-article",
                "publishedAt": datetime.now(timezone.utc).isoformat(),
                "description": "Özel RSS API taklit yanıtı",
            }],
        }
        await route.fulfill(status=200, content_type="application/json", body=json.dumps(payload))
        return
    if parsed.netloc == "api.rss2json.com":
        await route.abort()
        return
    if parsed.netloc == "geocoding-api.open-meteo.com":
        await route.fulfill(status=200, content_type="application/json", body=json.dumps({
            "results": [{
                "name": "Yalova", "latitude": 40.65, "longitude": 29.28,
                "country": "Türkiye", "timezone": "Europe/Istanbul",
            }],
        }))
        return
    if parsed.netloc == "api.open-meteo.com":
        await route.fulfill(status=200, content_type="application/json", body=json.dumps(weather_payload()))
        return
    # Fonts are self-hosted; any external font request is blocked by this test route.
    if parsed.hostname not in ("127.0.0.1", "localhost"):
        await route.abort()
        return
    await route.continue_()


async def assert_app_smoke(browser_type, name: str, base_url: str):
    browser = await browser_type.launch(headless=True)
    context = await browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1)
    await context.route("**/*", mock_external_request)
    page = await context.new_page()
    page_errors: list[str] = []
    console_errors: list[str] = []
    failed_requests: list[str] = []
    api_requests: list[str] = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
    page.on("requestfailed", lambda request: failed_requests.append(f"{request.url}: {request.failure}"))
    page.on("request", lambda request: api_requests.append(request.url) if "/api/news" in request.url or "/api/custom-news" in request.url else None)

    await page.goto(base_url, wait_until="domcontentloaded", timeout=30000)
    await page.locator("#heroClock").wait_for(state="visible", timeout=15000)
    await page.evaluate("document.fonts.ready")
    local_fonts = await page.evaluate("({inter: document.fonts.check('16px Inter'), pixelify: document.fonts.check('16px \"Pixelify Sans\"'), silkscreen: document.fonts.check('16px Silkscreen')})")
    assert all(local_fonts.values()), f"{name}: a local font did not load: {local_fonts}"
    category_locator = page.locator("#newsCategories .news-cat-btn")
    category_deadline = asyncio.get_running_loop().time() + 10
    while asyncio.get_running_loop().time() < category_deadline and await category_locator.count() < 3:
        await page.wait_for_timeout(100)
    category_count = await category_locator.count()
    if category_count < 3:
        diagnostics = await page.evaluate("""() => ({
            readyState: document.readyState,
            categoryHTML: document.querySelector('#newsCategories')?.innerHTML || null,
            scripts: [...document.querySelectorAll('script[type="module"]')].map(script => script.src),
            bodyClasses: document.body.className
        })""")
        raise AssertionError(
            f"{name}: news category tabs did not initialize; count={category_count}; "
            f"diagnostics={json.dumps(diagnostics, ensure_ascii=False)}; "
            f"pageErrors={page_errors}; consoleErrors={console_errors}; failedRequests={failed_requests}"
        )
    weather_locator = page.locator("#weatherTemp")
    weather_deadline = asyncio.get_running_loop().time() + 15
    weather_text = ""
    while asyncio.get_running_loop().time() < weather_deadline:
        weather_text = await weather_locator.inner_text()
        if re.search(r"\d+°C", weather_text):
            break
        await page.wait_for_timeout(100)
    assert re.search(r"\d+°C", weather_text), f"{name}: mocked weather data did not render: {weather_text!r}"

    # Habitat picker and cycle.
    await page.locator("#habitatMenuBtn").click()
    await page.locator("#habitatPopover.open").wait_for(state="visible")
    assert await page.locator("#habitatListContainer button").count() == 6
    await page.locator("#habitatListContainer button").nth(2).click()
    selected_habitat = await page.locator("#habitatNameLabel").inner_text()
    assert selected_habitat, f"{name}: habitat selection failed"
    await page.locator("#habitatCycleBtn").click()

    # Theme toggle.
    await page.locator("#themeToggleBtn").click()
    theme_state = await page.evaluate("""() => ({
        stored: localStorage.getItem('diorama_theme'),
        bodyLight: document.body.classList.contains('theme-light'),
        label: document.querySelector('#themeModeLabel')?.textContent?.trim() || ''
    })""")
    assert theme_state["stored"] in ("light", "dark"), f"{name}: theme preference was not persisted: {theme_state}"
    assert (theme_state["stored"] == "light") == theme_state["bodyLight"], f"{name}: saved theme and rendered theme differ: {theme_state}"

    # News categories render mocked, safe text content.
    await page.locator("#newsBtn").click()
    await page.locator("#newsPopover.open").wait_for(state="visible")
    await page.locator("#newsCategories .news-cat-btn").nth(1).click()
    try:
        await page.locator("#newsListContainer a").first.wait_for(state="visible", timeout=12000)
    except Exception as error:
        news_diagnostics = await page.evaluate("""() => ({
            sourceSummary: document.querySelector('#newsSourceSub')?.textContent || '',
            listMeta: document.querySelector('#newsListMeta')?.textContent || '',
            listText: document.querySelector('#newsListContainer')?.innerText || '',
            listHTML: (document.querySelector('#newsListContainer')?.innerHTML || '').slice(0, 1600),
            selectedCategory: document.querySelector('#newsCategories .news-cat-btn[aria-pressed="true"]')?.dataset.cat || ''
        })""")
        raise AssertionError(
            f"{name}: mocked news cards did not render: {error}; "
            f"diagnostics={json.dumps(news_diagnostics, ensure_ascii=False)}; "
            f"apiRequests={api_requests}; pageErrors={page_errors}; "
            f"consoleErrors={console_errors}; failedRequests={failed_requests}"
        ) from error
    assert "Diorama tarayıcı testi" in await page.locator("#newsListContainer").inner_text()
    await page.locator("#newsSettingsBtn").click()
    await page.locator("#newsSettingsPanel").wait_for(state="visible")
    await page.locator("#newsSourceNameInput").fill("Özel Smoke RSS")
    await page.locator("#newsSourceRssInput").fill("https://feeds.example.org/smoke.xml")
    await page.locator("#addNewsSourceForm button[type=submit]").click()
    await page.get_by_text("Özel Smoke RSS kaynağı eklendi.").wait_for(state="visible", timeout=5000)
    await page.locator("#newsListContainer").get_by_text("Diorama özel RSS testi").wait_for(state="visible", timeout=12000)

    # Task creation and data manager panel.
    await page.locator("#notesBtn").click()
    await page.locator("#notesPopover.open").wait_for(state="visible")
    await page.locator("#newTaskInput").fill("Tarayıcı smoke testi görevi")
    await page.locator("#addTaskForm button[type=submit]").click()
    assert "Tarayıcı smoke testi görevi" in await page.locator("#tasksListContainer").inner_text()
    await page.locator("#dataManagerBtn").click()
    await page.locator("#dataManagerPopover.open").wait_for(state="visible")
    assert await page.locator("#exportAllDataBtn").count() == 1
    assert await page.locator("#licenseLinks a").count() == 2

    # Responsive layouts: no horizontal document overflow.
    for width, height in ((320, 740), (390, 844), (768, 1024), (1440, 900)):
        await page.set_viewport_size({"width": width, "height": height})
        await page.wait_for_timeout(150)
        ARTIFACTS.mkdir(exist_ok=True)
        await page.screenshot(path=str(ARTIFACTS / f"{name}-{width}x{height}.png"), full_page=True)
        overflow_state = await page.evaluate("""() => {
            const width = window.innerWidth;
            const overflowing = [...document.querySelectorAll('body *')].map((el) => {
                const rect = el.getBoundingClientRect();
                return {
                    tag: el.tagName.toLowerCase(),
                    id: el.id || '',
                    className: typeof el.className === 'string' ? el.className.slice(0, 180) : '',
                    left: Math.round(rect.left),
                    right: Math.round(rect.right),
                    width: Math.round(rect.width),
                    scrollWidth: el.scrollWidth
                };
            }).filter((item) => item.width > 0 && (item.left < -1 || item.right > width + 1))
              .sort((a, b) => b.right - a.right)
              .slice(0, 15);
            return {
                viewport: width,
                documentWidth: document.documentElement.scrollWidth,
                bodyWidth: document.body.scrollWidth,
                overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > width + 1,
                elements: overflowing
            };
        }""")
        assert not overflow_state["overflow"], f"{name}: horizontal overflow at {width}px: {json.dumps(overflow_state, ensure_ascii=False)}"

    # Verify service-worker readiness and offline app-shell re-open where supported.
    sw_supported = await page.evaluate("'serviceWorker' in navigator")
    if sw_supported:
        sw_state = {}
        try:
            await asyncio.wait_for(page.evaluate("() => navigator.serviceWorker.ready.then(() => true)"), timeout=20)
            await page.reload(wait_until="domcontentloaded", timeout=20000)
            await page.locator("#heroClock").wait_for(state="visible", timeout=10000)
            controller_deadline = asyncio.get_running_loop().time() + 10
            while asyncio.get_running_loop().time() < controller_deadline:
                if await page.evaluate("Boolean(navigator.serviceWorker.controller)"):
                    break
                await page.wait_for_timeout(100)
            assert await page.evaluate("Boolean(navigator.serviceWorker.controller)"), f"{name}: Service Worker did not control the page"
            sw_state = await page.evaluate("""async () => {
                const registration = await navigator.serviceWorker.getRegistration();
                const cacheNames = await caches.keys();
                const indexUrl = new URL('./index.html', location.origin).href;
                const cachedIndex = await caches.match(indexUrl);
                return {
                    hasController: Boolean(navigator.serviceWorker.controller),
                    controllerScript: navigator.serviceWorker.controller?.scriptURL || null,
                    registrationActive: Boolean(registration?.active),
                    activeState: registration?.active?.state || null,
                    cacheNames,
                    cachedIndex: Boolean(cachedIndex),
                    cachedIndexStatus: cachedIndex?.status || null
                };
            }""")
            await context.set_offline(True)
            if name == "firefox":
                # Firefox's Playwright offline emulation rejects requests at the browser
                # network layer before the Service Worker can answer. Verify that the
                # active worker's complete app entry is persisted and readable in CacheStorage.
                offline_cache = await page.evaluate("""async () => {
                    const cached = await caches.match(new URL('./index.html', location.origin).href);
                    const html = cached ? await cached.text() : '';
                    return {
                        status: cached?.status || 0,
                        hasAppClock: html.includes('id="heroClock"'),
                        hasModuleEntry: html.includes('./js/main.js')
                    };
                }""")
                assert offline_cache["status"] == 200 and offline_cache["hasAppClock"] and offline_cache["hasModuleEntry"], (
                    f"{name}: offline app-shell cache is incomplete: {json.dumps(offline_cache, ensure_ascii=False)}"
                )
            else:
                await page.reload(wait_until="domcontentloaded", timeout=20000)
                await page.locator("#heroClock").wait_for(state="visible", timeout=10000)
            await context.set_offline(False)
        except Exception as error:
            try:
                offline_state = await page.evaluate("""async () => ({
                    hasController: Boolean(navigator.serviceWorker?.controller),
                    cacheNames: await caches.keys(),
                    cachedIndex: Boolean(await caches.match(new URL('./index.html', location.origin).href))
                })""")
            except Exception as diagnostic_error:
                offline_state = {"diagnosticError": str(diagnostic_error)}
            raise AssertionError(
                f"{name}: service worker/offline shell smoke test failed: {error}; "
                f"state before offline: {json.dumps(sw_state, ensure_ascii=False)}; "
                f"current state: {json.dumps(offline_state, ensure_ascii=False)}"
            ) from error

    assert not page_errors, f"{name}: JavaScript runtime errors: {page_errors}"
    await context.close()
    await browser.close()
    print(f"PASS {name}: startup, habitat, theme, news, tasks, responsive widths, and offline shell")


async def main():
    if not (DIST / "index.html").is_file():
        raise SystemExit("dist/ is missing. Run `npm run build` first.")
    server = ThreadingHTTPServer(("127.0.0.1", 0), AppHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base_url = f"http://127.0.0.1:{server.server_port}/"
    try:
        async with async_playwright() as playwright:
            for name in ("chromium", "firefox", "webkit"):
                browser_type = getattr(playwright, name)
                await assert_app_smoke(browser_type, name, base_url)
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)


if __name__ == "__main__":
    asyncio.run(main())
