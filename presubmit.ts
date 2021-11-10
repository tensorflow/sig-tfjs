/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
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

// TODO: change this to only run tests for packages with diffs (refer to tfjs
// repo).

import * as fs from 'fs';
import {join} from 'path';
import * as shell from 'shelljs';

// Exit if any commands error.
shell.set('-e');
process.on('unhandledRejection', e => {
  throw e;
});

// Read sub dirs that are under the parent dirs below.
const parentDirs = ['.', 'toolings'];
const dirs: string[] = [];
parentDirs.forEach(curParentDir => {
  const curDirs =
      fs.readdirSync(curParentDir)
          .filter(f => fs.statSync(join(curParentDir, f)).isDirectory())
          .filter(f => !f.startsWith('.') && f !== 'node_modules');
  dirs.push(...curDirs.map(curDir => join(curParentDir, curDir)));
})

dirs.forEach(dir => {
  shell.cd(dir);

  if (!fs.existsSync('./package.json')) {
    shell.cd('../');
    return;
  }

  const packageJSON: {'scripts': {[key: string]: string}} =
      JSON.parse(fs.readFileSync('./package.json', {encoding: 'utf-8'}));
  if (packageJSON['scripts']['test-ci'] != null) {
    console.log(`~~~~~~~~~~~~ Testing ${dir} ~~~~~~~~~~~~`);
    shell.exec('yarn');
    shell.exec('yarn test-ci');
    console.log('\n');
  } else if (packageJSON['scripts']['test'] != null) {
    console.log(`~~~~~~~~~~~~ Testing ${dir} ~~~~~~~~~~~~`);
    shell.exec('yarn');
    shell.exec('yarn test');
    console.log('\n');
  }

  if (packageJSON['scripts']['lint'] != null) {
    console.log(`~~~~~~~~~~~~ Linting ${dir} ~~~~~~~~~~~~`);
    shell.exec('yarn');
    shell.exec('yarn lint');
    console.log('\n');
  }
  shell.cd('../');
});
