import { IConfig } from '../types'
import { Language, localUrl } from '../global'
import { LanguageDetect } from './tencentcloud'
import axios from 'axios'


function lang_testing(str) {
	const s = str.replace(/\s+/g, '')
	if (s.length < 1) return Language.英语
	const list = [
		{ type: Language.中文, re: /[\u4e00-\u9fff\u2e80-\u2fdf\u3400-\u4dbf]/, num: 0 },
		{ type: Language.英语, re: /[\u0021-\u007e]/, num: 0 },
		{ type: Language.日语, re: /[\u3040-\u30ff\u31f0-\u31ff]/, num: 0 },
		{ type: Language.韩语, re: /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/, num: 0 },
		{ type: Language.俄语, re: /[\u0400-\u052f]/, num: 0 },
		{ type: Language.德语, re: /[\u00c0-\u00ff]/, num: 0 }
	]
	for (let i = 0; i < s.length; i++) {
		for (const item of list) {
			if (item.re.test(s.charAt(i))) {
				item.num++
			}
		}
	}
	const news = list.filter(x => x.num > 0)
	if (news.length < 1) {
		return Language.英语
	}
	return news.sort((a, b) => b.num - a.num)[0].type
}

async function tencent(config: IConfig, str): Promise<string> {
	try {
		const conf = config.translate.find(x => x.name === 'tencent')
		if (!conf.secretId || !conf.secretKey) {
			return ''
		}
		const text = str.split('\n').filter(x => !!x).join(' ').substring(0, 30)
		const res = await LanguageDetect({ Text: text, ProjectId: 0 }, { region: conf.region || 'ap-chengdu', secretId: conf.secretId, secretKey: conf.secretKey })
		for (const item of config.languages) {
			if (item.tencent === res.Lang || item.default === res.Lang) {
				return item.name
			}
		}
	} catch {
		return ''
	}
}

async function google(config: IConfig, str: string): Promise<string> {
	try {
		const conf = config.translate.find(x => x.name === 'google')
		if (!conf || !conf.url || !conf.projectId || !conf.apiKey)
			return ''
		const res = await axios.post(localUrl(config, conf) + '/detect', { projectId: conf.projectId, key: conf.apiKey, text: str })
		if (res.status === 200 && res.data.success) {
			if (res.data.result.language.startsWith('zh')) return Language.中文
			for (const item of config.languages) {
				if (item.google === res.data.result.language || item.default === res.data.result.language) {
					return item.name
				}
			}
		}
	} catch {
	}
	return ''
}

export default async function (config: IConfig, str: string): Promise<string> {
	let lang = ''
	try {
		if (config.lang_testing === 'auto') {
			lang = await tencent(config, str)
			if (lang) return lang
			lang = await google(config, str)
		} else if (config.lang_testing === 'tencent') {
			lang = await tencent(config, str)
		} else if (config.lang_testing === 'google') {
			lang = await google(config, str)
		}
	} catch {
	}
	return lang || lang_testing(str)
}
