import { join } from 'path'
import * as fs from 'fs'
import ffi from 'ffi-napi'
import ref from 'ref-napi'
import wchar_t from 'ref-wchar-napi'
import win32 from './win32'

const cwd = process.env.CUR_CWD
const ahk_script = fs.readFileSync(join(cwd, 'Mac.ahk'), 'utf-8')
const POINTER = ref.refType(ref.types.void)
const WCHAR_T_P = ref.refType(wchar_t)
const ahk2 = new ffi.Library(join(cwd, 'ahkh2x64.dll'), {
	NewThread: [POINTER, [WCHAR_T_P, WCHAR_T_P, WCHAR_T_P]],
	ahkReady: [ref.types.int, [POINTER]],
	addScript: [POINTER, [WCHAR_T_P, ref.types.int, POINTER]]
})

function wchar(str) {
	return Buffer.from(str + '\0', 'ucs-2')
}

const sleep = (t = 10) => new Promise(r => setTimeout(r, t))

class Ahkh2 {
	threadId: any
	callbackMap: Record<string, Function> = {}
	
	async init() {
		let threadId = this.threadId = ahk2.NewThread(wchar('#NoTrayIcon\nPersistent True'), wchar('asd'), wchar('ahk'))
		let res = ahk2.ahkReady(threadId)
		while (!res) {
			await sleep(20)
			res = ahk2.ahkReady(threadId)
		}
		const self = this
		const ptr = win32.registrMethod(function (obj) {
			try {
				const { name, args } = JSON.parse(obj)
				if (self.callbackMap[name]) {
					self.callbackMap[name].apply(null, args || [])
				}
			} catch {
			}
		})
		this.add(`
		__jsfncb(cbinfo) {
            DllCall(${ ptr }, 'Str', JSON.stringify(cbinfo))
        }`)
		this.add_fn('print', function (msg) {
			console.log(msg)
		})
	}
	
	add(script) {
		let done = false
		for (let i = 0; i < 3; i++) {
			try {
				ahk2.addScript(wchar(script), 1, this.threadId)
				done = true
				break
			} catch {
			}
		}
		return done
	}
	
	add_fn(alias, fn) {
		this.callbackMap[alias] = fn
		this.add(`
		${ alias }(args*) {
			__jsfncb({ name: '${ alias }', args: args })
			return
		}`)
		return this
	}
}

const ah2 = new Ahkh2()
ah2.init().then(() => {
	ah2.add_fn('js_key_callback', function (action) {
		process.send({ action })
	})
	ah2.add(ahk_script)
})
