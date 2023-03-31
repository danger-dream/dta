export declare interface Languages extends Record<string, any> {
	name: string
	default: string
	baidu?: string
	tencent?: string
	google?: string
	caiyun?: string
	wechat?: string
	youdao?: string
}

export declare interface OcrTranslateConfig extends Record<string, any> {
	enable: boolean,
	name: string,
	label: string,
	url: string
	local_url?: string
	zh2en_enable?: boolean
}


export declare interface UITranslate {
	name: string
	text: string
	label?: string
	status: boolean
	expand: boolean
	loading: boolean
	isWord?: boolean
	timestamp: number
	work_ext: {
		/** 音标 */
		phonetic: string
		/** 翻译前语音合成发音URL */
		src_speak_url: string
		/** 翻译后语音合成发音URL */
		dst_speak_url: string
		/** 基本释义 */
		explains: string[]
		/** 美式 */
		us: {
			/** 音标 */
			phonetic: string
			/** 语音合成发音URL */
			speech: string
		}
		/** 英式 */
		uk: {
			/** 音标 */
			phonetic: string
			/** 语音合成发音URL */
			speech: string
		}
		/** 复数 */
		wfs: { name: string, value: string }[]
		/** 网络释义 */
		web: { name: string, list: string[] }[]
	}
}

export declare interface ITranslate {
	pinup: boolean
	position: 'default' | 'last' | 'center' | 'mouse' | 'right-top'
	current_ocr: 'paddocr' | 'baidu'
	lang_testing: 'auto' | 'local' | 'tencent' | 'google'
	ocr_clipboard: boolean
	ocr: OcrTranslateConfig[]
	translate: OcrTranslateConfig[]
	languages: Languages[]
	timeout: number
	local_ip?: string
}

export declare interface IConfig {
	init: boolean
	screenhost_type: 'shareX' | 'html'
	takeword: {
		enable: boolean
		auto_hide_time: number
		skip?: string[]
	}
	trans: ITranslate
}