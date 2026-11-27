"""Recordable demo video: HTML cards + live clips (video/clips, from rec-recordable.mjs) + `say` voice-over + captions.

Usage: python3 scenes.py        -> out/recordable-final.mp4, out/recordable-final.srt, out/recordable-upload.mp4, out/frames/
       RF_PARTS=3,5 python3 scenes.py   re-encode only those scenes (1-based), reuse the other parts
Same pipeline as the Rightful, Vouch and Roadworthy videos (kit/video).
"""
import hashlib, html, json, os, re, subprocess, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
FR = os.path.join(OUT, 'frames')
CAPS = os.path.join(OUT, 'caps')
SHOT = os.path.expanduser('~/.claude/skills/skills-studio/scripts/shot.sh')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
VOICE, RATE = 'Ava (Premium)', '165'
for d in (OUT, FR, CAPS):
    os.makedirs(d, exist_ok=True)
clip = lambda n: os.path.join(HERE, 'clips', n)
MARKS = json.load(open(clip('marks.json'))) if os.path.exists(clip('marks.json')) else {}

ICON = ('<svg viewBox="0 0 64 64"><rect x="2" y="2" width="60" height="60" rx="14" fill="#D9480F"/>'
        '<rect x="17" y="13" width="30" height="40" rx="4" fill="none" stroke="#fff" stroke-width="4"/><rect x="25" y="9" width="14" height="8" rx="2.5" fill="#fff"/>'
        '<path d="M24 34h16M32 26v16" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/></svg>')

CSS = """
*{box-sizing:border-box} html,body{margin:0;width:1920px;height:1080px;background:#0F0B09;font-family:-apple-system,"SF Pro Display",system-ui,sans-serif;color:#F3EEE9;overflow:hidden}
.bg{position:absolute;inset:0;background:radial-gradient(1200px 700px at 15% 0%,rgba(217,72,15,.30),transparent 60%),radial-gradient(900px 600px at 100% 100%,rgba(255,170,110,.10),transparent 60%)}
.brand{position:absolute;left:56px;top:36px;display:flex;align-items:center;gap:14px;font-weight:700;font-size:26px}
.brand svg{width:40px;height:40px}
.card{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:0 150px 110px}
.kicker{font-size:28px;color:#FFB37A;font-weight:700;letter-spacing:1.5px;text-transform:uppercase}
h1{font-size:92px;line-height:1.03;margin:18px 0 26px;font-weight:800;letter-spacing:-1.5px}
h2{font-size:64px;line-height:1.08;margin:14px 0 22px;font-weight:800;letter-spacing:-1px}
p.lead{font-size:34px;line-height:1.42;color:#E6D9CF;max-width:1560px;margin:0}
.laws{display:flex;gap:18px;margin:8px 0 34px;flex-wrap:nowrap}
.law{background:#1C1512;border:1px solid rgba(255,255,255,.10);border-radius:16px;padding:18px 22px;flex:1}
.law b{display:block;font-size:24px;color:#FFB37A;letter-spacing:.5px;margin-bottom:6px}
.law span{display:block;font-size:34px;font-weight:800;color:#fff;line-height:1.1}
.law small{display:block;font-size:19px;color:#CDBBAE;margin-top:6px;line-height:1.3}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:22px}
.tile{background:#1C1512;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:22px 26px}
.tile b{display:block;font-size:50px;color:#FFC53D;margin-bottom:4px;letter-spacing:-.5px}
.tile span{font-size:22px;color:#D3C2B6;line-height:1.35}
.src{font-size:19px;color:#A8968A;margin-top:20px;line-height:1.45}
.flow{display:flex;align-items:stretch;gap:12px;margin-top:34px}
.flow div{background:#1C1512;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:16px 18px;font-size:21px;line-height:1.3;flex:1;color:#D3C2B6}
.flow div b{display:block;font-size:25px;color:#fff;margin-bottom:4px}
.flow div.hl{border-color:#FF8A4C;box-shadow:0 0 30px rgba(255,120,60,.35)}
.flow i{font-style:normal;color:#FFB37A;font-size:30px;align-self:center;flex:none}
.pills{margin-top:28px}
.pill{display:inline-block;padding:10px 22px;border-radius:999px;background:#241A15;border:1px solid rgba(255,255,255,.12);font-size:24px;margin:0 12px 12px 0;color:#F1E4DA}
.pill.g{border-color:rgba(126,231,135,.45);color:#B8F5C0}
"""


