#include <UIAutomation.h>
#include <atlbase.h>
#include <windows.h>

#pragma comment(lib, "comsuppw.lib")
#pragma comment(lib, "psapi.lib")

#include "selection.hpp"

namespace selection {
	
	void Initialize() { CoInitializeEx(nullptr, COINIT_MULTITHREADED); }
	
	std::string BSTRtoUTF8(BSTR bstr) {
		int len = SysStringLen(bstr);
		if (len == 0)
			return "";
		int size_needed = WideCharToMultiByte(CP_UTF8, 0, bstr, len, nullptr, 0, nullptr, nullptr);
		std::string ret(size_needed, '\0');
		WideCharToMultiByte(CP_UTF8, 0, bstr, len, &ret.front(), ret.size(), nullptr, nullptr);
		return ret;
	}
	
	
	CComPtr<IUIAutomation> CreateUIAutomation() {
		CComPtr<IUIAutomation> automation;
		if (CoCreateInstance(CLSID_CUIAutomation, nullptr, CLSCTX_INPROC_SERVER, IID_IUIAutomation,
		                     reinterpret_cast<void **>(&automation)) != S_OK) {
			return nullptr;
		}
		return automation;
	}
	
	bool GetSelection(Selection *selection) {
		static CComPtr<IUIAutomation> automation = CreateUIAutomation();
		if (!automation) {
			return false;
		}
		
		CComPtr<IUIAutomationTreeWalker> treeWalker;
		if (automation->get_RawViewWalker(&treeWalker) != S_OK || !treeWalker) {
			return false;
		}
		
		CComPtr<IUIAutomationElement> focusedElement;
		if (automation->GetFocusedElement(&focusedElement) != S_OK || !focusedElement) {
			return false;
		}
		for (; focusedElement;
		       treeWalker->GetParentElement(focusedElement, &focusedElement) != S_OK && (focusedElement = nullptr)) {
			CComPtr<IUIAutomationTextPattern> textPattern;
			if (focusedElement->GetCurrentPatternAs(UIA_TextPatternId, IID_IUIAutomationTextPattern,
			                                        reinterpret_cast<void **>(&textPattern)) != S_OK ||
			    !textPattern) {
				CComPtr<IUIAutomationTextChildPattern> textChildPattern;
				if (focusedElement->GetCurrentPatternAs(UIA_TextChildPatternId, IID_IUIAutomationTextChildPattern,
				                                        reinterpret_cast<void **>(&textChildPattern)) != S_OK ||
				    !textChildPattern) {
					continue;
				}
				
				CComPtr<IUIAutomationElement> containerElement;
				if (textChildPattern->get_TextContainer(&containerElement) != S_OK || !containerElement) {
					return false;
				}
				
				if (containerElement->GetCurrentPatternAs(UIA_TextPatternId, IID_IUIAutomationTextPattern,
				                                          reinterpret_cast<void **>(&textPattern)) != S_OK ||
				    !textPattern) {
					return false;
				}
			}
			
			CComPtr<IUIAutomationTextRangeArray> textRanges;
			if (textPattern->GetSelection(&textRanges) != S_OK || !textRanges) {
				return false;
			}
			int length;
			if (textRanges->get_Length(&length) != S_OK) {
				return false;
			}
			for (int i = 0; i < length; i++) {
				CComPtr<IUIAutomationTextRange> textRange;
				if (textRanges->GetElement(i, &textRange) != S_OK) {
					continue;
				}
				CComBSTR text;
				if (textRange->GetText(256, &text) != S_OK) {
					continue;
				}
				int pid = 0;
				focusedElement->get_CurrentProcessId(&pid);
				selection->pid = pid;
				selection->text = BSTRtoUTF8(text);
				return true;
			}
		}
		return false;
	}
}