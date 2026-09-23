import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(__dirname, '..', relPath), 'utf-8');
}

describe('Mobile Sidebar Regression Verification', () => {
  it('1. CSS Breakpoint Isolation: Desktop collapsed rules are scoped to @media (min-width: 901px)', () => {
    const css = readSrc('src/app/globals.css');

    // Layout token exists in :root
    assert.match(css, /--sidebar-collapsed-width:\s*68px;/);

    // Desktop app-shell collapsed rule is wrapped in @media (min-width: 901px)
    const desktopSection = css.slice(css.indexOf('@media (min-width: 901px)'));
    assert.match(desktopSection, /\.app-shell\.sidebar-collapsed\s*\{[^}]*grid-template-columns:\s*var\(--sidebar-collapsed-width\)\s+minmax\(0,\s*1fr\);/);

    // Desktop toggle button and collapsed rules are inside desktop media query
    assert.match(desktopSection, /\.sidebar-toggle-btn/);
    assert.match(desktopSection, /\.sidebar\.collapsed,\s*\n\s*\.app-shell\.sidebar-collapsed\s+\.sidebar\s*\{[^}]*width:\s*var\(--sidebar-collapsed-width\);/);
    assert.match(desktopSection, /\.sidebar\.collapsed\s+\.sidebar-header/);
    assert.match(desktopSection, /\.sidebar\.collapsed\s+\.brand/);
    assert.match(desktopSection, /\.sidebar\.collapsed\s+nav\s+button/);
  });

  it('2. Mobile Bottom Nav Protection: @media (max-width: 900px) overrides collapsed state with full width & grid', () => {
    const css = readSrc('src/app/globals.css');
    const mobileIndex = css.indexOf('@media (max-width: 900px)');
    assert.ok(mobileIndex !== -1, 'Mobile media query must exist');
    const mobileSection = css.slice(mobileIndex);

    // app-shell.sidebar-collapsed resets to flex column without desktop grid columns
    assert.match(mobileSection, /\.app-shell\.sidebar-collapsed\s*\{[^}]*display:\s*flex\s*!important;/);
    assert.match(mobileSection, /\.app-shell\.sidebar-collapsed\s*\{[^}]*grid-template-columns:\s*none\s*!important;/);

    // .sidebar.collapsed resets to 100% width, fixed to bottom, full height of mobile bottom nav
    assert.match(mobileSection, /\.sidebar\.collapsed,\s*\n\s*\.app-shell\.sidebar-collapsed\s+\.sidebar\s*\{[^}]*width:\s*100%\s*!important;/);
    assert.match(mobileSection, /\.sidebar\.collapsed,\s*\n\s*\.app-shell\.sidebar-collapsed\s+\.sidebar\s*\{[^}]*height:\s*var\(--mobile-bottom-nav-height\)\s*!important;/);
    assert.match(mobileSection, /\.sidebar\.collapsed,\s*\n\s*\.app-shell\.sidebar-collapsed\s+\.sidebar\s*\{[^}]*position:\s*fixed\s*!important;/);

    // Desktop toggle and headers are strictly hidden on mobile
    assert.match(mobileSection, /\.sidebar-toggle-btn/);
    assert.match(mobileSection, /display:\s*none\s*!important;/);

    // Navigation remains 4-column grid on mobile even if collapsed class is applied
    assert.match(mobileSection, /\.sidebar\.collapsed\s+nav,\s*\n\s*\.app-shell\.sidebar-collapsed\s+\.sidebar\s+nav\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*1fr\)\s*!important;/);
    assert.match(mobileSection, /\.sidebar\.collapsed\s+nav\s+button,\s*\n\s*\.app-shell\.sidebar-collapsed\s+\.sidebar\s+nav\s+button\s*\{[^}]*display:\s*flex\s*!important;/);

    // Mobile labels remain visible and full labels remain hidden
    assert.match(mobileSection, /\.sidebar\.collapsed\s+nav\s+\.nav-label-full,\s*\n\s*\.app-shell\.sidebar-collapsed\s+\.sidebar\s+nav\s+\.nav-label-full\s*\{[^}]*display:\s*none\s*!important;/);
    assert.match(mobileSection, /\.sidebar\.collapsed\s+nav\s+\.nav-label-mobile,\s*\n\s*\.app-shell\.sidebar-collapsed\s+\.sidebar\s+nav\s+\.nav-label-mobile\s*\{[^}]*display:\s*inline\s*!important;/);

    // Workspace on mobile retains zero margin-left / padding-left
    assert.match(mobileSection, /\.app-shell\.sidebar-collapsed\s+\.workspace\s*\{[^}]*margin-left:\s*0\s*!important;/);
    assert.match(mobileSection, /\.app-shell\.sidebar-collapsed\s+\.workspace\s*\{[^}]*width:\s*100%\s*!important;/);
  });

  it('3. ExploreApp: Mobile viewports (<= 900px) ignore desktop sidebar collapsed state on mount', () => {
    const exploreFile = readSrc('src/components/explore/ExploreApp.tsx');

    // Desktop preference ref exists
    assert.match(exploreFile, /desktopCollapsedRef\s*=\s*useRef/);

    // On mobile viewports (<= 900px), useState returns false
    assert.match(exploreFile, /if\s*\(window\.innerWidth\s*<=\s*900\)\s*\{\s*return false;\s*\}/);

    // localStorage persistence is maintained for desktop
    assert.match(exploreFile, /localStorage\.getItem\('naviable_sidebar_collapsed'\)/);
  });

  it('4. ExploreApp: Breakpoint transition listener resets collapse on mobile and restores on desktop', () => {
    const exploreFile = readSrc('src/components/explore/ExploreApp.tsx');

    // mediaQuery listener for (max-width: 900px)
    assert.match(exploreFile, /window\.matchMedia\('\(max-width:\s*900px\)'\)/);

    // When matching mobile, collapse is reset to false
    assert.match(exploreFile, /setIsSidebarCollapsed\(false\)/);

    // When returning to desktop, preference is restored
    assert.match(exploreFile, /setIsSidebarCollapsed\(desktopCollapsedRef\.current\)/);

    // Dispatch resize event for Leaflet map invalidation
    assert.match(exploreFile, /window\.dispatchEvent\(new Event\('resize'\)\)/);
  });

  it('5. ExploreApp: Toggle function is disabled on mobile (<= 900px) but functional on desktop', () => {
    const exploreFile = readSrc('src/components/explore/ExploreApp.tsx');

    // handleToggleSidebar ignores mobile calls
    assert.match(exploreFile, /if\s*\(typeof window !== 'undefined'\s*&&\s*window\.innerWidth\s*<=\s*900\)\s*\{\s*return;\s*\}/);

    // Updates desktop ref and localStorage
    assert.match(exploreFile, /desktopCollapsedRef\.current\s*=\s*next/);
    assert.match(exploreFile, /localStorage\.setItem\('naviable_sidebar_collapsed',\s*String\(next\)\)/);
  });

  it('6. Floating Controls Clearance: Voice Reader and A11y controls sit above mobile bottom nav', () => {
    const css = readSrc('src/app/globals.css');
    const mobileSection = css.slice(css.indexOf('@media (max-width: 900px)'));

    // Voice reader bar is offset above mobile bottom nav
    assert.match(mobileSection, /body:has\(\.app-shell\)\s+\.voice-reader-bar\s*\{[^}]*bottom:\s*calc\(var\(--mobile-bottom-nav-height\)\s*\+\s*12px\)/);

    // Accessibility widget trigger button is offset above mobile bottom nav
    assert.match(mobileSection, /\.widget-pos-left,\s*\n\s*\.widget-pos-right\s*\{[^}]*bottom:\s*calc\(74px\s*\+\s*env\(safe-area-inset-bottom,\s*0px\)\)/);
  });
});