def page(body):
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body><div class="bg"></div>
<div class="brand">{ICON}Recordable</div>{body}</body></html>"""


def card(kicker, heading, lead='', extra='', big=False):
    h = 'h1' if big else 'h2'
    return page(f'<div class="card"><div class="kicker">{kicker}</div><{h}>{heading}</{h}>{f"<p class=lead>{lead}</p>" if lead else ""}{extra}</div>')


def law(name, clock, note):
    return f'<div class="law"><b>{name}</b><span>{clock}</span><small>{note}</small></div>'


HOOK = card('Codegeist 2026 · Apps for Specialized Industries', 'Every work injury<br>needs a call, on the clock.', '',
            '<div class="laws">'
            + law('Fatality', '8 hours', 'report to OSHA · 1904.39(a)(1)')
            + law('Amputation, eye, in-patient', '24 hours', 'report to OSHA · 1904.39(a)(2)')
            + law('Recordable case', '7 days', 'onto the 300 log · 1904.29(b)(3)')
            + law('300A summary', 'Feb 1', 'post until Apr 30 · 1904.32')
            + law('Electronic filing', 'Mar 2', 'where 1904.41 applies')
            + '</div><div class="grid">'
            '<div class="tile"><b>2.4M</b><span>work injuries and illnesses reported by US private employers in 2025 (BLS)</span></div>'
            '<div class="tile"><b>~25 a day</b><span>severe injury reports to federal OSHA in 2024: 9,034 (OSHA)</span></div>'
            '<div class="tile"><b>52,092</b><span>establishments that must file case data electronically each year (88 FR 47254)</span></div>'
            '<div class="tile"><b>$165,514</b><span>maximum penalty per willful or repeated violation (OSHA, 2026)</span></div>'
            '</div><div class="src">Sources: BLS Employer-Reported Workplace Injuries and Illnesses 2025 (Nov 2026); OSHA 2024 Annual Report of Severe Injury Reports; 88 FR 47254 (2023); osha.gov/penalties. Rules: 29 CFR Part 1904.</div>',
            big=True)

ARCH = card('How it works', 'A rules engine for 29 CFR 1904,<br>built on Forge.', '',
            '<div class="flow">'
            '<div><b>Portal form</b>JSM create property panel; answers saved on the request</div><i>→</i>'
            '<div class="hl"><b>Rules engine</b>1904.5-1904.11 and 1904.29, every step cited; questions, never guesses</div><i>→</i>'
            '<div><b>Clocks</b>8 / 24-hour OSHA report, 7-day log, day counts to 180</div><i>→</i>'
            '<div><b>Establishments in Assets</b>NAICS, headcount, hours</div><i>→</i>'
            '<div><b>300, 300A, 301, ITA</b>PDFs and OSHA\'s exact CSVs</div></div>'
            '<div class="pills"><span class="pill">Rovo agent + 5 actions + skill</span><span class="pill">Issue-created trigger, hourly clocks</span>'
            '<span class="pill">41 tests · 112 quotes checked against eCFR</span><span class="pill">JQL: oshaDecision = recordable</span>'
            '<span class="pill g">Runs on Atlassian · no egress</span><span class="pill g">Names and medical details stay in Jira</span></div>')

CLOSE = card('Recordable · OSHA recordkeeping on Jira Service Management', 'Every injury on the right<br>side of the line, on time.',
             'Built on Forge · Runs on Atlassian · Codegeist 2026', big=True)

ROVO_BG = page('<div class="card" style="padding:0 900px 110px 150px"><div class="kicker">Rovo · Recordable agent</div>'
              '<h2>Ask in plain words.<br>Get the rule.</h2><p class="lead">The agent uses the same engine and the same records, and cites its source. '
              'Changes, like entering a case on the log, wait for your confirmation.</p><div class="pills"><span class="pill">check recordability</span>'
              '<span class="pill">incidence rates</span><span class="pill">open cases</span><span class="pill">enter on the log</span><span class="pill">record days</span></div></div>')

QUESTION_BG = page('<div class="card" style="padding:0 900px 110px 150px"><div class="kicker">The request panel</div>'
                  '<h2>Questions,<br>never guesses.</h2><p class="lead">When the rules need a fact the report doesn\'t give, Recordable asks for it. '
                  'Here: the ibuprofen dose the clinic recommended. More than the label\'s 400 mg is prescription strength (OSHA FAQ 7-8).</p>'
                  '<div class="pills"><span class="pill">work-related?</span><span class="pill">fully recovered?</span><span class="pill">dose?</span><span class="pill">contaminated sharp?</span></div></div>')

SCENES = [
    dict(html=HOOK, on='Card: the OSHA clocks (8 hours, 24 hours, 7 days, Feb 1, Mar 2) and four sourced numbers (BLS 2.4M, 9,034 severe injury reports, 52,092 establishments, $165,514).',
         vo="A press operator loses a fingertip. The company has twenty-four hours to tell OSHA. And every cut, strain and needlestick "
            "needs a call: is it recordable, and on which line of the log? US employers reported two point four million work injuries "
            "and illnesses last year, and OSHA gets about twenty-five severe injury reports a day."),
    dict(clip=clip('clip-01-portal.mp4'), on="Live, customer portal: the 'Injury or illness' request with Recordable's form (JSM create property panel): name, job, workplace, date, place, what happened, care ticked (cleaned, stitches), clinic -> Send (wait cut).",
         edit=[(0.3, 4.0, 1), (4.0, 43.3, 1.9), (45.9, 48.2, 1)],
         vo="Meet Dana Kim, safety manager at Ridgeway Fabrication, on Jira Service Management. When Jordan cuts his hand on the shear "
            "table, he reports it on the portal with Recordable's injury form: where, when, what happened, and the care he got, in plain "
            "words. The wound was cleaned and stitched. His answers stay on the request, in Jira."),
    dict(clip=clip('clip-02-decision.mp4'), on="Live: the new request in Jira -> Recordable panel: 'Recordable: other recordable case (column J)', 'Enter it on the OSHA 300 log by Dec 4', the cited steps (cleaning = first aid C; sutures = medical treatment, 1904.7(b)(5)(ii)(D)) -> Enter on the 300 log (wait cut) -> case 2026-004, Form 301 PDF attached.",
         edit=[(0.3, 26.2, 1.15), (29.7, 38.0, 1.1)],
         vo="Recordable decides in seconds, applying OSHA's rule, twenty-nine C F R part nineteen-oh-four, one step at a time, with the "
            "citation for each. Cleaning the wound is first aid. Stitches are medical treatment, so the case is recordable; butterfly "
            "strips would not have been. It must go on the log within seven days. Dana enters it: case 2026-004, with the Form 301 "
            "incident report attached."),
    dict(clip=clip('clip-04-board.mp4'), on="Live: the Recordable page: KPIs (report to OSHA now, recordable not on the log, waiting for answers), the red alert 'Amputation · Plant 1, Dayton · due ... (22h left)', the cases table with clocks.",
         edit=[(0.3, 17.5, 1.1)],
         vo="Dana's Recordable page shows what needs her now: one event to report to OSHA, recordable cases not yet on the log, "
            "and questions waiting for answers."),
    dict(clip=clip('clip-05-report.mp4'), on="Live: the amputation request -> 'Report to OSHA by ... (24-hour clock)', OSHA's checklist prefilled from the report (establishment, location, time, names), how reported: Online, reference -> Record the report (wait cut) -> 'Reported to OSHA on time'.",
         edit=[(0.3, 23.7, 1.25), (25.8, 32.3, 1)],
         vo="That event is a fingertip amputation. OSHA must hear about it within twenty-four hours of when the company learned of it, "
            "and Recordable runs that clock in the plant's time zone. It lays out what OSHA will ask, already filled in from the "
            "report. Dana reports online, records the reference, and it's on time."),
    dict(clip=clip('clip-06-question.mp4'), on="Live: a strained shoulder -> '1 question before Recordable can decide': 'What single dose of ibuprofen was recommended (mg)? More than 400 mg, the single dose on the OTC label, is prescription strength.' -> 800 -> Answer (wait cut) -> 'prescription-strength dose recommended (medical treatment)'.",
         edit=[(0.3, 11.5, 1), (13.9, 19.35, 1)], layout='panel',
         vo="When a fact is missing, Recordable asks instead of guessing. The clinic recommended ibuprofen, but at what dose? More "
            "than the label's four hundred milligrams is prescription strength. Dana enters eight hundred, and the case is recordable."),
    dict(clip=clip('clip-07-log.mp4'), on="Live: OSHA 300 logs tab: Plant 1 (needlestick shown as 'Privacy case'), Plant 2 (rotator cuff '180+' days), Rates and hours chart, then Prepare 300, 300A and ITA files (wait cut) -> 'Year-end package attached to HR-...'.",
         edit=[(0.3, 25.8, 1.2), (31.6, 37.33, 1)],
         vo="Each plant's OSHA 300 log is built live from the cases. The needlestick is a privacy case, with no name. Days away stop at a "
            "hundred and eighty. Rates come from the hours worked. At year end, one click prepares the 300 log, the 300A summary and "
            "OSHA's electronic filing files, after checking which ones each plant must file."),
    dict(clip=clip('clip-09-rovo.mp4'), on="Live, zoomed on the Rovo panel: Recordable agent -> 'Is this recordable? He got 3 stitches and went back to work the same day.' -> Recordable, column J, sutures [29 CFR 1904.7(b)(5)(ii)(D)] -> 'What's our DART rate at Plant 2?' -> 4.48 year to date, formula, hours (Rovo waits cut).", layout='rovo',
         edit=[(0.3, 4.0, 1), (17.5, 27.3, 1.1), (38.0, 45.37, 1)],
         vo="Dana can also just ask Rovo. Is this recordable? He got three stitches and went back to work. The Recordable agent answers "
            "from the same rules, with the citation. What's our DART rate at Plant 2? Four point four eight, year to date, with the formula."),
    dict(html=ARCH, on='Card: architecture (portal form -> rules engine -> clocks -> establishments in Assets -> 300, 300A, 301, ITA files), Rovo, triggers, tests, runs on Atlassian, no egress.',
         vo="Under the hood: a deterministic rules engine for OSHA's recordkeeping rule, checked against the regulation and unit tested, "
            "on Forge. A structured portal form in Jira Service Management, establishments in Assets, triggers and hourly clocks, and a "
            "Rovo agent. It runs on Atlassian, and names and medical details never leave Jira."),
    dict(html=CLOSE, on="Card: close, 'Every injury on the right side of the line, on time.'", vo="Recordable. Every injury on the right side of the line, on time."),
]

# ---------------------------------------------------------------------------------------------------------------
CAP_HTML = """<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:1920px;height:200px;background:transparent;font-family:-apple-system,"SF Pro Display",system-ui,sans-serif}
.c{position:absolute;left:50%;bottom:26px;transform:translateX(-50%);max-width:1560px;width:max-content;background:rgba(8,11,18,.88);color:#fff;font-size:40px;font-weight:600;line-height:1.3;padding:12px 28px;border-radius:12px;text-align:center}</style></head><body><div class="c">{TEXT}</div></body></html>"""


def chunks(text, limit=64):
    """Caption-sized pieces: sentences (and clauses after a colon); long ones split into balanced parts at a comma or a
    space; very short pieces joined to a neighbour."""
    out = []
    for sent in re.split(r'(?<=[.!?:])\s+', text.strip()):
        n = -(-len(sent) // limit)
        while n > 1:
            target = len(sent) / n
            commas = [m.end() for m in re.finditer(r', ', sent) if abs(m.end() - target) < 14]
            cut = min(commas, key=lambda c: abs(c - target)) if commas else min(
                (m.end() for m in re.finditer(r' ', sent)), key=lambda c: abs(c - target))
            out.append(sent[:cut].strip())
            sent = sent[cut:].strip()
            n -= 1
        if sent:
            out.append(sent)
    lead = []
    for piece in out:  # a short lead-in ending with a colon goes with what follows it
        if lead and lead[-1].endswith(':') and len(lead[-1]) < 24 and len(lead[-1]) + 1 + len(piece) <= limit + 14:
            lead[-1] = lead[-1] + ' ' + piece
        else:
            lead.append(piece)
    merged = []
    for piece in lead:
        if merged and (len(piece) < 24 or len(merged[-1]) < 24) and not merged[-1].endswith(':') and len(merged[-1]) + 1 + len(piece) <= limit + 14:
            merged[-1] = merged[-1] + ' ' + piece
        else:
            merged.append(piece)
    return merged


def caption_png(text):
    """A transparent 1920x200 caption image, rendered by headless Chrome (cached)."""
    png = os.path.join(CAPS, hashlib.sha1(text.encode()).hexdigest()[:12] + '.png')
    if not os.path.exists(png):
        src = png.replace('.png', '.html')
        open(src, 'w').write(CAP_HTML.replace('{TEXT}', html.escape(text)))
        subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--default-background-color=00000000',
                        f'--user-data-dir={tempfile.mkdtemp()}', '--force-device-scale-factor=1', '--window-size=1920,200',
                        f'--screenshot={png}', 'file://' + src], check=True, capture_output=True)
    return png


