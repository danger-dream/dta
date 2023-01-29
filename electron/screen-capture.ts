import { BrowserWindow, screen, ipcMain, Display } from 'electron'
import { join } from 'node:path'
import { Screenshots } from 'node-screenshots'

function capturer() {
	function capturerDisplayId(s: Display) {
		const d = Screenshots.fromDisplay(s.id)
		const buf = d.captureSync()
		return 'data:image/png;base64,' + buf.toString('base64')
	}
	
	const all = screen.getAllDisplays()
	const p = screen.getCursorScreenPoint()
	for (let s of all) {
		if (s.bounds.x <= p.x && p.x <= s.bounds.x + s.bounds.width && s.bounds.y <= p.y && p.y <= s.bounds.y + s.bounds.height) {
			return capturerDisplayId(s)
		}
	}
	return capturerDisplayId(all[0])
}

function create_clip_window(): Promise<undefined | { type: 'color' | 'screenhost', data: string }> {
	return new Promise(resolve => {
		try {
			const pWorkAreaSize = screen.getPrimaryDisplay().workAreaSize
			const clip_window = new BrowserWindow({
				icon: process.env.APP_ICON,
				width: pWorkAreaSize.width,
				height: pWorkAreaSize.height,
				show: false,
				alwaysOnTop: true,
				fullscreenable: true,
				transparent: true,
				frame: false,
				skipTaskbar: true,
				autoHideMenuBar: true,
				movable: false,
				enableLargerThanScreen: true,
				hasShadow: false,
				webPreferences: {
					nodeIntegration: true,
					contextIsolation: false
				}
			})
			
			clip_window.loadFile(join(process.env.PUBLIC, './capture.html')).catch()
			clip_window.webContents.on('did-finish-load', function () {
				clip_window.webContents.send('reflash', capturer())
				clip_window.show()
				clip_window.setSimpleFullScreen(true)
			})
			// * 监听截屏奇奇怪怪的事件
			ipcMain.on('window-close', () => {
				resolve(undefined)
				clip_window.destroy()
			}).on('color', (event, args) => {
				resolve({ type: 'color', data: args })
				clip_window.destroy()
			}).on('screenhost', (event, args) => {
				resolve({ type: 'screenhost', data: args })
				clip_window.destroy()
			})
		} catch {
			resolve(undefined)
		}
	})
	
}

export default async function () {
	return await create_clip_window()
}
