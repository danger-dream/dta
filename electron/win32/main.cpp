#include "main.hpp"

void onMainThread(Napi::Env env, Napi::Function function, MouseEventContext *pMouseEvent) {
	auto nCode = pMouseEvent->nCode;
	auto wParam = pMouseEvent->wParam;
	auto ptX = pMouseEvent->ptX;
	auto ptY = pMouseEvent->ptY;
	auto nMouseData = pMouseEvent->mouseData;
	
	delete pMouseEvent;
	
	if (nCode >= 0) {
		auto action = -1;
		auto button = -1;
		auto delta = 0;
		if (wParam == WM_MOUSEMOVE) {
			if (captureMouseMove) {
				action = 1; // mousemove
			}
		} else {
			if (wParam == WM_LBUTTONUP || wParam == WM_RBUTTONUP || wParam == WM_MBUTTONUP) {
				action = 2; // mouseup
			} else if (wParam == WM_LBUTTONDOWN || wParam == WM_RBUTTONDOWN || wParam == WM_MBUTTONDOWN) {
				action = 3; // mousedown
			} else if (wParam == WM_MOUSEWHEEL || wParam == WM_MOUSEHWHEEL) {
				action = 4; // mousewheel
			}
			
			if (wParam == WM_LBUTTONUP || wParam == WM_LBUTTONDOWN) {
				button = 1;
			} else if (wParam == WM_RBUTTONUP || wParam == WM_RBUTTONDOWN) {
				button = 2;
			} else if (wParam == WM_MBUTTONUP || wParam == WM_MBUTTONDOWN) {
				button = 3;
			} else if (wParam == WM_MOUSEWHEEL) {
				button = 0;
				delta = HIWORD(nMouseData);
			} else if (wParam == WM_MOUSEHWHEEL) {
				button = 1;
			}
		}
		
		if (action != -1) {
			Napi::HandleScope scope(env);
			auto obj = Napi::Object::New(env);
			obj["action"] = action;
			obj["btn"] = button;
			obj["x"] = ptX;
			obj["y"] = ptY;
			obj["delta"] = delta;
			function.Call(env.Global(), {obj});
		}
	}
}

LRESULT CALLBACK HookCallback(int nCode, WPARAM wParam, LPARAM lParam) {
	MSLLHOOKSTRUCT *data = (MSLLHOOKSTRUCT *) lParam;
	
	if (!(wParam == WM_MOUSEMOVE && !captureMouseMove)) {
		auto pMouseEvent = new MouseEventContext();
		pMouseEvent->nCode = nCode;
		pMouseEvent->wParam = wParam;
		pMouseEvent->ptX = data->pt.x;
		pMouseEvent->ptY = data->pt.y;
		pMouseEvent->mouseData = data->mouseData;
		
		_tsfn.NonBlockingCall(pMouseEvent, onMainThread);
	}
	
	return CallNextHookEx(_hook, nCode, wParam, lParam);
}

DWORD WINAPI MouseHookThread(LPVOID lpParam) {
	MSG msg;
	_hook = SetWindowsHookEx(WH_MOUSE_LL, HookCallback, NULL, 0);
	
	while (GetMessage(&msg, NULL, 0, 0) > 0) {
		TranslateMessage(&msg);
		DispatchMessage(&msg);
	}
	_tsfn.Release();
	return 0;
}

void stopMouseHook() {
	if (_hook != NULL) {
		UnhookWindowsHookEx(_hook);
		_hook = NULL;
	}
	if (_hThread != NULL) {
		_tsfn.Release();
		_tsfn = NULL;
		TerminateThread(_hThread, 0);
		_hThread = NULL;
	}
}

void _stopMouseHook(const Napi::CallbackInfo &info) {
	stopMouseHook();
}

