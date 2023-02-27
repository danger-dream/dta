import ffi from 'ffi-napi'
import ref from 'ref-napi'
import wchar_t from 'ref-wchar-napi'
import { join } from 'node:path'
import { app } from 'electron'
import * as fs from 'fs'

const cwd = app.isPackaged ? process.resourcesPath : join(__dirname, '../pack')
const ahk_script = fs.readFileSync(join(cwd, 'Mac.ahk'), 'utf-8')
const POINTER = ref.refType(ref.types.void)
const WCHAR_T_P = ref.refType(wchar_t)
const ahk2 = new ffi.Library(join(cwd, 'ahkh2x64.dll'), {
	NewThread: [POINTER, [WCHAR_T_P, WCHAR_T_P, WCHAR_T_P]],
	ahkReady: [ref.types.int, [POINTER]],
	addScript: [POINTER, [WCHAR_T_P, ref.types.int, POINTER]]
})
const sleep = (t = 10) => new Promise(r => setTimeout(r, t))
export default async function () {
	try {
		let threadid = ahk2.NewThread(Buffer.from('#NoTrayIcon\nPersistent True\0', 'ucs-2'), Buffer.from('script\0', 'ucs-2'), Buffer.from('ahk\0', 'ucs-2'))
		let res = ahk2.ahkReady(threadid)
		while (!res) {
			await sleep(20)
			res = ahk2.ahkReady(threadid)
		}
		ahk2.addScript(Buffer.from(ahk_script + '\0', 'ucs-2'), 1, threadid)
		return true
	} catch {
		return false
	}
}