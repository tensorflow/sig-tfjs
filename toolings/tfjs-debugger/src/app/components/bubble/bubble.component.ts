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

import {animate, state, style, transition, trigger} from '@angular/animations';
import {ConnectedPosition} from '@angular/cdk/overlay';
import {Component, EventEmitter, Inject, InjectionToken, Input, OnDestroy, Optional, Output, TemplateRef, ViewEncapsulation} from '@angular/core';
import {BehaviorSubject, Observable, OperatorFunction, pipe, ReplaySubject, Subject} from 'rxjs';
import {audit, debounceTime, distinctUntilChanged, filter, mapTo, takeUntil, throttle} from 'rxjs/operators';

const opacity0 = style({'opacity': '0'});

// Optimization: Reuse these pipes across all instances.
const filterTruthy = filter<boolean>(opening => opening);
const collapseTruthyValuesPipe = pipe(
    distinctUntilChanged<boolean>(),
    filterTruthy,
    mapTo(undefined),
);

/** The UI paradigm to follow. */
export enum BubbleDefaultStyle {
  /**
   * The Google Material variant by Reach UX.
   * Spec: https://carbon.googleplex.com/reach-ux/pages/tooltips/spec
   */
  REACH = 'xap-bubble-reach',
  MATERIAL_DESIGN_1 = 'xap-bubble-md1',
}

/** (Optional) InjectionToken specifying which UX spec to follow. */
export const XAP_BUBBLE_DEFAULT_STYLE =
    new InjectionToken<BubbleDefaultStyle>('xap-bubble UX style');

/**
 * A component that shows a "bubble" or popup when a trigger dom element is
 * hovered. Unlike MatTooltip, the bubble can contain arbitrary
 * markup/components/etc.
 *
 * Example usage:
 * <xap-bubble [panelTemplate]="content">Trigger element content</xap-bubble>
 * <ng-template #content>Bubble content</ng-template>
 *
 * Note: If the bubble background is transparent, you need to include the
 * bubble theme mixin in your App's styles.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  selector: 'bubble',
  styleUrls: ['./bubble.component.scss'],
  templateUrl: './bubble.component.html',
  animations: [
    trigger(
        'fade',
        [
          transition(':enter', [opacity0, animate('150ms')]),
          transition(':leave', [animate('100ms', opacity0)]),
        ]),
  ],
})
export class Bubble implements OnDestroy {
  private readonly activity = new Subject<void>();
  private readonly openedSubject = new BehaviorSubject<boolean>(false);
  private readonly destroy = new ReplaySubject<void>();
  readonly bubbleStyle: BubbleDefaultStyle;
  readonly opened: Observable<boolean>;

  @Input() panelTemplate!: TemplateRef<object>;

  /**
   * Overlay positions for the overlay. If the list is empty, default overlay
   * positions are used, which follows the behavior of a dropdown.
   */
  @Input() overlayPositions: ConnectedPosition[] = [];

  @Input() overlayPanelClass: string|string[] = '';

  /** Controls hover delay in milliseconds after mouseenter from mouse rest. */
  @Input() hoverDelayMs = 50;

  /**
   * Emits when the popup is preparing to open. Note that the popup may not
   * actually open if the user mouses away too quickly.
   */
  @Output() readonly beforeOpened = new EventEmitter<void>();
  /** @deprecated use beforeOpened */
  @Output() readonly beforeShow = this.beforeOpened;

  /** Emits when the popup is opened. */
  @Output('opened') readonly onOpened = new EventEmitter<void>();

  constructor(@Optional() @Inject(XAP_BUBBLE_DEFAULT_STYLE) style:
                  BubbleDefaultStyle|null) {
    this.bubbleStyle = style || BubbleDefaultStyle.MATERIAL_DESIGN_1;

    // Delay opening/closing until mouse has stopped moving and a short amount
    // of time has passed in order to ignore accidental movements.
    this.opened = this.openedSubject.pipe(
        audit(() => this.activity.pipe(debounceTime(this.hoverDelayMs))));

    // Optimization: Share takeUntil in the two subscriptions below.
    const takeUntilDestroyed = takeUntil(this.destroy);

    this.opened
        .pipe(
            collapseTruthyValuesPipe,
            takeUntilDestroyed as OperatorFunction<void, void>,
            )
        .subscribe(this.onOpened);

    // Emit the beforeOpened event when the first open-triggering event happens.
    this.openedSubject
        .pipe(
            filterTruthy,
            throttle(() => this.opened.pipe(filter(opened => !opened))),
            takeUntilDestroyed,
            )
        .subscribe(() => {
          this.beforeOpened.emit();
        });
  }

  ngOnDestroy() {
    this.destroy.next();
    this.destroy.complete();
  }

  /**
   * Called on every user interaction.
   * Used to delay changing the open/closed state.
   */
  onActivity() {
    this.activity.next();
  }

  toggle(open: boolean) {
    this.openedSubject.next(open);
    this.onActivity();
  }
}
