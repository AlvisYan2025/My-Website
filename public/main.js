/* Alvis Yan — portfolio behaviour
   Nav state, mobile menu, scroll reveals, carousel, filters, cursor glow. */
(function () {
    'use strict';

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- Footer year ---------- */
    $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

    /* ---------- Nav: scrolled state + active section ---------- */
    const nav = $('#navbar');
    const alwaysScrolled = nav && nav.hasAttribute('data-always-scrolled');

    function updateNav() {
        if (!nav || alwaysScrolled) return;
        nav.classList.toggle('scrolled', window.scrollY > 24);
    }
    updateNav();
    window.addEventListener('scroll', updateNav, { passive: true });

    const sectionLinks = $$('.nav-links a[href^="#"]');
    const sections = sectionLinks
        .map(a => $(a.getAttribute('href')))
        .filter(Boolean);

    if (sections.length && 'IntersectionObserver' in window) {
        const spy = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const id = '#' + entry.target.id;
                sectionLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === id));
            });
        }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
        sections.forEach(s => spy.observe(s));
    }

    /* ---------- Mobile menu ---------- */
    const toggle = $('.nav-toggle');
    const links = $('#nav-links');

    function setMenu(open) {
        if (!toggle || !links) return;
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        links.classList.toggle('open', open);
        document.body.classList.toggle('menu-open', open);
    }
    if (toggle && links) {
        toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
        links.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
        window.matchMedia('(min-width: 821px)').addEventListener('change', e => { if (e.matches) setMenu(false); });
    }

    /* ---------- Smooth in-page scrolling (offset for fixed nav) ---------- */
    document.addEventListener('click', e => {
        const a = e.target.closest('a[href^="#"]');
        if (!a) return;
        const href = a.getAttribute('href');
        if (href === '#') return;
        const target = $(href);
        if (!target) return;
        e.preventDefault();
        const navH = nav ? nav.offsetHeight : 0;
        const top = target.getBoundingClientRect().top + window.scrollY - (href === '#home' ? 0 : navH - 1);
        window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
        history.replaceState(null, '', href);
    });

    /* ---------- Scroll reveal ---------- */
    const revealEls = $$('.reveal');

    if (reduceMotion || !('IntersectionObserver' in window)) {
        revealEls.forEach(el => el.classList.add('in'));
    } else {
        const io = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('in');
                io.unobserve(entry.target);
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
        revealEls.forEach(el => io.observe(el));
    }

    /* ---------- Experience carousel ---------- */
    const carousel = $('.carousel');
    if (carousel) {
        const track = $('.carousel-track', carousel);
        const items = Array.from(track.children);
        const prev = $('.carousel-prev');
        const next = $('.carousel-next');
        const dotsWrap = $('.carousel-dots');

        const gap = () => parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
        const step = () => (items[0] ? items[0].getBoundingClientRect().width + gap() : 1);
        const perView = () => Math.max(1, Math.round((track.clientWidth + gap()) / step()));
        const maxIndex = () => Math.max(0, items.length - perView());
        const current = () => Math.round(track.scrollLeft / step());

        function buildDots() {
            if (!dotsWrap) return;
            dotsWrap.innerHTML = '';
            const n = maxIndex() + 1;
            for (let i = 0; i < n; i++) {
                const b = document.createElement('button');
                b.type = 'button';
                b.setAttribute('aria-label', 'Go to slide ' + (i + 1));
                b.addEventListener('click', () => goTo(i));
                dotsWrap.appendChild(b);
            }
        }

        function sync() {
            const i = Math.min(current(), maxIndex());
            if (prev) prev.disabled = i <= 0;
            if (next) next.disabled = i >= maxIndex();
            if (dotsWrap) Array.from(dotsWrap.children).forEach((d, k) => d.classList.toggle('active', k === i));
        }

        function goTo(i) {
            const clamped = Math.max(0, Math.min(maxIndex(), i));
            track.scrollTo({ left: clamped * step(), behavior: reduceMotion ? 'auto' : 'smooth' });
        }

        if (prev) prev.addEventListener('click', () => goTo(current() - 1));
        if (next) next.addEventListener('click', () => goTo(current() + 1));
        track.addEventListener('keydown', e => {
            if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current() + 1); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current() - 1); }
        });

        let raf = 0;
        track.addEventListener('scroll', () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(sync);
        }, { passive: true });

        let rt;
        window.addEventListener('resize', () => {
            clearTimeout(rt);
            rt = setTimeout(() => { buildDots(); sync(); }, 150);
        });

        buildDots();
        sync();
    }

    /* ---------- Project filters ---------- */
    const filters = $$('.filter');
    const projects = $$('.project');
    const countEl = $('[data-count]');

    if (countEl && projects.length) countEl.textContent = projects.length;

    if (filters.length && projects.length) {
        filters.forEach(btn => {
            const f = btn.dataset.filter;
            const n = f === 'all'
                ? projects.length
                : projects.filter(p => (p.dataset.category || '').split(/\s+/).includes(f)).length;
            const span = document.createElement('span');
            span.className = 'n';
            span.textContent = n;
            btn.appendChild(span);
        });

        filters.forEach(btn => {
            btn.addEventListener('click', () => {
                const f = btn.dataset.filter;
                filters.forEach(b => {
                    b.classList.toggle('active', b === btn);
                    b.setAttribute('aria-pressed', String(b === btn));
                });
                let shown = 0;
                projects.forEach(p => {
                    const cats = (p.dataset.category || '').split(/\s+/);
                    const show = f === 'all' || cats.includes(f);
                    p.classList.toggle('is-hidden', !show);
                    if (show) {
                        shown++;
                        p.classList.remove('in');
                        requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('in')));
                    }
                });
                if (countEl) countEl.textContent = shown;
            });
        });
    }

    /* ---------- Cursor glow (fine pointers only) ---------- */
    const glow = $('.cursor-glow');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    if (glow && finePointer && !reduceMotion) {
        let tx = window.innerWidth / 2, ty = window.innerHeight / 2;
        let x = tx, y = ty;
        let active = false;

        function tick() {
            x += (tx - x) * 0.12;
            y += (ty - y) * 0.12;
            glow.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
            requestAnimationFrame(tick);
        }

        window.addEventListener('pointermove', e => {
            tx = e.clientX; ty = e.clientY;
            if (!active) {
                active = true;
                x = tx; y = ty;
                glow.classList.add('visible');
                tick();
            }
        }, { passive: true });

        document.addEventListener('mouseleave', () => glow.classList.remove('visible'));
        document.addEventListener('mouseenter', () => { if (active) glow.classList.add('visible'); });
    }
})();
