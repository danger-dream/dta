import { IConfig } from '../../types'
import baidu from './baidu'
import paddocr from './paddocr'

const map = { baidu, paddocr }

export default async function (config: IConfig, base64: string): Promise<string> {
	const conf = config.ocr.find(x => x.name === config.current_ocr)
	if (!conf) {
		throw new Error('无效的配置')
	}
	const action = map[config.current_ocr]
	if (!action) {
		throw new Error('接口错误')
	}
	try {
		return await action(conf, base64)
	} catch {
		throw new Error('接口调用错误')
	}
}
