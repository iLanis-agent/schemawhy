(function (root) {
  'use strict';
  // JSON Schema 2020-12 validation vocabulary subset (json-schema.org/draft/2020-12/json-schema-validation, section 6).
  // Not covered: $ref, $defs, unevaluated*, contains, prefixItems/dependent*, format assertion.
  function typeOf(v) { return v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v; }
  function isType(v, t) {
    var k = typeOf(v);
    if (t === 'integer') return k === 'number' && isFinite(v) && Math.floor(v) === v;
    return k === t;
  }
  function eq(a, b) {
    var ta = typeOf(a), tb = typeOf(b); if (ta !== tb) return false;
    if (ta === 'array') return a.length === b.length && a.every(function (x, i) { return eq(x, b[i]); });
    if (ta === 'object') { var ka = Object.keys(a), kb = Object.keys(b); return ka.length === kb.length && ka.every(function (k) { return Object.prototype.hasOwnProperty.call(b, k) && eq(a[k], b[k]); }); }
    return a === b;
  }
  function esc(k) { return String(k).replace(/~/g, '~0').replace(/\//g, '~1'); }
  function show(v) { var s = JSON.stringify(v); return s && s.length > 60 ? s.slice(0, 57) + '...' : s; }
  function multiple(x, m) { return Number.isInteger(x / m); }
  function validate(schema, inst, path, errs) {
    if (schema === true || schema === undefined) return;
    if (schema === false) { errs.push({ path: path, keyword: 'false', message: 'The schema is false: nothing is valid here.' }); return; }
    if (typeOf(schema) !== 'object') return;
    var t = typeOf(inst), s = schema, ok;
    function add(kw, msg) { errs.push({ path: path, keyword: kw, message: msg }); }
    if ('type' in s) { var ts = [].concat(s.type); if (!ts.some(function (x) { return isType(inst, x); })) add('type', show(inst) + ' is a ' + (isType(inst, 'integer') ? 'integer' : t) + ', schema wants ' + ts.join(' or ') + '.'); }
    if ('enum' in s && !s.enum.some(function (x) { return eq(x, inst); })) add('enum', show(inst) + ' is not one of ' + show(s.enum) + '.');
    if ('const' in s && !eq(s.const, inst)) add('const', show(inst) + ' is not ' + show(s.const) + '.');
    if (t === 'number') {
      if ('multipleOf' in s && !multiple(inst, s.multipleOf)) add('multipleOf', inst + ' is not a multiple of ' + s.multipleOf + '.');
      if ('maximum' in s && inst > s.maximum) add('maximum', inst + ' is above the maximum ' + s.maximum + '.');
      if ('exclusiveMaximum' in s && inst >= s.exclusiveMaximum) add('exclusiveMaximum', inst + ' must be below ' + s.exclusiveMaximum + '.');
      if ('minimum' in s && inst < s.minimum) add('minimum', inst + ' is below the minimum ' + s.minimum + '.');
      if ('exclusiveMinimum' in s && inst <= s.exclusiveMinimum) add('exclusiveMinimum', inst + ' must be above ' + s.exclusiveMinimum + '.');
    }
    if (t === 'string') {
      var len = Array.from(inst).length;
      if ('maxLength' in s && len > s.maxLength) add('maxLength', 'Length ' + len + ' is over ' + s.maxLength + ' (counted in characters, not UTF-16 units).');
      if ('minLength' in s && len < s.minLength) add('minLength', 'Length ' + len + ' is under ' + s.minLength + '.');
      if ('pattern' in s) { var re = null; try { re = new RegExp(s.pattern, 'u'); } catch (e) { } if (re && !re.test(inst)) add('pattern', show(inst) + ' does not match /' + s.pattern + '/ (patterns are unanchored: they match anywhere).'); }
    }
    if (t === 'array') {
      if ('maxItems' in s && inst.length > s.maxItems) add('maxItems', inst.length + ' items, at most ' + s.maxItems + '.');
      if ('minItems' in s && inst.length < s.minItems) add('minItems', inst.length + ' items, at least ' + s.minItems + ' needed.');
      if (s.uniqueItems === true) { var dup = false; for (var i = 0; i < inst.length && !dup; i++) for (var j = i + 1; j < inst.length; j++) if (eq(inst[i], inst[j])) { dup = true; add('uniqueItems', 'Items ' + i + ' and ' + j + ' are equal (1 and 1.0 are equal; true and 1 are not).'); break; } }
      if ('items' in s) inst.forEach(function (x, i) { validate(s.items, x, path + '/' + i, errs); });
    }
    if (t === 'object') {
      var keys = Object.keys(inst);
      if ('maxProperties' in s && keys.length > s.maxProperties) add('maxProperties', keys.length + ' properties, at most ' + s.maxProperties + '.');
      if ('minProperties' in s && keys.length < s.minProperties) add('minProperties', keys.length + ' properties, at least ' + s.minProperties + ' needed.');
      if ('required' in s) s.required.forEach(function (k) { if (!Object.prototype.hasOwnProperty.call(inst, k)) add('required', 'Missing required property "' + k + '".'); });
      var props = s.properties || {}, pp = s.patternProperties || {};
      Object.keys(props).forEach(function (k) { if (Object.prototype.hasOwnProperty.call(inst, k)) validate(props[k], inst[k], path + '/' + esc(k), errs); });
      Object.keys(pp).forEach(function (p) { var re = new RegExp(p, 'u'); keys.forEach(function (k) { if (re.test(k)) validate(pp[p], inst[k], path + '/' + esc(k), errs); }); });
      if ('additionalProperties' in s) {
        var res = Object.keys(pp).map(function (p) { return new RegExp(p, 'u'); });
        var extra = keys.filter(function (k) { return !Object.prototype.hasOwnProperty.call(props, k) && !res.some(function (re) { return re.test(k); }); });
        if (s.additionalProperties === false) { if (extra.length) add('additionalProperties', 'Unexpected ' + (extra.length > 1 ? 'properties ' : 'property ') + extra.map(function (k) { return '"' + k + '"'; }).join(', ') + '.'); }
        else extra.forEach(function (k) { validate(s.additionalProperties, inst[k], path + '/' + esc(k), errs); });
      }
    }
    if ('allOf' in s) s.allOf.forEach(function (x) { validate(x, inst, path, errs); });
    if ('anyOf' in s) { ok = s.anyOf.some(function (x) { var e = []; validate(x, inst, path, e); return !e.length; }); if (!ok) add('anyOf', 'Matches none of the ' + s.anyOf.length + ' anyOf branches.'); }
    if ('oneOf' in s) { var n = s.oneOf.filter(function (x) { var e = []; validate(x, inst, path, e); return !e.length; }).length; if (n !== 1) add('oneOf', n === 0 ? 'Matches none of the ' + s.oneOf.length + ' oneOf branches.' : 'Matches ' + n + ' oneOf branches, exactly one is allowed.'); }
    if ('not' in s) { var e2 = []; validate(s.not, inst, path, e2); if (!e2.length) add('not', 'Matches the "not" schema, which must fail.'); }
    if ('if' in s) { var e3 = []; validate(s.if, inst, path, e3); if (!e3.length) { if ('then' in s) validate(s.then, inst, path, errs); } else if ('else' in s) validate(s.else, inst, path, errs); }
  }
  function check(schema, inst) { var errs = []; validate(schema, inst, '', errs); return errs; }
  var api = { check: check, eq: eq };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SchemaWhy = api;
})(typeof window !== 'undefined' ? window : this);
