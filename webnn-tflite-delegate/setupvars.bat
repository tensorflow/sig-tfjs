@echo off

:: @license
:: Copyright 2022 Google LLC. All Rights Reserved.
:: Licensed under the Apache License, Version 2.0 (the "License");
:: you may not use this file except in compliance with the License.
:: You may obtain a copy of the License at
::
:: http://www.apache.org/licenses/LICENSE-2.0
::
:: Unless required by applicable law or agreed to in writing, software
:: distributed under the License is distributed on an "AS IS" BASIS,
:: WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
:: See the License for the specific language governing permissions and
:: limitations under the License.
:: =============================================================================


set OPENVINO_SETVARS_PATH=%ProgramFiles(x86)%\Intel\openvino_2021\bin\setupvars.bat
set WEBNN_LIBS_PATH=%~dp0cc_lib\win32_x64\

echo Setup OpenVINO environment...
if exist "%OPENVINO_SETVARS_PATH%" (
  call "%OPENVINO_SETVARS_PATH%"
  echo Setup OpenVINO environment...Done
) else (
  echo   Setup OpenVINO environment...Failed
  echo   To fix, run the following command: ^<INSTALL_DIR^>\bin\setupvars.bat
  echo   where INSTALL_DIR is the OpenVINO installation directory.
)

echo Set path of WebNN native libs to PATH...
echo Path of WebNN native libs: %WEBNN_LIBS_PATH%
call set PATH=%PATH%;%WEBNN_LIBS_PATH%
echo Set path of WebNN native libs to PATH...Done