Napi::Boolean createMouseHook(const Napi::CallbackInfo &info) {
	stopMouseHook();
	DWORD dwThreadID;
	_hThread = CreateThread(NULL, 0, MouseHookThread, NULL, CREATE_SUSPENDED, &dwThreadID);
	_tsfn = Napi::ThreadSafeFunction::New(info.Env(), info[0].As<Napi::Function>(), "WH_MOUSE_LL Hook Thread", 512, 1,
	                                      [](Napi::Env) {
		                                      CloseHandle(_hThread);
	                                      }
	);
	if (_hThread) {
		ResumeThread(_hThread);
	}
	return Napi::Boolean::New(info.Env(), true);
}

void enableMouseMove(const Napi::CallbackInfo &info) {
	captureMouseMove = true;
}

Napi::Value getMousePos(const Napi::CallbackInfo &info) {
	POINT point;
	GetCursorPos(&point);
	Napi::Object p = Napi::Object::New(info.Env());
	p["x"] = point.x;
	p["y"] = point.y;
	return p;
}

struct MonitorRects {
	std::vector<DisplayRect> rects;
	
	static BOOL CALLBACK MonitorEnum(HMONITOR hMon, HDC hdc, LPRECT lpRect, LPARAM pData) {
		MONITORINFOEXA iMonitor{};
		iMonitor.cbSize = sizeof(MONITORINFOEXA);
		GetMonitorInfoA(hMon, &iMonitor);
		
		DisplayRect rect{};
		rect.device = std::string(iMonitor.szDevice);
		rect.rect = *lpRect;
		
		DEVMODEA dm{};
		dm.dmSize = sizeof(DEVMODEA);
		if (EnumDisplaySettingsA(iMonitor.szDevice, ENUM_CURRENT_SETTINGS, &dm) != 0) {
			//dm.dmPosition
			rect.dmPelsWidth = dm.dmPelsWidth;
			rect.dmPelsHeight = dm.dmPelsHeight;
		}
		reinterpret_cast<MonitorRects *>(pData)->rects.push_back(rect);
		return TRUE;
	}
	
	MonitorRects() {
		EnumDisplayMonitors(0, 0, MonitorEnum, (LPARAM) this);
	}
};

Napi::Value getAllMonitor(const Napi::CallbackInfo &info) {
	MonitorRects monitors{};
	POINT point{};
	GetCursorPos(&point);
	auto env = info.Env();
	auto result = Napi::Array::New(env);
	
	for (const DisplayRect &rect: monitors.rects) {
		auto item = Napi::Object::New(env);
		item["device"] = rect.device;
		item["left"] = rect.rect.left;
		item["top"] = rect.rect.top;
		item["right"] = rect.rect.right;
		item["bottom"] = rect.rect.bottom;
		item["width"] = rect.dmPelsWidth;
		item["height"] = rect.dmPelsHeight;
		item["primary"] = point.x >= rect.rect.left && point.x <= rect.rect.left + rect.dmPelsWidth &&
		                  point.y >= rect.rect.top && point.y <= rect.rect.top + rect.dmPelsHeight;
		result[result.Length()] = item;
	}
	return result;
}

uint8_t *bitmap2png(HBITMAP hbitmap) {
	Gdiplus::Bitmap bmp(hbitmap, nullptr);
	IStream *istream = nullptr;
	if (CreateStreamOnHGlobal(NULL, TRUE, &istream) != 0)
		return 0;
	CLSID clsid_png;
	if (CLSIDFromString(L"{557cf406-1a04-11d3-9a73-0000f81ef32e}", &clsid_png) != 0)
		return 0;
	if (bmp.Save(istream, &clsid_png) != Gdiplus::Status::Ok)
		return 0;
	
	HGLOBAL hg = NULL;
	if (GetHGlobalFromStream(istream, &hg) != S_OK)
		return 0;
	
	SIZE_T len = GlobalSize(hg);
	auto mem = (uint8_t *) malloc(len);
	LPVOID pimage = GlobalLock(hg);
	if (!pimage || mem == 0) {
		GlobalUnlock(hg);
		istream->Release();
		return 0;
	}
	memcpy(mem, pimage, len);
	GlobalUnlock(hg);
	istream->Release();
	return mem;
}

