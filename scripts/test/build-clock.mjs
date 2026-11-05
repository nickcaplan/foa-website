// Only loaded by the dedicated, non-deployable browser-fixture build.
const RealDate = globalThis.Date;
const fixed = RealDate.parse('2026-10-11T12:00:00Z');
globalThis.Date = class extends RealDate {
  constructor(...args) { super(...(args.length ? args : [fixed])); }
  static now() { return fixed; }
};
