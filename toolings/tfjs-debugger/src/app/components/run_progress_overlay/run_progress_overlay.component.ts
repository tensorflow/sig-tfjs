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

import {animate, style, transition, trigger} from '@angular/animations';
import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {Store} from '@ngrx/store';
import {RunStatus, TaskStatus} from 'src/app/data_model/misc';
import {resetRunStatus} from 'src/app/store/actions';
import {selectRunStatus} from 'src/app/store/selectors';
import {AppState} from 'src/app/store/state';

@Component({
  selector: 'run-progress-overlay',
  templateUrl: './run_progress_overlay.component.html',
  styleUrls: ['./run_progress_overlay.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    // Animate overlay.
    trigger(
        'overlayAnimationTrigger',
        [
          // Fade/scale in the overlay when showing it.
          transition(
              ':enter',
              [
                style({
                  opacity: 0,
                  transform: 'scale(1.1)',
                }),
                animate('200ms ease-out', style({
                          opacity: 1,
                          transform: 'scale(1)',
                        })),
              ]),
          // Fade/scale out the overlay when hiding it.
          transition(
              ':leave',
              [
                animate('150ms ease-in', style({
                          opacity: 0,
                          transform: 'scale(1.1)',
                        })),
              ]),
        ]),
    // Animate status icon.
    trigger(
        'statusIconEnterAnimationTrigger',
        [
          // Zoom in icon.
          transition(
              ':enter',
              [
                style({
                  transform: 'scale(.4)',
                  opacity: 0,
                }),
                animate('200ms ease-out', style({
                          transform: 'scale(1)',
                          opacity: 1,
                        })),
              ]),
        ]),
  ]
})
export class RunProgressOverlay implements OnInit {
  curRunStatus?: RunStatus;

  /** Used by template. */
  TaskStatus = TaskStatus;

  constructor(
      private readonly changeDetectionRef: ChangeDetectorRef,
      private readonly store: Store<AppState>,
  ) {}

  ngOnInit() {
    this.store.select(selectRunStatus).subscribe(runStatus => {
      this.curRunStatus = runStatus;
      this.changeDetectionRef.markForCheck();

      if (this.curRunStatus && this.checkAllTasksDone()) {
        // Hide the panel with some delay for better ux.
        setTimeout(() => {
          this.store.dispatch(resetRunStatus());
        }, 500);
      }
    });
  }

  getRunTaskStatus(taskName: string): TaskStatus|undefined {
    if (!this.curRunStatus) {
      return undefined;
    }
    return this.curRunStatus[taskName];
  }

  get runTaskNames(): string[] {
    if (!this.curRunStatus) {
      return [];
    }
    return Object.keys(this.curRunStatus);
  }

  get showOverlay(): boolean {
    return this.curRunStatus != null;
  }

  private checkAllTasksDone(): boolean {
    if (!this.curRunStatus) {
      return false;
    }

    for (const task of Object.keys(this.curRunStatus)) {
      if (this.curRunStatus[task] !== TaskStatus.SUCCESS) {
        return false;
      }
    }
    return true;
  }
}
