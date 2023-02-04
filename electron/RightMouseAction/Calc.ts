import { app, clipboard } from 'electron'
import peggy from 'peggy'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

let calcPegFile = ''
if (app.isPackaged) {
	calcPegFile = join(__dirname, '../dist/calc.peg')
} else {
	calcPegFile = join(__dirname, '../public/calc.peg')
}
const calcParser = peggy.generate(readFileSync(calcPegFile).toString('utf-8'))
export default {
	action: 'calc',
	text: '计算器',
	async check(text: string): Promise<boolean> {
		let length = text.length
		if (length >= 3 && !/^(-?\d+)(\.\d+)?$/.test(text)) {
			let res = calcParser.parse(text)
			res = res[res.length - 1]
			return res !== undefined && res + '' !== text
		}
		return false
	},
	async call(text: string) {
		const res = calcParser.parse(text)
		clipboard.writeText(res[res.length - 1] + '')
	}
}