def word_times(aiff, text):
    """Caption timing from the voice itself: `say` pauses at sentence and comma breaks, so split the audio at its
    silences and map them to the chunk boundaries; fall back to character share."""
    parts = chunks(text)
    d = dur(aiff)
    total = sum(len(p) for p in parts) or 1
    out, t = [], 0.3
    for p in parts:
        span = d * len(p) / total
        out.append((p, t, t + span))
        t += span
    # Snap each boundary to the nearest silence midpoint within 0.6 s.
    r = subprocess.run(['ffmpeg', '-i', aiff, '-af', 'silencedetect=n=-38dB:d=0.12', '-f', 'null', '-'], capture_output=True, text=True)
    sil, st = [], None
    for line in r.stderr.splitlines():
        if 'silence_start' in line:
            st = float(line.split('silence_start:')[1].split()[0])
        elif 'silence_end' in line and st is not None:
            sil.append((st + float(line.split('silence_end:')[1].split()[0])) / 2 + 0.3)
            st = None
    snapped = []
    for i, (p, a, b) in enumerate(out):
        if i < len(out) - 1 and sil:
            near = min(sil, key=lambda s: abs(s - b))
            if abs(near - b) < 0.6:
                b = near
        if snapped:
            a = snapped[-1][2]
        b = max(b, a + 0.5)
        snapped.append((p, a, b))
    return snapped


