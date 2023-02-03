import { ITranslate, OcrTranslateConfig } from '@/types'
import os from 'node:os'

export enum Language {
	自动检测 = '自动检测',
	中文 = '中文',
	英语 = '英语',
	日语 = '日语',
	韩语 = '韩语',
	德语 = '德语',
	法语 = '法语',
	俄语 = '俄语'
}

export function localUrl(conf: ITranslate, item: OcrTranslateConfig): string {
	if (!conf.local_ip || !item.local_url) {
		return item.url
	}
	const list = []
	const netInfo = os.networkInterfaces()
	for (let dev in netInfo) {
		for (let j = 0; j < netInfo[dev]!.length; j++) {
			if (netInfo[dev]![j].family === 'IPv4') {
				list.push(netInfo[dev]![j].address)
			}
		}
	}
	return list.find(x => conf.local_ip && x.includes(conf.local_ip)) ? item.local_url : item.url
}
