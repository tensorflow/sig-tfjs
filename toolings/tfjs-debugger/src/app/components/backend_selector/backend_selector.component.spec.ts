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
import {EffectsModule} from '@ngrx/effects';
import {routerReducer, RouterReducerState, StoreRouterConnectingModule} from '@ngrx/router-store';
import {createFeatureSelector, Store, StoreModule} from '@ngrx/store';
import {Observable, of} from 'rxjs';
import {UrlParamKey} from 'src/app/common/types';
import {appendConfigIndexToKey} from 'src/app/common/utils';
import {BackendId} from 'src/app/data_model/backend_type';
import {ReleaseJson} from 'src/app/data_model/tfjs_release';
import {GithubService} from 'src/app/services/github_service';
import {fetchTfjsReleases} from 'src/app/store/actions';
import {GithubEffects} from 'src/app/store/effects';
import {mainReducer} from 'src/app/store/reducers';
import {AppState} from 'src/app/store/state';

import {BackendSelector} from './backend_selector.component';
import {BackendSelectorModule} from './backend_selector.module';
import {BackendVersionSelector} from './backend_version_selector.component';

/** A mock for GithubService. */
class MockGithubService {
  fetchTfjsReleases(): Observable<ReleaseJson[]> {
    return of([
      {
        tag_name: 'tfjs-v3.12.0',
        published_at: '2021-12-08T21:32:57Z',  // Wed, Dec 08, 2021
      },
      {
        tag_name: 'tfjs-v3.11.0',
        published_at: '2021-10-27T21:37:59Z',  // Wed, Oct 27, 2021
      },
    ]);
  }
}

