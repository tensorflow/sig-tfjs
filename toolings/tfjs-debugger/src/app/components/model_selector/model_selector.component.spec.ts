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
import {MatInputHarness} from '@angular/material/input/testing';
import {MatSelectHarness} from '@angular/material/select/testing';
import {By} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {Router} from '@angular/router';
import {RouterTestingModule} from '@angular/router/testing';
import {routerReducer, RouterReducerState, StoreRouterConnectingModule} from '@ngrx/router-store';
import {createFeatureSelector, Store, StoreModule} from '@ngrx/store';
import {UrlParamKey} from 'src/app/common/types';
import {appendConfigIndexToKey} from 'src/app/common/utils';
import {ModelTypeId} from 'src/app/data_model/model_type';
import {AppState} from 'src/app/store/state';

import {ModelSelector} from './model_selector.component';
import {ModelSelectorModule} from './model_selector.module';

describe('ModelSelector', () => {
  let store: Store<AppState>;
  let router: Router;
  let fixture: ComponentFixture<ModelSelector>;
  let loader: HarnessLoader;
  const selectRouter = createFeatureSelector<RouterReducerState>('router');

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [
        ModelSelector,
      ],
      imports: [
        ModelSelectorModule,
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
    fixture = TestBed.createComponent(ModelSelector);
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  it('should select the correct model type encoded in URL', fakeAsync(() => {
       // Verify that the default selection is the first one in the modelTypes
       // array.
       fixture.componentInstance.configIndex = 1;
       // Need 2 rounds of change detections (one for initial data binding and
       // one for navigation) to properly update the UI
       detectChanges(2);
       const selectEle: HTMLElement =
           fixture.debugElement.query(By.css('mat-select')).nativeElement;
       expect(selectEle.textContent)
           .toBe(fixture.componentInstance.modelTypes[0].label);

       // After updating the url with modelTypeId = TFJS, verify that the
       // model type selector has the correct one selected.
       router.navigate([], {
         queryParams: {
           [appendConfigIndexToKey(
               UrlParamKey.SELECTED_MODEL_TYPE_ID,
               fixture.componentInstance.configIndex)]: `${ModelTypeId.TFJS}`,
         }
       });
       detectChanges();

       const tfjsModelType = fixture.componentInstance.modelTypes.find(
           modelType => modelType.id === ModelTypeId.TFJS)!;
       expect(selectEle.textContent).toBe(tfjsModelType.label);
     }));

  it('should set the correct content of the TFJS model url encoded in URL',
     fakeAsync(() => {
       fixture.componentInstance.configIndex = 0;
       detectChanges(2);
       // Update URL that encodes the tfjs model url to be "www.google.com".
       const modelUrl = 'www.myweb.com/model.json';
       router.navigate([], {
         queryParams: {
           [appendConfigIndexToKey(
               UrlParamKey.TFJS_MODEL_URL,
               fixture.componentInstance.configIndex)]: modelUrl,
         }
       });
       detectChanges(2);

       // Verify the input has the correct value.
       const tfjsModelUrlInput: HTMLInputElement =
           fixture.debugElement.query(By.css('.tfjs-model-url-input'))
               .nativeElement;
       expect(tfjsModelUrlInput.value).toBe(modelUrl);
     }));

  it('should show the correct UI components when TFJS model type is selected',
     fakeAsync(() => {
       // Verify that when TFJS model is selected (default), the TFJS model url
       // input should appear.
       fixture.componentInstance.configIndex = 0;
       detectChanges(2);
       expect(fixture.debugElement.query(By.css('.tfjs-model-url-input')))
           .not.toBeNull();
     }));

  it('should correctly encode the selected model type in URL', fakeAsync(() => {
       fixture.componentInstance.configIndex = 1;
       detectChanges(2);

       // Click the "TFJS model" in the model type selector.
       const selectTFJSModelType = async () => {
         const selector = await loader.getHarness(MatSelectHarness);
         await selector.open();
         const options = await selector.getOptions({text: 'TFJS model'});
         await options[0].click();
       };

       selectTFJSModelType();
       tick();

       // Verify that the router store has the correct query param for the
       // selected model type id.
       let curRouterState!: RouterReducerState;
       store.select(selectRouter).subscribe(routerState => {
         curRouterState = routerState;
       });
       tick();

       expect(curRouterState.state.root.queryParams[appendConfigIndexToKey(
                  UrlParamKey.SELECTED_MODEL_TYPE_ID,
                  fixture.componentInstance.configIndex)])
           .toBe(`${ModelTypeId.TFJS}`);
     }));

  it('should correctly encode the TFJS model url string in URL',
     fakeAsync(() => {
       fixture.componentInstance.configIndex = 0;
       detectChanges(2);

       // Enter model url in the input element.
       const modelUrl = 'www.myweb.com/model.json';
       const enterTfjsModelUrl = async () => {
         const input = await loader.getHarness(MatInputHarness);
         await input.setValue(modelUrl);
         await input.blur();
       };

       enterTfjsModelUrl();
       tick();

       // Need to manually fire the "change" event which will be handeled by the
       // model selector.
       const inputEle: HTMLInputElement =
           fixture.debugElement.query(By.css('input')).nativeElement;
       inputEle.dispatchEvent(new Event('change'));
       tick();

       // Verify that the router store has the correct query param for the
       // selected model type id.
       let curRouterState!: RouterReducerState;
       store.select(selectRouter).subscribe(routerState => {
         curRouterState = routerState;
       });
       tick();

       expect(curRouterState.state.root.queryParams[appendConfigIndexToKey(
                  UrlParamKey.TFJS_MODEL_URL,
                  fixture.componentInstance.configIndex)])
           .toBe(modelUrl);
     }));

  const detectChanges = (count = 1) => {
    for (let i = 0; i < count; i++) {
      tick();
      fixture.detectChanges();
    }
  };
});
