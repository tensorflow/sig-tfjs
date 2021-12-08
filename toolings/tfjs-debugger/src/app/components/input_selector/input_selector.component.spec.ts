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

import {HarnessLoader} from '@angular/cdk/testing';
import {TestbedHarnessEnvironment} from '@angular/cdk/testing/testbed';
import {ComponentFixture, fakeAsync, TestBed, tick} from '@angular/core/testing';
import {MatSelectHarness} from '@angular/material/select/testing';
import {By} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {Router} from '@angular/router';
import {RouterTestingModule} from '@angular/router/testing';
import {routerReducer, RouterReducerState, StoreRouterConnectingModule} from '@ngrx/router-store';
import {createFeatureSelector, Store, StoreModule} from '@ngrx/store';
import {UrlParamKey} from 'src/app/common/types';
import {appendConfigIndexToKey} from 'src/app/common/utils';
import {InputTypeId} from 'src/app/data_model/input_type';
import {AppState} from 'src/app/store/state';

import {InputSelector} from './input_selector.component';
import {InputSelectorModule} from './input_selector.module';

describe('InputSelector', () => {
  let store: Store<AppState>;
  let router: Router;
  let fixture: ComponentFixture<InputSelector>;
  let loader: HarnessLoader;
  const selectRouter = createFeatureSelector<RouterReducerState>('router');

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [
        InputSelector,
      ],
      imports: [
        InputSelectorModule,
        BrowserAnimationsModule,
        RouterTestingModule,
        StoreModule.forRoot({
          'router': routerReducer,
        }),
        StoreRouterConnectingModule.forRoot(),
      ],
    });

    router = TestBed.inject(Router);
    store = TestBed.inject(Store);
    fixture = TestBed.createComponent(InputSelector);
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  it('should select the correct input type encoded in URL', fakeAsync(() => {
       // Verify that the default selection is the first one in the inputTypes
       // array.
       fixture.componentInstance.configIndex = 1;
       // Need 2 rounds of change detections (one for initial data binding and
       // one for navigation) to properly update the UI
       detectChanges(2);
       const selectEle: HTMLElement =
           fixture.debugElement.query(By.css('mat-select')).nativeElement;
       expect(selectEle.textContent)
           .toBe(fixture.componentInstance.inputTypes[0].label);

       // After updating the url with inputTypeId = CUSTOM_VALUE, verify that
       // the input type selector has the correct one selected.
       router.navigate([], {
         queryParams: {
           [appendConfigIndexToKey(
               UrlParamKey.SELECTED_INPUT_TYPE_ID,
               fixture.componentInstance.configIndex)]:
               `${InputTypeId.CUSTOM_VALUE}`,
         }
       });
       detectChanges();

       const inputType = fixture.componentInstance.inputTypes.find(
           inputType => inputType.id === InputTypeId.CUSTOM_VALUE)!;
       expect(selectEle.textContent).toBe(inputType.label);
     }));

  it('should correctly encode the selected input type in URL', fakeAsync(() => {
       fixture.componentInstance.configIndex = 1;
       detectChanges(2);

       // Click the "Random" in the input type selector.
       const selectInputType = async () => {
         const selector = await loader.getHarness(MatSelectHarness);
         await selector.open();
         const options = await selector.getOptions({text: 'Random'});
         await options[0].click();
       };

       selectInputType();
       tick();

       // Verify that the router store has the correct query param for the
       // selected input type id.
       let curRouterState!: RouterReducerState;
       store.select(selectRouter).subscribe(routerState => {
         curRouterState = routerState;
       });
       tick();

       expect(curRouterState.state.root.queryParams[appendConfigIndexToKey(
                  UrlParamKey.SELECTED_INPUT_TYPE_ID,
                  fixture.componentInstance.configIndex)])
           .toBe(`${InputTypeId.RANDOM}`);
     }));

  const detectChanges = (count = 1) => {
    for (let i = 0; i < count; i++) {
      tick();
      fixture.detectChanges();
    }
  };
});
