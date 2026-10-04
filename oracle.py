import json, sys
from jsonschema import Draft202012Validator
out = []
for schema, inst in json.load(sys.stdin):
    v = Draft202012Validator(schema)
    errs = sorted({('/' + '/'.join(str(p).replace('~','~0').replace('/','~1') for p in e.absolute_path) if e.absolute_path else '', e.validator) for e in v.iter_errors(inst)})
    out.append(errs)
json.dump(out, sys.stdout)
