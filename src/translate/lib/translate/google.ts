import { OcrTranslateConfig } from '@/types'
import axios from 'axios'

export default async function (conf: OcrTranslateConfig, text: string, from: string, to: string): Promise<string> {
	/*const res = await axios.post(conf.url, { projectId: conf.projectId, key: conf.apiKey, text, to })
	if (res.status === 200 && res.data.success) {
		return res.data.result
	} else {
		throw new Error(res.data?.result || '未知的错误')
	}*/
	const res = await axios.post(conf.url, { key: conf.apiKey, text, lang: to })
	if (res.status === 200) {
		return res.data
	} else {
		throw new Error(res.data?.result || '未知的错误')
	}
}
