import { z } from 'zod';

const decimalCoordinate = z.string().trim().min(1, 'Enter both coordinates')
  .regex(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/, 'Use decimal degrees, for example -26.3054')
  .transform(Number);

export const farmCoordinatesSchema = z.object({
  latitude: decimalCoordinate.pipe(z.number().finite().min(-90).max(90)),
  longitude: decimalCoordinate.pipe(z.number().finite().min(-180).max(180)),
});