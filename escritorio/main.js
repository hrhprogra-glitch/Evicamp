// SiuHub para escritorio (PC de la caja).
// Abre el sistema del cliente desde el VPS en su propia ventana, así cada actualización
// llega al instante sin reinstalar, y agrega lo que el navegador no puede: imprimir tickets
// directo a la impresora elegida, sin la ventana de impresión.
const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Link del negocio: lo escribe el script de compilación por cliente (destino.json).
const DESTINO = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'destino.json'), 'utf8'));
  } catch {
    return { url: 'https://siuhub.duckdns.org', nombre: 'SiuHub' };
  }
})();
const ORIGEN = new URL(DESTINO.url).origin;

// Preferencias de la PC (impresora elegida). Se guardan en la carpeta de datos del usuario.
const archivoConfig = () => path.join(app.getPath('userData'), 'config.json');
const leerConfig = () => {
  try { return JSON.parse(fs.readFileSync(archivoConfig(), 'utf8')); } catch { return {}; }
};
const guardarConfig = (cambios) => {
  const config = { ...leerConfig(), ...cambios };
  fs.writeFileSync(archivoConfig(), JSON.stringify(config, null, 2));
  return config;
};

let ventana = null;

// Una sola ventana: si abren el ícono otra vez, se trae la que ya está abierta
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!ventana) return;
    if (ventana.isMinimized()) ventana.restore();
    ventana.focus();
  });
}

const cargarSistema = () => {
  ventana.loadURL(DESTINO.url).catch(() => {
    ventana.loadFile(path.join(__dirname, 'sin-conexion.html'));
  });
};

const crearVentana = () => {
  ventana = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: '#1E293B',
    title: DESTINO.nombre,
    icon: path.join(__dirname, 'icono.png'),
    autoHideMenuBar: true, // el menú aparece con la tecla Alt, para no quitar espacio
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  ventana.once('ready-to-show', () => {
    ventana.maximize();
    ventana.show();
  });

  // Solo se navega dentro del sistema del cliente; cualquier otro link se abre en el navegador
  ventana.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(ORIGEN) && !url.startsWith('file://')) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });
  ventana.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Sin internet: pantalla local de "Sin conexión" con botón para reintentar
  ventana.webContents.on('did-fail-load', (_e, _codigo, _desc, url, esPrincipal) => {
    if (esPrincipal && url.startsWith(ORIGEN)) {
      ventana.loadFile(path.join(__dirname, 'sin-conexion.html'));
    }
  });

  cargarSistema();
};

// === IMPRESIÓN DIRECTA ===
// La página manda el HTML del ticket; se carga en una ventana invisible y se imprime en silencio.
ipcMain.handle('imprimir', async (_e, { html, titulo }) => {
  const { impresora } = leerConfig();
  const oculta = new BrowserWindow({ show: false, webPreferences: { sandbox: true } });
  try {
    await oculta.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    return await new Promise((resolve) => {
      oculta.webContents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: impresora || undefined, // sin elegir: usa la impresora predeterminada de Windows
          margins: { marginType: 'none' },
        },
        (ok, motivo) => resolve({ ok, motivo: ok ? null : motivo || 'No se pudo imprimir' })
      );
    });
  } catch (err) {
    return { ok: false, motivo: String(err && err.message ? err.message : err) };
  } finally {
    setTimeout(() => { if (!oculta.isDestroyed()) oculta.destroy(); }, 1000);
    if (titulo) console.log('Impreso:', titulo);
  }
});

ipcMain.handle('reintentar', () => cargarSistema());

// === MENÚ (tecla Alt) ===
const construirMenu = async () => {
  const impresoras = ventana ? await ventana.webContents.getPrintersAsync() : [];
  const { impresora } = leerConfig();

  const elegir = (nombre) => {
    guardarConfig({ impresora: nombre });
    construirMenu();
  };

  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'SiuHub',
      submenu: [
        { label: 'Recargar', accelerator: 'F5', click: () => cargarSistema() },
        { label: 'Pantalla completa', accelerator: 'F11', click: () => ventana.setFullScreen(!ventana.isFullScreen()) },
        { type: 'separator' },
        { label: 'Salir', role: 'quit' },
      ],
    },
    {
      label: 'Impresora de tickets',
      submenu: [
        {
          label: 'Predeterminada de Windows',
          type: 'radio',
          checked: !impresora,
          click: () => elegir(null),
        },
        ...impresoras.map((p) => ({
          label: p.displayName || p.name,
          type: 'radio',
          checked: impresora === p.name,
          click: () => elegir(p.name),
        })),
        { type: 'separator' },
        { label: 'Actualizar lista de impresoras', click: () => construirMenu() },
      ],
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'Acerca de SiuHub',
          click: () => dialog.showMessageBox(ventana, {
            type: 'info',
            title: 'SiuHub',
            message: `SiuHub ${app.getVersion()}`,
            detail: `Conectado a: ${DESTINO.url}\nImpresora: ${leerConfig().impresora || 'predeterminada de Windows'}`,
          }),
        },
        { label: 'Herramientas de desarrollo', accelerator: 'Ctrl+Shift+I', click: () => ventana.webContents.toggleDevTools() },
      ],
    },
  ]));
};

app.whenReady().then(() => {
  crearVentana();
  construirMenu();
});

app.on('window-all-closed', () => app.quit());
