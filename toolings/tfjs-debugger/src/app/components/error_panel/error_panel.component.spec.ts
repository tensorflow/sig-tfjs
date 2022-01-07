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

import {ComponentFixture, fakeAsync, TestBed, tick} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Router} from '@angular/router';
import {RouterTestingModule} from '@angular/router/testing';
import {StoreRouterConnectingModule} from '@ngrx/router-store';
import {Store, StoreModule} from '@ngrx/store';
import {clearErrorMessage, setErrorMessage} from 'src/app/store/actions';
import {mainReducer} from 'src/app/store/reducers';
import {AppState} from 'src/app/store/state';

import {ErrorPanel} from './error_panel.component';
import {ErrorPanelModule} from './error_panel.module';

describe('ErrorPanel', () => {
  let store: Store<AppState>;
  let router: Router;
  let fixture: ComponentFixture<ErrorPanel>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [
        ErrorPanel,
      ],
      imports: [
        ErrorPanelModule,
        // Disable animation.
        NoopAnimationsModule,
        RouterTestingModule,
        StoreModule.forRoot({
          'main': mainReducer,
        }),
        StoreRouterConnectingModule.forRoot(),
      ],
    });

    router = TestBed.inject(Router);
    store = TestBed.inject(Store);
    fixture = TestBed.createComponent(ErrorPanel);
  });

  it('should show and hide the error panel correctly', fakeAsync(() => {
       const ele = fixture.debugElement.nativeElement as HTMLElement;

       // Verify that when there is no error message, the panel is hidden.
       expect(ele.querySelector('.title')).toBeNull();

       // Set an error message.
       store.dispatch(
           setErrorMessage({title: 'Error title', content: 'Error content'}));
       detectChanges(2);

       // Verify the panel is showing and the title and content are expected.
       expect(ele.querySelector('.title')?.textContent?.trim())
           .toBe('Error title');
       expect(ele.querySelector('.content-container')?.textContent?.trim())
           .toBe('Error content');

       // Clear the error message.
       store.dispatch(clearErrorMessage());
       detectChanges(2);

       // Verify that the panel is hidden.
       expect(ele.querySelector('.title')).toBeNull();
     }));

  const detectChanges = (count = 1) => {
    for (let i = 0; i < count; i++) {
      tick();
      fixture.detectChanges();
    }
  };
});
