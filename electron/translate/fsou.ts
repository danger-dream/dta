import { OcrTranslateConfig } from '../../types'
import axios from 'axios'
import qs from 'querystring'
import crypto from 'node:crypto'

const key = Buffer.from('badassbadassbada')

export default async function (conf: OcrTranslateConfig, text: string, from: string, to: string): Promise<string> {
	function h(str, max_num) {
		const len = str.length
		if (len < max_num) {
			return new Array(max_num - len + 1).join('0') + str
		}
		return len > max_num ? str.slice(max_num) : str
	}
	
	const cipher = crypto.createCipheriv('aes-128-cbc', key, key)
	const res = await axios.get(conf.url + '?' + qs.stringify({
		plaintext: 1, from, to, text: Buffer.concat([cipher.update(text), cipher.final()]).toString('hex')
	}))
	if (res.status === 200 && res.data.translation?.length > 0) {
		return res.data.translation.join('\n')
	}
	return ''
}
