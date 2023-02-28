;-----------------------------------------
; Mac keyboard to Windows Key Mappings
;=========================================
; ! = ALT
; ^ = CTRL
; + = SHIFT
; # = WIN
#SingleInstance Force
title := "Mac键盘映射"
#UseHook
A_MenuMaskKey := "vkFF"

LAlt & Tab::AltTab
Shift::ShiftAltTab

#a::return
#a UP::                 ;输入翻译 win + a -> ctrl + shift + f1
{
	js_key_callback('inputTranslate')
	return
}

#s::return
#s UP::                 ;ocr翻译 win + s -> ctrl + shift + f2
{
	js_key_callback('ocrTranslate')
	return
}

#d::return
#d UP::                              ;要硬说成划词翻译也不是不行 win + d -> ctrl + shift + f3
{
	A_Clipboard := ""
	Send "^c"
	if (ClipWait(2)){
		js_key_callback('copyAndTranslate')
	}
	Return
}

#HotIf WinActive("ahk_exe webstorm64.exe") == 0 && WinActive("ahk_exe clion64.exe") == 0 && WinActive("ahk_exe pycharm64.exe") == 0

!c::Send "^c"     ;alt + c -> ctrl + c
!x::Send "^x"     ;alt + x -> ctrl + x
!v::Send "^v"     ;alt + v -> ctrl + v
!a::Send "^a"     ;alt + a -> ctrl + a
!s::Send "^s"     ;alt + s -> ctrl + s
!w::              ;alt + w -> ctrl + w | ctrl + alt + z | esc
{
	; 如果是微信的话
	if (WinActive("ahk_exe WeChat.exe") != 0) {
		;   如果是微信的图片打开
		if (WinActive("ahk_class ImagePreviewWnd") != 0) {
			Send "{esc}" ;按esc
		} else {
			Send "^!z" ;ctrl + alt + z
		}
	} else {
		Send "^w" ;ctrl + w
	}
	Return
}

; 主要是chrome里切换标签页用的
!1::Send "^1"
!2::Send "^2"
!3::Send "^3"
!4::Send "^4"
!5::Send "^5"
!6::Send "^6"
!7::Send "^7"
!8::Send "^8"
!9::Send "^9"

!z::Send "^z"     ;alt + z -> ctrl + z
!r::Send "^r"     ;chrome刷新页面 alt + r -> ctrl + r
!+z::             ;chrome恢复上次关闭的页面 alt + shift + z -> ctrl + shift + t
{
	if (WinActive("ahk_exe chrome.exe") != 0 || WinActive("ahk_exe msedge.exe") != 0) {
		Send "^+t"
	}
	Return
}
!t::			   ;alt + t -> ctrl + t
{
	if (WinActive("ahk_exe notepad++.exe") != 0) {
		Send "^n"
	} else {
		Send "^t"
	}
	Return
}

!q::Send "!{F4}"  ;alt + q -> alt + F4
!f::Send "^f"     ;alt + f -> ctrl + f
!LButton::Send "^{Click Left}"  ;alt + 鼠标左键 -> ctrl + 鼠标左键
!Backspace::Send "{Delete}"     ;alt + c -> delete
!Left::Send "{Home}"            ;alt + 方向键左 -> Home键
!Right::Send "{End}"            ;alt + 方向键右 -> End键
!+Left::Send "+{Home}"          ;alt + shift + 方向键左 -> shift + Home键
!+Right::Send "+{End}"          ;alt + shift + 方向键右 -> shift + End键
!Up::Send "{PgUp}"
!Down::Send "{PgDn}"

#Left::Send "{Home}"
#+Left::Send "+{Home}"
#Right::Send "{End}"
#+Right::Send "+{End}"
#Up::Send "{PgUp}"
#Down::Send "{PgDn}"
#HotIf

#HotIf WinActive("ahk_exe webstorm64.exe") != 0 or WinActive("ahk_exe clion64.exe") != 0 or WinActive("ahk_exe pycharm64.exe") != 0
#Left::Send "^{Left}"
#+Left::Send "^+{Left}"
#Right::Send "^{Right}"
#+Right::Send "^+{Right}"
#HotIf
