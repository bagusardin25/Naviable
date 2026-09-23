import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { translate } from '../src/locales/index';
import { id } from '../src/locales/id';
import { en } from '../src/locales/en';

describe('Collapsible Sidebar Implementation Validation', () => {
  it('1. i18n keys for sidebar toggle exist and are accurate in both ID and EN', () => {
    assert.strictEqual(id.nav.collapseSidebar, 'Tutup sidebar');
    assert.strictEqual(id.nav.expandSidebar, 'Buka sidebar');
    assert.strictEqual(en.nav.collapseSidebar, 'Close sidebar');
    assert.strictEqual(en.nav.expandSidebar, 'Open sidebar');

    assert.strictEqual(translate('id', 'nav.collapseSidebar'), 'Tutup sidebar');
    assert.strictEqual(translate('id', 'nav.expandSidebar'), 'Buka sidebar');
    assert.strictEqual(translate('en', 'nav.collapseSidebar'), 'Close sidebar');
    assert.strictEqual(translate('en', 'nav.expandSidebar'), 'Open sidebar');
  });

  it('2. Icon component supports panel-left-close, panel-left-open, and panel-left', () => {
    const iconFile = fs.readFileSync(path.join(__dirname, '../src/components/ui/Icon.tsx'), 'utf-8');
    assert.match(iconFile, /PanelLeftClose/);
    assert.match(iconFile, /PanelLeftOpen/);
    assert.match(iconFile, /'panel-left-close':\s*PanelLeftClose/);
    assert.match(iconFile, /'panel-left-open':\s*PanelLeftOpen/);
  });

  it('3. AppSidebar component includes collapsible prop, toggle button, brand logo, and titles', () => {
    const sidebarFile = fs.readFileSync(path.join(__dirname, '../src/components/layout/AppSidebar.tsx'), 'utf-8');
    assert.match(sidebarFile, /isCollapsed\?: boolean/);
    assert.match(sidebarFile, /onToggleCollapse\?: \(\) => void/);
    assert.match(sidebarFile, /sidebar \$\{isCollapsed \? 'collapsed' : ''\}/);
    assert.match(sidebarFile, /sidebar-toggle-btn/);
    assert.match(sidebarFile, /title=\{t\('nav\.explore'\)\}/);
    assert.match(sidebarFile, /title=\{t\('nav\.addPlace'\)\}/);
    assert.match(sidebarFile, /title=\{t\('nav\.dashboard'\)\}/);
    assert.match(sidebarFile, /sidebar-badge/);
    assert.match(sidebarFile, /BrandLogo/);
    assert.match(sidebarFile, /brand-name/);
  });

  it('4. ExploreApp component implements state persistence and resize invalidation', () => {
    const exploreFile = fs.readFileSync(path.join(__dirname, '../src/components/explore/ExploreApp.tsx'), 'utf-8');
    assert.match(exploreFile, /naviable_sidebar_collapsed/);
    assert.match(exploreFile, /isSidebarCollapsed/);
    assert.match(exploreFile, /handleToggleSidebar/);
    assert.match(exploreFile, /window\.dispatchEvent\(new Event\('resize'\)\)/);
    assert.match(exploreFile, /app-shell \$\{isSidebarCollapsed \? 'sidebar-collapsed' : ''\}/);
    assert.match(exploreFile, /isCollapsed=\{isSidebarCollapsed\}/);
    assert.match(exploreFile, /onToggleCollapse=\{handleToggleSidebar\}/);
  });

  it('5. globals.css has layout tokens, smooth transitions, and collapsed rules', () => {
    const cssFile = fs.readFileSync(path.join(__dirname, '../src/app/globals.css'), 'utf-8');
    assert.match(cssFile, /--sidebar-collapsed-width:\s*68px;/);
    assert.match(cssFile, /\.app-shell\.sidebar-collapsed/);
    assert.match(cssFile, /\.sidebar\.collapsed/);
    assert.match(cssFile, /\.sidebar-toggle-btn/);
    assert.match(cssFile, /html\.contrast-mode \.sidebar-toggle-btn/);
    assert.match(cssFile, /\.sidebar\.collapsed \.brand/);
    assert.match(cssFile, /\.sidebar\.collapsed \.sidebar-bottom/);
  });
});
