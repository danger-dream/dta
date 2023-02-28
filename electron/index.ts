import { app, globalShortcut, Menu, Tray, powerMonitor } from 'electron'
import { initialize } from '@electron/remote/main'
import { join } from 'node:path'
import Translate from './translate'
import Takeword from './takeword'
import Store from './store'

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'
app.setAppUserModelId(app.getName())
if (!app.requestSingleInstanceLock()) {
	app.quit()
	process.exit(0)
}
process.env.DIST_ELECTRON = __dirname
process.env.DIST = join(process.env.DIST_ELECTRON, '../dist')
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL ? join(process.env.DIST_ELECTRON, '../public') : process.env.DIST

app.on('window-all-closed', () => app.exit(0))
app.whenReady().then(async () => {
	initialize()
	const store = new Store()
	app.store = store
	
	app.on('second-instance', () => store.showMainWindow())
	app.on('activate', () => store.showMainWindow())
	/** 取消注册热键 */
	app.on('will-quit', () => {
		try {
			globalShortcut.unregisterAll()
		} catch {
		}
	})
	await Translate(store)
	await Takeword(store)
	
	function restart() {
		app.relaunch()
		app.exit(0)
	}
	
	if (store.trayMenu.length > 0) {
		store.trayMenu.push(...[
			{ type: 'separator' },
			{ label: '重启', click: () => restart() },
			{ label: '退出', click: () => app.exit(0) }
		] as any)
		const tray = new Tray(join(store.publicPath, 'favicon.ico'))
		tray.setContextMenu(Menu.buildFromTemplate(store.trayMenu))
		tray.setToolTip(`Desktop Tools Assistant`)
		tray.on('double-click', () => store.showMainWindow())
	}
	
	powerMonitor.on('resume', () => restart())
	powerMonitor.on('unlock-screen', () => restart())
})

