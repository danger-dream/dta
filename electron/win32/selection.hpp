//
// Created by virus on 2023/02/14.
//

#ifndef DTA_SELECTION_HPP
#define DTA_SELECTION_HPP

#include <optional>
#include <string>
#include <tuple>
#include <utility>

namespace selection {
	
	struct Selection {
		std::string text;
		int pid;
	};
	
	void Initialize();
	
	bool GetSelection(Selection *selection);
}


#endif //DTA_SELECTION_HPP
