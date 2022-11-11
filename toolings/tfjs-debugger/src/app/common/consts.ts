/**
 * @license
 * Copyright 2022 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

export const CONST_NODE_WIDTH = 56;
export const NON_CONST_NODE_WIDTH = 90;
export const NODE_HEIGHT = 28;
export const DEFAULT_BAD_NODE_THRESHOLD_PCT = 10;
export const LOCAL_BUILD_LAEL = 'Local build';
export const NODE_NAME_PARTS_TO_SKIP = ['/cond/', '/while/'];
export const codeMirrorOptions: any = {
  mode: 'javascript',
  indentWithTabs: true,
  smartIndent: true,
  lineNumbers: true,
  lineWrapping: true,
  extraKeys: {'Ctrl-Space': 'autocomplete'},
  gutters: ['CodeMirror-linenumbers'],
  autoCloseBrackets: true,
  matchBrackets: true,
  lint: true,
  theme: 'vscode-dark',
};
