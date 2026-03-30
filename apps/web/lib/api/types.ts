// TODO: Signature function that enforces that last parameer is the config.
import { Nullable } from '@/lib/global.types';

export interface RequestConfig {
  authToken?: Nullable<string>;
  signal?: AbortSignal;
}
