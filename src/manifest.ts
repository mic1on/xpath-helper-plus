import fs from 'fs-extra'
import type PackageJson from '../package.json'
import { isDev, port, r } from '../scripts/utils'

export async function getManifest(): Promise<chrome.runtime.ManifestV3> {
  const pkg = await fs.readJSON(r('package.json')) as typeof PackageJson

  return {
    manifest_version: 3,
    minimum_chrome_version: '116',
    name: '__MSG_extensionName__',
    version: pkg.version,
    description: '__MSG_extensionDescription__',
    default_locale: 'en',
    action: {
      default_icon: {
        16: 'assets/icon16.png',
        24: 'assets/icon24.png',
        32: 'assets/icon32.png',
      },
      default_title: '__MSG_actionTitle__',
    },
    background: {
      service_worker: 'dist/background/index.js',
    },
    side_panel: {
      default_path: 'dist/sidepanel/index.html',
    },
    content_scripts: [
      {
        matches: ['<all_urls>'],
        js: ['dist/contentScripts/index.global.js'],
        css: ['dist/contentScripts/style.css'],
        run_at: 'document_start',
        all_frames: true,
        match_about_blank: true,
      },
    ],
    permissions: [
      'activeTab',
      'sidePanel',
    ],
    commands: {
      'open-side-panel': {
        suggested_key: {
          default: 'Alt+Shift+X',
          mac: 'Alt+Shift+X',
        },
        description: '__MSG_openSidePanelCommand__',
      },
    },
    content_security_policy: {
      extension_pages: isDev
        ? `script-src 'self' http://localhost:${port}; object-src 'self'`
        : "script-src 'self'; object-src 'self'",
    },
  }
}
