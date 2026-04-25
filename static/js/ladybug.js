(function () {
    'use strict';

    var bug = document.getElementById('ladybug-container');
    if (!bug) return; // Only run on pages that include the ladybug partial

    var pill = document.getElementById('ladybug-message');
    var particlesHost = document.getElementById('ladybug-particles-host');

    // Position state
    var x = window.innerWidth / 2;
    var y = window.innerHeight / 2;

    // Angle in radians. 0 = facing UP in the SVG.
    // dx = sin(angle), dy = -cos(angle)
    var angle = Math.random() * Math.PI * 2;

    var speed = 2.5;
    var currentSpeed = 0;
    var currentTurnRate = 0;
    var state = 'moving';   // 'moving' | 'stopped' | 'flying' | 'angry' | 'logo' | 'h1feast' | 'tooltile' | 'hibernate'
    var stateTimer = 0;
    var logoSub = 'approach'; // 'approach' | 'sit' | 'scratch' (only when state === 'logo')
    var hibernateSub = 'approach'; // 'approach' | 'sleep' (only when state === 'hibernate')
    var logoCooldown = 1200; // frames after load / after a visit before next chance
    var h1Sub = 'approach'; // 'approach' | 'biting' (state === 'h1feast')
    var h1BiteJitter = 0;
    var h1BitesTotal = 0;
    var h1FeastFrames = 0;
    var h1FeastCooldown = 0; // after a title feast, wait before hunger can trigger again
    var hunger = 0; // rises while wandering; when high, she heads for the h1 title
    var h1RestoreGeneration = 0; // invalidates pending title restore if a new feast ends

    var toolSub = 'approach'; // 'approach' | 'sit' | 'play' (state === 'tooltile')
    var toolTileEl = null; // .neumorphic-button she landed on
    var toolTileCooldown = 1000; // like logo — wait before next card visit
    var toolPlayMotesDone = false;
    var toolJokeIndex = 0;

    var bugSize = 40;
    var currentScale = 1;
    var currentLift = 0;
    var ambientTime = 0;
    var hibernateSleepPillUntil = 0;
    var hibernateSleepSlot = 0;
    var hibernateRelocateCooldown = 0;

    var annoyance = 0;
    var isCursorDestroyed = false;

    var mouseX = -1000;
    var mouseY = -1000;

    // Document scroll: move bug opposite delta so it stays “on” the page; clamping can annoy it (like the reference).
    var lastScrollX = 0;
    var lastScrollY = 0;

    var stateClasses = [
        'ladybug-state-moving',
        'ladybug-state-stopped',
        'ladybug-state-flying',
        'ladybug-state-angry',
        'ladybug-state-scared',
        'ladybug-state-logo',
        'ladybug-state-h1feast',
        'ladybug-state-tooltile',
        'ladybug-state-hibernate'
    ];

    var toolJokeLines = [
        'Certified click inspector: “{{n}}” gets a gold star. ⭐',
        'Bug-tested: {{n}}. Shipping confidence +7%.',
        'She’s naming her band “{{n}} & The Spots.”',
        'Hot take: {{n}} pairs well with this exact ladybug.',
        'Quality assurance is just a wing-flap for “{{n}}.”',
        'Throwing some hype at “{{n}}” — *yeet!*',
        'She read the label. {{n}} still scares the cursor. OK.',
        'Micro-endorsement: “{{n}} & chill.”'
    ];

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function normalizeAngle(rad) {
        var out = rad;
        while (out > Math.PI) out -= Math.PI * 2;
        while (out < -Math.PI) out += Math.PI * 2;
        return out;
    }

    function steerToward(targetAngle, maxTurn, damping) {
        var diff = normalizeAngle(targetAngle - angle);
        angle += clamp(diff, -maxTurn, maxTurn) * damping;
        currentTurnRate = currentTurnRate * 0.85 + diff * 0.02;
    }

    function isDarkTheme() {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    }

    function getLogoAnchor() {
        return document.getElementById('ladybug-logo-anchor');
    }

    function getThemeToggle() {
        return document.getElementById('theme-toggle');
    }

    /** Sleep roosts (header): Home, About, first H1 char, theme toggle, sup script char — then fallback #theme-toggle. */
    function getHibernateSleepTargetBySlot(slot) {
        var n = slot % 5;
        var el = null;
        if (n === 0) {
            el = document.querySelector('.main-navigation .nav-list a.nav-link[href="/"]');
        } else if (n === 1) {
            el = document.querySelector('.main-navigation .nav-list a.nav-link[href="/about-us"]');
        } else if (n === 2) {
            var h = getH1BiteTarget();
            el = h ? h.querySelector('.ladybug-h1-char:not(.ladybug-h1-char-sup)') : null;
        } else if (n === 3) {
            el = getThemeToggle();
        } else if (n === 4) {
            var h2 = getH1BiteTarget();
            if (h2) {
                var sups = h2.querySelectorAll('sup .ladybug-h1-char-sup');
                if (sups.length) {
                    el = sups[Math.min(4, sups.length - 1)];
                }
            }
        }
        if (el) {
            var r = el.getBoundingClientRect();
            if (r.width > 1 && r.height > 0.5) {
                return el;
            }
        }
        var fb = getThemeToggle();
        if (fb && fb.getBoundingClientRect().width > 1) {
            return fb;
        }
        return null;
    }

    function hibernatePerchForElement(el) {
        var r = el.getBoundingClientRect();
        return {
            px: r.left + r.width * 0.5 - bugSize * 0.5,
            py: r.top - bugSize * 0.26
        };
    }

    function setHibernateThemeSnoozeClass(on) {
        var t = getThemeToggle();
        if (!t) return;
        if (on) {
            t.classList.add('ladybug-theme-snoozing');
        } else {
            t.classList.remove('ladybug-theme-snoozing');
        }
    }

    function endHibernateVisit() {
        if (state !== 'hibernate') return;
        hibernateSleepPillUntil = 0;
        hibernateRelocateCooldown = 0;
        state = 'moving';
        hibernateSub = 'approach';
        stateTimer = 100;
        bug.classList.remove('ladybug-flying', 'ladybug-scratching', 'ladybug-sleeping', 'ladybug-angry');
        setHibernateThemeSnoozeClass(false);
    }

    function beginHibernateFromTheme() {
        if (state === 'hibernate') return;
        if (!getHibernateSleepTargetBySlot(0)) return;
        if (isCursorDestroyed) return;

        if (state === 'tooltile') endToolTileVisit();
        if (state === 'h1feast') endH1Feast(true);
        if (state === 'logo') endLogoVisit();
        if (state === 'angry') {
            bug.classList.remove('ladybug-flying', 'ladybug-angry');
            annoyance = 0;
        }

        bug.classList.remove('ladybug-flying', 'ladybug-scratching', 'ladybug-sleeping', 'ladybug-angry');
        clearLogoAnchorClasses();

        currentSpeed = 0;
        currentTurnRate = 0;

        hibernateSleepPillUntil = 0;
        hibernateSleepSlot = 0;
        hibernateRelocateCooldown = 0;

        state = 'hibernate';
        hibernateSub = 'approach';
        stateTimer = 0;
    }

    function clearLogoAnchorClasses() {
        var a = getLogoAnchor();
        if (a) {
            a.classList.remove('ladybug-logo-perched', 'ladybug-logo-imbalance');
        }
        bug.classList.remove('ladybug-scratching');
    }

    function endLogoVisit() {
        if (state !== 'logo') return;
        state = 'moving';
        logoSub = 'approach';
        stateTimer = 100;
        logoCooldown = 2000 + Math.floor(Math.random() * 900);
        bug.classList.remove('ladybug-flying', 'ladybug-scratching', 'ladybug-sleeping');
        clearLogoAnchorClasses();
    }

    function getH1BiteTarget() {
        return document.getElementById('ladybug-h1-bite-target');
    }

    function initH1BiteTarget() {
        var h1 = getH1BiteTarget();
        if (!h1 || h1.getAttribute('data-ladybug-wrapped')) return;
        h1.setAttribute('data-ladybug-title-backup', h1.innerHTML);
        var out = document.createDocumentFragment();
        var i;
        for (i = 0; i < h1.childNodes.length; i++) {
            var n = h1.childNodes[i];
            if (n.nodeType === 3) {
                var t = n.textContent;
                for (var j = 0; j < t.length; j++) {
                    var c = t[j];
                    if (c === '\n') continue;
                    if (c === ' ') {
                        out.appendChild(document.createTextNode(' '));
                        continue;
                    }
                    var sp = document.createElement('span');
                    sp.className = 'ladybug-h1-char';
                    sp.textContent = c;
                    out.appendChild(sp);
                }
            } else if (n.nodeType === 1 && n.tagName === 'SUP') {
                var spEl = n.cloneNode(false);
                if (n.getAttribute('style')) spEl.setAttribute('style', n.getAttribute('style'));
                var st = n.textContent;
                for (var k = 0; k < st.length; k++) {
                    var c2 = st[k];
                    if (c2 === ' ') {
                        spEl.appendChild(document.createTextNode(' '));
                        continue;
                    }
                    var s2 = document.createElement('span');
                    s2.className = 'ladybug-h1-char ladybug-h1-char-sup';
                    s2.textContent = c2;
                    spEl.appendChild(s2);
                }
                out.appendChild(spEl);
            }
        }
        h1.innerHTML = '';
        h1.appendChild(out);
        h1.setAttribute('data-ladybug-wrapped', '1');
    }

    function restoreH1AndRewrap() {
        var h1 = getH1BiteTarget();
        if (!h1) return;
        var backup = h1.getAttribute('data-ladybug-title-backup');
        if (backup) {
            h1.innerHTML = backup;
        }
        h1.removeAttribute('data-ladybug-wrapped');
        h1.removeAttribute('data-ladybug-title-restore-pending');
        initH1BiteTarget();
    }

    function endH1Feast(immediateRestore) {
        if (state !== 'h1feast') return;
        h1BitesTotal = 0;
        h1FeastFrames = 0;
        h1BiteJitter = 0;
        h1Sub = 'approach';
        state = 'moving';
        stateTimer = 120;
        h1FeastCooldown = 3200;
        hunger = 0;
        h1RestoreGeneration += 1;
        var gen = h1RestoreGeneration;
        if (immediateRestore) {
            restoreH1AndRewrap();
        } else {
            setTimeout(function () {
                if (gen === h1RestoreGeneration) {
                    restoreH1AndRewrap();
                }
            }, 4000);
        }
        bug.classList.remove('ladybug-flying');
    }

    function getUneatenH1Chars() {
        var h1 = getH1BiteTarget();
        if (!h1) return [];
        return h1.querySelectorAll('.ladybug-h1-char:not(.ladybug-h1-char-eaten)');
    }

    function spawnLeafBiteCrumbs(cx, cy) {
        if (!particlesHost) return;
        var m = 8;
        for (var i = 0; i < m; i++) {
            var a = Math.random() * Math.PI * 2;
            var d = 12 + Math.random() * 32;
            var p = document.createElement('span');
            p.className = 'ladybug-chomp-particle';
            p.style.width = (2 + Math.random() * 3) + 'px';
            p.style.height = p.style.width;
            p.style.left = cx + 'px';
            p.style.top = cy + 'px';
            p.style.setProperty('--lb-tx', (Math.cos(a) * d) + 'px');
            p.style.setProperty('--lb-ty', (Math.sin(a) * d) + 'px');
            p.style.background = chompColors[i % chompColors.length];
            p.style.animationDuration = (0.4 + Math.random() * 0.15) + 's';
            particlesHost.appendChild(p);
            (function (el) {
                setTimeout(function () { if (el.parentNode) el.remove(); }, 700);
            })(p);
        }
    }

    function getToolName(el) {
        if (!el) return 'this tool';
        var sp = el.querySelector('span');
        if (sp && sp.textContent) return sp.textContent.replace(/\s+/g, ' ').trim();
        var al = el.getAttribute('aria-label') || '';
        var parts = al.split(' - ');
        if (parts[0]) return parts[0].trim();
        return 'this tool';
    }

    function pickRandomToolButton() {
        var nodes = document.querySelectorAll('main#main-content .button-grid a.neumorphic-button');
        var list = [];
        var i;
        for (i = 0; i < nodes.length; i++) {
            var r = nodes[i].getBoundingClientRect();
            if (r.width > 24 && r.height > 24) {
                list.push(nodes[i]);
            }
        }
        if (list.length === 0) return null;
        return list[Math.floor(Math.random() * list.length)];
    }

    function spawnToolTextMotes(cx, cy) {
        if (!particlesHost) return;
        var words = ['nice!', 'haha', 'click!', '+1', 'ok??', 'yeet', 'hehe', 'wow', 'A+', 'beep', 'lfg'];
        var k;
        for (k = 0; k < 6; k++) {
            var w = document.createElement('div');
            w.className = 'ladybug-tool-mote';
            w.textContent = words[Math.floor(Math.random() * words.length)];
            w.style.left = (cx + (Math.random() - 0.5) * 36) + 'px';
            w.style.top = (cy + (Math.random() - 0.5) * 18) + 'px';
            w.style.setProperty('--lb-tmx', (Math.random() * 44 - 22) + 'px');
            w.style.setProperty('--lb-tmy', (-45 - Math.random() * 35) + 'px');
            w.style.animationDelay = (k * 0.06) + 's';
            particlesHost.appendChild(w);
            (function (el) {
                setTimeout(function () { if (el.parentNode) el.remove(); }, 1200);
            })(w);
        }
    }

    function endToolTileVisit() {
        if (toolTileEl) {
            toolTileEl.classList.remove('ladybug-sat-tile', 'ladybug-tile-boogie');
        }
        toolTileEl = null;
        toolSub = 'approach';
        toolPlayMotesDone = false;
        if (state === 'tooltile') {
            state = 'moving';
            stateTimer = 100;
        }
        toolTileCooldown = 2000 + Math.floor(Math.random() * 1000);
        bug.classList.remove('ladybug-flying', 'ladybug-scratching');
    }

    function setVisualStateClasses(activeState, scared) {
        bug.classList.remove.apply(bug.classList, stateClasses);
        bug.classList.remove('ladybug-scratching', 'ladybug-sleeping');
        if (activeState === 'logo') {
            bug.classList.add('ladybug-state-logo');
            if (logoSub === 'scratch') {
                bug.classList.add('ladybug-scratching');
            }
        } else if (activeState === 'hibernate') {
            bug.classList.add('ladybug-state-hibernate');
            if (hibernateSub === 'sleep') {
                bug.classList.add('ladybug-sleeping');
            }
        } else if (activeState === 'h1feast') {
            bug.classList.add('ladybug-state-h1feast');
        } else if (activeState === 'tooltile') {
            bug.classList.add('ladybug-state-tooltile');
        } else {
            bug.classList.add('ladybug-state-' + activeState);
        }
        if (scared) bug.classList.add('ladybug-state-scared');
    }

    var chompColors = ['#dc2626', '#991b1b', '#1e293b', '#0f172a', '#f87171', '#cbd5e1'];

    function spawnEatParticles(cx, cy) {
        if (!particlesHost) return;
        var i;
        var angle;
        var dist;
        var tx;
        var ty;
        var p;

        for (i = 0; i < 22; i++) {
            angle = Math.random() * Math.PI * 2;
            dist = 35 + Math.random() * 100;
            tx = Math.cos(angle) * dist;
            ty = Math.sin(angle) * dist;
            p = document.createElement('span');
            p.className = 'ladybug-chomp-particle' + (Math.random() > 0.55 ? ' ladybug-chomp-crumb' : '');
            p.style.left = cx + 'px';
            p.style.top = cy + 'px';
            p.style.setProperty('--lb-tx', tx + 'px');
            p.style.setProperty('--lb-ty', ty + 'px');
            p.style.animationDelay = (i * 0.015) + 's';
            p.style.background = chompColors[i % chompColors.length];
            particlesHost.appendChild(p);
            (function (el) {
                setTimeout(function () {
                    if (el.parentNode) el.parentNode.removeChild(el);
                }, 900);
            })(p);
        }

        for (i = 0; i < 10; i++) {
            angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.35;
            dist = 55 + Math.random() * 45;
            tx = Math.cos(angle) * dist;
            ty = Math.sin(angle) * dist;
            p = document.createElement('span');
            p.className = 'ladybug-chomp-particle';
            p.style.left = cx + 'px';
            p.style.top = cy + 'px';
            p.style.setProperty('--lb-tx', tx + 'px');
            p.style.setProperty('--lb-ty', ty + 'px');
            p.style.width = (3 + Math.random() * 3) + 'px';
            p.style.height = p.style.width;
            p.style.background = '#fef2f2';
            p.style.boxShadow = '0 0 4px rgba(220, 38, 38, 0.6)';
            p.style.animationDuration = (0.55 + Math.random() * 0.2) + 's';
            particlesHost.appendChild(p);
            (function (el) {
                setTimeout(function () {
                    if (el.parentNode) el.parentNode.removeChild(el);
                }, 900);
            })(p);
        }

        var ring = document.createElement('div');
        ring.className = 'ladybug-chomp-shock';
        ring.style.left = cx + 'px';
        ring.style.top = cy + 'px';
        particlesHost.appendChild(ring);
        setTimeout(function () {
            if (ring.parentNode) ring.parentNode.removeChild(ring);
        }, 500);
    }

    // ---------- Message pill helpers ----------

    var currentMessage = '';

    function showMessage(msg, type) {
        if (currentMessage === msg) return;
        currentMessage = msg;
        pill.textContent = msg;
        pill.classList.remove('is-warning', 'is-danger');
        if (type === 'danger')  pill.classList.add('is-danger');
        if (type === 'warning') pill.classList.add('is-warning');
        pill.classList.add('is-visible');
    }

    function hideMessage() {
        if (currentMessage === '') return;
        currentMessage = '';
        pill.classList.remove('is-visible', 'is-warning', 'is-danger');
    }

    // ---------- Mouse / click listeners ----------

    window.addEventListener('mousemove', function (e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    document.addEventListener('mouseleave', function () {
        mouseX = -1000;
        mouseY = -1000;
    });

    window.addEventListener('click', function (e) {
        if (state === 'h1feast') {
            endH1Feast(true);
        }
        if (state === 'tooltile') {
            endToolTileVisit();
        }
        if (state === 'logo') {
            endLogoVisit();
        }
        if (state === 'hibernate') {
            if (!isDarkTheme()) {
                var onThemeToggle = e.target && e.target.closest && e.target.closest('#theme-toggle');
                if (!onThemeToggle) {
                    endHibernateVisit();
                }
            }
            return;
        }

        var clickX = e.clientX || mouseX;
        var clickY = e.clientY || mouseY;

        state = 'flying';
        bug.classList.add('ladybug-flying');
        stateTimer = 180;

        var bugCenterX = x + bugSize / 2;
        var bugCenterY = y + bugSize / 2;
        var dxClick = bugCenterX - clickX;
        var dyClick = bugCenterY - clickY;

        if (dxClick === 0 && dyClick === 0) {
            angle = Math.random() * Math.PI * 2;
        } else {
            angle = Math.atan2(dxClick, -dyClick);
        }
    });

    function onScrollDrag() {
        var cx = window.scrollX || window.pageXOffset || 0;
        var cy = window.scrollY || window.pageYOffset || 0;
        var deltaX = cx - lastScrollX;
        var deltaY = cy - lastScrollY;

        lastScrollX = cx;
        lastScrollY = cy;

        if (deltaX === 0 && deltaY === 0) {
            return;
        }

        // Perch / feast / tile: position is driven from layout each frame — skip scroll carry.
        if (state === 'logo' || state === 'h1feast' || state === 'tooltile' || state === 'hibernate') {
            return;
        }

        x -= deltaX;
        y -= deltaY;

        var forcedToEdge = false;
        var maxX = window.innerWidth - bugSize;
        var maxY = window.innerHeight - bugSize;

        if (x < 0) {
            x = 0;
            forcedToEdge = true;
        } else if (x > maxX) {
            x = maxX;
            forcedToEdge = true;
        }

        if (y < 0) {
            y = 0;
            forcedToEdge = true;
        } else if (y > maxY) {
            y = maxY;
            forcedToEdge = true;
        }

        if (forcedToEdge && state !== 'angry' && !isCursorDestroyed) {
            annoyance += (Math.abs(deltaX) + Math.abs(deltaY)) * 0.1;
            if (annoyance > 150) {
                state = 'angry';
                bug.classList.add('ladybug-flying', 'ladybug-angry');
            }
        }
    }

    window.addEventListener('scroll', onScrollDrag, { passive: true });

    if (typeof MutationObserver !== 'undefined') {
        (new MutationObserver(function () {
            var t = document.documentElement.getAttribute('data-theme');
            if (t === 'dark') {
                beginHibernateFromTheme();
            } else {
                if (state === 'hibernate') {
                    endHibernateVisit();
                }
            }
        })).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }

    // ---------- Animation loop ----------

    function animateLoop() {
        ambientTime += 1;
        if (hibernateRelocateCooldown > 0) {
            hibernateRelocateCooldown--;
        }

        var bugCenterX = x + bugSize / 2;
        var bugCenterY = y + bugSize / 2;
        var dxMouse = bugCenterX - mouseX;
        var dyMouse = bugCenterY - mouseY;
        var distanceToMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

        // Annoyance accumulation
        if (!isCursorDestroyed && state !== 'angry' && state !== 'logo' && state !== 'h1feast' && state !== 'tooltile' && state !== 'hibernate') {
            if (distanceToMouse < 150) {
                annoyance += 1.5;
            } else if (annoyance > 0) {
                annoyance -= 0.5;
            }
            if (annoyance > 150) {
                state = 'angry';
                bug.classList.add('ladybug-flying', 'ladybug-angry');
            }
        }

        var isScared = distanceToMouse < 120 &&
                       state !== 'flying' &&
                       state !== 'angry' &&
                       state !== 'logo' &&
                       state !== 'h1feast' &&
                       state !== 'tooltile' &&
                       state !== 'hibernate' &&
                       !isCursorDestroyed;

        if (state === 'h1feast' && distanceToMouse < 75) {
            endH1Feast(true);
        }

        if (state === 'logo' && distanceToMouse < 80) {
            endLogoVisit();
        }

        if (state === 'hibernate' && distanceToMouse < 72 && !isDarkTheme()) {
            endHibernateVisit();
        }

        if (isDarkTheme() && state === 'hibernate' && hibernateSub === 'sleep' && distanceToMouse < 76 && hibernateRelocateCooldown <= 0) {
            hibernateSleepSlot = (hibernateSleepSlot + 1) % 5;
            hibernateSub = 'approach';
            hibernateRelocateCooldown = 52;
            setHibernateThemeSnoozeClass(false);
        }

        if (state === 'tooltile' && distanceToMouse < 72) {
            endToolTileVisit();
        }

        if (state !== 'h1feast' && state !== 'logo' && state !== 'angry' && state !== 'tooltile' && state !== 'hibernate' && !isCursorDestroyed) {
            hunger = Math.min(100, hunger + 0.014);
        }
        if (h1FeastCooldown > 0) {
            h1FeastCooldown--;
        }

        if ((state === 'moving' || state === 'stopped') && state !== 'tooltile') {
            if (hunger >= 68 && h1FeastCooldown <= 0) {
                initH1BiteTarget();
                if (getUneatenH1Chars().length > 0) {
                    state = 'h1feast';
                    h1Sub = 'approach';
                    h1BiteJitter = 0;
                    h1FeastFrames = 0;
                } else {
                    restoreH1AndRewrap();
                    hunger = 0;
                }
            }
        }

        // Message pill
        if (isCursorDestroyed) {
            showMessage('Cursor eaten! Recovering... 🪲', 'danger');
        } else if (state === 'angry') {
            showMessage("IT'S ANGRY! RUN! 😡", 'danger');
        } else if (state === 'hibernate' && hibernateSub === 'sleep' && ambientTime < hibernateSleepPillUntil) {
            showMessage('Zzz… 🌙', 'normal');
        } else if (annoyance > 100) {
            showMessage('It\'s getting very annoyed... 😠', 'warning');
        } else if (annoyance > 40) {
            showMessage('You\'re bothering it...', 'warning');
        } else if (isScared) {
            showMessage('You scared it! 💨', 'warning');
        } else if (state === 'flying') {
            showMessage('Taking flight! 🪽', 'normal');
        } else if (state === 'tooltile' && toolTileEl) {
            var pillName2 = getToolName(toolTileEl);
            if (toolSub === 'approach') {
                showMessage('Diving toward a tool card... 🛬', 'normal');
            } else if (toolSub === 'play') {
                showMessage('Word confetti @ ' + pillName2 + ' — *yeet* 🎊', 'normal');
            } else {
                showMessage(toolJokeLines[toolJokeIndex].split('{{n}}').join(pillName2), 'normal');
            }
        } else if (state === 'h1feast') {
            if (h1Sub === 'biting') {
                showMessage('Chomp! Hungry for letters... 🌿', 'warning');
            } else {
                showMessage('So hungry... heading for the title! 🥬', 'warning');
            }
        } else if (hunger > 38 && state !== 'angry' && state !== 'h1feast' && state !== 'logo' && state !== 'tooltile' && state !== 'hibernate') {
            showMessage('Getting hungry...', 'warning');
        } else {
            hideMessage();
        }

        // --- State behaviour ---

        if (state === 'h1feast') {
            h1FeastFrames++;
            var h1El = getH1BiteTarget();
            var rH1 = h1El ? h1El.getBoundingClientRect() : null;
            if (!rH1 || rH1.width < 4) {
                endH1Feast(true);
            } else {
                var perchH1X = rH1.left + rH1.width * 0.36 - bugSize * 0.5;
                var perchH1Y = rH1.top - bugSize * 0.16;

                if (h1Sub === 'approach') {
                    var hdx = perchH1X - x;
                    var hdy = perchH1Y - y;
                    var h1dist = Math.sqrt(hdx * hdx + hdy * hdy);
                    if (h1dist < 5) {
                        x = perchH1X;
                        y = perchH1Y;
                        angle = Math.PI;
                        currentSpeed = 0;
                        speed = 0;
                        h1Sub = 'biting';
                        h1BiteJitter = 4;
                        bug.classList.add('ladybug-flying');
                    } else {
                        bug.classList.add('ladybug-flying');
                        speed = 4.4;
                        var hGoal = Math.atan2(hdx, -hdy);
                        var hDiff = normalizeAngle(hGoal - angle);
                        angle += clamp(hDiff, -0.2, 0.2) * 0.92;
                        currentSpeed += (speed - currentSpeed) * 0.15;
                        x += Math.sin(angle) * currentSpeed;
                        y += -Math.cos(angle) * currentSpeed;
                    }
                } else if (h1Sub === 'biting') {
                    x = perchH1X + Math.sin(ambientTime * 0.52) * 2.6;
                    y = perchH1Y + Math.sin(ambientTime * 0.38) * 0.45;
                    angle = Math.PI + Math.sin(ambientTime * 0.35) * 0.3;
                    currentSpeed = 0;
                    speed = 0;
                    bug.classList.add('ladybug-flying');
                    h1BiteJitter -= 1;
                    if (h1BiteJitter <= 0) {
                        h1BiteJitter = 9 + Math.floor(Math.random() * 12);
                        var chList = getUneatenH1Chars();
                        if (chList.length === 0) {
                            endH1Feast(false);
                        } else {
                            var pick = chList[Math.floor(Math.random() * chList.length)];
                            pick.classList.add('ladybug-h1-char-eaten');
                            var br = pick.getBoundingClientRect();
                            spawnLeafBiteCrumbs(br.left + br.width * 0.5, br.top + br.height * 0.5);
                            hunger = Math.max(0, hunger - 5);
                            h1BitesTotal++;
                            if (hunger < 5 || h1FeastFrames > 720 || h1BitesTotal > 48) {
                                endH1Feast(false);
                            }
                        }
                    }
                }
            }
        } else if (state === 'tooltile') {
            if (!toolTileEl || !document.body.contains(toolTileEl)) {
                endToolTileVisit();
            } else {
                var rTf = toolTileEl.getBoundingClientRect();
                if (rTf.width < 6) {
                    endToolTileVisit();
                } else {
                    var tpX = rTf.left + rTf.width * 0.5 - bugSize * 0.5;
                    var tpY = rTf.top - bugSize * 0.11;

                    if (toolSub === 'approach') {
                        bug.classList.add('ladybug-flying');
                        var tdx = tpX - x;
                        var tdy = tpY - y;
                        var td0 = Math.sqrt(tdx * tdx + tdy * tdy);
                        if (td0 < 5) {
                            x = tpX;
                            y = tpY;
                            angle = Math.PI;
                            currentSpeed = 0;
                            speed = 0;
                            toolSub = 'sit';
                            stateTimer = 85 + Math.floor(Math.random() * 55);
                            toolPlayMotesDone = false;
                            toolJokeIndex = Math.floor(Math.random() * toolJokeLines.length);
                            if (toolTileEl) {
                                toolTileEl.classList.add('ladybug-sat-tile');
                            }
                        } else {
                            speed = 4.3;
                            var tga = Math.atan2(tdx, -tdy);
                            var tdf = normalizeAngle(tga - angle);
                            angle += clamp(tdf, -0.2, 0.2) * 0.92;
                            currentSpeed += (speed - currentSpeed) * 0.15;
                            x += Math.sin(angle) * currentSpeed;
                            y += -Math.cos(angle) * currentSpeed;
                        }
                    } else if (toolSub === 'sit') {
                        x = tpX + Math.sin(ambientTime * 0.35) * 1.2;
                        y = tpY;
                        angle = Math.PI;
                        currentSpeed = 0;
                        speed = 0;
                        bug.classList.remove('ladybug-scratching');
                        stateTimer--;
                        if (stateTimer <= 0) {
                            toolSub = 'play';
                            stateTimer = 78 + Math.floor(Math.random() * 50);
                            toolPlayMotesDone = false;
                        }
                    } else if (toolSub === 'play') {
                        if (!toolPlayMotesDone) {
                            toolPlayMotesDone = true;
                            spawnToolTextMotes(x + bugSize * 0.5, y + bugSize * 0.35);
                        }
                        x = tpX + Math.sin(ambientTime * 0.65) * 2.4;
                        y = tpY + Math.sin(ambientTime * 0.5) * 0.7;
                        angle = Math.PI + Math.sin(ambientTime * 0.4) * 0.24;
                        currentSpeed = 0;
                        speed = 0;
                        bug.classList.add('ladybug-flying', 'ladybug-scratching');
                        if (toolTileEl) {
                            toolTileEl.classList.add('ladybug-tile-boogie');
                        }
                        stateTimer--;
                        if (stateTimer <= 0) {
                            endToolTileVisit();
                        }
                    }
                }
            }
        } else if (state === 'logo') {
            var anchorL = getLogoAnchor();
            var rectL = anchorL ? anchorL.getBoundingClientRect() : null;
            if (!rectL || rectL.width < 8) {
                endLogoVisit();
            } else {
                var perchX = rectL.left + rectL.width * 0.5 - bugSize * 0.5;
                var perchY = rectL.top - bugSize * 0.2;

                if (logoSub === 'approach') {
                    var adx = perchX - x;
                    var ady = perchY - y;
                    var aDist = Math.sqrt(adx * adx + ady * ady);
                    if (aDist < 4) {
                        x = perchX;
                        y = perchY;
                        angle = Math.PI;
                        currentSpeed = 0;
                        speed = 0;
                        bug.classList.remove('ladybug-flying');
                        logoSub = 'sit';
                        stateTimer = 100 + Math.floor(Math.random() * 90);
                        if (anchorL) anchorL.classList.add('ladybug-logo-perched');
                    } else {
                        bug.classList.add('ladybug-flying');
                        speed = 4.6;
                        var goalAng = Math.atan2(adx, -ady);
                        var tdiff = normalizeAngle(goalAng - angle);
                        angle += clamp(tdiff, -0.2, 0.2) * 0.92;
                        currentSpeed += (speed - currentSpeed) * 0.15;
                        x += Math.sin(angle) * currentSpeed;
                        y += -Math.cos(angle) * currentSpeed;
                    }
                } else if (logoSub === 'sit') {
                    x = perchX;
                    y = perchY;
                    angle = Math.PI;
                    currentSpeed = 0;
                    speed = 0;
                    bug.classList.remove('ladybug-flying', 'ladybug-scratching');
                    stateTimer--;
                    if (stateTimer <= 0) {
                        if (Math.random() < 0.5) {
                            logoSub = 'scratch';
                            stateTimer = 110 + Math.floor(Math.random() * 100);
                            if (anchorL) {
                                anchorL.classList.remove('ladybug-logo-perched');
                                anchorL.classList.add('ladybug-logo-imbalance');
                            }
                        } else {
                            endLogoVisit();
                        }
                    }
                } else if (logoSub === 'scratch') {
                    x = perchX + Math.sin(ambientTime * 0.5) * 3.2;
                    y = perchY + Math.sin(ambientTime * 0.62) * 0.5;
                    angle = Math.PI + Math.sin(ambientTime * 0.36) * 0.38;
                    currentSpeed = 0;
                    speed = 0;
                    bug.classList.add('ladybug-flying');
                    stateTimer--;
                    if (stateTimer <= 0) {
                        endLogoVisit();
                    }
                }
            }
        } else if (state === 'hibernate') {
            var sleepEl = getHibernateSleepTargetBySlot(hibernateSleepSlot);
            if (!sleepEl) {
                endHibernateVisit();
            } else {
                var rectH = sleepEl.getBoundingClientRect();
                if (rectH.width < 2 || rectH.height < 0.5) {
                    endHibernateVisit();
                } else {
                var perchCoords = hibernatePerchForElement(sleepEl);
                var perchHx = perchCoords.px;
                var perchHy = perchCoords.py;

                if (hibernateSub === 'approach') {
                    var hdx = perchHx - x;
                    var hdy = perchHy - y;
                    var hDist = Math.sqrt(hdx * hdx + hdy * hdy);
                    if (hDist < 5) {
                        x = perchHx;
                        y = perchHy;
                        angle = Math.PI;
                        currentSpeed = 0;
                        speed = 0;
                        bug.classList.remove('ladybug-flying');
                        hibernateSub = 'sleep';
                        stateTimer = 1100 + Math.floor(Math.random() * 650);
                        hibernateSleepPillUntil = ambientTime + 72;
                        setHibernateThemeSnoozeClass(hibernateSleepSlot % 5 === 3);
                    } else {
                        bug.classList.add('ladybug-flying');
                        speed = 4.6;
                        var hGoal = Math.atan2(hdx, -hdy);
                        var hDiff = normalizeAngle(hGoal - angle);
                        angle += clamp(hDiff, -0.2, 0.2) * 0.92;
                        currentSpeed += (speed - currentSpeed) * 0.15;
                        x += Math.sin(angle) * currentSpeed;
                        y += -Math.cos(angle) * currentSpeed;
                    }
                } else if (hibernateSub === 'sleep') {
                    if (!isDarkTheme()) {
                        endHibernateVisit();
                    } else {
                        x = perchHx + Math.sin(ambientTime * 0.085) * 0.38;
                        y = perchHy + Math.sin(ambientTime * 0.055) * 0.26;
                        angle = Math.PI + Math.sin(ambientTime * 0.064) * 0.07;
                        currentSpeed = 0;
                        speed = 0;
                        bug.classList.remove('ladybug-flying', 'ladybug-scratching');
                        stateTimer--;
                        if (stateTimer <= 0) {
                            stateTimer = 880 + Math.floor(Math.random() * 580);
                        }
                    }
                }
                }
            }
        } else if (state === 'angry') {
            speed = 13;

            var attackDx = mouseX - bugCenterX;
            var attackDy = mouseY - bugCenterY;
            var targetAngle = Math.atan2(attackDx, -attackDy);
            var attackArcNoise = Math.sin(ambientTime * 0.06) * 0.07;
            steerToward(targetAngle + attackArcNoise, 0.24, 1);

            // Caught the cursor
            if (distanceToMouse < 25 && !isCursorDestroyed) {
                spawnEatParticles(mouseX, mouseY);
                isCursorDestroyed = true;
                document.body.classList.add('ladybug-no-cursor');

                state = 'moving';
                annoyance = 0;
                bug.classList.remove('ladybug-flying', 'ladybug-angry');
                stateTimer = 60;

                setTimeout(function () {
                    isCursorDestroyed = false;
                    document.body.classList.remove('ladybug-no-cursor');
                    mouseX = -1000;
                    mouseY = -1000;
                }, 5000);
            }

        } else if (isScared) {
            state = 'moving';
            stateTimer = 50;
            speed = 7;

            var fleeAngle = Math.atan2(dxMouse, -dyMouse);
            steerToward(fleeAngle, 0.16, 0.85);

        } else if (state === 'flying') {
            speed = 10;
            var drift = Math.sin(ambientTime * 0.05) * 0.04;
            var breeze = (Math.random() - 0.5) * 0.015;
            angle += drift + breeze;

            stateTimer--;
            if (stateTimer <= 0) {
                state = 'moving';
                bug.classList.remove('ladybug-flying');
                stateTimer = 50;
            }

        } else {
            speed = 2.5;

            stateTimer--;
            if (stateTimer <= 0) {
                if (state === 'moving') {
                    if (Math.random() < 0.15) {
                        state = 'flying';
                        bug.classList.add('ladybug-flying');
                        stateTimer = Math.floor(Math.random() * 120) + 80;
                    } else {
                        state = 'stopped';
                        stateTimer = Math.floor(Math.random() * 70) + 30;
                    }
                } else {
                    state = 'moving';
                    stateTimer = Math.floor(Math.random() * 190) + 60;
                    angle += (Math.random() - 0.5) * (Math.PI / 3);
                    if (logoCooldown <= 0 && Math.random() < 0.07) {
                        if (getLogoAnchor() && getLogoAnchor().getBoundingClientRect().width > 8) {
                            state = 'logo';
                            logoSub = 'approach';
                        }
                    } else if (toolTileCooldown <= 0 && hunger < 50 && Math.random() < 0.055) {
                        var tB = pickRandomToolButton();
                        if (tB) {
                            toolTileEl = tB;
                            state = 'tooltile';
                            toolSub = 'approach';
                        }
                    }
                }
            }
        }

        if (state === 'moving' && logoCooldown <= 0 && !isScared) {
            if (Math.random() < 0.00022) {
                if (getLogoAnchor() && getLogoAnchor().getBoundingClientRect().width > 8) {
                    state = 'logo';
                    logoSub = 'approach';
                }
            }
        }
        if (logoCooldown > 0) {
            logoCooldown--;
        }
        if (toolTileCooldown > 0) {
            toolTileCooldown--;
        }
        if (state === 'moving' && !isScared && toolTileCooldown <= 0 && hunger < 52) {
            if (Math.random() < 0.00028) {
                var tPick = pickRandomToolButton();
                if (tPick) {
                    toolTileEl = tPick;
                    state = 'tooltile';
                    toolSub = 'approach';
                }
            }
        }

        setVisualStateClasses(state, isScared);

        if (state !== 'stopped' && state !== 'logo' && state !== 'h1feast' && state !== 'tooltile' && state !== 'hibernate') {
            var wiggle = (state === 'flying' || state === 'angry') ? 0.01 : (isScared ? 0.03 : 0.055);
            var wanderDrift = (state === 'moving' && !isScared) ? Math.sin(ambientTime * 0.018) * 0.02 : 0;
            angle += (Math.random() - 0.5) * wiggle + wanderDrift + currentTurnRate * 0.04;

            var accel = 0.12;
            if (state === 'flying') accel = 0.08;
            if (state === 'angry') accel = 0.16;
            if (isScared) accel = 0.14;
            currentSpeed += (speed - currentSpeed) * accel;

            var dx = Math.sin(angle) * currentSpeed;
            var dy = -Math.cos(angle) * currentSpeed;
            x += dx;
            y += dy;

            var hitWall = false;

            if (x < 0) {
                x = 0;
                angle = -angle + (Math.random() - 0.5) * 0.15;
                hitWall = true;
            } else if (x > window.innerWidth - bugSize) {
                x = window.innerWidth - bugSize;
                angle = -angle + (Math.random() - 0.5) * 0.15;
                hitWall = true;
            }

            if (y < 0) {
                y = 0;
                angle = Math.PI - angle + (Math.random() - 0.5) * 0.15;
                hitWall = true;
            } else if (y > window.innerHeight - bugSize) {
                y = window.innerHeight - bugSize;
                angle = Math.PI - angle + (Math.random() - 0.5) * 0.15;
                hitWall = true;
            }

            if (hitWall) {
                currentSpeed *= 0.85;
            }
        } else if (state === 'logo') {
            if (logoSub === 'approach' || logoSub === 'scratch') {
                var wallLogo = false;
                if (x < 0) { x = 0; wallLogo = true; }
                else if (x > window.innerWidth - bugSize) { x = window.innerWidth - bugSize; wallLogo = true; }
                if (y < 0) { y = 0; wallLogo = true; }
                else if (y > window.innerHeight - bugSize) { y = window.innerHeight - bugSize; wallLogo = true; }
                if (wallLogo) {
                    endLogoVisit();
                }
            }
        } else if (state === 'hibernate' && hibernateSub === 'approach') {
            var wallHib = false;
            if (x < 0) { x = 0; wallHib = true; }
            else if (x > window.innerWidth - bugSize) { x = window.innerWidth - bugSize; wallHib = true; }
            if (y < 0) { y = 0; wallHib = true; }
            else if (y > window.innerHeight - bugSize) { y = window.innerHeight - bugSize; wallHib = true; }
            if (wallHib) {
                endHibernateVisit();
            }
        } else if (state === 'h1feast' && h1Sub === 'approach') {
            var wallH1 = false;
            if (x < 0) { x = 0; wallH1 = true; }
            else if (x > window.innerWidth - bugSize) { x = window.innerWidth - bugSize; wallH1 = true; }
            if (y < 0) { y = 0; wallH1 = true; }
            else if (y > window.innerHeight - bugSize) { y = window.innerHeight - bugSize; wallH1 = true; }
            if (wallH1) {
                endH1Feast(true);
            }
        } else if (state === 'tooltile' && toolSub === 'approach') {
            var wTt = false;
            if (x < 0) { x = 0; wTt = true; }
            else if (x > window.innerWidth - bugSize) { x = window.innerWidth - bugSize; wTt = true; }
            if (y < 0) { y = 0; wTt = true; }
            else if (y > window.innerHeight - bugSize) { y = window.innerHeight - bugSize; wTt = true; }
            if (wTt) {
                endToolTileVisit();
            }
        } else {
            currentSpeed *= 0.82;
        }

        var degrees = angle * (180 / Math.PI);

        var targetScale = (state === 'flying' || state === 'angry') ? 1.4 : 1;
        if (state === 'hibernate' && hibernateSub === 'sleep') {
            targetScale = 0.93 + 0.06 * (0.5 + 0.5 * Math.sin(ambientTime * 0.048));
        }
        if (state === 'logo' && logoSub === 'scratch') {
            targetScale = 1.08;
        }
        if (state === 'h1feast' && h1Sub === 'biting') {
            targetScale = 1.06;
        }
        if (state === 'tooltile' && toolSub === 'approach') {
            targetScale = 1.2;
        }
        if (state === 'tooltile' && toolSub === 'play') {
            targetScale = 1.07;
        }
        currentScale += (targetScale - currentScale) * 0.1;
        var targetLift = (state === 'flying' || state === 'angry' || (state === 'logo' && logoSub === 'approach') || (state === 'hibernate' && hibernateSub === 'approach') || (state === 'h1feast' && h1Sub === 'approach') || (state === 'tooltile' && toolSub === 'approach')) ? 6 : 0;
        if (state === 'logo' && (logoSub === 'sit' || logoSub === 'scratch')) {
            targetLift = 0;
        }
        if (state === 'hibernate' && hibernateSub === 'sleep') {
            targetLift = 0;
        }
        if (state === 'h1feast' && h1Sub === 'biting') {
            targetLift = 0;
        }
        if (state === 'tooltile' && (toolSub === 'sit' || toolSub === 'play')) {
            targetLift = 0;
        }
        currentLift += (targetLift - currentLift) * 0.1;
        var bob;
        if (state === 'stopped' || (state === 'logo' && logoSub === 'sit')) {
            bob = 0.3 * Math.sin(ambientTime * 0.1);
        } else if (state === 'hibernate' && hibernateSub === 'sleep') {
            bob = 0.16 * Math.sin(ambientTime * 0.062);
        } else if (state === 'logo' && logoSub === 'scratch') {
            bob = 0.5 * Math.sin(ambientTime * 0.4);
        } else if (state === 'logo' && logoSub === 'approach') {
            bob = Math.sin(ambientTime * 0.2) * 0.6;
        } else if (state === 'hibernate' && hibernateSub === 'approach') {
            bob = Math.sin(ambientTime * 0.2) * 0.55;
        } else if (state === 'logo') {
            bob = 0;
        } else if (state === 'h1feast' && h1Sub === 'approach') {
            bob = Math.sin(ambientTime * 0.2) * 0.55;
        } else if (state === 'h1feast' && h1Sub === 'biting') {
            bob = 0.4 * Math.sin(ambientTime * 0.42);
        } else if (state === 'tooltile' && toolSub === 'approach') {
            bob = Math.sin(ambientTime * 0.2) * 0.55;
        } else if (state === 'tooltile' && toolSub === 'sit') {
            bob = 0.25 * Math.sin(ambientTime * 0.12);
        } else if (state === 'tooltile' && toolSub === 'play') {
            bob = 0.45 * Math.sin(ambientTime * 0.5);
        } else {
            bob = Math.sin(ambientTime * (state === 'flying' || state === 'angry' ? 0.23 : 0.12)) * (state === 'flying' || state === 'angry' ? 1.5 : 0.8);
        }

        /* Night = no day-wandering: any stray moving/stopped/flying/angry in dark snaps back to hibernate. */
        if (isDarkTheme() && (state === 'moving' || state === 'stopped' || state === 'flying' || state === 'angry')) {
            beginHibernateFromTheme();
        }

        bug.style.transform = 'translate3d(' + x + 'px, ' + (y - currentLift + bob) + 'px, 0) rotate(' + degrees + 'deg) scale(' + currentScale + ')';

        requestAnimationFrame(animateLoop);
    }

    // ---------- Boot ----------

    function start() {
        x = Math.random() * (window.innerWidth - bugSize);
        y = Math.random() * (window.innerHeight - bugSize);
        lastScrollX = window.scrollX || window.pageXOffset || 0;
        lastScrollY = window.scrollY || window.pageYOffset || 0;
        initH1BiteTarget();
        requestAnimationFrame(animateLoop);
        setTimeout(function () {
            if (isDarkTheme()) {
                beginHibernateFromTheme();
            }
        }, 0);
    }

    if (document.readyState === 'loading') {
        window.addEventListener('load', start);
    } else {
        start();
    }

    window.addEventListener('resize', function () {
        if (x > window.innerWidth  - bugSize) x = window.innerWidth  - bugSize;
        if (y > window.innerHeight - bugSize) y = window.innerHeight - bugSize;
    });

}());
