"use strict";
const { HttpError } = require("./error");

/** validate(schema, "body" | "query" | "params") -> replaces req[part] with parsed data */
const validate = (schema, part = "body") => (req, _res, next) => {
  const r = schema.safeParse(req[part]);
  if (!r.success) {
    return next(new HttpError(400, "Validation failed", r.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }))));
  }
  if (part === "query") Object.defineProperty(req, "query", { value: r.data, writable: true, configurable: true });
  else req[part] = r.data;
  next();
};
module.exports = { validate };
