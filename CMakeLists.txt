cmake_minimum_required(VERSION 3.24)
project(dta)

set(CMAKE_CXX_STANDARD 14)

include_directories(
	electron/win32
	node_modules/node-addon-api
	C:/Users/virus/AppData/Local/node-gyp/Cache/19.4.0/include/node
)

add_executable(dta
	electron/win32/main.cpp
	electron/win32/main.hpp
	)
