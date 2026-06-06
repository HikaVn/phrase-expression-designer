cmake_minimum_required(VERSION 3.22)
project(PhraseExpressionDesignerPlugin VERSION 0.1.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# --- JUCE -------------------------------------------------------------------
# Fetched automatically; pin a tag for reproducibility. Requires network on the
# first configure. To use a local checkout instead, set -DJUCE_DIR=/path/to/JUCE
# and replace the FetchContent block with add_subdirectory(${JUCE_DIR}).
include(FetchContent)
FetchContent_Declare(
    JUCE
    GIT_REPOSITORY https://github.com/juce-framework/JUCE.git
    GIT_TAG        8.0.4
    GIT_SHALLOW    TRUE
)
FetchContent_MakeAvailable(JUCE)

# --- Plugin target ----------------------------------------------------------
juce_add_plugin(PhraseExpressionDesigner
    PLUGIN_MANUFACTURER_CODE Hkvn
    PLUGIN_CODE Ped1
    COMPANY_NAME "HikaVn"
    PRODUCT_NAME "Phrase Expression Designer"
    IS_MIDI_EFFECT TRUE
    NEEDS_MIDI_INPUT TRUE
    NEEDS_MIDI_OUTPUT TRUE
    FORMATS AU VST3 Standalone
)

target_sources(PhraseExpressionDesigner PRIVATE
    Source/PluginProcessor.cpp
    Source/PluginEditor.cpp
    Source/PedCore/Profile.cpp
)

target_include_directories(PhraseExpressionDesigner PRIVATE Source)

target_compile_definitions(PhraseExpressionDesigner PUBLIC
    JUCE_WEB_BROWSER=0
    JUCE_USE_CURL=0
    JUCE_VST3_CAN_REPLACE_VST2=0
)

target_link_libraries(PhraseExpressionDesigner PRIVATE
    juce::juce_audio_utils
    juce::juce_audio_processors
    juce::juce_core
    PUBLIC
    juce::juce_recommended_config_flags
    juce::juce_recommended_lto_flags
    juce::juce_recommended_warning_flags
)

# --- PedCore parity test (no JUCE) ------------------------------------------
enable_testing()
add_executable(pedcore_test tests/test_pedcore.cpp)
target_include_directories(pedcore_test PRIVATE Source)
add_test(NAME pedcore_test COMMAND pedcore_test)
