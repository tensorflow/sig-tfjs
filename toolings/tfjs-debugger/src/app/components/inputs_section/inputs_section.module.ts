import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatDialogModule} from '@angular/material/dialog';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {CodemirrorModule} from '@ctrl/ngx-codemirror';

import {InputsCodeEditor} from './inputs_code_editor.component';
import {InputsSection} from './inputs_section.component';

@NgModule({
  imports: [
    CodemirrorModule,
    CommonModule,
    MatButtonToggleModule,
    FormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  declarations: [
    InputsSection,
    InputsCodeEditor,
  ],
  exports: [
    InputsSection,
  ]
})
export class InputsSectionModule {
}
