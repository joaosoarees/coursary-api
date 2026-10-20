import { z } from 'zod';

import { nameSchema } from '@application/controllers/shared/schemas';

export const updateMeSchema = z.object({ name: nameSchema });
