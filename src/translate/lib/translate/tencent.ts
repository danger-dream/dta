import { OcrTranslateConfig } from '@/types'
import { TextTranslate } from '../tencentcloud'

export default async function (conf: OcrTranslateConfig, text: string, from: string, to: string): Promise<string> {
	const res = await TextTranslate({ SourceText: text, Source: from, Target: to, ProjectId: 0 }, { region: conf.region || 'ap-chengdu', secretId: conf.secretId, secretKey: conf.secretKey })
	if (res.Error) {
		throw new Error(res.Error.Message)
	}
	return res.TargetText
}
