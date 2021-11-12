import {Injectable} from '@angular/core';
import {Router} from '@angular/router';

/**
 * Service for url related tasks.
 */
@Injectable({
  providedIn: 'root',
})
export class UrlService {
  constructor(
      private readonly router: Router,
  ) {}

  updateUrlParameter(paramKey: string, value: string) {
    this.router.navigate([], {
      queryParams: {
        [paramKey]: value,
      },
      queryParamsHandling: 'merge',
    });
  }
}
