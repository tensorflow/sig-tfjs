import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';

import {AppBar} from './app_bar.component';

@NgModule({
  declarations: [
    AppBar,
  ],
  imports: [
    CommonModule,
    MatButtonModule,
  ],
  exports: [
    AppBar,
  ],
})
export class AppBarModule {
}
