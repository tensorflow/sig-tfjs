import {UrlParamKey} from './types';

const CONFIG_INDEX_SEP = '__';

export function appendConfigIndexToKey(paramKey: UrlParamKey, index: number) {
  return `${paramKey}${CONFIG_INDEX_SEP}${index}`;
}