Napi::Value capture(const Napi::CallbackInfo &info) {
	auto env = info.Env();
	int x = 0;
	int y = 0;
	int w = 2560;
	int h = 1600;
	if (info.Length() == 4) {
		x = info[0].As<Napi::Number>().Int32Value();
		y = info[1].As<Napi::Number>().Int32Value();
		w = info[2].As<Napi::Number>().Int32Value();
		h = info[3].As<Napi::Number>().Int32Value();
	} else if (info.Length() == 2) {
		w = info[0].As<Napi::Number>().Int32Value();
		h = info[1].As<Napi::Number>().Int32Value();
	} else {
		MonitorRects monitor;
		POINT point;
		GetCursorPos(&point);
		
		for (const DisplayRect &rect: monitor.rects) {
			if (point.x >= rect.rect.left && point.x <= rect.rect.left + rect.dmPelsWidth &&
			    point.y >= rect.rect.top && point.y <= rect.rect.top + rect.dmPelsHeight) {
				x = point.x;
				y = point.y;
				w = rect.dmPelsWidth;
				h = rect.dmPelsHeight;
				break;
			}
		}
		
	}
	CoInitialize(nullptr);
	
	ULONG_PTR token;
	Gdiplus::GdiplusStartupInput tmp;
	GdiplusStartup(&token, &tmp, nullptr);
	
	auto hdc = GetDC(nullptr);
	if (hdc == nullptr) return env.Undefined();
	auto memdc = CreateCompatibleDC(hdc);
	if (memdc == nullptr) {
		ReleaseDC(nullptr, hdc);
		return env.Undefined();
	}
	auto hbitmap = CreateCompatibleBitmap(hdc, w, h);
	if (hbitmap == nullptr) {
		DeleteDC(memdc);
		ReleaseDC(nullptr, hdc);
		return env.Undefined();
	}
	auto result = Napi::Object::New(env);
	result["x"] = x;
	result["y"] = y;
	result["width"] = w;
	result["height"] = h;
	auto oldbmp = SelectObject(memdc, hbitmap);
	if (BitBlt(memdc, 0, 0, w, h, hdc, 0, 0, SRCCOPY)) {
		uint8_t *mem = bitmap2png(hbitmap);
		if (mem) {
			auto image = Napi::Buffer<unsigned char>::New(env, mem, _msize(mem));
			image.AddFinalizer([](Napi::Env env, uint8_t *buf) {
				free(buf);
			}, mem);
			result["image"] = image;
		}
	}
	DeleteObject(hbitmap);
	SelectObject(memdc, oldbmp);
	DeleteDC(memdc);
	ReleaseDC(nullptr, hdc);
	Gdiplus::GdiplusShutdown(token);
	CoUninitialize();
	return result;
}


