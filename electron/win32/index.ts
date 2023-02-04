export enum MouseAction {
	None = -1,
	Move = 1,
	Up,
	Down,
	Wheel,
	Click,
	DBClick,
	LongClick
}

export enum MouseButton {
	NONE = -1,
	WHEEL = 0,
	LEFT = 1,
	RIGHT = 2,
	MIDDLE
}

export enum WheelDirection {
	NONE = 0,
	UP = 65416,
	DOWN = 120
}

export declare interface ICapture {
	x: number
	y: number
	width: number
	height: number
	image?: Buffer
}

export declare interface IProcess {
	pid: number
	ppid: number
	exeFile: string
	path?: string
}

export type KeyboardRegularButton =
	| 'backspace'
	| 'tab'
	| 'enter'
	| 'shift'
	| 'ctrl'
	| 'alt'
	| 'pause'
	| 'capslock'
	| 'escape'
	| 'space'
	| 'pageup'
	| 'pagedown'
	| 'end'
	| 'home'
	| 'left'
	| 'up'
	| 'right'
	| 'down'
	| 'prntscrn'
	| 'insert'
	| 'delete'
	| '0'
	| '1'
	| '2'
	| '3'
	| '4'
	| '5'
	| '6'
	| '7'
	| '8'
	| '9'
	| 'a'
	| 'b'
	| 'c'
	| 'd'
	| 'e'
	| 'f'
	| 'g'
	| 'h'
	| 'i'
	| 'j'
	| 'k'
	| 'l'
	| 'm'
	| 'n'
	| 'o'
	| 'p'
	| 'q'
	| 'r'
	| 's'
	| 't'
	| 'u'
	| 'v'
	| 'w'
	| 'x'
	| 'y'
	| 'z'
	| 'lwin'
	| 'rwin'
	| 'num0'
	| 'num1'
	| 'num2'
	| 'num3'
	| 'num4'
	| 'num5'
	| 'num6'
	| 'num7'
	| 'num8'
	| 'num9'
	| 'num*'
	| 'num+'
	| 'num,'
	| 'num-'
	| 'num.'
	| 'num/'
	| 'f1'
	| 'f2'
	| 'f3'
	| 'f4'
	| 'f5'
	| 'f6'
	| 'f7'
	| 'f8'
	| 'f9'
	| 'f10'
	| 'f11'
	| 'f12'
	| 'f13'
	| 'f14'
	| 'f15'
	| 'f16'
	| 'f17'
	| 'f18'
	| 'f19'
	| 'f20'
	| 'f21'
	| 'f22'
	| 'f23'
	| 'f24'
	| 'numlock'
	| 'scrolllock'
	| 'lshift'
	| 'rshift'
	| 'lctrl'
	| 'rctrl'
	| 'lalt'
	| 'ralt'
	| ';'
	| '='
	| ','
	| '-'
	| '.'
	| '/'
	| '~'
	| '['
	| '|'
	| ']'
	| '\'';

interface win32 {
	createMouseHook(
		func: (params: { action: MouseAction, x: number, y: number, btn: MouseButton, delta: WheelDirection }) => void
	): boolean
	
	stopMouseHook(): void
	
	enableMouseMove(): void
	
	getMousePos(): { x: number, y: number }
	
	getAllMonitor(): { device: string, left: number, top: number, right: number, bottom: number, width: number, height: number, primary: boolean }[]
	
	capture(): ICapture
	
	capture(width: number, height: number): ICapture
	
	capture(x: number, y: number, width: number, height: number): ICapture
	
	capture_fpng(): ICapture
	
	capture_fpng(width: number, height: number): ICapture
	
	capture_fpng(x: number, y: number, width: number, height: number): ICapture
	
	getColor(x: number, y: number): number
	
	keyToggle(keycode: number, up?: boolean): number
	
	getForegroundWindowPid(): number
	
	findProcess(pid: number): IProcess
	
	findProcess(): IProcess[]
	
	killProcess(pid: number)
	
	getDoubleClickTime(): number
	
	getCaretPos(): undefined | { x: number, y: number }
	
	KeyCodes: Record<KeyboardRegularButton, number>
}


const win32Node: win32 = require('../build/Release/win32.node')
export default win32Node
