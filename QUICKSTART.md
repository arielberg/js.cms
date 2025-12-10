# Quick Start Guide

## Setup

### 🚀 Easy Setup (Recommended)

1. **Open Root URL**
   - Simply navigate to your site's root URL (e.g., `https://yoursite.com/` or `http://localhost:8000/`)
   - The system will automatically detect if configuration is needed
   - You'll be redirected to the setup wizard if not configured

2. **Or Run Setup Wizard Directly**
   - Open `/cms-core/init/index.html` in your browser
   - The wizard will guide you through:
     - Repository configuration
     - GitHub token setup
     - Connection testing
     - Automatic configuration save

3. **That's it!** After the wizard completes, you can access the admin panel.

### 📝 Manual Setup

1. **Configure GitHub Repository**
   Edit `config/appSettings.json`:
   ```json
   {
     "API_Params": ["your-username", "your-repo-name"],
     "GIT_Account": "your-username",
     "GIT_Repository": "your-repo-name"
   }
   ```
   
   See `CONFIGURATION.md` for detailed setup instructions.

2. **Enable Modules**
   Edit `config/modules.json`:
   ```json
   {
     "active": ["blog"]
   }
   ```

3. **Get GitHub Personal Access Token**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Name it (e.g., "CMS Builder")
   - Select **repo** scope (full control)
   - Generate and **copy the token** (you won't see it again!)

4. **Access Admin Panel**
   - Open `/cms-core/admin/index.html` in your browser

5. **Login**
   - Enter your GitHub username in "Name" field
   - Paste your Personal Access Token in "Password" field
   - Click Login

5. **Create Content**
   - Navigate to "Blog Posts" in the sidebar
   - Click "Add New"
   - Fill in the form and save

## Creating Your First Module

1. **Create Module Directory**
   ```bash
   mkdir -p modules/my-module
   ```

2. **Create module.json**
   ```json
   {
     "name": "my-module",
     "version": "1.0.0",
     "description": "My first module",
     "provides": {
       "contentTypes": ["my-content"]
     }
   }
   ```

3. **Create contentTypes.json**
   ```json
   [
     {
       "name": "my-content",
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

4. **Enable Module**
   Add `"my-module"` to `active` array in `config/modules.json`

5. **Refresh Admin Panel**
   Your new content type will appear in the sidebar!

## Module Hooks

Add `hooks.mjs` to your module:

```javascript
export const hooks = {
  beforeRender: async (contentItem, context) => {
    // Modify content before rendering
    if (contentItem.type === 'my-content') {
      contentItem.customField = 'processed';
    }
    return contentItem;
  },
  
  afterSave: async (contentItem) => {
    // Do something after saving
    console.log('Saved:', contentItem.title);
    return contentItem;
  }
};
```

## Field Types

- `textfield` - Single line text
- `wysiwyg` - Rich text editor
- `date` - Date picker
- `image` - Image upload
- `file` - File upload
- `url` - URL input
- `select` - Dropdown (requires `values` object)

## Tips

- Content is stored as JSON in GitHub
- HTML pages are generated automatically
- Modules can be upgraded independently
- Use hooks to extend functionality without modifying core