Napi::Value capture_fpng(const Napi::CallbackInfo &info) {
	auto env = info.Env();
	int x = 0;
	int y = 0;
	int w = 2560;
	int h = 1600;
	if (info.Length() == 4) {
		x = info[0].As<Napi::Number>().Int32Value();
		y = info[1].As<Napi::Number>().Int32Value();
		w = info[2].As<Napi::Number>().Int32Value();
		h = info[3].As<Napi::Number>().Int32Value();
	} else if (info.Length() == 2) {
		w = info[0].As<Napi::Number>().Int32Value();
		h = info[1].As<Napi::Number>().Int32Value();
	} else {
		MonitorRects monitor;
		POINT point;
		GetCursorPos(&point);
		
		for (const DisplayRect &rect: monitor.rects) {
			if (point.x >= rect.rect.left && point.x <= rect.rect.left + rect.dmPelsWidth &&
			    point.y >= rect.rect.top && point.y <= rect.rect.top + rect.dmPelsHeight) {
				x = point.x;
				y = point.y;
				w = rect.dmPelsWidth;
				h = rect.dmPelsHeight;
				break;
			}
		}
		
	}
	auto screenDC = GetDC(NULL);
	if (screenDC == NULL) return env.Undefined();
	int size = 4 * w * h;
	BITMAPINFO bi{};
	bi.bmiHeader.biSize = sizeof(bi.bmiHeader);
	bi.bmiHeader.biWidth = w;
	bi.bmiHeader.biHeight = -h;
	bi.bmiHeader.biPlanes = 1;
	bi.bmiHeader.biBitCount = 32;
	bi.bmiHeader.biCompression = BI_RGB;
	bi.bmiHeader.biSizeImage = (DWORD) size;
	bi.bmiHeader.biXPelsPerMeter = 0;
	bi.bmiHeader.biYPelsPerMeter = 0;
	bi.bmiHeader.biClrUsed = 0;
	bi.bmiHeader.biClrImportant = 0;
	uint8_t *pixels;
	auto dib = CreateDIBSection(screenDC, &bi, DIB_RGB_COLORS, (void **) &pixels, NULL, 0);
	if (dib == NULL) {
		ReleaseDC(NULL, screenDC);
		return env.Undefined();
	}
	HDC memdc = NULL;
	if ((memdc = CreateCompatibleDC(screenDC)) == NULL ||
	    SelectObject(memdc, dib) == NULL ||
	    !BitBlt(memdc, 0, 0, w, h, screenDC, 0, 0, SRCCOPY)) {
		if (memdc != NULL) DeleteDC(memdc);
		DeleteObject(dib);
		ReleaseDC(NULL, screenDC);
		return env.Undefined();
	}
	auto result = Napi::Object::New(env);
	result["x"] = x;
	result["y"] = y;
	result["width"] = w;
	result["height"] = h;
	for (int i = 0; i < size; i += 4) {
		std::swap(pixels[i], pixels[i + 2]);
	}
	std::vector<uint8_t> fpng_file_buf;
	if (fpng::fpng_encode_image_to_memory((void *) pixels, w, h, 4, fpng_file_buf)) {
		auto buf = Napi::Array::New(env, fpng_file_buf.size());
		for (int i = 0; i < fpng_file_buf.size(); i++) {
			buf[i] = pixels[i];
		}
		result["image"] = buf;
	}
	DeleteDC(memdc);
	DeleteObject(dib);
	ReleaseDC(NULL, screenDC);
	return result;
}

Napi::Value getColor(const Napi::CallbackInfo &info) {
	HDC context = GetDC(NULL);
	const unsigned int color = GetPixel(context, info[0].As<Napi::Number>().Int32Value(), info[1].As<Napi::Number>().Int32Value());
	ReleaseDC(NULL, context);
	return Napi::Number::New(info.Env(), color);
}

Napi::Value keyToggle(const Napi::CallbackInfo &info) {
	Napi::Env env = info.Env();
	if (info.Length() < 1) return env.Undefined();
	
	auto key = info[0].As<Napi::Number>().Int32Value();
	auto dwFlags = KEYEVENTF_SCANCODE;
	auto isUp = info.Length() > 1 && info[1].As<Napi::Boolean>().Value();
	if (isUp) {
		dwFlags |= KEYEVENTF_KEYUP;
	}
	if (std::find(std::begin(extendKeys), std::end(extendKeys), key) != std::end(extendKeys)) {
		dwFlags |= KEYEVENTF_EXTENDEDKEY;
	}
	
	INPUT input;
	input.type = INPUT_KEYBOARD;
	input.ki.time = 0;
	input.ki.wVk = 0;
	input.ki.dwExtraInfo = 0;
	input.ki.dwFlags = dwFlags;
	input.ki.wScan = MapVirtualKeyExA(key, 0, 0);
	auto res = SendInput(1, &input, sizeof(INPUT));
	return Napi::Number::New(info.Env(), res);
}

Napi::Value getForegroundWindowPid(const Napi::CallbackInfo &info) {
	DWORD pid;
	GetWindowThreadProcessId(GetForegroundWindow(), &pid);
	return Napi::Number::New(info.Env(), pid);
}

bool getProcessPath(DWORD pid, TCHAR *buffer, DWORD cchLen) {
	try {
		auto handle = OpenProcess(PROCESS_ALL_ACCESS, 0, pid);
		if (handle) {
			auto ret = QueryFullProcessImageNameA(handle, 0, buffer, &cchLen);
			CloseHandle(handle);
			return ret != false;
		}
	}
	catch (...) {
	}
	return false;
}

