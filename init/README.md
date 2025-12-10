# Setup Wizard

The setup wizard provides an easy way to configure your CMS Builder installation.

## Usage

1. Open `/cms-core/init/index.html` in your web browser
2. Follow the step-by-step wizard:
   - **Step 1**: Enter your GitHub repository details
   - **Step 2**: Enter your GitHub Personal Access Token
   - **Step 3**: Test the connection
   - **Step 4**: Configuration complete!

## Features

- ✅ Step-by-step guided setup
- ✅ Validates repository access
- ✅ Tests GitHub token permissions
- ✅ Automatically saves configuration to GitHub
- ✅ Stores token securely in browser localStorage
- ✅ Fallback to manual configuration if needed

## Requirements

- A GitHub repository (public or private)
- A GitHub Personal Access Token with `repo` scope
- Modern web browser with JavaScript enabled

## CORS Note

If you're opening the HTML file directly (file:// protocol), you may encounter CORS errors when testing the GitHub API. To avoid this:

1. **Use a local web server**:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Node.js (http-server)
   npx http-server
   
   # Then open: http://localhost:8000/cms-core/init/
   ```

2. **Or use GitHub Pages** if your repository is already set up

## Troubleshooting

### "CORS policy" error
- Use a local web server instead of opening the file directly
- Or deploy to GitHub Pages

### "Repository not found"
- Check that the repository name is correct
- Verify you have access to the repository
- For private repos, ensure your token has access

### "Invalid token"
- Verify the token is correct (no extra spaces)
- Check if the token has expired
- Ensure the token has the `repo` scope enabled

### "Could not save automatically"
- The wizard will show manual instructions
- Copy the configuration JSON
- Save it manually to `cms-core/config/appSettings.json` in your repository