def overlay_chain(base, caps, first_input):
    """Filter text that lays each caption PNG (inputs first_input...) over `base` while it is spoken."""
    f, cur = '', base
    for k, (_, a, b) in enumerate(caps):
        nxt = f'cv{k}'
        f += f";[{cur}][{first_input + k}:v]overlay=0:H-200:enable='gte(t,{a:.3f})*lt(t,{b:.3f})'[{nxt}]"
        cur = nxt
    return f, cur


def dur(path):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True).stdout)


def freezes(path, min_len=2.5):
    """Static stretches in a clip (waiting for a page or Rovo), from ffmpeg freezedetect: [(start, end)]."""
    r = subprocess.run(['ffmpeg', '-i', path, '-vf', 'freezedetect=n=0.002:d=2', '-map', '0:v', '-f', 'null', '-'], capture_output=True, text=True)
    st, out = None, []
    for line in r.stderr.splitlines():
        if 'freeze_start' in line:
            st = float(line.split('freeze_start:')[1].split()[0])
        elif 'freeze_end' in line and st is not None:
            en = float(line.split('freeze_end:')[1].split()[0])
            if en - st >= min_len:
                out.append((st, en))
            st = None
    return out


ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2']
NORM = 'fps=30,format=yuv420p,setparams=range=tv:colorspace=unknown:color_primaries=unknown:color_trc=unknown'


