import {HttpErrorResponse} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {of} from 'rxjs';
import {catchError, map, switchMap} from 'rxjs/operators';

import {modelJsonToModelGraph} from '../data_model/run_results';
import {releaseJsonToTfjsRelease, TfjsRelease} from '../data_model/tfjs_release';
import {GithubService} from '../services/github_service';
import {TfjsService} from '../services/tfjs_service';

import {DebuggerAction, fetchTfjsModelJson, fetchTfjsModelJsonFail, fetchTfjsModelJsonSuccess, fetchTfjsReleasesFail, fetchTfjsReleasesSuccess} from './actions';

/** Effects for github related tasks. */
@Injectable()
export class GithubEffects {
  constructor(
      private actions$: Actions,
      private githubService: GithubService,
  ) {}

  /** Fetch TFJS releaes using GithubService. */
  fetchTfjsReleases$ = createEffect(
      () => this.actions$.pipe(
          ofType(DebuggerAction.FETCH_TFJS_RELEASES),
          switchMap(
              () => this.githubService.fetchTfjsReleases().pipe(
                  map(jsonArray => {
                    const releases =
                        jsonArray.map(json => releaseJsonToTfjsRelease(json))
                            .filter(release => release != null) as
                        TfjsRelease[];
                    return fetchTfjsReleasesSuccess({releases});
                  }),
                  catchError((error: HttpErrorResponse) => {
                    return of(fetchTfjsReleasesFail({error}));
                  }))),
          ));
}

/** Effects for TFJS related tasks. */
@Injectable()
export class TfjsEffects {
  constructor(
      private actions$: Actions,
      private tfjsService: TfjsService,
  ) {}

  /** Fetch TFJS model json file using TfjsService. */
  fetchTfjsModelJson$ = createEffect(
      () => this.actions$.pipe(
          ofType(fetchTfjsModelJson),
          switchMap(
              (action) =>
                  this.tfjsService.fetchModelJson(action.url)
                      .pipe(
                          map(modelJson => {
                            const modelGraph = modelJsonToModelGraph(modelJson);
                            return fetchTfjsModelJsonSuccess(
                                {configIndex: action.configIndex, modelGraph});
                          }),
                          catchError((error: HttpErrorResponse) => {
                            return of(fetchTfjsModelJsonFail(
                                {configIndex: action.configIndex, error}));
                          }))),
          ));
}
