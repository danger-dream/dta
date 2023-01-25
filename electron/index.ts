import { app, BrowserWindow, shell, screen } from 'electron'
import { join } from 'node:path'
import Event from './event'

///node_modules/vite-plugin-electron/index.js startup->spawn('chcp 65001 && ' + electronPath, argv, { stdio: "inherit", shell: true });
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'
app.disableHardwareAcceleration()
app.setAppUserModelId(app.getName())
if (!app.requestSingleInstanceLock()) {
	app.quit()
	process.exit(0)
}
process.env.DIST_ELECTRON = __dirname
process.env.DIST = join(process.env.DIST_ELECTRON, '../dist')
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL ? join(process.env.DIST_ELECTRON, '../public') : process.env.DIST
let win: BrowserWindow | null = null

app.whenReady().then(() => {
	const primaryDisplay = screen.getPrimaryDisplay()
	win = new BrowserWindow({
		show: false, title: 'Bob for electron', icon: join(process.env.PUBLIC, 'favicon.ico'),
		x: primaryDisplay.bounds.width - 450 - 40, y: 40, width: 450, height: 256,
		resizable: true, backgroundColor: '#00000000', alwaysOnTop: true,
		transparent: true, skipTaskbar: true, frame: false,
		webPreferences: {
			nodeIntegration: true, contextIsolation: false,
			webSecurity: false, spellcheck: false
		}
	})
	win.on('ready-to-show', () => {
		win.show()
		win.focus()
	})
	if (process.env.VITE_DEV_SERVER_URL) {
		win.loadURL(process.env.VITE_DEV_SERVER_URL).catch()
		win.webContents.openDevTools()
	} else {
		win.loadFile(join(process.env.DIST, 'index.html')).catch()
	}
	win.on('close', (e) => {
		e.preventDefault()
		e.returnValue = false
		win.hide()
	})
	win.setMenu(null)
	win.setIcon(join(process.env.PUBLIC, 'favicon.ico'))
	win.webContents.setWindowOpenHandler(({ url }) => {
		url.startsWith('https:') && shell.openExternal(url).catch()
		return { action: 'deny' }
	})
	
	Event(win).catch(() => app.exit(0))
})

app.on('window-all-closed', () => app.exit(0))
