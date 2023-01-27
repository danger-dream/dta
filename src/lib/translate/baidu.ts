import { OcrTranslateConfig } from '../../../types'
import axios from 'axios'

const qs = window.require('querystring')
const crypto = window.require('crypto')

export default async function (conf: OcrTranslateConfig, text: string, from: string, to: string): Promise<string> {
	const salt = new Date().getTime()
	const url = conf.url + '?' + qs.stringify({
		q: text, appid: conf.appid, salt: salt, from, to, dict: 1, tts: 1,
		sign: crypto.createHash('md5').update(conf.appid + text + salt + conf.secret).digest('hex')
	})
	const res = await axios.get(url)
	if (res.status === 200 && res.data.trans_result?.length > 0) {
		return res.data.trans_result.map((x: any) => x.dst).join('\n')
	} else {
		return ''
	}
}
