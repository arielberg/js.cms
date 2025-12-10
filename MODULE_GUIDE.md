# Module Development Guide

## Module Structure

A module is a self-contained directory in `cms-core/modules/` with the following structure:

```
my-module/
├── module.json          # Required: Module metadata
├── contentTypes.json    # Optional: Content type definitions
├── hooks.mjs            # Optional: Hook handlers
└── templates/           # Optional: Custom templates
    └── my-template.html
```

## module.json

Required file that defines the module:

```json
{
  "name": "my-module",
  "version": "1.0.0",
  "description": "Module description",
  "author": "Your Name",
  "dependencies": ["other-module"],
  "provides": {
    "contentTypes": ["my-content"],
    "templates": ["my-template.html"],
    "hooks": ["beforeRender", "afterSave"]
  }
}
```

### Fields:
- `name` (required): Unique module identifier
- `version` (required): Semantic version (e.g., "1.0.0")
- `description`: Human-readable description
- `author`: Module author
- `dependencies`: Array of module names this depends on
- `provides`: What this module provides (for documentation)

## contentTypes.json

Defines content types this module provides:

```json
[
  {
    "name": "my-content",
    "label": "My Content",
    "labelPlural": "My Contents",
    "labelDefinedPlural": "The My Contents",
    "urlPrefix": "my-content/",
    "fields": [
      {
        "name": "title",
        "label": "Title",
        "type": "textfield",
        "i18n": true,
        "placeholder": "Enter title"
      },
      {
        "name": "body",
        "label": "Content",
        "type": "wysiwyg",
        "i18n": true
      },
      {
        "name": "category",
        "label": "Category",
        "type": "select",
        "values": {
          "tech": "Technology",
          "news": "News",
          "other": "Other"
        },
        "default": "other",
        "i18n": false
      }
    ]
  }
]
```

### Field Types:

- **textfield**: Single-line text input
- **wysiwyg**: Rich text editor (WYSIWYG)
- **date**: Date picker
- **image**: Image upload (stores path, uploads file)
- **file**: File upload (stores path, uploads file)
- **url**: URL input with validation
- **select**: Dropdown (requires `values` object)

### Field Properties:

- `name` (required): Field identifier
- `label` (required): Display label
- `type` (required): Field type
- `i18n`: Boolean, if field supports internationalization (default: true)
- `placeholder`: Placeholder text
- `default`: Default value
- `values`: For select type, object of value:label pairs

## hooks.mjs

Export hook handlers to extend CMS functionality:

```javascript
export const hooks = {
  /**
   * Called before rendering a content item
   * @param {Object} contentItem - The content item being rendered
   * @param {string} context - Content type name
   * @returns {Object} Modified content item
   */
  beforeRender: async (contentItem, context) => {
    // Add computed fields, modify data, etc.
    if (contentItem.type === 'my-content') {
      contentItem.processedAt = new Date().toISOString();
    }
    return contentItem;
  },
  
  /**
   * Called after saving a content item
   * @param {Object} contentItem - The saved content item
   * @returns {Object} Content item (can be modified)
   */
  afterSave: async (contentItem) => {
    // Send notifications, update indexes, etc.
    if (contentItem.type === 'my-content') {
      console.log('Saved:', contentItem.title);
    }
    return contentItem;
  },
  
  /**
   * Custom field renderer
   * @param {Object} field - Field definition
   * @param {*} value - Field value
   * @param {string} contentType - Content type name
   * @returns {string} HTML string
   */
  renderField: (field, value, contentType) => {
    if (field.type === 'custom-type' && contentType === 'my-content') {
      return `<div class="custom-field">${value}</div>`;
    }
    return null; // Return null to use default renderer
  }
};
```

### Available Hooks:

- `beforeRender(contentItem, context)`: Modify content before rendering
- `afterSave(contentItem)`: Execute after saving
- `renderField(field, value, contentType)`: Custom field rendering
- `beforeSave(contentItem)`: Modify before saving (future)
- `validate(contentItem)`: Custom validation (future)

## Templates

Modules can provide custom templates. Templates use JavaScript template literals:

```html
<!-- templates/my-content.html -->
<article class="my-content">
  <h1>${pageTitle}</h1>
  <div class="meta">
    <span class="date">${date}</span>
    <span class="category">${category}</span>
  </div>
  <div class="content">${body}</div>
</article>
```

Template variables:
- `pageTitle`: Content title
- `pageDescription`: SEO description
- `content`: Rendered content fields
- `strings`: Translation strings
- `menu_main`: Main menu HTML
- All field values by name

## Module Lifecycle

1. **Loading**: Module is discovered and `module.json` is loaded
2. **Initialization**: Content types and hooks are registered
3. **Active**: Module is available for use
4. **Hooks**: Hooks are called at appropriate times
5. **Rendering**: Templates are used when rendering content

## Best Practices

1. **Keep modules focused**: One module = one feature/domain
2. **Use semantic versioning**: Follow semver for module versions
3. **Document dependencies**: List required modules in `dependencies`
4. **Handle errors gracefully**: Don't break CMS if module fails
5. **Use hooks wisely**: Don't overload hooks with heavy operations
6. **Test modules**: Test modules independently before integrating

## Example: Complete Module

See `modules/blog/` for a complete example module with:
- Content type definition
- Hook handlers
- Custom functionality

## Upgrading Modules

Modules can be upgraded by:
1. Updating files in the module directory
2. Updating version in `module.json`
3. The CMS will automatically use the new version

No core code changes needed!