describe('BackendSelector', () => {
  let store: Store<AppState>;
  let router: Router;
  let fixture: ComponentFixture<BackendSelector>;
  let loader: HarnessLoader;
  const selectRouter = createFeatureSelector<RouterReducerState>('router');

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [
        BackendSelector,
      ],
      imports: [
        BackendSelectorModule,
        BrowserAnimationsModule,
        EffectsModule.forRoot([GithubEffects]),
        RouterTestingModule,
        StoreModule.forRoot({
          'main': mainReducer,
          'router': routerReducer,
        }),
        StoreRouterConnectingModule.forRoot(),
      ],
      providers: [
        {provide: GithubService, useClass: MockGithubService},
      ],
    });

    router = TestBed.inject(Router);
    store = TestBed.inject(Store);
    fixture = TestBed.createComponent(BackendSelector);
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  it('should select the correct backend encoded in URL', fakeAsync(() => {
       // Verify that the default selection is the first one in the backends
       // array.
       fixture.componentInstance.configIndex = 0;
       // Need 2 rounds of change detections (one for initial data binding and
       // one for navigation) to properly update the UI
       detectChanges(2);
       const selectEle: HTMLElement =
           fixture.debugElement.query(By.css('mat-select')).nativeElement;
       expect(selectEle.textContent)
           .toBe(fixture.componentInstance.backends[0].label);

       // After updating the url with backendId = WASM, verify that the
       // backend selector has the correct one selected.
       router.navigate([], {
         queryParams: {
           [appendConfigIndexToKey(
               UrlParamKey.SELECTED_BACKEND_ID,
               fixture.componentInstance.configIndex)]: `${BackendId.WASM}`,
         }
       });
       detectChanges();

       const backend = fixture.componentInstance.backends.find(
           backend => backend.id === BackendId.WASM)!;
       expect(selectEle.textContent).toBe(backend.label);
     }));

  it('should correctly encode the selected backend id in URL', fakeAsync(() => {
       fixture.componentInstance.configIndex = 1;
       detectChanges(2);

       // Click the "WASM" in the backend selector.
       const selectBackendId = async () => {
         const selector = await loader.getHarness(MatSelectHarness);
         await selector.open();
         const options = await selector.getOptions({text: 'WASM'});
         await options[0].click();
       };

       selectBackendId();
       tick();

       // Verify that the router store has the correct query param for the
       // selected backend id.
       let curRouterState!: RouterReducerState;
       store.select(selectRouter).subscribe(routerState => {
         curRouterState = routerState;
       });
       tick();

       expect(curRouterState.state.root.queryParams[appendConfigIndexToKey(
                  UrlParamKey.SELECTED_BACKEND_ID,
                  fixture.componentInstance.configIndex)])
           .toBe(`${BackendId.WASM}`);
     }));

  // Tests for backend version selector.
  describe('BackendVersionSelector', () => {
    it('should show "loading" when github releases are being loaded',
       fakeAsync(() => {
         fixture.componentInstance.configIndex = 0;
         // Need 2 rounds of change detections (one for initial data binding
         // and one for navigation) to properly update the UI
         detectChanges(2);
         // Get the backend-version-selector component and verify its content.
         //
         // At this point, TFJS releases have not been fetched so the component
         // should show "loading".
         const backendVersionSelector =
             fixture.debugElement.query(By.directive(BackendVersionSelector));
         expect(backendVersionSelector.nativeElement.textContent.trim())
             .toBe('Loading...');
       }));

    it('should select the correct version encoded in URL', fakeAsync(() => {
         // Start fetching TFJS releases.
         //
         // The MockGithubService will be used.
         store.dispatch(fetchTfjsReleases());
         detectChanges();

         // Verify that the default selection is the first one in the
         // releases array.
         fixture.componentInstance.configIndex = 0;
         // Need 2 rounds of change detections (one for initial data binding
         // and one for navigation) to properly update the UI
         detectChanges(2);

         // Get the backend-version-selector component and its mat-select.
         const backendVersionSelector =
             fixture.debugElement.query(By.directive(BackendVersionSelector));
         const selectEle: HTMLElement =
             backendVersionSelector.query(By.css('mat-select')).nativeElement;
         // Verify that the correct default release is selected (the first one
         // returned by MockGithubService).
         expect(selectEle.textContent).toBe('3.12.0Wed, Dec 08, 2021');

         // After updating the url with backendVersion = 3.11.0, verify that
         // the version selector has the correct one selected.
         router.navigate([], {
           queryParams: {
             [appendConfigIndexToKey(
                 UrlParamKey.SELECTED_BACKEND_VERSION,
                 fixture.componentInstance.configIndex)]: '3.11.0',
           }
         });
         detectChanges();

         expect(selectEle.textContent).toBe('3.11.0Wed, Oct 27, 2021');
       }));

    it('should correctly encode the selected version in URL', fakeAsync(() => {
         // Start fetching TFJS releases.
         //
         // The MockGithubService will be used.
         store.dispatch(fetchTfjsReleases());
         detectChanges();

         fixture.componentInstance.configIndex = 0;
         detectChanges(2);

         // Click the "3.11.0" in the backend selector.
         const backendVersionSelector =
             fixture.debugElement.query(By.directive(BackendVersionSelector));
         const selectVersion = async () => {
           const selector = (await loader.getAllHarnesses(MatSelectHarness))[1];
           await selector.open();
           const options = await selector.getOptions({text: /3\.11\.0.*/});
           await options[0].click();
         };

         selectVersion();
         tick();

         // Verify that the router store has the correct query param for the
         // selected version.
         let curRouterState!: RouterReducerState;
         store.select(selectRouter).subscribe(routerState => {
           curRouterState = routerState;
         });
         tick();

         expect(curRouterState.state.root.queryParams[appendConfigIndexToKey(
                    UrlParamKey.SELECTED_BACKEND_VERSION,
                    fixture.componentInstance.configIndex)])
             .toBe('3.11.0');
       }));
  });

  const detectChanges = (count = 1) => {
    for (let i = 0; i < count; i++) {
      tick();
      fixture.detectChanges();
    }
  };
});
