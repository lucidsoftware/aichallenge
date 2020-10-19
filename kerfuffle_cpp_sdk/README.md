# C++ BeastBot Instructions

Welcome to the C++ version of the BeastBot SDK. This SDK takes care of all communications with the server.

---
## Install dependencies and build the code

The BeastBot SDK relies on several 3rd party libraries: CMake, Boost, and RapidJSON. You'll need to download and build these libraries before BeastBot will work. Find your platform below and follow the setup instructions.

Note: If you followed the instructions mailed to you, you should already have installed CMake, Boost, and RapidJSON and can skip over the instructions for those. However, you will need to set BOOST_ROOT and RapidJSON_DIR before running cmake.

---
### Linux

#### Install Dependencies

* CMake 3.13 or greater
  * Type `sudo apt install cmake`
  * Or install from https://cmake.org/download/
* Boost 1.66 or greater
  * Type `sudo apt install libboost-all-dev`
    * Warning: This SDK requires version Boost 1.66 or greater, and it is quite likely this will not install the correct version.
  * Or download and install. Instructions are at https://www.boost.org/doc/libs/1_69_0/more/getting_started/unix-variants.html
      * Download Boost: https://dl.bintray.com/boostorg/release/1.69.0/source/boost_1_69_0.tar.gz
      * Extract the files.
        * The necessary files will be copied below, so this can be a temporary location.
      * Change directory into the archive:
        * Example: `cd boost_1_69_0`
      * Configure Boost with the directory to install.
        * Example: `./bootstrap.sh --prefix=../../code/boost_169`
        * Note: Do not use the tilde to represent the 'home directory' as that will not work here.
      * Set BOOST_ROOT to that directory.
        * Example: `export BOOST_ROOT=~/code/boost_169`
        * You can put this in your .bashrc if you want it to survive a reboot, be used in other shell instances, etc.
      * Build Boost.
        * Type: `./b2 install -j 8`
        * The `-j 8` option tells it to use 8 threads to build. Adjust for your system as necessary.
        * Without this option, your build will go _much_ slower.
* RapidJSON 1.10 or greater
  * Type `sudo apt install rapidjson-dev`
  * Or download and install from https://github.com/Tencent/rapidjson/archive/master.zip
    * Extract the files to the desired code location (e.g., `~/code/rapidjson-master`)
    * Set RapidJSON_DIR to point to the RapidJSON directory where you unzipped the file.
      * Example: `export RapidJSON_DIR=~/code/rapidjson-master`

#### Build BeastBot

