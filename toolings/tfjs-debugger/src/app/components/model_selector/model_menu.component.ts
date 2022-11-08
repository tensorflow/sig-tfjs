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

import {Component, Input} from '@angular/core';
import {Subject} from 'rxjs';

export interface ModelItem {
  label: string;
  url: string;
  children?: Array<string|ModelItem>;
}

@Component({
  selector: 'model-menu',
  templateUrl: './model_menu.component.html',
  styleUrls: ['./model_menu.component.scss'],
})
export class ModelMenu {
  @Input() data: ModelItem[] = [];
  @Input() item!: ModelItem;
  @Input() isRootNode = false;
  @Input() urlSubject!: Subject<string>;

  isExpandable(node: ModelItem): boolean {
    return node.children != null && node.children.length > 0;
  }

  getData(node: ModelItem) {
    this.data = (node.children || []).map(child => {
      const isChildString = typeof child === 'string';
      return {
        label: isChildString ? child : child.label,
        url: isChildString ? node.url.replace('{}', child) : child.url,
      };
    });
  }

  handleMenuItemClicked(url: string) {
    this.urlSubject.next(url);
  }
}
