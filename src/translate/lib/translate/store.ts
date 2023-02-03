import { app } from '@electron/remote'

const { existsSync, mkdirSync, readFileSync, writeFileSync } = window.require('fs')
const crypto = window.require('crypto')
const { join } = window.require('path')
const defaultKey = 'FV$jyu*D!rWpxZZ2$g%cfDx6%^Ng@2xh'

function encrypt(text: string, key: string): Buffer {
	key = key + defaultKey
	let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key.substr(0, 32)), Buffer.from(key.substr(0, 16)))
	return Buffer.concat([cipher.update(text), cipher.final()])
}

function decrypt(buf: Buffer, key: string): string {
	key = key + defaultKey
	let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key.substr(0, 32)), Buffer.from(key.substr(0, 16)))
	return Buffer.concat([decipher.update(buf), decipher.final()]).toString()
}

export default class Store {
	private readonly path: string
	private readonly map: Record<string, any> = {}
	
	constructor(private filename: string, private pwd: string) {
		this.path = join(app.getPath('userData'), 'conf')
		if (!existsSync(this.path)) {
			mkdirSync(this.path)
		}
		this.path = join(this.path, filename)
		if (existsSync(this.path)) {
			try {
				this.map = JSON.parse(decrypt(readFileSync(this.path), pwd))
			} catch {
			}
		}
	}
	
	set(key: string, value: any) {
		this.map[key] = value
		try {
			writeFileSync(this.path, encrypt(JSON.stringify(this.map), this.pwd))
		} catch {
		}
		return this
	}
	
	get<T>(key: string, default_value?: T): T {
		return this.map[key] || default_value
	}
}