def build():
    only = {int(x) for x in os.environ.get('RF_PARTS', '').split(',') if x}
    parts, srt, t, shots = [], [], 0.0, []
    for i, s in enumerate(SCENES, 1):
        aiff = os.path.join(OUT, f'vo-{i:02d}.aiff')
        seg_file = os.path.join(OUT, f'seg-{i:02d}.mp4')
        if not os.path.exists(aiff) or not only or i in only:
            subprocess.run(['say', '-v', VOICE, '-r', RATE, '-o', aiff, s['vo']], check=True)
        d = dur(aiff)
        caps = word_times(aiff, s['vo'])
        if only and i not in only and os.path.exists(seg_file):
            seg = dur(seg_file)
        elif 'html' in s:
            src = os.path.join(OUT, f'scene-{i:02d}.html')
            png = os.path.join(OUT, f'scene-{i:02d}.png')
            open(src, 'w').write(s['html'])
            subprocess.run([SHOT, src, '1920x1080', png], check=True, capture_output=True)
            seg = d + 1.1
            frames = int(seg * 30)
            vf = f"scale=3840:2160,zoompan=z='min(1+0.035*on/{frames},1.035)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s=1920x1080:fps=30"
            capf, last = overlay_chain('base', caps, 2)
            subprocess.run(['ffmpeg', '-y', '-loop', '1', '-i', png, '-i', aiff, *sum((['-i', caption_png(c[0])] for c in caps), []), '-filter_complex',
                            f'[0:v]{vf}[base]{capf};[{last}]{NORM}[v];[1:a]adelay=300|300,apad,atrim=0:{seg:.2f},aformat=sample_rates=48000:channel_layouts=stereo[a]',
                            '-map', '[v]', '-map', '[a]', '-t', f'{seg:.2f}', *ENC, seg_file], check=True, capture_output=True)
        else:
            full = dur(s['clip'])
            if 'edit' in s:
                keep = [(x, min(y, full), sp) for x, y, sp in s['edit']]
            else:
                # Real speed; cut long waits down to a short glimpse at the recorder's marks.
                keep, pos = [], 0.0
                for scene, a, z, head, tail in s.get('cuts', []):
                    m = MARKS.get(scene, {})
                    if a in m and z in m and m[z] - m[a] > head + tail + 0.5:
                        keep.append((pos, m[a] + head, 1))
                        pos = m[z] - tail
                keep.append((pos, full, 1))
            cd = sum((y - x) / sp for x, y, sp in keep)
            chain = ''.join(f'[0:v]trim={x:.2f}:{y:.2f},setpts=(PTS-STARTPTS)/{sp}[c{k}];' for k, (x, y, sp) in enumerate(keep))
            chain += ''.join(f'[c{k}]' for k in range(len(keep))) + f'concat=n={len(keep)}:v=1:a=0[cut];'
            seg = max(cd, d + 0.9)
            ins = ['-i', s['clip'], '-i', aiff]
            first_cap = 2
            pad = f'[cut]tpad=stop_mode=clone:stop_duration=60,trim=0:{seg:.2f},setpts=PTS-STARTPTS,fps=30'
            if s.get('layout') == 'panel':
                # The Recordable panel (issue sidebar, right of the clip) beside a title card.
                src = os.path.join(OUT, f'scene-{i:02d}-bg.html')
                bgp = os.path.join(OUT, f'scene-{i:02d}-bg.png')
                open(src, 'w').write(QUESTION_BG)
                subprocess.run([SHOT, src, '1920x1080', bgp], check=True, capture_output=True)
                ins += ['-loop', '1', '-i', bgp]
                first_cap = 3
                video = (pad + ',crop=644:1016:1236:64,scale=-2:1080[pz];'
                         f'[2:v]scale=1920:1080,format=rgba[bg];[bg][pz]overlay=1236:0:shortest=1,trim=0:{seg:.2f}[base]')
            elif s.get('layout') == 'rovo':
                # The Rovo panel (right edge of the 1920x1080 clip) beside a title card, so it fills the frame's height.
                src = os.path.join(OUT, f'scene-{i:02d}-bg.html')
                bgp = os.path.join(OUT, f'scene-{i:02d}-bg.png')
                open(src, 'w').write(ROVO_BG)
                subprocess.run([SHOT, src, '1920x1080', bgp], check=True, capture_output=True)
                ins += ['-loop', '1', '-i', bgp]
                first_cap = 3
                video = (pad + ',crop=588:1016:1332:64,scale=-2:1080[pz];'
                         f'[2:v]scale=1920:1080,format=rgba[bg];[bg][pz]overlay=1234:0:shortest=1,trim=0:{seg:.2f}[base]')
            else:
                video = pad + ',scale=1920:1080[base]'
            capf, last = overlay_chain('base', caps, first_cap)
            subprocess.run(['ffmpeg', '-y', *ins, *sum((['-i', caption_png(c[0])] for c in caps), []), '-filter_complex',
                            chain + video + f'{capf};[{last}]{NORM}[v];'
                            f'[1:a]adelay=300|300,apad,atrim=0:{seg:.2f},aformat=sample_rates=48000:channel_layouts=stereo[a]',
                            '-map', '[v]', '-map', '[a]', '-t', f'{seg:.2f}', *ENC, seg_file], check=True, capture_output=True)
            print(f'   clip {full:.1f}s -> {cd:.1f}s edited, segment {seg:.1f}s (vo {d:.1f}s)')
        # Review frames: a third and two thirds of the way in.
        for k, frac in enumerate((0.33, 0.8)):
            subprocess.run(['ffmpeg', '-y', '-ss', f'{seg * frac:.2f}', '-i', seg_file, '-frames:v', '1', os.path.join(FR, f'scene-{i:02d}-{k}.jpg')], check=True, capture_output=True)
        fmt = lambda x: f'{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{int(x % 60):02d},{int(round(x % 1 * 1000)) % 1000:03d}'
        for text, a, b in caps:
            srt.append(f'{len(srt) + 1}\n{fmt(t + a)} --> {fmt(t + b)}\n{text}\n')
        parts.append(seg_file)
        shots.append((i, t, seg, s.get('clip') and os.path.basename(s['clip']) or 'card'))
        t += seg
        print(f'scene {i:02d}: {seg:5.1f}s (vo {d:4.1f}s)  starts {int(shots[-1][1] // 60)}:{shots[-1][1] % 60:04.1f}')
    lst = os.path.join(OUT, 'list.txt')
    open(lst, 'w').write(''.join(f"file '{p}'\n" for p in parts))
    joined = os.path.join(OUT, 'joined.mp4')
    subprocess.run(['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', joined], check=True, capture_output=True)
    final = os.path.join(OUT, 'recordable-final.mp4')
    # Master: video as built (CRF 20), audio normalised to -16 LUFS.
    subprocess.run(['ffmpeg', '-y', '-i', joined, '-c:v', 'copy', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
                    '-movflags', '+faststart', final], check=True, capture_output=True)
    os.remove(joined)
    open(os.path.join(OUT, 'recordable-final.srt'), 'w').write('\n'.join(srt))
    json.dump([dict(scene=i, start=round(a, 2), length=round(l, 2), source=src) for i, a, l, src in shots], open(os.path.join(OUT, 'shots.json'), 'w'), indent=1)
    if not only:
        shotlist(shots)
    total = dur(final)
    print(f'{final}: {total:.1f}s, {os.path.getsize(final) / 1e6:.1f} MB')
    upload(final, total)


