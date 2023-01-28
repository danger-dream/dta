import { OcrTranslateConfig } from '../../../types'
import axios from 'axios'

interface IItem {
	x: number
	y: number
	width: number
	word_width: number
	height: number
	right: number
	bottom: number
	v: string
	text_region: number[][]
	ispush: boolean
}

export default async function (conf: OcrTranslateConfig, base64: string): Promise<string> {
	const res = await axios.post(conf.url, { images: [base64] })
	if (res.status === 200 && res.data.status === '000') {
		
		const list = [] as IItem[]
		for (const item of res.data.results[0]) {
			const obj = {
				v: item.text,
				x: item.text_region[0][0],
				y: item.text_region[0][1],
				height: item.text_region[3][1] - item.text_region[0][1],
				width: item.text_region[1][0] - item.text_region[0][0],
				right: 0, bottom: 0,
				text_region: item.text_region,
				word_width: 0, ispush: false
			}
			obj.word_width = obj.width / item.text.length
			obj.right = obj.x + obj.width
			obj.bottom = obj.y + obj.height
			list.push(obj)
		}
		let last_line = {} as IItem
		let newLines = [] as IItem[]
		
		function pushLastLine() {
			if (!last_line.ispush && last_line.v !== undefined) {
				last_line.ispush = true
				newLines.push(last_line)
				return true
			}
			return false
		}
		
		for (const item of list) {
			if (last_line.v === undefined) {
				last_line = item
				continue
			}
			//  y轴基本相同
			if (Math.abs(item.y - last_line.y) < item.height) {
				if (item.x - last_line.right > item.word_width * 2) {
					if (pushLastLine()) {
						newLines.push(item)
					}
				} else {
					pushLastLine()
					last_line = item
				}
			} else {
				//  如果两行间x轴正负小于1个字，则不是同一行文本
				if (item.y - last_line.bottom > item.height || Math.abs(item.x - last_line.x) > item.word_width) {
					pushLastLine()
					last_line = item
				} else {
					if (Math.abs(item.width - last_line.width) < item.word_width * 2 || item.width < last_line.width) {
						last_line.v += item.v
					} else {
						pushLastLine()
						last_line = item
					}
				}
			}
		}
		
		if (!last_line.ispush && last_line.v !== undefined) {
			newLines.push(last_line)
		}
		return newLines.map(x => x.v).join('\n')
	}
	return ''
}
