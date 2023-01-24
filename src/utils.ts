export function S4(): string {
	return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
}

export function UUID(): string {
	return S4() + S4() + S4() + S4() + S4() + S4() + S4() + S4()
}

export function isEmpty(str: any): boolean {
	if (typeof str === 'undefined' || str === null || str === '') return true
	if (Array.isArray(str)) {
		return str.length === 0
	} else if (typeof str === 'number') {
		return str === 0
	}
	return (str + '').replace(/\s+/g, '').length === 0
}
