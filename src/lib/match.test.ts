// npm test
import assert from "node:assert/strict";
import { findMatches } from "./match";

const today = new Date("2026-11-16T12:00:00");
const base = { status: "Available", date_of_birth: null, birth_year: null, approx_age: null, country: null, religious_level: null, kosher_level: null, community: null,
  pref_age_min: null, pref_age_max: null, pref_religious: null, pref_kosher: null, pref_community: null, pref_countries: null, pref_anywhere: false };
const P = (o) => ({ ...base, ...o });

const sarah = P({ id: "s", gender: "female", approx_age: 27, country: "United Kingdom", religious_level: 3, kosher_level: 4, community: ["ashkenazi"],
  pref_age_min: 26, pref_age_max: 32, pref_religious: [3, 4], pref_kosher: [3, 4], pref_countries: ["United Kingdom", "Israel"] });
const good = P({ id: "g", gender: "male", approx_age: 29, country: "Israel", religious_level: 4, kosher_level: 4, pref_anywhere: true, pref_religious: [3, 4] });
const tooOld = P({ id: "o", gender: "male", approx_age: 40, country: "Israel", religious_level: 4 });
const wrongWay = P({ id: "w", gender: "male", approx_age: 28, country: "Israel", religious_level: 4, pref_religious: [1] }); // he wants not religious
const unknownMan = P({ id: "u", gender: "male" }); // nothing known: kept, all unknown
const dating = P({ id: "d", gender: "male", status: "Dating", approx_age: 29 });
const woman = P({ id: "x", gender: "female", approx_age: 28 });
const farAway = P({ id: "f", gender: "male", approx_age: 28, country: "Canada" });

const m = findMatches(sarah, [sarah, good, tooOld, wrongWay, unknownMan, dating, woman, farAway], today);
assert.deepEqual(m.map((x) => x.person.id), ["g", "u"]);
assert.equal(m[0].result.age, "unknown"); // he gave no age preference, so it can't be confirmed both ways
assert.equal(m[0].result.religious, "yes");
assert.equal(m[0].result.location, "yes");
assert.equal(m[0].result.type, "unknown");
assert.equal(m[1].fits, 0);
// approximate age gets a year's grace: 33 (approx) vs max 32 is still ok
assert.equal(findMatches(sarah, [P({ id: "a", gender: "male", approx_age: 33 })], today).length, 1);
assert.equal(findMatches(sarah, [P({ id: "a", gender: "male", date_of_birth: "1992-01-01" })], today).length, 0); // exactly 34
const onHold = P({ id: "h", gender: "male", status: "On hold", approx_age: 28 });
assert.equal(findMatches(sarah, [onHold], today).length, 1);
assert.equal(findMatches(sarah, [onHold], today, { excludeOnHold: true }).length, 0);
console.log("match checks passed");
