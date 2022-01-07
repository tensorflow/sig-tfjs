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

import {animate, style, transition, trigger} from '@angular/animations';
import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {Store} from '@ngrx/store';
import {ErrorMessage} from 'src/app/data_model/misc';
import {clearErrorMessage} from 'src/app/store/actions';
import {selectErrorMessage} from 'src/app/store/selectors';
import {AppState} from 'src/app/store/state';

/** A panel showing any errors occurred in the app. */
@Component({
  selector: 'error-panel',
  templateUrl: './error_panel.component.html',
  styleUrls: ['./error_panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger(
        'errorMessageTrigger',
        [
          // Zoom in and fade in the panel when showing it.
          transition(
              ':enter',
              [
                style({
                  transform: 'scale(0.6)',
                  opacity: 0,
                }),
                animate('200ms ease-out', style({
                          transform: 'scale(1)',
                          opacity: 1,
                        })),
              ]),
          // Zoom out and fade out the panel when hiding it.
          transition(
              ':leave',
              [
                animate('150ms ease-in', style({
                          transform: 'scale(0.6)',
                          opacity: 0,
                        })),
              ]),
        ]),
  ]
})
export class ErrorPanel implements OnInit {
  curErrorMessage?: ErrorMessage;

  constructor(
      private readonly changeDetectorRef: ChangeDetectorRef,
      private readonly store: Store<AppState>,
  ) {}

  ngOnInit() {
    // Show the error message panel when it is set.
    this.store.select(selectErrorMessage).subscribe(errorMessage => {
      if (!errorMessage) {
        this.curErrorMessage = undefined;
      } else {
        this.curErrorMessage = {...errorMessage};
      }
      this.changeDetectorRef.markForCheck();
    });
  }

  dismissErrorMessage() {
    this.store.dispatch(clearErrorMessage());
  }

  refresh() {
    window.location.reload();
  }

  get hasErrorMessage(): boolean {
    return this.curErrorMessage !== undefined;
  }
}
