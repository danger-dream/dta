{
	"targets": [
		{
			"target_name": "win32",
			"cflags!": [ "-fno-exceptions" ],
			"cflags_cc!": [ "-fno-exceptions" ],
			"msvs_settings": {
				"VCCLCompilerTool": { "ExceptionHandling": 1 },
			},
			"sources": [
				"electron/win32/main.cpp",
				"electron/win32/selection.cpp"
			],
			"include_dirs": ["<!@(node -p \"require('node-addon-api').include\")"],
			"defines": ["NAPI_VERSION=<(napi_build_version)", "NAPI_DISABLE_CPP_EXCEPTIONS", "_HAS_EXCEPTIONS=1"]
		}
	]
}
