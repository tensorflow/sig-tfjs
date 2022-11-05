import {HttpErrorResponse} from '@angular/common/http';
import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {Store} from '@ngrx/store';
import {of} from 'rxjs';
import {catchError, map, take, takeWhile} from 'rxjs/operators';
import {UrlParamKey} from 'src/app/common/types';
import {Input, InputValuesType} from 'src/app/data_model/input';
import {ModelGraph, modelJsonToModelGraph} from 'src/app/data_model/run_results';
import {TfjsService} from 'src/app/services/tfjs_service';
import {UrlService} from 'src/app/services/url_service';
import {clearErrorMessage, setErrorMessage, setInputs} from 'src/app/store/actions';
import {selectConfigValueFromUrl, selectValueFromUrl} from 'src/app/store/selectors';
import {AppState} from 'src/app/store/state';

interface InputItem extends Input {
  index: number;
  op: string;
  strShape: string;
}

interface DecodedInputItem {
  inputValuesType?: InputValuesType;

  randomMin?: number;
  randomMax?: number;

  sameValue?: number;
}

@Component({
  selector: 'inputs-section',
  templateUrl: './inputs_section.component.html',
  styleUrls: ['./inputs_section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputsSection implements OnInit, OnDestroy {
  private tfjsModelUrl = '';
  private active = true;
  private inputsFromUrl: DecodedInputItem[] = [];

  InputValuesType = InputValuesType;
  infoMsg = 'No model loaded';
  inputs: InputItem[] = [];
  inputTypes = [InputValuesType.RANDOM, InputValuesType.SAME_VALUE];

  constructor(
      private readonly changeDetectorRef: ChangeDetectorRef,
      private readonly store: Store<AppState>,
      private readonly urlService: UrlService,
      private readonly tfjsService: TfjsService,
  ) {}

  ngOnInit() {
    // TODO(jingjin): only support tfjs model url from the first config.
    this.store.select(selectConfigValueFromUrl(0, UrlParamKey.TFJS_MODEL_URL))
        .pipe(takeWhile(() => this.active))
        .subscribe((url) => {
          this.handleTfjsUrlChanged(url);
        });

    // Update inputs from URL.
    this.store.select(selectValueFromUrl(UrlParamKey.INPUTS))
        .pipe(takeWhile(() => this.active))
        .subscribe((strInputs) => {
          if (!strInputs) {
            return;
          }
          this.inputsFromUrl = this.decodeInputs(strInputs);
          this.mergeDecodedInputsAndModelInputs();
          this.changeDetectorRef.markForCheck();

          // Update store.
          this.store.dispatch(
              setInputs({inputs: this.inputs.map(input => ({...input}))}));
        });
  }

  ngOnDestroy() {
    this.active = false;
  }

  handleInputChanged() {
    this.updateUrl();
  }

  private handleTfjsUrlChanged(url: string) {
    if (!url) {
      return;
    }

    this.updateInfoMsg('Loading model...');

    // Fetch and parse model.json, find inputs, and update UI.
    this.tfjsModelUrl = url;
    this.tfjsService.fetchModelJson(url)
        .pipe(
            take(1),
            map(modelJson => modelJsonToModelGraph(modelJson)),
            catchError((e: HttpErrorResponse) => {
              this.store.dispatch(setErrorMessage({
                title: 'Network error',
                content: `Failed to load TFJS model '${this.tfjsModelUrl}': ${
                    e.message}`
              }));
              return of({} as ModelGraph);
            }),
            )
        .subscribe(modelGraph => {
          if (Object.keys(modelGraph).length > 0) {
            this.store.dispatch(clearErrorMessage());
          }
          this.updateInfoMsg('');
          this.updateInputs(modelGraph);
        });
  }

  private updateInputs(modelGraph: ModelGraph) {
    if (Object.keys(modelGraph).length === 0) {
      return;
    }

    // Extract the input nodes.
    this.inputs =
        Object.values(modelGraph)
            .filter(
                node => node.op.toLowerCase() !== 'const' &&
                    node.inputNodeIds.length === 0 && node.dtype !== 'resource')
            .map((input, index) => {
              return {
                index,
                id: input.id,
                shape: input.shape,
                dtype: input.dtype,
                op: input.op,
                strShape: `${input.dtype}[${input.shape.join(', ')}]`,
                inputValuesType: InputValuesType.RANDOM,
                randomMin: 0,
                randomMax: 1,
                sameValue: 0,
              };
            });
    this.mergeDecodedInputsAndModelInputs();
    this.changeDetectorRef.markForCheck();

    // Update store.
    this.store.dispatch(
        setInputs({inputs: this.inputs.map(input => ({...input}))}));
  }

  private updateUrl() {
    this.urlService.updateUrlParameters({
      [UrlParamKey.INPUTS]: this.encodeInputs(),
    });
  }

  private encodeInputs(): string {
    // In the form of:
    //
    // <type>;value1;value2,<type>;value1,value2,...
    return this.inputs
        .map(input => {
          const parts: string[] = [input.inputValuesType];
          switch (input.inputValuesType) {
            case InputValuesType.RANDOM:
              parts.push(String(input.randomMin));
              parts.push(String(input.randomMax));
              break;
            case InputValuesType.SAME_VALUE:
              parts.push(String(input.sameValue));
              break;
            default:
              break;
          }
          return parts.join(';');
        })
        .join(',');
  }

  private decodeInputs(strInputs: string): DecodedInputItem[] {
    return strInputs.split(',').map(part => {
      const item: DecodedInputItem = {};
      const fields = part.split(';');
      const strValuesType = fields[0];
      switch (strValuesType) {
        case InputValuesType.RANDOM: {
          if (fields.length >= 3) {
            const randomMin = Number(fields[1]);
            const randomMax = Number(fields[2]);
            item.inputValuesType = InputValuesType.RANDOM;
            item.randomMin = randomMin;
            item.randomMax = randomMax;
          }
          break;
        }
        case InputValuesType.SAME_VALUE: {
          if (fields.length >= 2) {
            const sameValue = Number(fields[1]);
            item.inputValuesType = InputValuesType.SAME_VALUE;
            item.sameValue = sameValue;
          }
          break;
        }
        default:
          break;
      }
      return item;
    });
  }

  private mergeDecodedInputsAndModelInputs() {
    if (this.inputs.length > 0 && this.inputsFromUrl.length > 0 &&
        this.inputs.length === this.inputsFromUrl.length) {
      for (let i = 0; i < this.inputs.length; i++) {
        const modelInput = this.inputs[i];
        const decodedInput = this.inputsFromUrl[i];
        if (decodedInput.inputValuesType) {
          modelInput.inputValuesType = decodedInput.inputValuesType;
        }
        if (decodedInput.randomMin != null) {
          modelInput.randomMin = decodedInput.randomMin;
        }
        if (decodedInput.randomMax != null) {
          modelInput.randomMax = decodedInput.randomMax;
        }
        if (decodedInput.sameValue != null) {
          modelInput.sameValue = decodedInput.sameValue;
        }
      }
    }
  }

  private updateInfoMsg(msg: string) {
    this.infoMsg = msg;
    this.changeDetectorRef.markForCheck();
  }
}
