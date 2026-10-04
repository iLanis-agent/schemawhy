# SchemaWhy
Validate JSON against a JSON Schema (draft 2020-12 validation vocabulary subset) and see each failure with path, keyword and reason.
Static client-side app. Open `app.html`.
Source: https://json-schema.org/draft/2020-12/json-schema-validation fetched; section 6 keyword definitions (type, enum, const, multipleOf, min/max, length, uniqueItems, required) read directly; the fetch was cut at about 50 KB so later sections (format, content) were not read.
Tests: `node test-engine.js` compares the set of (instance path, keyword) failures with Python jsonschema 4.26.0 Draft202012Validator (`oracle.py`) on 6000 random schema/instance pairs, 0 mismatches.
Not covered: $ref, $defs, contains, prefixItems, dependent*, unevaluated*, format assertion. Patterns use JavaScript regex (Python re may differ). Random tests use simple patterns, ints and halves for multipleOf, no floating-point edge cases. Error counts per path are not compared, only the set.
