#!/bin/bash

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


OPENVINO_SETVARS_PATH="/opt/intel/openvino_2021/bin/setupvars.sh"

printf "\nSetup OpenVINO environment...\n"

if [ -e "$OPENVINO_SETVARS_PATH" ]; then
  source "$OPENVINO_SETVARS_PATH"
  printf "Setup OpenVINO environment...Done\n"
else
  printf "Setup OpenVINO environment...Failed
    To fix, run the following command: source <INSTALL_DIR>/bin/setupvars.sh
    where INSTALL_DIR is the OpenVINO installation directory.\n"
  exit 1
fi
