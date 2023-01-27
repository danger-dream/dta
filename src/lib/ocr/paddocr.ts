import { OcrTranslateConfig } from '../../../types'
import axios from 'axios'

export default async function (conf: OcrTranslateConfig, base64: string): Promise<string> {
	const res = await axios.post(conf.url, { images: [base64] })
	if (res.status === 200 && res.data.status === '000') {
		return res.data.results.map((row: any) => row.map((x: any) => x.text).join(' ')).join('\n')
	}
	return ''
}
