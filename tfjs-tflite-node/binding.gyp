##
# @license
# Copyright 2022 Google LLC. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# =============================================================================

# Node.js TensorFlow Binding config:
{
  'variables' : {
    'tflite_include_dir' : '<(module_root_dir)/cc_deps/include',
    'tflite_headers' : [
      '<@(tflite_include_dir)/tflite/c/c_api.h',
      '<@(tflite_include_dir)/tflite/c/eager/c_api.h',
    ],
    'ARCH': '<!(node -e "console.log(process.arch)")',
    'tflite-library-action': 'move'
  },
  'targets' : [{
    'target_name' : 'node_tflite_binding',
    'sources' : [
      'binding/node_tflite_binding.cc'
    ],
    'include_dirs' : [
        '..',
        '<(tflite_include_dir)',
        "<!@(node -p \"require('node-addon-api').include\")"
    ],
    'defines': [ 'NAPI_CPP_EXCEPTIONS' ],
    'cflags!': [ '-fno-exceptions' ], # Remove flags that disable exceptions.
    'cflags_cc!': [ '-fno-exceptions' ],
    'conditions' : [
      [
        'OS=="linux" and ARCH=="x64"', {
          'cflags+': [ '-std=c++11', '-fexceptions' ],
          'cflags_c+': [ '-std=c++11', '-fexceptions' ],
          'cflags_cc+': [ '-std=c++11', '-fexceptions' ],
          'libraries' : [
            '<(module_root_dir)/cc_deps/linux_amd64/libtensorflowlite_c.so',
            '<(module_root_dir)/cc_deps/linux_amd64/libexternal_delegate_obj.so',
            '-Wl,-rpath,\$$ORIGIN/../../cc_deps/linux_amd64'
          ]
        }
      ],
      [
        'OS=="linux" and ARCH=="arm64"', {
          'cflags+': [ '-std=c++11', '-fexceptions' ],
          'cflags_c+': [ '-std=c++11', '-fexceptions' ],
          'cflags_cc+': [ '-std=c++11', '-fexceptions' ],
          'libraries' : [
            '<(module_root_dir)/cc_deps/linux_arm64/libtensorflowlite_c.so',
            '<(module_root_dir)/cc_deps/linux_arm64/libexternal_delegate_obj.so',
            '-Wl,-rpath,\$$ORIGIN/../../cc_deps/linux_arm64'
          ]
        }
      ],
      [
        'OS=="mac" and ARCH=="arm64"', {
          "cflags+": [ "-stdlib=libc++" ],
          "xcode_settings": {
            "OTHER_CPLUSPLUSFLAGS" : [ "-std=c++11", "-stdlib=libc++", "-pthread" ],
            "OTHER_LDFLAGS": [ "-stdlib=libc++" ],
            "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
            "MACOSX_DEPLOYMENT_TARGET": "10.7",
            "CLANG_CXX_LANGUAGE_STANDARD":"c++11",
            "CLANG_CXX_LIBRARY": "libc++"
          },
          'libraries' : [
            '<(module_root_dir)/cc_deps/darwin_arm64/libtensorflowlite_c.dylib',
            '<(module_root_dir)/cc_deps/darwin_arm64/libexternal_delegate_obj.dylib',
          ],
          'postbuilds': [
            {
              'postbuild_name': 'Adjust libtflite load path',
              'action': [
                'install_name_tool',
                "-change",
                "@rpath/libtensorflowlite_c.dylib",
                "@loader_path/../../cc_deps/darwin_arm64/libtensorflowlite_c.dylib",
                "<(PRODUCT_DIR)/node_tflite_binding.node"
              ]
            },
            {
              'postbuild_name': 'Adjust external delegate lib load path',
              'action': [
                'install_name_tool',
                "-change",
                "@rpath/libexternal_delegate_obj.dylib",
                "@loader_path/../../cc_deps/darwin_arm64/libexternal_delegate_obj.dylib",
                "<(PRODUCT_DIR)/node_tflite_binding.node"
              ]
            }
          ],
        }
      ],
      [
        'OS=="win" and ARCH=="x64"', {
          'defines': ['COMPILER_MSVC', 'WIN'],
          'libraries': [
            '<(module_root_dir)/cc_deps/windows_amd64/tensorflowlite_c.dll.if.lib',
            '<(module_root_dir)/cc_deps/windows_amd64/external_delegate_obj.dll.if.lib',
          ],
          'copies': [{
            'destination': './build/Release',
              'files': [
                '<(module_root_dir)/cc_deps/windows_amd64/tensorflowlite_c.dll',
                '<(module_root_dir)/cc_deps/windows_amd64/external_delegate_obj.dll',
              ],
          }],
          'library_dirs' : ['<(module_root_dir)/cc_deps/windows_amd64'],
          'variables': {
            'tflite-library-target': 'windows'
          },
          "msvs_settings": {
            "defines": [
              "_HAS_EXCEPTIONS=1"
            ],
            "VCCLCompilerTool": {
              "ExceptionHandling": "2",
              "DisableSpecificWarnings": [
                "4244"
              ],
            },
            "VCLinkerTool": {
              "LinkTimeCodeGeneration": 1,
              "OptimizeReferences": 2,
              "EnableCOMDATFolding": 2,
              "LinkIncremental": 1,
            }
          },
          'msvs_disabled_warnings': [
            # Warning	C4190: 'TF_NewWhile' has C-linkage specified, but returns
            # UDT 'TF_WhileParams' which is incompatible with C.
            # (in include/tflite/c/c_api.h)
            4190
          ]
        },
      ],
    ]
  }
  ],
  "defines": [
      "NAPI_VERSION=<(napi_build_version)"
  ]
}
