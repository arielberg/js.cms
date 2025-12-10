# Configuration Guide

## appSettings.json Configuration

Edit `cms-core/config/appSettings.json` with your GitHub repository details:

```json
{
    "API_Gate": "GitHubAPI",
    "API_Params": ["your-username", "your-repo-name"],
    "GIT_Account": "your-username",
    "GIT_Repository": "your-repo-name",
    "Lanugages": ["en"],
    "LanugageLabels": {"en": "English"},
    "Admin_Lanaguage": "en",
    "Default_Language": "en",
    "Authentication_Mode": "token"
}
```

### Configuration Fields

- **API_Gate**: Always `"GitHubAPI"` (for GitHub backend)
- **API_Params**: Array with `[username, repository-name]`
  - Example: `["myusername", "my-site"]`
- **GIT_Account**: Your GitHub username
- **GIT_Repository**: Your repository name
- **Lanugages**: Array of language codes (e.g., `["en", "es", "fr"]`)
- **LanugageLabels**: Object mapping language codes to display names
- **Admin_Lanaguage**: Language for admin interface
- **Default_Language**: Default language for content
- **Authentication_Mode**: Always `"token"` (uses GitHub Personal Access Token)

## Getting a GitHub Personal Access Token

### Step 1: Create a GitHub Personal Access Token

1. **Go to GitHub Settings**
   - Visit: https://github.com/settings/tokens
   - Or: GitHub → Your Profile → Settings → Developer settings → Personal access tokens → Tokens (classic)

2. **Generate New Token**
   - Click "Generate new token" → "Generate new token (classic)"
   - Give it a descriptive name (e.g., "CMS Builder Access")

3. **Set Expiration**
   - Choose expiration (30 days, 60 days, 90 days, or no expiration)
   - For production, use a longer expiration or set up token rotation

4. **Select Scopes (Permissions)**
   The token needs these permissions:
   - ✅ **repo** (Full control of private repositories)
     - This includes: `repo:status`, `repo_deployment`, `public_repo`, `repo:invite`, `security_events`
   - ✅ **workflow** (if using GitHub Actions - optional)

5. **Generate Token**
   - Click "Generate token" at the bottom
   - ⚠️ **IMPORTANT**: Copy the token immediately! You won't be able to see it again.

### Step 2: Use the Token in CMS

1. **Open Admin Panel**
   - Navigate to `/cms-core/admin/index.html`

2. **Login Form**
   - The form will appear asking for:
     - **Name**: Your GitHub username (for reference, not used for auth)
     - **Password**: Paste your GitHub Personal Access Token here

3. **Save Credentials**
   - After successful login, credentials are stored in browser localStorage
   - You won't need to enter them again unless you clear browser data

## Repository Setup

### Create a New Repository

1. **On GitHub**
   - Create a new repository (public or private)
   - Initialize with a README (optional)
   - Note the repository name

2. **Update appSettings.json**
   ```json
   {
     "API_Params": ["your-username", "your-repo-name"],
     "GIT_Account": "your-username",
     "GIT_Repository": "your-repo-name"
   }
   ```

3. **First Login**
   - The CMS will create necessary directories on first use
   - Content will be stored in the repository

## Security Best Practices

### Token Security

1. **Never Commit Tokens**
   - ⚠️ Never commit tokens to Git
   - Tokens are stored in browser localStorage only
   - Add `.env` or similar files to `.gitignore` if storing locally

2. **Use Fine-Grained Tokens (Recommended)**
   - GitHub now supports fine-grained personal access tokens
   - More secure: limit to specific repositories
   - Go to: Settings → Developer settings → Personal access tokens → Fine-grained tokens

3. **Token Rotation**
   - Regularly rotate tokens (every 90 days recommended)
   - Revoke old tokens when creating new ones

4. **Repository Permissions**
   - For public sites, use a public repository
   - For private content, use a private repository
   - Consider using a dedicated GitHub account for CMS

### Fine-Grained Token Setup (Recommended)

1. **Create Fine-Grained Token**
   - Settings → Developer settings → Personal access tokens → Fine-grained tokens
   - Click "Generate new token"

2. **Configure**
   - **Token name**: Descriptive name
   - **Expiration**: Set appropriate expiration
   - **Repository access**: Select "Only select repositories" → Choose your repo
   - **Permissions**:
     - **Repository permissions**:
       - Contents: Read and write
       - Metadata: Read-only (automatic)

3. **Generate and Use**
   - Copy token and use in login form

## Troubleshooting

### "Authentication failed" Error

1. **Check Token**
   - Verify token is correct (no extra spaces)
   - Check if token has expired
   - Verify token has `repo` scope

2. **Check Repository**
   - Verify repository name is correct
   - Check if repository exists
   - Verify you have access to the repository

3. **Check API_Params**
   - Format: `["username", "repo-name"]`
   - No typos in username or repo name
   - Case-sensitive

### "Repository not found" Error

1. **Verify Repository**
   - Repository exists on GitHub
   - You have access (for private repos)
   - Repository name matches exactly

2. **Check Permissions**
   - Token has `repo` scope
   - Your GitHub account has access to the repository

### Token Expired

1. **Create New Token**
   - Follow steps above to create a new token

2. **Clear Old Credentials**
   - Open browser DevTools (F12)
   - Application/Storage → Local Storage
   - Delete `secret` key
   - Refresh page and login again

## Example Configuration

### Single Language Site
```json
{
    "API_Gate": "GitHubAPI",
    "API_Params": ["johndoe", "my-blog"],
    "GIT_Account": "johndoe",
    "GIT_Repository": "my-blog",
    "Lanugages": ["en"],
    "LanugageLabels": {"en": "English"},
    "Admin_Lanaguage": "en",
    "Default_Language": "en",
    "Authentication_Mode": "token"
}
```

### Multi-Language Site
```json
{
    "API_Gate": "GitHubAPI",
    "API_Params": ["johndoe", "my-site"],
    "GIT_Account": "johndoe",
    "GIT_Repository": "my-site",
    "Lanugages": ["en", "es", "fr"],
    "LanugageLabels": {
        "en": "English",
        "es": "Español",
        "fr": "Français"
    },
    "Admin_Lanaguage": "en",
    "Default_Language": "en",
    "Authentication_Mode": "token"
}
```

## Next Steps

After configuration:

1. ✅ Save `appSettings.json`
2. ✅ Create GitHub Personal Access Token
3. ✅ Open `/cms-core/admin/index.html`
4. ✅ Login with username and token
5. ✅ Start creating content!

