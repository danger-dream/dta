import { app, BrowserWindow, screen, ipcMain, Display, clipboard } from 'electron'
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { Screenshots } from 'node-screenshots'
import win32 from './win32'


async function runShareX(): Promise<void> {
	return new Promise(resolve => {
		try {
			const proc = spawn('ShareX.exe', [], { cwd: app.isPackaged ? process.resourcesPath : join(__dirname, '../pack') })
			proc.on('exit', function () {
				resolve()
			})
		} catch {
			resolve()
		}
	})
}

/**
 * 调用ShareX截图/取色
 * @param {boolean} ocr
 * @returns {Promise<{type: "ocr" | "color", status: boolean, text: "", img?: string}>}
 * @constructor
 */
export async function ShareX(ocr: boolean = true): Promise<{ type: 'ocr' | 'color', status: boolean, data: string } | undefined> {
	//  读取历史剪贴板数据
	let old_text = clipboard.readText()
	
	function recovery(obj) {
		clipboard.writeText(old_text)
		return obj
	}
	
	clipboard.writeText('')
	//  调用ShareX
	await runShareX()
	try {
		//  读取剪贴板
		const text = clipboard.readText()
		if (text === 'ocr:empty') {
			//  取消截图
			return recovery(undefined)
		}
		const arr = text.split(':')
		if (arr.length !== 2) {
			return recovery(undefined)
		}
		return recovery({ type: arr[0], status: true, data: arr[1] })
	} catch (e) {
		return recovery(undefined)
	}
}

function capturer() {
	if (process.platform === 'win32' && process.arch === 'x64') {
		let res = win32.capture()
		if (res && res.image) {
			return 'data:image/png;base64,' + Buffer.from(res.image).toString('base64')
		}
	}
	
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

let clip_window: BrowserWindow = undefined
let callback = undefined as any

export function Init() {
	if (app.store.config.screenhost_type === 'shareX') return
	const pWorkAreaSize = screen.getPrimaryDisplay().workAreaSize
	clip_window = new BrowserWindow({
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
	clip_window.loadFile(join(app.store.publicPath, './capture.html')).catch()
// * 监听截屏奇奇怪怪的事件
	ipcMain.on('sc-window-hide', () => {
		callback(undefined)
		clip_window.setSimpleFullScreen(false)
		clip_window.hide()
	}).on('sc-color', (event, args) => {
		callback({ type: 'color', data: args })
		clip_window.setSimpleFullScreen(false)
		clip_window.hide()
	}).on('sc-screenhost', (event, args) => {
		callback({ type: 'screenhost', data: args })
		clip_window.setSimpleFullScreen(false)
		clip_window.hide()
	}).on('sc-show', () => {
		clip_window.show()
		clip_window.setSimpleFullScreen(true)
	})
}

export default async function (): Promise<undefined | { type: 'color' | 'screenhost', data: string }> {
	return new Promise(async resolve => {
		if (app.store.config.screenhost_type === 'shareX') {
			ShareX().then(r => {
				if (!r || !r.status) {
					resolve(undefined)
				} else if (r.type === 'color') {
					resolve({ type: 'color', data: r.data })
				} else {
					resolve({ type: 'screenhost', data: r.data })
				}
			})
		} else {
			if (!clip_window) {
				await Init()
			}
			callback = resolve
			clip_window.webContents.send('reflash', capturer())
		}
	})
}