Napi::Value findProcess(const Napi::CallbackInfo &info) {
	auto env = info.Env();
	auto pid = info.Length() > 0 ? info[0].As<Napi::Number>().Int64Value() : 0;
	HANDLE hSnap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
	if (!hSnap) {
		return env.Undefined();
	}
	auto result = Napi::Array::New(env);
	try {
		PROCESSENTRY32 lppe;
		lppe.dwSize = sizeof(PROCESSENTRY32);
		int flag = Process32First(hSnap, &lppe);
		while (flag) {
			auto proc = Napi::Object::New(env);
			proc["pid"] = lppe.th32ProcessID;
			proc["ppid"] = lppe.th32ParentProcessID;
			proc["exeFile"] = Napi::String::New(env, lppe.szExeFile);
			if (pid > 0) {
				if (pid == lppe.th32ProcessID) {
					TCHAR buffer[MAX_PATH];
					if (getProcessPath(lppe.th32ProcessID, buffer, MAX_PATH)) {
						proc["path"] = Napi::String::New(env, buffer);
					}
					return proc;
				}
			} else {
				TCHAR buffer[MAX_PATH];
				if (getProcessPath(lppe.th32ProcessID, buffer, MAX_PATH)) {
					proc["path"] = Napi::String::New(env, buffer);
				}
				result[result.Length()] = proc;
			}
			flag = Process32Next(hSnap, &lppe);
		}
	}
	catch (...) {
	}
	CloseHandle(hSnap);
	return result;
}

void killProcess(const Napi::CallbackInfo &info) {
	HANDLE hThread = OpenProcess(PROCESS_ALL_ACCESS, TRUE, info[0].As<Napi::Number>().Int32Value());
	TerminateProcess(hThread, 0);
	CloseHandle(hThread);
}


Napi::Value getDoubleClickTime(const Napi::CallbackInfo &info) {
	return Napi::Number::New(info.Env(), GetDoubleClickTime());
}

Napi::Value getCaretPos(const Napi::CallbackInfo &info) {
	POINT lpPoint{};
	auto env = info.Env();
	HWND pHwnd = GetForegroundWindow();
	AttachThreadInput(GetCurrentThreadId(), GetWindowThreadProcessId(pHwnd, NULL), TRUE);
	auto cp = GetCaretPos(&lpPoint);
	AttachThreadInput(GetCurrentThreadId(), GetWindowThreadProcessId(pHwnd, NULL), FALSE);
	if (cp) {
		auto result = Napi::Object::New(env);
		result["x"] = lpPoint.x;
		result["y"] = lpPoint.y;
		return result;
	} else {
		return env.Undefined();
	}
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
	fpng::fpng_init();
	exports["createMouseHook"] = Napi::Function::New(env, createMouseHook);
	exports["enableMouseMove"] = Napi::Function::New(env, enableMouseMove);
	exports["stopMouseHook"] = Napi::Function::New(env, _stopMouseHook);
	exports["capture"] = Napi::Function::New(env, capture);
	exports["capture_fpng"] = Napi::Function::New(env, capture_fpng);
	exports["getColor"] = Napi::Function::New(env, getColor);
	exports["getAllMonitor"] = Napi::Function::New(env, getAllMonitor);
	exports["keyToggle"] = Napi::Function::New(env, keyToggle);
	exports["getMousePos"] = Napi::Function::New(env, getMousePos);
	exports["getForegroundWindowPid"] = Napi::Function::New(env, getForegroundWindowPid);
	exports["findProcess"] = Napi::Function::New(env, findProcess);
	exports["killProcess"] = Napi::Function::New(env, killProcess);
	exports["getDoubleClickTime"] = Napi::Function::New(env, getDoubleClickTime);
	exports["getCaretPos"] = Napi::Function::New(env, getCaretPos);
	
	Napi::Object KeyCodeMap = Napi::Object::New(env);
	for (const auto &k: keyCodes) {
		KeyCodeMap[k.first] = k.second;
	}
	exports["KeyCodes"] = KeyCodeMap;
	return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)