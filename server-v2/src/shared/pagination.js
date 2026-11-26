const { z } = require('../core/openapi');

/** Query fields for any list endpoint: ?page=2&limit=50 (limit is capped at 100). */
const paginationFields = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

const offsetOf = ({ page, limit }) => (page - 1) * limit;

/** The standard list payload: the rows, plus where we are and how many exist. */
const pageOf = (items, total, { page, limit }) => ({ items, page, limit, total });

/** Swagger shape of a list payload, for one row type. */
const pageSchema = (itemSchema) =>
  z.object({
    items: z.array(itemSchema),
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
  });

module.exports = { paginationFields, offsetOf, pageOf, pageSchema };
