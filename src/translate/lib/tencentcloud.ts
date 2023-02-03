import axios from 'axios'

const crypto = window.require('crypto')

function getHash(message: string) {
	return crypto.createHash('sha256').update(message).digest('hex')
}

function sha256(message: string, secret = '', encoding = '') {
	return crypto.createHmac('sha256', secret).update(message).digest(encoding as any)
}

function getDate(timestamp: number): string {
	const date = new Date(timestamp * 1000)
	return `${ date.getUTCFullYear() }-${ ('0' + (date.getUTCMonth() + 1)).slice(-2) }-${ ('0' + date.getUTCDate()).slice(-2) }`
}

async function RequestTencentCloudApi(action: string, req: Record<string, any>, config: { secretId: string, secretKey: string, region: string }): Promise<Record<string, any>> {
	const signedHeaders = 'content-type;host'
	const canonicalRequest = 'POST\n/\n\ncontent-type:application/json\nhost:tmt.tencentcloudapi.com\n\n' + signedHeaders + '\n' + getHash(JSON.stringify(req))
	const timestamp = parseInt(String(new Date().getTime() / 1000))
	const date = getDate(timestamp)
	const kService = sha256('tmt', sha256(date, 'TC3' + config.secretKey))
	const kSigning = sha256('tc3_request', kService)
	const signature = sha256('TC3-HMAC-SHA256' + '\n' + timestamp + '\n' + `${ date }/tmt/tc3_request` + '\n' + getHash(canonicalRequest), kSigning, 'hex')
	const sign = `TC3-HMAC-SHA256 Credential=${ config.secretId }/${ date }/tmt/tc3_request, SignedHeaders=${ signedHeaders }, Signature=${ signature }`
	
	const res = await axios.post('https://tmt.tencentcloudapi.com/', req, {
		timeout: 60 * 1000,
		headers: {
			//Host: 'tmt.tencentcloudapi.com',
			'Content-Type': 'application/json',
			'X-TC-Action': 'TextTranslate',
			'X-TC-Region': config.region,
			'X-TC-Timestamp': timestamp,
			'X-TC-Version': '2018-03-21',
			'X-TC-RequestClient': 'SDK_NODEJS_4.0.526',
			Authorization: sign
		}
	})
	if (res.status === 200) {
		return res.data.Response
	}
	throw new Error('调用腾讯云接口失败')
}

export async function LanguageDetect(req: Record<string, any>, config: { secretId: string, secretKey: string, region: string }) {
	return await RequestTencentCloudApi('LanguageDetect', req, config)
}

export async function TextTranslate(req: Record<string, any>, config: { secretId: string, secretKey: string, region: string }) {
	return await RequestTencentCloudApi('TextTranslate', req, config)
}
