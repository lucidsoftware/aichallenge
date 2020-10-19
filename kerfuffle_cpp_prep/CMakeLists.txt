cmake_minimum_required (VERSION 3.0)

# Start the project first. This sets variables like MSVC, so we need it early.
project (lucidtest)
set(CMAKE_CXX_STANDARD 14)
set(CMAKE_SUPPRESS_REGENERATION true)

# Find required packages. This should be automatic if installed from apt-get (Linux); otherwise, you might need to set the BOOST_ROOT environment variable.

#######################################################################################################################
# Boost
# Install via 'sudo apt install boost-all-dev' or download. It must be version 1.66 or greater.
#######################################################################################################################

set(BOOST_ROOT $ENV{BOOST_ROOT})
if(DEFINED BOOST_ROOT)
    message(STATUS "BOOST_ROOT environment variable = " ${BOOST_ROOT})
    if(NOT EXISTS "${BOOST_ROOT}")
        message(WARNING "Boost directory '" ${BOOST_ROOT} "' not found.")
    endif()

	if(MSVC)
		set(Boost_INCLUDE_DIRS ${BOOST_ROOT})
		set(Boost_LIBRARY_DIRS ${BOOST_ROOT}/stage/lib)
	else()
		set(Boost_INCLUDE_DIRS ${BOOST_ROOT}/include)
		set(Boost_LIBRARY_DIRS ${BOOST_ROOT}/lib)
	endif()
else()
    message(STATUS "BOOST_ROOT environment variable not set. Searching for Boost.")
    find_package(Boost 1.66) # We require Boost Beast which was added to Boost in version 1.66. Earlier versions of Boost will not work.
endif()

message(STATUS "Boost_INCLUDE_DIRS = ${Boost_INCLUDE_DIRS}")
message(STATUS "Boost_LIBRARY_DIRS = ${Boost_LIBRARY_DIRS}")

#######################################################################################################################
# RapidJSON
# Install via 'sudo apt install rapidjson-dev' or download.
#######################################################################################################################

#set(RAPIDJSON_ROOT ~/code/rapidjson)
set(RapidJSON_DIR $ENV{RapidJSON_DIR})
if(DEFINED RapidJSON_DIR)
    message(STATUS "RapidJSON_DIR environment variable = " ${RapidJSON_DIR})
    if(NOT EXISTS "${RapidJSON_DIR}")
        message(WARNING "RAPIDJSON directory '" ${RapidJSON_DIR} "' not found.")
    endif()
else()
    message(STATUS "RapidJSON_DIR environment variable not set. Searching for RapidJSON.")
    find_package(RapidJSON CONFIG REQUIRED)
endif()

message(STATUS "RapidJSON_DIR = ${RapidJSON_DIR}")

#######################################################################################################################
# lucidtest
#######################################################################################################################

include_directories(include ${RapidJSON_DIR}/include ${Boost_INCLUDE_DIRS})
link_directories(${Boost_LIBRARY_DIRS})
file(GLOB HEADERS "include/*.h")
file(GLOB SOURCES "src/*.cpp")
file(GLOB EXTRA "*.md")
add_executable(lucidtest ${SOURCES} ${HEADERS} ${EXTRA})

# On Windows, disable crt not secure warnings.
if(MSVC)
    add_definitions(-D_CRT_SECURE_NO_WARNINGS)
endif()

# Needed for non-Windows platforms.
if(NOT MSVC)
    find_package (Threads)
    target_link_libraries(lucidtest ${CMAKE_THREAD_LIBS_INIT})
endif()
