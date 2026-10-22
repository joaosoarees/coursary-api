import type { ImageProcessor } from '@application/gateways/file/ImageProcessor';
import { SharpImageProcessor } from '@infra/gateways/file/SharpImageProcessor';

export function makeImageProcessor(): ImageProcessor {
  return new SharpImageProcessor();
}
