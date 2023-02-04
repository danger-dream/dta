#include <napi.h>
#include <windows.h>
#include <algorithm>
#include <array>
#include <chrono>
#include <cmath>
#include <functional>
#include <iterator>
#include <map>
#include <set>
#include <thread>
#include <vector>
#include <string>
#include <iostream>
#include <io.h>
#include <gdiplus.h>
#include <shellscalingapi.h>
#include <tlhelp32.h>

#pragma comment(lib, "gdiplus.lib")
#pragma comment(lib, "Shcore.lib")

struct DisplayRect {
	std::string device;
	RECT rect{};
	int dmPelsWidth = 0;
	int dmPelsHeight = 0;
};

struct MouseEventContext {
public:
	int nCode;
	WPARAM wParam;
	LONG ptX;
	LONG ptY;
	DWORD mouseData;
};

HHOOK _hook;
Napi::ThreadSafeFunction _tsfn;
HANDLE _hThread;
boolean captureMouseMove = false;

const UINT extendKeys[] = {
	VK_RCONTROL,
	VK_SNAPSHOT,
	VK_RMENU,
	VK_PAUSE,
	VK_HOME,
	VK_UP,
	VK_PRIOR,
	VK_LEFT,
	VK_RIGHT,
	VK_END,
	VK_DOWN,
	VK_NEXT,
	VK_INSERT,
	VK_DELETE,
	VK_LWIN,
	VK_RWIN,
	VK_APPS,
	VK_VOLUME_MUTE,
	VK_VOLUME_DOWN,
	VK_VOLUME_UP,
	VK_MEDIA_NEXT_TRACK,
	VK_MEDIA_PREV_TRACK,
	VK_MEDIA_STOP,
	VK_MEDIA_PLAY_PAUSE,
	VK_BROWSER_BACK,
	VK_BROWSER_FORWARD,
	VK_BROWSER_REFRESH,
	VK_BROWSER_STOP,
	VK_BROWSER_SEARCH,
	VK_BROWSER_FAVORITES,
	VK_BROWSER_HOME,
	VK_LAUNCH_MAIL,
};

const std::map<std::string, UINT> keyCodes = {
	{"backspace",  VK_BACK},
	{"tab",        VK_TAB},
	{"enter",      VK_RETURN},
	{"shift",      VK_SHIFT},
	{"ctrl",       VK_CONTROL},
	{"alt",        VK_MENU},
	{"pause",      VK_PAUSE},
	{"capslock",   VK_CAPITAL},
	{"escape",     VK_ESCAPE},
	{"space",      VK_SPACE},
	{"pageup",     VK_PRIOR},
	{"pagedown",   VK_NEXT},
	{"end",        VK_END},
	{"home",       VK_HOME},
	{"left",       VK_LEFT},
	{"up",         VK_UP},
	{"right",      VK_RIGHT},
	{"down",       VK_DOWN},
	{"prntscrn",   VK_SNAPSHOT},
	{"insert",     VK_INSERT},
	{"delete",     VK_DELETE},
	{"0", 0x30},
	{"1", 0x31},
	{"2", 0x32},
	{"3", 0x33},
	{"4", 0x34},
	{"5", 0x35},
	{"6", 0x36},
	{"7", 0x37},
	{"8", 0x38},
	{"9", 0x39},
	{"a", 0x41},
	{"b", 0x42},
	{"c", 0x43},
	{"d", 0x44},
	{"e", 0x45},
	{"f", 0x46},
	{"g", 0x47},
	{"h", 0x48},
	{"i", 0x49},
	{"j", 0x4a},
	{"k", 0x4b},
	{"l", 0x4c},
	{"m", 0x4d},
	{"n", 0x4e},
	{"o", 0x4f},
	{"p", 0x50},
	{"q", 0x51},
	{"r", 0x52},
	{"s", 0x53},
	{"t", 0x54},
	{"u", 0x55},
	{"v", 0x56},
	{"w", 0x57},
	{"x", 0x58},
	{"y", 0x59},
	{"z", 0x5a},
	{"lwin",       VK_LWIN},
	{"rwin",       VK_RWIN},
	{"num0",       VK_NUMPAD0},
	{"num0",       VK_NUMPAD0},
	{"num1",       VK_NUMPAD1},
	{"num2",       VK_NUMPAD2},
	{"num3",       VK_NUMPAD3},
	{"num4",       VK_NUMPAD4},
	{"num5",       VK_NUMPAD5},
	{"num6",       VK_NUMPAD6},
	{"num7",       VK_NUMPAD7},
	{"num8",       VK_NUMPAD8},
	{"num9",       VK_NUMPAD9},
	{"num*",       VK_MULTIPLY},
	{"num+",       VK_ADD},
	{"num,",       VK_SEPARATOR},
	{"num-",       VK_SUBTRACT},
	{"num.",       VK_DECIMAL},
	{"num/",       VK_DIVIDE},
	{"f1",         VK_F1},
	{"f2",         VK_F2},
	{"f3",         VK_F3},
	{"f4",         VK_F4},
	{"f5",         VK_F5},
	{"f6",         VK_F6},
	{"f7",         VK_F7},
	{"f8",         VK_F8},
	{"f9",         VK_F9},
	{"f10",        VK_F10},
	{"f11",        VK_F11},
	{"f12",        VK_F12},
	{"f13",        VK_F13},
	{"f14",        VK_F14},
	{"f15",        VK_F15},
	{"f16",        VK_F16},
	{"f17",        VK_F17},
	{"f18",        VK_F18},
	{"f19",        VK_F19},
	{"f20",        VK_F20},
	{"f21",        VK_F21},
	{"f22",        VK_F22},
	{"f23",        VK_F23},
	{"f24",        VK_F24},
	{"numlock",    VK_NUMLOCK},
	{"scrolllock", VK_SCROLL},
	{"lshift",     VK_LSHIFT},
	{"rshift",     VK_RSHIFT},
	{"lctrl",      VK_LCONTROL},
	{"rctrl",      VK_RCONTROL},
	{"lalt",       VK_LMENU},
	{"ralt",       VK_RMENU},
	{";",          VK_OEM_1},
	{"=",          VK_OEM_PLUS},
	{",",          VK_OEM_COMMA},
	{"-",          VK_OEM_MINUS},
	{".",          VK_OEM_PERIOD},
	{"/",          VK_OEM_2},
	{"~",          VK_OEM_3},
	{"[",          VK_OEM_4},
	{"|",          VK_OEM_5},
	{"]",          VK_OEM_6},
	{"'",          VK_OEM_7}
};
