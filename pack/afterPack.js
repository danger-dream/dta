const fs = require('fs')
exports.default = async function (context) {
	fs.unlinkSync(context.appOutDir + '/LICENSES.chromium.html')
	fs.unlinkSync(context.appOutDir + '/LICENSE.electron.txt')
	fs.unlinkSync(context.appOutDir + '/vk_swiftshader_icd.json')
	
	const localeDir = context.appOutDir + '/locales/'
	const files = fs.readdirSync(localeDir)
	for (const file of files.filter(x => x !== 'zh-CN.pak')) {
		fs.unlinkSync(localeDir + file)
	}
}
