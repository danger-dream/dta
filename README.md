# Desktop Tools Assistant

Desktop Tools Assistant是一款仿[Bob](https://bobtranslate.com/)、[PopClip](https://pilotmoon.com/popclip/).的屏幕取词、OCR、翻译、取色工具，使用Electron、Vite、Vue3开发。

图片识别、翻译功能可仅使用自建服务（paddocr + meta-ai fairseq nllb）

集成ahk2，自定义按键后可拥有与macos同样的按键体验

## 截图

![主界面](image/主界面.png)
![翻译.png](image%2F%E7%BF%BB%E8%AF%91.png)
![查词](image/查词.png)

## 已接入的OCR

* [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) 识别率还行，部署在自己的服务器比较放心。后面考虑集成本地版
  ```bash
  docker run --name ppdocr -p 8866:8866 -d drainkeng/paddleocr:2.6-cpu-latest
  ```
* [百度文字识别OCR](https://cloud.baidu.com/doc/OCR/index.html) 备选方案

## 已接入语种识别

* unicode识别，不涉及语义
* [Google Cloud Translation API detect](https://cloud.google.com/translate/docs/basic/detecting-language)
* [腾讯云 语种识别](https://cloud.tencent.com/document/api/551/15620) 这个是免费的还是和文本翻译共用免费额度不太清楚...
* 默认使用自动模式： 腾讯云 -> Google -> unicode，要快的话直接换unicode

## 已接入文本翻译（已删除效果较差的接口）

* [有道翻译](https://ai.youdao.com/DOCSIRMA/html/%E8%87%AA%E7%84%B6%E8%AF%AD%E8%A8%80%E7%BF%BB%E8%AF%91/API%E6%96%87%E6%A1%A3/%E6%96%87%E6%9C%AC%E7%BF%BB%E8%AF%91%E6%9C%8D%E5%8A%A1/%E6%96%87%E6%9C%AC%E7%BF%BB%E8%AF%91%E6%9C%8D%E5%8A%A1-API%E6%96%87%E6%A1%A3.html) 查词时还是很有用的
* [百度通用翻译](http://api.fanyi.baidu.com/doc/21) 高级版100万字符免费额度
* [Google Cloud Translation API v2](https://cloud.google.com/translate/docs/basic/translating-text?hl=zh-cn) v2版本够用了，每月50万字符免费额度
* [腾讯云 文本翻译](https://cloud.tencent.com/document/api/551/15619) 500万字符免费额度
* [微信翻译](https://developers.weixin.qq.com/doc/offiaccount/Intelligent_Interface/AI_Open_API.html) 为了接入还注册了个小程序，没提收费的事，但API只支持中英互转
* [彩云小译](https://open.caiyunapp.com/%E4%BA%94%E5%88%86%E9%92%9F%E5%AD%A6%E4%BC%9A%E5%BD%A9%E4%BA%91%E5%B0%8F%E8%AF%91_API) 100万字符免费额度，支持中英日互译

## 配置文件

* ### 自己申请接口后修改这部分，涉及到各种密钥，我就不提交这个文件了
* ### 路径在electron/config.ts
* ### 不加没法运行!!!!

```typescript
import { IConfig } from '@/types'

export default {
	init: true,
	//  截图类型，shareX、html
	screenhost_type: 'shareX',
	//  滑词检索配置
	takeword: {
		//  启用
		enable: true,
		//  自动隐藏时间，单位：秒
		auto_hide_time: 1,
		//  跳过要处理的进程，进程名称、路径
		skip: ['MobaXterm_Personal_22.1.exe', 'D:\\JetBrains\\apps', 'C:\\Program Files\\PowerShell', 'WindowsTerminal.exe', 'explorer.exe']
	},
	//  翻译配置
	trans: {
		//  钉住窗口
		pinup: false,
		//  默认启动位置，未使用
		position: 'right-top',
		//  语言检测方式
		lang_testing: 'local',
		//  ocr识别方式
		current_ocr: 'paddocr',
		//  识图后复制到剪切板
		ocr_clipboard: true,
		//  单个翻译接口超时时间
		timeout: 15,
		//  本地ip前缀
		local_ip: '172.20.0.',
		//  ocr配置
		ocr: [
			{
				enable: true,
				name: 'baidu',
				label: '百度通用场景文本识别',
				token_url: 'https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials',
				url: 'https://aip.baidubce.com/rest/2.0/ocr/v1/',
				client_id: '',
				client_secret: '',
				detect_direction: true,
				type: '标准' as '高精度' | '高精度含坐标' | '标准' | '标准含坐标',
				type_action: { 标准: 'general_basic', 标准含坐标: 'general', 高精度: 'accurate_basic', 高精度含坐标: 'accurate' }
			},
			{ enable: true, name: 'paddocr', label: '飞桨OCR', url: '你的地址' }
		],
		translate: [
			{ enable: true, name: 'youdao', label: '有道翻译', url: 'http://openapi.youdao.com/api', appKey: '', key: '' },
			{ enable: true, name: 'baidu', label: '百度翻译', url: 'https://fanyi-api.baidu.com/api/trans/vip/translate', appid: '', secret: '' },
			{ enable: true, name: 'google', label: '谷歌翻译', zh2en_enable: false, url: 'https://你的workers地址.workers.dev/trans', apiKey: '' },
			{ enable: true, name: 'tencent', label: '腾讯翻译', url: 'tmt.tencentcloudapi.com', region: 'ap-chengdu', secretId: '', secretKey: '' },
			{ enable: true, name: 'wechat', label: '微信翻译', url: 'https://api.weixin.qq.com/cgi-bin', appid: '', secret: '' },
			{ enable: true, name: 'caiyun', label: '彩云小译', url: 'http://api.interpreter.caiyunai.com/v1/translator', token: '' }
		],
		languages: [
			{ name: '中文', default: 'zh', wechat: 'zh_CN', youdao: 'zh-CHS', google: 'zh_CN' },
			{ name: '英语', default: 'en', wechat: 'en_US' },
			{ name: '日语', default: 'ja', wechat: '-' },
			{ name: '韩语', default: 'ko', baidu: 'kor', caiyun: '-', wechat: '-' },
			{ name: '俄语', default: 'ru', caiyun: '-', wechat: '-' },
			{ name: '德语', default: 'de', caiyun: '-', wechat: '-' },
			{ name: '法语', default: 'fr', baidu: 'fra', caiyun: '-', wechat: '-' }
		]
	}
} as IConfig
```

## ......

* 飞桨OCR部署完成后的地址是host:port/predict/ocr_system.我自己代理了一层到cdn，要用的话记得改成你自己的url
* google api调用建议使用CloudFlare的Workers，稳定免费，脚本如下：

```javascript
unction
main(request)
{
	const { lang, text, key } = await request.json()
	const req = { "target": lang, "q": text }
	const response = await fetch(
		'https://translation.googleapis.com/language/translate/v2?key=' + key,
		{ body: JSON.stringify(req), method: 'POST', headers: { 'content-type': 'application/json;charset=UTF-8' } }
	)
	const { headers, status } = response
	if (status == "200" && headers.get('content-type').includes('application/json')) {
		const res = await response.json()
		if (res.data) {
			let translations = res.data.translations
			return (Array.isArray(translations) ? translations[0] : translations).translatedText
			// detectedSourceLanguage
		}
	}
	throw new Error("Failed response from Google Translate")
}

export default {
	async fetch(request, env) {
		if (request.method !== 'POST' || !request.url.endsWith('/trans')) {
			return new Response('', { status: 404, headers: { "Cache-Control": "no-cache" } })
		}
		let status = true
		let text = ''
		try {
			text = await main(request)
		} catch (e) {
			status = false
			text = e.message
		}
		return new Response(text, { status: status ? 200 : 400, headers: { "Cache-Control": "no-cache" } })
	}
}
```

* 只支持了部分语言，有需要的自己加，文末有各平台语言编码对照链接
* 只使用了常用的包，理论都能自己打包出来
* 集成了[AutoHotKey 2.0](https://autohotkey.com)，做改键会更像mac，打包成dll了，放在pack/ahkh2x64.dll，改键脚本是pack/Mac.ahk

## 各平台语言编码

[有道](https://ai.youdao.com/DOCSIRMA/html/%E8%87%AA%E7%84%B6%E8%AF%AD%E8%A8%80%E7%BF%BB%E8%AF%91/API%E6%96%87%E6%A1%A3/%E6%96%87%E6%9C%AC%E7%BF%BB%E8%AF%91%E6%9C%8D%E5%8A%A1/%E6%96%87%E6%9C%AC%E7%BF%BB%E8%AF%91%E6%9C%8D%E5%8A%A1-API%E6%96%87%E6%A1%A3.html#section-9)

[彩云](https://docs.caiyunapp.com/blog/2018/09/03/lingocloud-api/)

[google](https://cloud.google.com/translate/docs/languages?hl=zh-cn)

[腾讯](https://cloud.tencent.com/document/api/551/73920)

[百度](http://api.fanyi.baidu.com/doc/21)

## end
