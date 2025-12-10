# CMS Builder - Modular Static Site CMS

A clean, modular CMS framework for building static websites with GitHub as a backend.

## Structure

```
cms-core/
├── admin/              # Admin panel interface
├── core/               # Core CMS engine
│   ├── moduleLoader.mjs    # Module loading system
│   └── hooks/              # Hook system for extensions
├── modules/            # Pluggable modules
│   └── blog/              # Example blog module
├── config/             # Configuration files
└── README.md           # This file
```

## Module System

### Creating a Module

1. Create a directory in `cms-core/modules/` (e.g., `my-module/`)

2. Create `module.json`:
```json
{
  "name": "my-module",
  "version": "1.0.0",
  "description": "My custom module",
  "dependencies": [],
  "provides": {
    "contentTypes": ["my-content-type"],
    "hooks": ["beforeRender", "afterSave"]
  }
}
```

3. Add `contentTypes.json` (optional):
```json
[
  {
    "name": "my-content-type",
    "label": "My Content",
    "labelPlural": "My Contents",
    "urlPrefix": "my-content/",
    "fields": [
      {"name": "title", "type": "textfield", "label": "Title"},
      {"name": "body", "type": "wysiwyg", "label": "Content"}
    ]
  }
]
```

4. Add `hooks.mjs` (optional):
```javascript
export const hooks = {
  beforeRender: async (contentItem, context) => {
    // Modify contentItem before rendering
    return contentItem;
  },
  afterSave: async (contentItem) => {
    // Do something after saving
    return contentItem;
  }
};
```

5. Enable in `config/modules.json`:
```json
{
  "active": ["my-module"]
}
```

### Available Hooks

- `beforeRender(contentItem, context)` - Called before rendering a content item
- `afterSave(contentItem)` - Called after saving a content item
- `renderField(field, value, contentType)` - Custom field rendering

### Field Types

- `textfield` - Single line text input
- `wysiwyg` - Rich text editor
- `date` - Date picker
- `image` - Image upload
- `file` - File upload
- `url` - URL input
- `select` - Dropdown select

## Configuration

### appSettings.json
Main CMS configuration:
- `GIT_Account` - GitHub username
- `GIT_Repository` - Repository name
- `Lanugages` - Supported languages
- `Default_Language` - Default language code

### modules.json
Module registry - lists active and disabled modules.

### contentTypes.json
Legacy content types (modules are preferred).

## Quick Start

### Option 1: Setup Wizard (Recommended)

1. **Run Setup Wizard**
   - Open `/cms-core/init/index.html` in your browser
   - Follow the step-by-step wizard to configure your CMS
   - The wizard will test your GitHub token and save configuration

2. **Access Admin Panel**
   - After setup, go to `/cms-core/admin/index.html`
   - Start creating content!

### Option 2: Manual Configuration

1. **Configure** `config/appSettings.json` with your GitHub repository
   - See `CONFIGURATION.md` for detailed setup instructions
   - You'll need a GitHub Personal Access Token with `repo` scope
2. **Enable modules** in `config/modules.json`
3. **Access admin panel** at `/cms-core/admin/index.html`
4. **Login** with your GitHub username and Personal Access Token
5. **Create content** using the admin interface
6. Content is stored in GitHub and rendered as static HTML

For detailed configuration steps, see `CONFIGURATION.md`.

## Development

Modules are loaded automatically from `cms-core/modules/`. Each module is self-contained and can be upgraded independently.

## Example: Blog Module

See `modules/blog/` for a complete example module that provides:
- Blog post content type
- Reading time calculation hook
- Post save notifications

