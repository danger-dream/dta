import { OcrTranslateConfig } from '../../../types'
import axios from 'axios'

const qs = window.require('querystring')
const crypto = window.require('crypto')

function S4(): string {
	return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
}

function truncate(q: string): string {
	const len = q.length
	if (len <= 20) return q
	return q.substring(0, 10) + len + q.substring(len - 10, len)
}

export default async function (conf: OcrTranslateConfig, text: string, from: string, to: string): Promise<Record<string, any>> {
	const salt = S4() + S4() + S4() + S4() + S4() + S4() + S4() + S4()
	const curtime = Math.round(Date.now() / 1000)
	const sign = crypto.createHash('sha256').update(conf.appKey + truncate(text) + salt + curtime + conf.key).digest('hex')
	const res = await axios.post(
		conf.url,
		{ q: text, from, to, appKey: conf.appKey, salt, sign, signType: 'v3', curtime, ext: 'mp3' },
		{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, transformRequest: [(data) => qs.stringify(data)] }
	)
	if (res.status !== 200 || res.data.errorCode + '' !== '0') {
		throw new Error('翻译失败')
	}
	const obj = {} as Record<string, any>
	const data = res.data
	obj.text = data.translation.join('\n')
	obj.isWord = data.isWord
	obj.work_ext = { src_speak_url: data.speakUrl, dst_speak_url: data.tSpeakUrl }
	if (data.basic) {
		const basic = data.basic
		obj.work_ext.phonetic = basic.phonetic || ''
		obj.work_ext.explains = basic.explains || []
		if (basic['us-phonetic']) {
			obj.work_ext.us = {
				phonetic: basic['us-phonetic'],
				speech: basic['us-speech']
			}
		}
		if (basic['uk-phonetic']) {
			obj.work_ext.uk = {
				phonetic: basic['uk-phonetic'],
				speech: basic['uk-speech']
			}
		}
		if (basic.wfs) {
			obj.work_ext.wfs = basic.wfs.map((x: { wf: { name: string, value: string } }) => {
				return { name: x.wf.name, value: x.wf.value }
			})
		}
	}
	if (data.web) {
		obj.work_ext.web = data.web.map((x: { key: string, value: string }) => {
			return { name: x.key, list: x.value }
		})
	}
	return obj
}
