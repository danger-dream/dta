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
const url = process.env.VITE_DEV_SERVER_URL
const indexHtml = join(process.env.DIST, 'index.html')

function createWindow() {
	const primaryDisplay = screen.getPrimaryDisplay()
	win = new BrowserWindow({
		show: false, title: 'Bob for electron', icon: join(process.env.PUBLIC, 'favicon.ico'),
		x: primaryDisplay.bounds.width - 450 - 40, y: 40, width: 450, height: 256,
		resizable: true, backgroundColor: '#00000000',
		alwaysOnTop: true, transparent: true, skipTaskbar: true, frame: false,
		webPreferences: { nodeIntegration: true, contextIsolation: false, webSecurity: false }
	})
	win.on('ready-to-show', show)
	if (process.env.VITE_DEV_SERVER_URL) {
		win.loadURL(url).catch()
		win.webContents.openDevTools()
	} else {
		win.loadFile(indexHtml).catch()
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
}

function show() {
	if (!win) return
	if (win.isMinimized())
		win.restore()
	win.focus()
	win.show()
}

app.whenReady().then(() => {
	createWindow()
	Event(win).catch(() => app.exit(0))
})

app.on('window-all-closed', () => {
	win = null
	app.quit()
})
