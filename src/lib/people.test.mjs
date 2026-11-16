// Quick checks: node --experimental-strip-types src/lib/people.test.mjs
import assert from "node:assert/strict";
import { ageOf, cmToFtIn, ftInToCm, heightText, phoneDigits, toCsv } from "./people.ts";

const today = new Date("2026-11-16T12:00:00");
assert.deepEqual(ageOf({ date_of_birth: "1999-11-17", birth_year: null, approx_age: null }, today), { age: 26, approx: false });
assert.deepEqual(ageOf({ date_of_birth: "1999-11-16", birth_year: null, approx_age: null }, today), { age: 27, approx: false });
assert.deepEqual(ageOf({ date_of_birth: null, birth_year: 2000, approx_age: null }, today), { age: 26, approx: true });
assert.deepEqual(ageOf({ date_of_birth: null, birth_year: null, approx_age: 30 }, today), { age: 30, approx: true });
assert.equal(ageOf({ date_of_birth: null, birth_year: null, approx_age: null }, today), null);
assert.deepEqual(cmToFtIn(175), { ft: 5, inch: 9 });
assert.deepEqual(cmToFtIn(168), { ft: 5, inch: 6 });
assert.equal(ftInToCm(5, 9), 175);
assert.equal(heightText(180), "180 cm · 5ft 11in");
assert.equal(phoneDigits("+44 7700 900000"), "447700900000");
assert.equal(phoneDigits("0044 (0)7700-900000"), "447700900000");
assert.equal(toCsv([{ a: 'x, "y"', b: null }]), 'a,b\r\n"x, ""y""",');
console.log("all checks passed");
