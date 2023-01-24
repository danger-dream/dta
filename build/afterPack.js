exports.default = async function (context) {
	const fs = require('fs')
	fs.unlinkSync(context.appOutDir + '/LICENSES.chromium.html')
	fs.unlinkSync(context.appOutDir + '/LICENSE.electron.txt')
	const localeDir = context.appOutDir + '/locales/'
	fs.readdir(localeDir, function (err, files) {
		if (!(files && files.length)) return
		for (let i = 0, len = files.length; i < len; i++) {
			const match = files[i].match(/zh-CN\.pak/) //只保留中文
			if (match === null) {
				fs.unlinkSync(localeDir + files[i])
			}
		}
	})
}
