import { unique } from './collections.js';

const IMAGE_NAME_HINT = /(image|mask|reference|source|control|input)/i;
const PRIORITY_FIELDS = [
  'reference_image_url',
  'reference_image',
  'input_image_url',
  'input_image',
  'source_image_url',
  'source_image',
  'image_url',
  'image',
  'image_urls'
];

function getRefName(ref) {
  if (typeof ref !== 'string') {
    return '';
  }
  const parts = ref.split('/');
  return parts[parts.length - 1] || '';
}

function resolveSchema(schema, components, seen = new Set()) {
  if (!schema || typeof schema !== 'object') {
    return null;
  }

  if (schema.$ref) {
    const refName = getRefName(schema.$ref);
    if (!refName || seen.has(refName)) {
      return null;
    }
    seen.add(refName);
    return resolveSchema(components?.schemas?.[refName], components, seen);
  }

  if (Array.isArray(schema.allOf) && schema.allOf.length > 0) {
    const merged = {
      type: 'object',
      properties: {},
      required: []
    };

    for (const entry of schema.allOf) {
      const resolved = resolveSchema(entry, components, seen);
      if (!resolved) {
        continue;
      }
      if (resolved.properties && typeof resolved.properties === 'object') {
        Object.assign(merged.properties, resolved.properties);
      }
      if (Array.isArray(resolved.required)) {
        merged.required.push(...resolved.required);
      }
      if (!merged.type && resolved.type) {
        merged.type = resolved.type;
      }
    }

    return {
      ...schema,
      ...merged,
      required: unique(merged.required)
    };
  }

  return schema;
}

function getRequestSchema(openapi) {
  if (!openapi || typeof openapi !== 'object') {
    return null;
  }

  const components = openapi.components || {};
  const paths = openapi.paths || {};

  for (const pathValue of Object.values(paths)) {
    if (!pathValue || typeof pathValue !== 'object') {
      continue;
    }

    for (const method of ['post', 'put']) {
      const operation = pathValue[method];
      if (!operation) {
        continue;
      }

      let requestBody = operation.requestBody;
      if (requestBody?.$ref) {
        const refName = getRefName(requestBody.$ref);
        requestBody = components?.requestBodies?.[refName] || requestBody;
      }

      const content = requestBody?.content;
      if (!content || typeof content !== 'object') {
        continue;
      }

      const schema =
        content['application/json']?.schema ||
        content['multipart/form-data']?.schema ||
        Object.values(content)[0]?.schema;

      const resolved = resolveSchema(schema, components);
      if (resolved) {
        return resolved;
      }
    }
  }

  return null;
}

function isImageSchema(schema) {
  if (!schema || typeof schema !== 'object') {
    return false;
  }

  const resolved = schema;
  if (resolved.type === 'array') {
    const item = resolved.items || {};
    if ((item.type === 'string' && (item.format === 'uri' || item.format === 'binary')) || item.contentEncoding === 'base64') {
      return true;
    }
    return isImageSchema(item);
  }

  if (resolved.type === 'string') {
    if (resolved.format === 'binary' || resolved.format === 'uri') {
      return true;
    }
    if (resolved.contentEncoding === 'base64') {
      return true;
    }
  }

  return false;
}

function isImageField(fieldName, schema) {
  const nameLooksLikeImage = IMAGE_NAME_HINT.test(fieldName);
  if (nameLooksLikeImage) {
    return true;
  }
  return isImageSchema(schema);
}

function pickPreferredField(fields) {
  if (!Array.isArray(fields) || fields.length === 0) {
    return null;
  }

  for (const key of PRIORITY_FIELDS) {
    const found = fields.find((field) => field.name === key);
    if (found) {
      return found;
    }
  }

  return fields[0];
}

export function inferModelImageRequirement(openapi) {
  const schema = getRequestSchema(openapi);
  if (!schema || typeof schema !== 'object') {
    return {
      status: 'unknown',
      imageSupport: 'unknown',
      fields: [],
      preferredField: null,
      unsupportedReason: 'request schema not found'
    };
  }

  const properties = schema.properties || {};
  const requiredSet = new Set(Array.isArray(schema.required) ? schema.required : []);
  const fields = [];

  for (const [name, property] of Object.entries(properties)) {
    const normalized = resolveSchema(property, openapi.components || {}) || property;
    if (!isImageField(name, normalized)) {
      continue;
    }

    fields.push({
      name,
      required: requiredSet.has(name),
      expectsArray: normalized?.type === 'array'
    });
  }

  if (fields.length === 0) {
    return {
      status: 'ready',
      imageSupport: 'none',
      fields: [],
      preferredField: null,
      unsupportedReason: ''
    };
  }

  const requiredImageFields = fields.filter((field) => field.required);
  const imageSupport = requiredImageFields.length > 0 ? 'required' : 'optional';
  const preferredField = pickPreferredField(fields);

  return {
    status: 'ready',
    imageSupport,
    fields,
    preferredField,
    unsupportedReason:
      requiredImageFields.length > 1
        ? `複数の画像入力が必須です: ${requiredImageFields.map((field) => field.name).join(', ')}`
        : ''
  };
}

export function buildReferenceImagePayload(requirement, referenceValue) {
  const value = String(referenceValue || '').trim();
  if (!value) {
    return {};
  }
  if (!requirement || (requirement.imageSupport !== 'required' && requirement.imageSupport !== 'optional')) {
    return {};
  }

  const target = requirement.preferredField;
  if (!target?.name) {
    return {};
  }

  return {
    [target.name]: target.expectsArray ? [value] : value
  };
}
