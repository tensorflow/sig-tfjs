import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';

import {ModelSelectorModule} from '../model_selector/model_selector.module';

import {ConfigSection} from './config_section.component';

@NgModule({
  declarations: [
    ConfigSection,
  ],
  imports: [
    CommonModule,
    ModelSelectorModule,
  ],
  exports: [
    ConfigSection,
  ]
})
export class ConfigSectionModule {
}