Now that the dependencies are installed, you can run cmake to generate the makefiles and build BeastBot.
* Make sure `BOOST_ROOT` and `RapidJSON_DIR` are set per the instructions above. They will be needed every time you run cmake (see below).
* Download and extract kerfuffle_cpp_sdk.zip (presumably you already have since you're reading this).
* From that directory:
  * Type: `cd build`
  * Type: `cmake ..`
* If cmake is properly installed, it should generate the makefiles.
  * If you get any errors, try to identify the error. You might need to set an environment variable to help locate a 3rd party library. See the instructions above.
* Now's the big moment. Type `make` and it should build the project.
  * You can now iterate on your BeastBot. After making changes, you'll need to rerun make, but you won't need to rerun cmake unless you change an environment variable, etc.

---
### Windows

These instructions will set up Windows for compiling with Visual Studio 2015 or 2017. You'll need either of those installed before continuing.

#### Install Dependencies

* Visual Studio Community 2017
  * Download and install from https://visualstudio.microsoft.com/vs/community/.
* CMake 3.13 or greater
  * Download CMake at https://cmake.org/download/.
    * We recommend using the MSI installer: https://github.com/Kitware/CMake/releases/download/v3.13.4/cmake-3.13.4-win64-x64.msi
    * Check the option in the installer to add CMake to the system path (or add it manually).
* Boost 1.66 or greater
  * Download and install. Instructions are at https://www.boost.org/doc/libs/1_69_0/more/getting_started/windows.html
      * Download Boost: https://dl.bintray.com/boostorg/release/1.69.0/source/boost_1_69_0.zip
      * Extract the files to the desired code location (e.g., `c:\users\yourname\code\boost_1_69_0`)
        * Hint: You will enjoy life much more if you use 7-zip (it's much faster) from 7-zip.org rather than using the built-in Windows zip file support.
      * Change directory into the archive.
        * Example: `cd boost_1_69_0`
      * Bootstrap Boost.
        * Type: `bootstrap`
      * Build Boost.
        * Type: `b2 -j 8`
        * The `-j 8` option tells it to use 8 threads to build. Adjust for your system as necessary.
        * Without this option, your build will go _much_ slower.
      * Set BOOST_ROOT to that directory.
        * Example: `set BOOST_ROOT=c:\users\yourname\code\boost_1_69_0`
        * You'll need this for running cmake below.
* RapidJSON 1.10 or greater
  * Download and install from https://github.com/Tencent/rapidjson/archive/master.zip
    * Extract the files to the desired code location (e.g., `c:\users\yourname\code\rapidjson-master`)
    * Set RapidJSON_DIR to point to the RapidJSON directory where you unzipped the file.
      * Example: `set RapidJSON_DIR=c:\users\yourname\code\rapidjson-master`

#### Build BeastBot

Now that the dependencies are installed, you can run cmake to generate beastbot.sln.
* Make sure `BOOST_ROOT` and `RapidJSON_DIR` are set per the instructions above.
* Download and extract kerfuffle_cpp_sdk.zip (presumably you already have since you're reading this).
* From that directory:
  * Type: `cd build`
  * Type: `cmake ..`
* If cmake is properly installed, it should generate the project and solution files.
  * If you get any errors, try to identify the error. You might need to set an environment variable to help locate a 3rd party library. See the instructions above.
* Now's the big moment. Load `beastbot.sln` from the build directory into Visual Studio and build the project.
  * Right-click on `beastbot` in the solution explorer and set it as the startup project.
  * You can now iterate on your BeastBot.

---
### Mac

It's assumed you already have XCode installed.
To install these SDKs, we're going to use HomeBrew, a popular package manager on the Mac. If you prefer to download them directly, follow the general instructions for the platforms above.
If you've already installed dependencies, you can skip down to `Build BeastBot`

#### Install Dependencies

* Xcode: https://developer.apple.com/xcode/
* Homebrew: `/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"`
* CMake: `brew install cmake`
* RapidJSON: `brew install rapidjson`
  * Set RapidJSON_DIR to the installed directory, typically: `export RapidJSON_DIR=/usr/local/Cellar/rapidjson/1.1.0`
* Boost 1.66 or greater
  * Things were going so nicely until now. The homebrew version of Boost is not compatible with C++14, which we need, so instead, we get the supreme pleasure of slumming it with the other platforms and installing from source.
  * Download and install. Instructions are at https://www.boost.org/doc/libs/1_69_0/more/getting_started/unix-variants.html
      * Download Boost: https://dl.bintray.com/boostorg/release/1.69.0/source/boost_1_69_0.tar.gz
      * Extract the files.
        * The necessary files will be copied below, so this can be a temporary location.
      * Change directory into the archive:
        * Example: `cd boost_1_69_0`
      * Configure Boost with the directory to install.
        * Example: `./bootstrap.sh --prefix=../../code/boost_169`
        * Note: Do not use the tilde to represent the 'home directory' as that will not work here.
      * Set BOOST_ROOT to that directory.
        * Example: `export BOOST_ROOT=~/code/boost_169`
        * You can put this in your .bashrc if you want it to survive a reboot, be used in other shell instances, etc.
      * Build Boost.
        * Type: `./b2 install -j 8`
        * The `-j 8` option tells it to use 8 threads to build. Adjust for your system as necessary.
        * On our 2015 Macbook Pro, this step took ~7 minutes.

#### Build BeastBot

Now that the dependencies are installed, you can run cmake to generate the Xcode project files.
* Make sure `BOOST_ROOT` and `RapidJSON_DIR` are set per the instructions above.
* Download and extract kerfuffle_cpp_sdk.zip (presumably you already have since you're reading this).
* From that directory:
  * Type: `cd build`
  * Type: `cmake -G Xcode ..`
    * Note: If you want to bypass Xcode and use `make` from the commandline, you can create Unix-style makefiles by typing: `cmake ..`
* If cmake is properly installed, it should generate the makefiles.
  * If you get any errors, try to identify the error. You might need to set an environment variable to help locate a 3rd party library. See the instructions above.
* Now's the big moment. Load `beastbot.xcodeproj` from the build directoryinto XCode and build the project.
  * You can now iterate on your BeastBot.
* Now's the big moment. Load `beastbot.xcodeproj` from the build directory into XCode.
  * Change the build target to `beastbot`.
  * Build and run `beastbot`, paying attention to command line parameters as specified below.
  * Iterate on BeastBot and win.

---
## Modifying BeastBot

You are welcome to modify any files in this project, but in most cases you should only need to deal with two primary sets of files: Beastbot.h/cpp and GameInfo.h/cpp.
* **Beastbot.h/cpp** contains a stubbed-out bot that you can immediately begin to modify.

    ```c++
    virtual void init(int boardWidth, int boardHeight);
    ```

    * Instantiate any persistent data structures for the board.
    * The bot gets reused for each game, so you'll need to reset your bot and any state here.

    ```c++
    virtual Moves getMoves(const GameInfo& gameInfo);
    ```

    * Called once each turn and should return 5 moves.
    * If your code takes too long, the server will continue for five moves in the previous direction.
    * If it returns fewer than 5 moves, the server will repeat the final move until 5 moves have been made.

* **GameInfo.h/cpp** contains a few game structures you'll use. The classes and functions are documented.
* For your reference, other files include:
  * **main.cpp** is the entry point and handles command line parameters, creates an instance of your bot, and starts the game.
  * **GameClient.h/cpp** communicates with the server, handling the lobby, looping through the game, turning JSON data into GameInfo classes, etc.
  * **bot.h** provides the base class for the both. If you want to create multiple bots to test, you can subclass this then instance the desired one in main.cpp.

---
## Running

* BeastBot takes four optional commandline parameters: **botname persistent host port**
  * **botname**: The name your bot will appear as in the tournament; defaults to MyName. Change to your name.
  * **persistent**: 'true' or 'false' (or 1 or 0). Defaults to 'true' to connect to the persistent game.
  * **host**: The hostname of the tournament server. Defaults to 10.100.139.2.
  * **port**: The port to use. Defaults to 80.
* **Example**: `beastbot your_name true 10.100.139.2 80`
