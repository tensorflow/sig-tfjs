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

import * as Lint from 'tslint';
import * as ts from 'typescript';

export class Rule extends Lint.Rules.AbstractRule {
  public static FAILURE_STRING =
      'importing from dist/ is prohibited. Please use public API';

  public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
    return this.applyWithWalker(
        new NoImportsFromDistWalker(sourceFile, this.getOptions()));
  }
}

class NoImportsFromDistWalker extends Lint.RuleWalker {
  public visitImportDeclaration(node: ts.ImportDeclaration) {
    const importFrom = node.moduleSpecifier.getText();
    const reg = /@tensorflow\/tfjs[-a-z]*\/dist/;
    if (importFrom.match(reg)) {
      const fix = new Lint.Replacement(
          node.moduleSpecifier.getStart(), node.moduleSpecifier.getWidth(),
          importFrom.replace(/\/dist[\/]*/, ''));

      this.addFailure(this.createFailure(
          node.moduleSpecifier.getStart(), node.moduleSpecifier.getWidth(),
          Rule.FAILURE_STRING, fix));
    }

    super.visitImportDeclaration(node);
  }
}