def shotlist(shots):
    """video/SHOTLIST.md: one row per scene with its start time, source, voice-over and what is on screen."""
    mmss = lambda x: f'{int(x // 60)}:{x % 60:04.1f}'
    rows = ['| # | Start | Length | Source | On screen | Voice-over |', '|---|---|---|---|---|---|']
    for (i, a, l, src), s in zip(shots, SCENES):
        rows.append(f"| {i} | {mmss(a)} | {l:.1f}s | {src} | {s.get('on', '')} | {s['vo']} |")
    end = shots[-1][1] + shots[-1][2]
    head = (f'# Recordable demo: shot list\n\nBuilt by `video/scenes.py` from live clips (`video/rec-recordable.mjs` via `video/rec-run.mjs`, recorded on '
            f'the development site) and HTML cards. Total {mmss(end)}. Voice: macOS `say -v "Ava (Premium)" -r 165`; captions burned in and in '
            f'`out/recordable-final.srt`; audio loudnorm -16 LUFS.\n\nIn the recordings only: the account name shows as the persona "Dana Kim", '
            f'the portal reporter as "Jordan Ellis", and other apps\' buttons and sidebar sections and the sample guide are hidden with CSS/JS. '
            f'Waits (the issue-created trigger, saving, Rovo thinking) are cut; typing plays at up to 1.9x (ranges in `scenes.py`).\n\n')
    open(os.path.join(HERE, 'SHOTLIST.md'), 'w').write(head + '\n'.join(rows) + '\n')


def upload(final, total, target_mb=9.2):
    """A copy under the 10 MB upload cap: 1080p, 15 fps, two-pass x264 at the bitrate that lands on target_mb."""
    up = os.path.join(OUT, 'recordable-upload.mp4')
    abr = 96
    vbr = int(target_mb * 8e3 / total - abr - 4)
    log = os.path.join(OUT, 'x264pass')
    common = ['-c:v', 'libx264', '-preset', 'slow', '-tune', 'stillimage', '-b:v', f'{vbr}k', '-r', '15', '-pix_fmt', 'yuv420p', '-passlogfile', log]
    subprocess.run(['ffmpeg', '-y', '-i', final, *common, '-pass', '1', '-an', '-f', 'mp4', '/dev/null'], check=True, capture_output=True)
    subprocess.run(['ffmpeg', '-y', '-i', final, *common, '-pass', '2', '-c:a', 'aac', '-b:a', f'{abr}k', '-movflags', '+faststart', up], check=True, capture_output=True)
    for f in os.listdir(OUT):
        if f.startswith('x264pass'):
            os.remove(os.path.join(OUT, f))
    print(f'{up}: {os.path.getsize(up) / 1e6:.2f} MB at {vbr} kb/s video')


if __name__ == '__main__':
    build()
