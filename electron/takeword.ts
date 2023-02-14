import { BrowserWindow, ipcMain, Point, screen } from 'electron'
import { enable } from '@electron/remote/main'
import { join } from 'node:path'
import win32, { MouseAction, MouseButton } from './win32'
import { callRightMouseAction, getRightMouseActions } from './RightMouseAction'
import Store from './store'

let win: BrowserWindow | null = null
let mouse_history = [] as { type: MouseAction, st: number, x: number, y: number }[]
const win_info_catch = {} as Record<number, boolean>
const winHeight = 22 + 10 * 2
const winWidht = 22 + 10

//const sleep = (time = 100) => new Promise(resolve => setTimeout(resolve, time))

function isWinRect() {
	if (!win || win.isDestroyed() || !win.isVisible()) return false
	const p = screen.getCursorScreenPoint()
	const b = win.getBounds()
	return p.x >= b.x && p.x <= b.x + b.width &&
	       p.y >= b.y && p.y <= b.y + b.height
}

let win_show_timeout: any = undefined

function handlePointHideWin(force: boolean = false) {
	clearTimeout(win_show_timeout)
	if (force) {
		win.hide()
		return
	}
	if (isWinRect()) return
	win.hide()
}

export default async function (store: Store) {
	store.TakeWordWin = win = new BrowserWindow({
		show: false, width: winWidht * 5 + 10, height: winHeight, backgroundColor: '#F7F9FB', alwaysOnTop: true,
		minimizable: false, maximizable: false, movable: true, resizable: false,
		transparent: false, skipTaskbar: true, frame: false, hasShadow: true,
		webPreferences: {
			nodeIntegration: true, contextIsolation: false,
			webSecurity: false, spellcheck: false
		}
	})
	enable(win.webContents)
	win.on('show', () => setTimeout(() => win.setOpacity(1), 50))
	win.on('hide', () => win.setOpacity(0))
	win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
	if (store.isPack) {
		win.loadFile(join(store.resourcesPath, 'takeword.html')).catch()
	} else {
		win.loadURL(store.devUrl + 'takeword.html').catch()
		//win.webContents.openDevTools({ mode: 'detach' })
	}
	ipcMain.on('tw-call', function (event, { action, text }) {
		callRightMouseAction(action, text, store).catch()
		handlePointHideWin(true)
	})
	
	async function showWin(point: Point, text: string) {
		if (!text) return
		clearTimeout(win_show_timeout)
		const actions = await getRightMouseActions(text)
		const s = screen.getPrimaryDisplay()
		const width = winWidht * actions.length + 20
		let x = point.x - Math.ceil(width / 2)
		if (x < 0) {
			x = 0
		} else if (x + width > s.size.width) {
			x = s.size.width - 10 - width
		}
		
		let y = point.y + 15
		if (y < 0) {
			y = 15
		} else if (y + winHeight > s.size.height) {
			y = s.size.height - winHeight - 15
		}
		win.setContentBounds({ x, y, height: winHeight, width })
		win.showInactive()
		win.webContents.send('text', { actions, text })
		if (store.config.takeword.auto_hide_time > 0) {
			win_show_timeout = setTimeout(() => handlePointHideWin(), store.config.takeword.auto_hide_time * 1000)
		}
	}
	
	win32.createMouseHook(async function ({ action, btn, x, y }) {
		if (!win || win.isDestroyed() || !store.config.takeword.enable) return
		if (isWinRect()) return
		if (action === MouseAction.Down && btn !== MouseButton.LEFT) {
			mouse_history = []
			handlePointHideWin()
			return
		}
		if (btn !== MouseButton.LEFT) return
		if (store.config.takeword.skip?.length > 0) {
			const pid = win32.getForegroundWindowPid()
			if (win_info_catch[pid] !== undefined) {
				if (win_info_catch[pid]) return
			} else {
				let skip = false
				const proc = win32.findProcess(pid)
				if (proc) {
					const exeFile = proc.exeFile?.toLowerCase() || ''
					const exePath = proc.path?.toLowerCase() || ''
					for (const item of store.config.takeword.skip) {
						const lowerItem = item.toLowerCase()
						if (exeFile === lowerItem || exePath.startsWith(lowerItem)) {
							skip = true
							break
						}
					}
				}
				win_info_catch[pid] = skip
				if (skip) return
			}
		}
		if (action === MouseAction.Down) {
			mouse_history.push({ type: MouseAction.Down, st: Date.now(), x, y })
		} else if (action === MouseAction.Up) {
			const last = mouse_history[mouse_history.length - 1]
			if (!last || last.type !== MouseAction.Down) {
				handlePointHideWin()
				return
			}
			const st = Date.now()
			const cur = { type: MouseAction.Click, st, x, y } as any
			cur.st = last.st
			let action = MouseAction.Click
			if (st - last.st < win32.getDoubleClickTime()) {
				let pLast = mouse_history[mouse_history.length - 2]
				if (pLast?.type === MouseAction.Click) {
					if (st - pLast.st < win32.getDoubleClickTime() && pLast.x === x && pLast.y === y) {
						action = MouseAction.DBClick
					} else {
						mouse_history = [cur]
					}
				} else {
					mouse_history = [cur]
				}
			} else {
				action = MouseAction.LongClick
				mouse_history = []
			}
			const distance_x = Math.abs(x - last.x)
			const distance_y = Math.abs(y - last.y)
			if (distance_x < 10 && distance_y < 10) {
				if (action !== MouseAction.DBClick) {
					handlePointHideWin()
					return
				}
			}
			const selection = win32.getSelection()
			if (!selection || !selection.pid) {
				handlePointHideWin()
				return
			}
			let text = selection.text
			if (text && text.length >= 3) {
				showWin(screen.getCursorScreenPoint(), text).catch()
			} else {
				handlePointHideWin()
			}
		}
	})
}
