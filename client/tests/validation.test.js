import test from "node:test";
import assert from "node:assert/strict";
import { valider } from "../src/validation.js";

test("un formulaire vide a trois erreurs", () => {
  assert.deepEqual(Object.keys(valider({ nom: "", tel: "", quartier: "" })), [
    "nom",
    "tel",
    "quartier",
  ]);
});
test("un numéro camerounais valide est accepté, avec ou sans indicatif", () => {
  for (const tel of ["699000000", "+237 6 99 00 00 00", "237699000000", "6.99.00.00.00"]) {
    assert.equal(valider({ nom: "Aïcha", tel, quartier: "Bonapriso" }).tel, undefined, tel);
  }
});
test("un numéro trop court ou ne commençant pas par 6 est refusé", () => {
  for (const tel of ["12345", "299000000", "69900000"])
    assert.ok(valider({ nom: "Aïcha", tel, quartier: "Akwa" }).tel, tel);
});
