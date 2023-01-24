export declare interface Languages {
	name: string
	default: string
	fsou?: string
	baidu?: string
	tencent?: string
	openl?: string
	google?: string
	caiyun?: string
	wechat?: string
	youdao?: string
	metaAI?: string
}

export declare interface UIConfig {
	name: string
	label: string
	type: 'switch' | 'input' | 'password' | 'select'
	required?: boolean
	multi?: boolean
	options?: string[] | { label: string, value: any }[]
}

export declare interface OcrTranslateConfig extends Record<string, any> {
	enable: boolean,
	name: string,
	label: string,
	ui: UIConfig[]
	url: string
	
	zh2en_enable?: boolean
}

export declare interface IConfig {
	init: boolean
	pinup: boolean
	position: 'default' | 'last' | 'center' | 'mouse' | 'right-top'
	current_ocr: 'paddocr' | 'baidu'
	lang_testing: 'auto' | 'local' | 'tencent' | 'google'
	ocr_clipboard: boolean
	ocr: OcrTranslateConfig[]
	translate: OcrTranslateConfig[]
	languages: Languages[]
	timeout: number
}


export declare type ITranslateResult = { id: string, result: ITranslateResultItem | ITranslateResultItem[] }

export declare interface ITranslateResultItem {
	name: string
	text: string
	label?: string
	status: boolean
	
	isWord?: boolean
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

export declare interface UITranslate extends ITranslateResultItem {
	expand: boolean
	loading: boolean
}
