import { enable, initialize } from '@electron/remote/main';
import { app, BrowserWindow, Menu, session } from 'electron';
import { autoUpdater } from 'electron-updater';
import windowStateKeeper from 'electron-window-state';
import os from 'os';
import path from 'path';
import { errorCatcher } from 'src/helpers/error-catcher';

initialize();
autoUpdater.checkForUpdatesAndNotify();

// needed in case process is undefined under Linux
const platform = process.platform || os.platform();
let mainWindow: BrowserWindow | null;
let mediaWindow: BrowserWindow | null;

const allowedHostnames = [
  'jw.org',
  'jw-cdn.org',
  'akamaihd.net',
  'cloudfront.net',
];

const jwHostnames = ['jw.org'];

const isValidHostname = (hostname: string) => {
  // Check if the hostname is exactly one of the allowed hostnames
  if (allowedHostnames.includes(hostname)) {
    return true;
  }

  // Check for subdomain matches
  return allowedHostnames.some((allowedHostname) => {
    return (
      hostname === allowedHostname || hostname.endsWith(`.${allowedHostname}`)
    );
  });
};

const isJwHostname = (hostname: string) => {
  // Check if the hostname is exactly one of the allowed hostnames
  if (jwHostnames.includes(hostname)) {
    return true;
  }

  // Check for subdomain matches
  return jwHostnames.some((jwHostname) => {
    return hostname === jwHostname || hostname.endsWith(`.${jwHostname}`);
  });
};

function createMediaWindow() {
  const window = new BrowserWindow({
    alwaysOnTop: false,
    backgroundColor: 'black',
    frame: false,
    // roundedCorners: windowOpts.fullscreen,
    fullscreen: false,
    height: 720,
    icon: path.resolve(path.join(__dirname, 'icons', 'media-player.png')),
    minHeight: 110,
    minWidth: 195,
    show: false,
    thickFrame: false,
    title: 'Media Window',
    webPreferences: {
      backgroundThrottling: false,
      nodeIntegration: true,
      // More info: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/electron-preload-script
      preload: path.resolve(__dirname, process.env.QUASAR_ELECTRON_PRELOAD),
      sandbox: false,
      webSecurity: false,
    },
    width: 1280,
    x: 50,
    y: 50,
  });

  window.setAspectRatio(16 / 9);
  if (platform !== 'darwin') {
    window.setMenuBarVisibility(false);
  }
  if (process.env.DEBUGGING) {
    window.webContents.openDevTools();
  }

  enable(window.webContents);

  window.on('closed', () => {
    mediaWindow = null;
  });

  return window;
}

function createWindow() {
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const parsedUrl = new URL(details.url);
    if (isValidHostname(parsedUrl.hostname)) {
      if (details.requestHeaders) {
        const baseUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}/`;
        details.requestHeaders.Referer = baseUrl;
        details.requestHeaders.Origin = baseUrl;
        details.requestHeaders['User-Agent'] = details.requestHeaders[
          'User-Agent'
        ].replace('Electron', '');
      }
    }
    callback({ requestHeaders: details.requestHeaders });
  });
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const parsedUrl = new URL(details.url);
    let passthroughReferrer = false;
    if (details.referrer) {
      const referrerUrl = new URL(details.referrer);
      if (
        (isJwHostname(referrerUrl.hostname) &&
          parsedUrl.hostname !== 'b.jw-cdn.org') ||
        referrerUrl.hostname === parsedUrl.hostname
      )
        passthroughReferrer = true;
    }
    if (isValidHostname(parsedUrl.hostname) && !passthroughReferrer) {
      if (details.responseHeaders) {
        if (
          !details.responseHeaders['access-control-allow-origin'] ||
          !details.responseHeaders['access-control-allow-origin'].includes('*')
        ) {
          details.responseHeaders['access-control-allow-headers'] = [
            'Content-Type,Authorization,X-Client-ID',
          ];
          details.responseHeaders['access-control-allow-origin'] = ['*'];
          details.responseHeaders['access-control-allow-credentials'] = [
            'true',
          ];
        }
        if (details.responseHeaders['x-frame-options'])
          delete details.responseHeaders['x-frame-options'];
      }
    }
    callback({ responseHeaders: details.responseHeaders });
  });
  /**
   * Initial window options
   */
  const mainWindowState = windowStateKeeper({
    defaultHeight: 600,
    defaultWidth: 1000,
  });
  mainWindow = new BrowserWindow({
    backgroundColor: 'grey',
    height: mainWindowState.height,
    icon: path.resolve(path.join(__dirname, 'icons', 'icon.png')),
    show: false,
    useContentSize: true,
    webPreferences: {
      backgroundThrottling: false,
      nodeIntegration: true,
      preload: path.resolve(__dirname, process.env.QUASAR_ELECTRON_PRELOAD),
      sandbox: false,
      webSecurity: false,
    },
    width: mainWindowState.width,
    x: mainWindowState.x,
    y: mainWindowState.y,
  });

  Menu.setApplicationMenu(Menu.buildFromTemplate([]));

  enable(mainWindow.webContents);
  mainWindow.webContents.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  );

  if (process.env.DEBUGGING) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('close', () => {
    if (mediaWindow && !mediaWindow.isDestroyed()) mediaWindow.close();
    const websiteWindow = BrowserWindow.getAllWindows().find((w) =>
      w.webContents.getURL().includes('https://'),
    );
    if (websiteWindow && !websiteWindow.isDestroyed()) websiteWindow.close();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindowState.manage(mainWindow);
    }
  });

  if (!mediaWindow || mediaWindow.isDestroyed()) {
    mediaWindow = createMediaWindow();
  }
  mainWindow.loadURL(
    process.env.APP_URL + '?page=initial-congregation-selector',
  );
  mediaWindow.loadURL(process.env.APP_URL + '?page=media-player');
}

app
  .whenReady()
  .then(createWindow)
  .catch((err) => errorCatcher(err));

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (!mainWindow || (mainWindow && mainWindow.isDestroyed())) {
    createWindow();
  } else {
    mainWindow?.show();
  }
});
