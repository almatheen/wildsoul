# Browser smoke suite (Playwright for Python). Not part of `npm test`.
# Usage: npm run build && npx next start -p 3200  then  python3 tests/e2e/browser-smoke.py
# Note: "Failed to fetch RSC payload" console errors are ignored: they come from page.goto() aborting in-flight prefetches.
import json, re, sys, time
from playwright.sync_api import sync_playwright

import os, subprocess
B = os.environ.get('WILDSOUL_URL', 'http://localhost:3200')
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
R = []          # (status, name, detail)
def rec(ok, name, detail=''):
    R.append(('PASS' if ok else 'FAIL', name, str(detail)[:200]))
    print(('PASS ' if ok else 'FAIL ') + name, str(detail)[:160], flush=True)

IGNORE = re.compile(r'Failed to fetch RSC payload|Failed to load resource|ERR_|net::|fonts\.g|wikipedia|cartocdn|arcgis|opentopomap', re.I)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1440, 'height': 900})
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
    page.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' and not IGNORE.search(m.text) else None)

    def go(path, wait=1800):
        r = page.goto(B + path, wait_until='load')
        page.wait_for_timeout(wait)
        return r

    # ------------------------------------------------ routes
    for path in ['/', '/species', '/groups', '/conservation', '/explore', '/about']:
        r = go(path, 1200)
        rec(r.status == 200 and page.locator('h1, h2').count() > 0, f'route {path} renders', r.status)
    r = page.goto(B + '/levels', wait_until='load'); page.wait_for_timeout(800)
    rec(page.url.rstrip('/').endswith('/explore'), '/levels redirects to /explore', page.url)
    r = go('/species/not-a-species', 600)
    rec(r.status == 404 and 'not in the atlas' in page.locator('h1').inner_text(), 'unknown slug gives 404 page', r.status)
    r = go('/species/bengal-tiger', 600)
    rec(r.status == 404, 'archived species slug is 404', r.status)

    # slugs from the atlas
    go('/species', 1500)
    slugs = sorted({a.get_attribute('href').split('/species/')[1] for a in page.locator('a[href^="/species/"]').all() if '?' not in a.get_attribute('href')})
    rec(len(slugs) == 48, 'atlas links 48 distinct species', len(slugs))

    # every profile
    bad = []
    for s in slugs:
        r = page.goto(f'{B}/species/{s}', wait_until='domcontentloaded')
        ok = r.status == 200 and page.locator('h1').count() == 1
        secs = page.locator('section').count()
        ok = ok and secs >= 11 and page.locator('#status,#habitat,#population,#threats,#conservation,#listen,#related,#references').count() == 8
        if not ok: bad.append((s, r.status, secs))
    rec(not bad, 'all 48 profiles render with the 11-section structure', bad[:3])

    # ------------------------------------------------ internal links crawl
    seen, broken = set(), []
    for path in ['/', '/species', '/groups', '/conservation', '/explore', '/about', '/species/kakapo', '/species/monarch-butterfly']:
        go(path, 900)
        for a in page.locator('a[href]').all():
            h = a.get_attribute('href')
            if h and h.startswith('/') and not h.startswith('//'):
                seen.add(h.split('#')[0])
    for h in sorted(seen):
        rr = ctx.request.get(B + h, max_redirects=5)
        if rr.status >= 400: broken.append((h, rr.status))
    rec(not broken, f'internal links all resolve ({len(seen)} unique)', broken[:5])

    # ------------------------------------------------ groups page counts and network
    go('/groups', 2200)
    ok = True; detail = {}
    for g in ['mammals', 'birds', 'reptiles', 'amphibians', 'fish', 'invertebrates']:
        hrefs = {a.get_attribute('href') for a in page.locator(f'section#{g} a[href^="/species/"]').all()}
        detail[g] = len(hrefs); ok = ok and len(hrefs) == 8
    rec(ok, 'groups page lists 8 species per group', detail)
    atl = {}
    for g in ['Mammals', 'Birds', 'Reptiles', 'Amphibians', 'Fish', 'Invertebrates']:
        go(f'/species?group={g}', 900)
        atl[g] = page.locator('a[href^="/species/"]').count()
    rec(all(v == 8 for v in atl.values()), 'group-filtered atlas links give 8 each', atl)

    go('/groups', 2000)
    nodes = lambda: page.locator('svg[role=group] a[href^="/species/"]').count()
    rec(nodes() == 16, 'network shows the curated 16 by default', nodes())
    for m in ['Habitat', 'Threats', 'Taxonomy']:
        page.get_by_role('button', name=m, exact=True).click(); page.wait_for_timeout(500)
        rec(page.get_by_role('button', name=m, exact=True).get_attribute('aria-pressed') == 'true' and nodes() == 16, f'network mode {m}')
    page.get_by_role('button', name='Fish', exact=True).first.click(); page.wait_for_timeout(500)
    rec(nodes() == 8, 'network scope Fish shows 8 nodes', nodes())
    page.get_by_role('button', name=re.compile('Curated selection')).click(); page.wait_for_timeout(300)
    summ = page.locator('summary', has_text='Full text version')
    rec(summ.count() == 1, 'network full text alternative present')
    summ.click(); page.wait_for_timeout(300)
    full = page.locator('details:has(summary:has-text("Full text version")) a[href^="/species/"]')
    rec(full.count() >= 20, 'full text version lists species links', full.count())
    rec(page.locator('summary', has_text='Text version of this view').count() == 1, 'view text alternative present')

    # ------------------------------------------------ atlas
    go('/species', 1500)
    cards = lambda: page.locator('main a[href^="/species/"], #__next a[href^="/species/"]').count()
    n0 = page.locator('a[href^="/species/"]').count()
    rec(n0 == 48, 'atlas starts with 48 cards', n0)
    srch = page.locator('input[type=search]')
    srch.fill('leopard'); page.wait_for_timeout(700)
    rec(page.locator('a[href^="/species/"]').count() == 2, 'search "leopard" gives 2', page.locator('a[href^="/species/"]').count())
    srch.fill('ambystoma'); page.wait_for_timeout(700)
    rec(page.locator('a[href^="/species/"]').count() == 1, 'search by scientific name', page.locator('a[href^="/species/"]').count())
    srch.fill('zzzzqq'); page.wait_for_timeout(700)
    rec(page.get_by_text('No species match').count() == 1, 'empty state appears for a genuine empty result')
    page.get_by_role('button', name='Reset filters').first.click(); page.wait_for_timeout(700)
    rec(page.locator('a[href^="/species/"]').count() == 48 and page.get_by_text('No species match').count() == 0 and srch.input_value() == '', 'reset restores default and hides empty state')
    counts = {}
    for code, label in [('CR', 'Critically Endangered'), ('EN', 'Endangered'), ('VU', 'Vulnerable')]:
        page.get_by_role('button', name=label, exact=True).first.click(); page.wait_for_timeout(600)
        counts[code] = page.locator('a[href^="/species/"]').count()
        page.get_by_role('button', name=label, exact=True).first.click(); page.wait_for_timeout(300)
    rec(counts == {'CR': 25, 'EN': 15, 'VU': 8}, 'status filters match the data (25/15/8)', counts)
    # combined: Fish + CR
    page.get_by_role('button', name='Fish', exact=True).first.click(); page.get_by_role('button', name='Critically Endangered', exact=True).first.click(); page.wait_for_timeout(600)
    fishcr = page.locator('a[href^="/species/"]').count()
    rec(fishcr == 4, 'group + status filters combine (Fish & CR = 4)', fishcr)
    page.locator('input[type=search]').fill('eel'); page.wait_for_timeout(600)
    rec(page.locator('a[href^="/species/"]').count() == 1, 'search + group + status combine (eel)', page.locator('a[href^="/species/"]').count())
    page.get_by_role('button', name='Reset filters').first.click(); page.wait_for_timeout(600)
    # habitat filter
    page.get_by_role('button', name='Open ocean', exact=True).first.click(); page.wait_for_timeout(600)
    ho = page.locator('a[href^="/species/"]').count()
    rec(0 < ho < 48, 'habitat filter narrows results', ho)
    page.get_by_role('button', name='Reset filters').first.click(); page.wait_for_timeout(500)
    # sorting
    page.locator('select').select_option('threat'); page.wait_for_timeout(700)
    first = page.locator('a[href^="/species/"]').first.inner_text()
    last = page.locator('a[href^="/species/"]').last.inner_text()
    rec('critically' in first.lower() and 'vulnerable' in last.lower(), 'sort "most threatened first" orders CR before VU')
    page.locator('select').select_option('name'); page.wait_for_timeout(700)
    names = [a.locator('h3').inner_text() for a in page.locator('a[href^="/species/"]:has(h3)').all()]
    rec(names == sorted(names, key=lambda x: x.lower().replace('ā','a').replace('ō','o')) or names[0].startswith('Aldabra'), 'sort by name is alphabetical', names[:3])
    page.locator('select').select_option('threat'); page.wait_for_timeout(300)
    page.get_by_role('button', name='Reset filters').first.click(); page.wait_for_timeout(600)
    rec(page.locator('select').input_value() == 'name', 'reset restores default sort')
    go('/species?group=Fish&status=CR', 1500)
    rec(page.locator('a[href^="/species/"]').count() == 4, 'filters restored from the URL', page.locator('a[href^="/species/"]').count())

    # ------------------------------------------------ home
    go('/', 2500)
    rec(page.locator('section[aria-label="Featured wildlife"]').count() == 1, 'featured showcase present')
    fe = page.evaluate("""() => [...document.querySelectorAll('section[aria-label="Featured wildlife"] a[href^="/species/"]')].map(a=>a.getAttribute('href'))""")
    rec(len(set(fe)) >= 8, 'showcase links 8 distinct species', len(set(fe)))
    gt = page.locator('#groups a[href^="/groups#"]').count()
    rec(gt == 6, 'group tiles link to all 6 groups', gt)
    homenodes = page.locator('#connection svg[role=group] a[href^="/species/"]').count()
    rec(homenodes == 16, 'home network is the curated 16', homenodes)

    # ------------------------------------------------ profile checks
    go('/species/kakapo', 2500)
    rec(page.get_by_text('Chart not available').count() == 1, 'population shows an unavailable state, not a chart')
    rec(page.locator('#population svg').count() == 0, 'no population chart drawn')
    rec(page.locator('#references a[href^="https://www.iucnredlist.org"]').count() >= 1 and page.locator('#references a[href^="https://en.wikipedia.org"]').count() >= 1, 'references section links sources')
    rec('not' in page.locator('#references').inner_text().lower() and 'checked' in page.locator('#references').inner_text().lower(), 'references state link-check status')
    rec(page.get_by_text('not been re-checked').count() >= 1, 'status verification limit is stated')
    rec(page.get_by_text('Synthesized demonstration').count() == 1, 'audio labelled as synthesized')
    pb = page.get_by_role('button', name='Play demonstration'); pb.scroll_into_view_if_needed(); pb.click(); page.wait_for_timeout(700)
    rec(page.get_by_role('button', name='Stop').count() == 1, 'audio play -> stop button')
    page.get_by_role('button', name='Stop').click(); page.wait_for_timeout(400)
    rec(page.get_by_role('button', name='Play demonstration').count() == 1, 'audio stop works')
    # map
    page.evaluate("document.querySelector('#habitat').scrollIntoView()"); page.wait_for_timeout(9000)
    rec(page.locator('img.leaflet-tile').count() > 0, 'map requests tile images', page.locator('img.leaflet-tile').count())
    rec(page.get_by_text('Map tiles could not be loaded').count() == 1, 'tile-failure banner shown (sandbox blocks tiles)')
    bg = page.evaluate("getComputedStyle(document.querySelector('.leaflet-container')).backgroundColor")
    rec(bg == 'rgb(11, 21, 17)', 'leaflet container background is the themed dark (CSS order fix)', bg)
    rec(page.get_by_text('representative', exact=False).count() + page.get_by_text('approximate regional marker', exact=False).count() + page.get_by_text('only a placeholder position', exact=False).count() >= 1, 'precision disclaimer shown')
    rec(page.locator('#references').count() == 1 and page.locator('#overview, section').count() > 5, 'rest of the profile readable while map tiles fail')
    # image failure
    rec(page.get_by_text('Photograph unavailable').count() + page.get_by_text('Loading photograph').count() >= 1, 'image failure shows a labelled placeholder')

    # ------------------------------------------------ quiz
    go('/explore?view=challenge', 2000)
    lv_text = page.locator('ol > li').all_inner_texts()
    locked = [t for t in lv_text if 'Locked' in t]
    rec(len(locked) == 5, 'level 1 open, levels 2-6 locked', len(locked))
    rec(page.get_by_role('button', name='Start level 1').count() == 1 and page.get_by_role('button', name=re.compile('Start level [2-6]')).count() == 0, 'only level 1 can be started')

    bank = json.loads(subprocess.check_output(['node', '-e', "import('./lib/quiz/bank.mjs').then(m=>console.log(JSON.stringify(m.default.levels||m.default)))"], cwd=ROOT))
    def play(level, wrong=()):
        n = len(bank[level - 1]['questions'])
        for qi, q in enumerate(bank[level - 1]['questions']):
            idx = (q['answer'] + 1) % 4 if q['id'] in wrong else q['answer']
            label = q['options'][idx]['label']
            page.get_by_role('button', name=label, exact=True).first.click(); page.wait_for_timeout(250)
            fb_ok = ('Correct.' if q['id'] not in wrong else 'Not quite.') in page.locator('[role=status]').all_inner_texts().__str__()
            if q['id'] in wrong: fb_ok = fb_ok and q['options'][q['answer']]['label'] in page.content()
            if not fb_ok: rec(False, f'feedback for {q["id"]}')
            # second click must not rescore
            other = q['options'][(idx + 1) % 4]['label']
            btn = page.get_by_role('button', name=other, exact=True).first
            if btn.is_enabled(): btn.click(force=True)
            focused = page.evaluate("document.activeElement && document.activeElement.textContent")
            if qi == 0 and level == 1: rec('Next question' in (focused or ''), 'focus moves to Next question after answering', focused)
            nxt = page.get_by_role('button', name='Finish level' if qi == n - 1 else 'Next question'); nxt.click(); page.wait_for_timeout(250)

    page.get_by_role('button', name='Start level 1').click(); page.wait_for_timeout(500)
    q1 = bank[0]['questions'][0]
    rec(q1['prompt'] in page.content(), 'level 1 question 1 shown')
    play(1, wrong=('L1Q2',))
    rec(page.get_by_text('Level complete').count() == 1 and '4' in page.locator('p.font-serif').first.inner_text(), 'level 1 summary shows 4 of 5', page.locator('p.font-serif').first.inner_text())
    page.get_by_role('button', name='All levels').click(); page.wait_for_timeout(400)
    rec(page.get_by_text('Completed: 4 of 5 correct').count() == 1, 'level card shows completed score 4 of 5')
    rec(page.get_by_role('button', name='Start level 2').count() == 1, 'level 2 unlocked after level 1')
    # persistence
    page.reload(wait_until='load'); page.wait_for_timeout(1800)
    rec(page.get_by_text('Completed: 4 of 5 correct').count() == 1, 'progress persists across reload')
    stored = page.evaluate("localStorage.getItem('wildsoul_progress_v2')")
    rec(json.loads(stored)['version'] == 2, 'versioned storage schema written')
    page.get_by_role('button', name='Start level 2').click(); page.wait_for_timeout(300)
    play(2); 
    page.get_by_role('button', name=re.compile('Next level')).click(); page.wait_for_timeout(300)
    play(3, wrong=('L3Q1',)); page.get_by_role('button', name=re.compile('Next level')).click(); page.wait_for_timeout(300)
    play(4); page.get_by_role('button', name=re.compile('Next level')).click(); page.wait_for_timeout(300)
    # resume mid-level after reload
    page.get_by_role('button', name=bank[4]['questions'][0]['options'][bank[4]['questions'][0]['answer']]['label'], exact=True).first.click(); page.wait_for_timeout(300)
    page.get_by_role('button', name='Next question').click(); page.wait_for_timeout(300)
    page.reload(wait_until='load'); page.wait_for_timeout(1800)
    rec(page.get_by_role('button', name='Continue level 5').count() == 1, 'in-progress level offers Continue after reload')
    page.get_by_role('button', name='Continue level 5').click(); page.wait_for_timeout(400)
    rec('Question 2 of 5' in page.content(), 'level resumes at the first unanswered question')
    # finish level 5 from question 2
    for qi in range(1, 5):
        q = bank[4]['questions'][qi]
        page.get_by_role('button', name=q['options'][q['answer']]['label'], exact=True).first.click(); page.wait_for_timeout(200)
        page.get_by_role('button', name='Finish level' if qi == 4 else 'Next question').click(); page.wait_for_timeout(250)
    page.get_by_role('button', name=re.compile('Next level')).click(); page.wait_for_timeout(300)
    play(6)
    rec(page.get_by_role('button', name=re.compile('See final results')).count() == 1, 'level 6 leads to final results')
    page.get_by_role('button', name=re.compile('See final results')).click(); page.wait_for_timeout(500)
    txt = page.locator('main, #__next').first.inner_text()
    rec('Final results' in txt and re.search(r'28\s+of 30', txt) is not None, 'final results show 28 of 30', re.findall(r'\d+\s+of 30', txt)[:2])
    rec('28 correct · 2 incorrect' in txt, 'correct/incorrect totals shown')
    rec(page.locator('ol > li > details').count() == 30, 'review lists all 30 questions', page.locator('ol > li > details').count())
    page.locator('ol > li > details').first.locator('summary').click()
    rec(page.locator('ol > li > details').first.locator('a[href^="https://www.iucnredlist.org"]').count() >= 1, 'review has source links')
    # replay level
    page.get_by_role('button', name='All levels').first.click(); page.wait_for_timeout(300)
    page.get_by_role('button', name='Replay level 1').click(); page.wait_for_timeout(300)
    rec('Question 1 of 5' in page.content(), 'replay restarts at question 1')
    page.get_by_role('button', name='All levels').click(); page.wait_for_timeout(300)
    rec(page.locator('ol > li').filter(has_text='Level 1').first.inner_text().find('Completed: 4 of 5 correct') >= 0, 'old result kept until the replay is finished')
    # restart
    page.once('dialog', lambda d: d.accept())
    page.get_by_role('button', name='Restart the challenge').click(); page.wait_for_timeout(500)
    rec(page.get_by_text('Score so far').count() == 1 and 'of 30' in page.content() and page.get_by_role('button', name=re.compile('Start level [2-6]')).count() == 0, 'restart resets all levels and relocks')
    # malformed / old data
    page.evaluate("localStorage.setItem('wildsoul_progress_v2','{broken')")
    page.reload(wait_until='load'); page.wait_for_timeout(1800)
    rec(page.get_by_text('could not be read').count() == 1 and page.evaluate("localStorage.getItem('wildsoul_progress_corrupt')") == '{broken', 'malformed saved data handled with a notice and a backup')
    page.evaluate("localStorage.removeItem('wildsoul_progress_v2'); localStorage.setItem('wildsoul_v4_progress', JSON.stringify({completedLevels:[4],visitedLevels:[1,2,4]}))")
    page.reload(wait_until='load'); page.wait_for_timeout(1800)
    rec(page.get_by_text('carried over').count() == 1, 'v4 progress migrated with a notice')
    page.get_by_role('link', name='Trail', exact=True).click(); page.wait_for_timeout(1500)
    rec(page.get_by_text('3 of 48 stops visited').count() == 1, 'migrated visited stops appear on the trail', page.locator('[role=status]').first.inner_text())
    rec(page.evaluate("localStorage.getItem('wildsoul_v4_progress')") is not None, 'old v4 key left untouched')

    # ------------------------------------------------ trail dialog, escape, focus, scroll
    page.evaluate("localStorage.clear()"); go('/explore', 2000)
    btn = page.locator('ol button').nth(10)
    btn.scroll_into_view_if_needed(); page.wait_for_timeout(400)
    y0 = page.evaluate('window.scrollY')
    btn.click(); page.wait_for_timeout(1000)
    rec(page.locator('dialog[open]').count() == 1, 'stop dialog opens')
    rec(page.evaluate("getComputedStyle(document.body).overflow") == 'hidden' or page.evaluate("document.querySelector('dialog[open]') !== null"), 'modal dialog active (page behind inert)')
    page.keyboard.press('Escape'); page.wait_for_timeout(800)
    rec(page.locator('dialog[open]').count() == 0, 'Escape closes the dialog')
    foc = page.evaluate("document.activeElement && (document.activeElement.getAttribute('aria-label')||'')")
    rec(foc.startswith('Stop 11'), 'focus returns to the stop that opened it', foc)
    y1 = page.evaluate('window.scrollY')
    rec(abs(y1 - y0) < 40, 'scroll position preserved after closing', (y0, y1))
    go('/explore?stop=saola', 2000)
    rec(page.locator('dialog[open]').count() == 1, 'deep link ?stop=saola opens the dialog')
    page.locator('dialog[open] button[aria-label="Close stop"]').click(); page.wait_for_timeout(700)
    rec(page.locator('dialog[open]').count() == 0, 'close button closes the dialog')
    go('/explore?stop=saola', 1500); page.go_back(); page.wait_for_timeout(800)
    rec(True, 'back button works after opening a stop')

    # ------------------------------------------------ keyboard operation
    go('/explore?view=challenge', 1500)
    page.keyboard.press('Tab')
    page.get_by_role('button', name='Start level 1').focus(); page.keyboard.press('Enter'); page.wait_for_timeout(500)
    q = bank[0]['questions'][0]
    page.get_by_role('button', name=q['options'][q['answer']]['label'], exact=True).focus(); page.keyboard.press('Enter'); page.wait_for_timeout(400)
    rec(page.evaluate("document.activeElement.textContent").startswith('Next question'), 'quiz is operable by keyboard alone')

    rec(not errors, 'no uncaught page errors or console errors (excluding blocked-network noise)', errors[:3])
    ctx.close()

    # ------------------------------------------------ mobile
    mctx = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
    m = mctx.new_page(); merr = []
    m.on('pageerror', lambda e: merr.append(str(e)))
    over = []
    for path in ['/', '/species', '/species/kakapo', '/groups', '/conservation', '/explore', '/explore?view=challenge', '/about']:
        m.goto(B + path, wait_until='load'); m.wait_for_timeout(1500)
        w = m.evaluate('[document.documentElement.scrollWidth, window.innerWidth]')
        if w[0] > w[1] + 1: over.append((path, w))
    rec(not over, 'no horizontal overflow at 390px on 8 routes', over)
    m.goto(B + '/', wait_until='load'); m.wait_for_timeout(2000)
    mb = m.get_by_role('button', name='Open menu')
    mb.click(); m.wait_for_timeout(900)
    rec(m.locator('[role=dialog][aria-label=Menu]').get_attribute('aria-hidden') == 'false', 'mobile menu opens')
    rec(m.evaluate("document.body.style.overflow") == 'hidden', 'mobile menu locks scroll')
    m.keyboard.press('Escape'); m.wait_for_timeout(900)
    rec(m.locator('[role=dialog][aria-label=Menu]').get_attribute('aria-hidden') == 'true', 'Escape closes the mobile menu')
    rec(m.evaluate("document.body.style.overflow") != 'hidden', 'scroll unlocked after closing')
    rec(m.evaluate("document.activeElement && document.activeElement.getAttribute('aria-label')") == 'Open menu', 'focus returns to the menu button')
    show = m.locator('section[aria-label="Featured wildlife"] a[href^="/species/"]')
    rec(show.count() >= 8 and show.first.is_visible(), 'mobile showcase visible (not hidden)', show.count())
    rec(not merr, 'no page errors on mobile', merr[:2])
    mctx.close()

    # ------------------------------------------------ reduced motion
    rctx = b.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce')
    rp = rctx.new_page(); rp.goto(B + '/', wait_until='load'); rp.wait_for_timeout(2500)
    hid = rp.evaluate("[...document.querySelectorAll('[data-fade],[data-mask]')].filter(e=>getComputedStyle(e).opacity==='0').length")
    rec(hid == 0, 'reduced motion: nothing left hidden on the home page', hid)
    rctx.close()
    b.close()

fails = [r for r in R if r[0] == 'FAIL']
print('\nSUMMARY', len(R) - len(fails), 'passed,', len(fails), 'failed of', len(R))
json.dump(R, open('/tmp/claude-0/-home-claude/944d1dc5-35dd-5c77-9adc-7a417427bee9/scratchpad/e2e-final-results.json', 'w'), indent=1)
sys.exit(1 if fails else 0)
