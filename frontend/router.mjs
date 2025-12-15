import * as utils from '../scripts/utils.js';
import { contentItemLoader } from '../scripts/contentItem.mjs';
import { renderMenu } from '../scripts/contentItem.mjs';
import { getFixedContentTypes } from '../core/fixedContentTypes.mjs';

/**
 * Frontend Router - Handles rendering of the public-facing site
 */

let appSettings, contentTypes, translations, gitApi;

/**
 * Initialize the frontend by loading all required configuration
 */
export async function initFrontend() {
  try {
    // Load configuration files
    await loadConfiguration();
    
    // Get current path (remove base path for GitHub Pages if needed)
    let path = window.location.pathname;
    
    // Handle GitHub Pages paths (e.g., /test2/ should become /)
    // Remove repository name from path if it's a GitHub Pages URL
    const githubPagesMatch = window.location.href.match(/github\.io\/([^/]+)/);
    if (githubPagesMatch) {
      const repoName = githubPagesMatch[1];
      if (path.startsWith(`/${repoName}/`)) {
        path = path.replace(`/${repoName}`, '');
      } else if (path === `/${repoName}`) {
        path = '/';
      }
    }
    
    // Route to appropriate handler
    await route(path);
  } catch (error) {
    console.error('Frontend initialization error:', error);
    console.error('Error stack:', error.stack);
    // Show a more helpful error message
    showError(`Failed to initialize site: ${error.message || 'Unknown error'}. Please check the browser console for details.`);
  }
}

/**
 * Load all configuration files
 */
async function loadConfiguration() {
  // Load appSettings
  appSettings = await loadJSONFile('config/appSettings.json', 'cms-core/config/appSettings.json');
  utils.setGlobalVariable('appSettings', appSettings);
  
  // Load contentTypes
  const configContentTypes = await loadJSONFile('config/contentTypes.json', 'cms-core/config/contentTypes.json');
  const loadedContentTypes = Array.isArray(configContentTypes) ? configContentTypes : [];
  
  // Merge with fixed content types (pages, blocks)
  const fixedContentTypes = getFixedContentTypes();
  const allContentTypesMap = new Map();
  
  // Fixed types first, then loaded types (loaded can override fixed if needed)
  [...fixedContentTypes, ...loadedContentTypes].forEach(ct => {
    allContentTypesMap.set(ct.name, ct);
  });
  
  contentTypes = Array.from(allContentTypesMap.values());
  utils.setGlobalVariable('contentTypes', contentTypes);
  
  // Load translations
  translations = await loadJSONFile('config/translations.json', 'cms-core/config/translations.json');
  if (!Array.isArray(translations)) translations = [];
  utils.setGlobalVariable('translations', translations);
  
  // Initialize GitHub API if token exists
  const secret = localStorage.getItem('secret');
  if (secret) {
    try {
      const secretData = JSON.parse(secret);
      if (secretData.token) {
        const GitHubAPI = await import('../scripts/api/GitHubAPI.mjs');
        gitApi = {
          getFile: GitHubAPI.getFile
        };
        utils.setGlobalVariable('gitApi', gitApi);
      }
    } catch (e) {
      console.warn('Could not initialize GitHub API:', e);
    }
  }
}

/**
 * Get base path from URL (GitHub Pages)
 */
function getBasePath() {
  const githubPagesMatch = window.location.href.match(/github\.io\/([^/]+)/);
  if (githubPagesMatch) {
    const repoName = githubPagesMatch[1];
    const currentPath = window.location.pathname;
    if (currentPath.startsWith(`/${repoName}/`)) {
      return `/${repoName}`;
    } else if (currentPath === `/${repoName}`) {
      return `/${repoName}`;
    }
  }
  return '';
}

/**
 * Resolve effective base path using settings (BasePath_Mode / BasePath_Value) with URL fallback
 */
function getEffectiveBasePath() {
  const urlBase = getBasePath();
  try {
    const settings = utils.getGlobalVariable('appSettings') || {};
    const mode = settings.BasePath_Mode || 'auto';
    if (mode === 'set' && settings.BasePath_Value) {
      return settings.BasePath_Value;
    }
    if (mode === 'relative') return '';
    return urlBase;
  } catch (e) {
    return urlBase;
  }
}

/**
 * Load JSON file with fallback
 */
async function loadJSONFile(primaryPath, fallbackPath) {
  const basePath = getEffectiveBasePath();
  const primaryFullPath = basePath ? `${basePath.replace(/\/$/,'')}/${primaryPath}` : primaryPath;
  const fallbackFullPath = basePath ? `${basePath.replace(/\/$/,'')}/${fallbackPath}` : fallbackPath;
  
  try {
    const response = await fetch(primaryFullPath);
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.log(`Failed to load ${primaryFullPath}, trying fallback`);
  }
  
  try {
    const response = await fetch(fallbackFullPath);
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.warn(`Failed to load ${fallbackFullPath}`);
  }
  
  // Return empty defaults
  if (primaryPath.includes('contentTypes')) return [];
  if (primaryPath.includes('translations')) return [];
  return {};
}

/**
 * Route based on path
 */
async function route(path) {
  // Normalize path (remove leading/trailing slashes, except root)
  const normalizedPath = path === '/' ? '/' : path.replace(/^\/+|\/+$/g, '');
  
  if (normalizedPath === '/') {
    // Homepage
    await renderHomepage();
  } else {
    // Try to match content type
    const contentMatch = matchContentType(normalizedPath);
    if (contentMatch) {
      await renderContentItem(contentMatch.type, contentMatch.id);
    } else {
      // Try custom page
      await renderCustomPage(normalizedPath);
    }
  }
}

/**
 * Match path to content type
 */
function matchContentType(path) {
  for (const contentType of contentTypes) {
    const urlPrefix = contentType.urlPrefix || '';
    if (path.startsWith(urlPrefix)) {
      const remaining = path.substring(urlPrefix.length);
      // Extract ID (everything after the prefix, before any trailing slash)
      const id = remaining.split('/')[0];
      if (id) {
        return { type: contentType.name, id: id };
      }
    }
  }
  return null;
}

/**
 * Render homepage
 */
async function renderHomepage() {
  try {
    // First, try to find a page with id "homepage" or "home"
    const pageContentType = contentTypes.find(ct => ct.name === 'page');
    if (pageContentType) {
      try {
        // Try to load homepage page
        const homepagePage = await contentItemLoader('page', 'homepage');
        if (homepagePage && homepagePage.title) {
          const defaultLang = appSettings.Default_Language || '';
          const isDefaultLanguage = defaultLang === '' || defaultLang === appSettings.Default_Language;
          
          const templateVars = await getBaseTemplateVars(
            isDefaultLanguage ? homepagePage.title : (homepagePage[defaultLang]?.title || homepagePage.title),
            `itemPage page page-homepage`,
            defaultLang
          );
          
          templateVars.content = homepagePage.render(isDefaultLanguage ? '' : defaultLang);
          
          // Load and inject blocks
          await injectBlocks(templateVars, 'homepage', 'page');
          
          await renderPage(templateVars);
          return;
        }
      } catch (e) {
        console.log('Homepage page not found, trying other options:', e);
      }
      
      // Try "home" as fallback
      try {
        const homePage = await contentItemLoader('page', 'home');
        if (homePage && homePage.title) {
          const defaultLang = appSettings.Default_Language || '';
          const isDefaultLanguage = defaultLang === '' || defaultLang === appSettings.Default_Language;
          
          const templateVars = await getBaseTemplateVars(
            isDefaultLanguage ? homePage.title : (homePage[defaultLang]?.title || homePage.title),
            `itemPage page page-home`,
            defaultLang
          );
          
          templateVars.content = homePage.render(isDefaultLanguage ? '' : defaultLang);
          
          // Load and inject blocks
          await injectBlocks(templateVars, 'homepage', 'page');
          
          await renderPage(templateVars);
          return;
        }
      } catch (e) {
        console.log('Home page not found, trying custom pages:', e);
      }
    }
    
    // Try to load custom homepage
    const customPages = await loadJSONFile('config/customPages.json', 'cms-core/config/customPages.json');
    const defaultLang = appSettings.Default_Language || '';
    const langPages = customPages[defaultLang] || customPages[''] || [];
    const homepage = langPages.find(p => p.url === 'index.html' || p.url === '/');
    
    if (homepage) {
      await renderCustomPageTemplate(homepage, defaultLang);
    } else {
      // Default homepage - show welcome message
      await renderDefaultHomepage(defaultLang);
    }
  } catch (error) {
    console.error('Error rendering homepage:', error);
    await renderDefaultHomepage(appSettings.Default_Language || '');
  }
}

/**
 * Render default homepage
 */
async function renderDefaultHomepage(language) {
  const templateVars = await getBaseTemplateVars('Homepage', 'homepage', language);
  templateVars.content = `
    <div class="homepage-welcome">
      <h2>Welcome to Your CMS Site</h2>
      <p>This is your homepage. To customize it:</p>
      <ol>
        <li>Go to the admin panel</li>
        <li>Create a page with ID "homepage" or "home"</li>
        <li>Add your content</li>
      </ol>
      <p><a href="cms-core/index.html" class="btn btn-primary">Go to Admin Panel</a></p>
    </div>
  `;
  
  // Load and inject blocks for homepage
  await injectBlocks(templateVars, 'homepage', null);
  
  await renderPage(templateVars);
}

/**
 * Render content item
 */
async function renderContentItem(contentType, itemId) {
  try {
    const contentItem = await contentItemLoader(contentType, itemId);
    const defaultLang = appSettings.Default_Language || '';
    // For now, we'll use the default language (can be extended for multi-language)
    const currentLang = defaultLang;
    const isDefaultLanguage = currentLang === '' || currentLang === defaultLang;
    
    const templateVars = await getBaseTemplateVars(
      isDefaultLanguage ? contentItem.title : (contentItem[currentLang]?.title || contentItem.title),
      `itemPage ${contentType} ${contentType}-${itemId}`,
      currentLang
    );
    
    templateVars.content = contentItem.render(isDefaultLanguage ? '' : currentLang);
    await renderPage(templateVars);
  } catch (error) {
    console.error('Error rendering content item:', error);
    showError(`Content not found: ${contentType}/${itemId}`);
  }
}

/**
 * Render custom page
 */
async function renderCustomPage(path) {
  try {
    const customPages = await loadJSONFile('config/customPages.json', 'cms-core/config/customPages.json');
    const defaultLang = appSettings.Default_Language || '';
    const langPages = customPages[defaultLang] || customPages[''] || [];
    
    // Match by URL (remove .html extension if present)
    const normalizedUrl = path.endsWith('.html') ? path.replace('.html', '') : path;
    const page = langPages.find(p => {
      const pageUrl = p.url.replace('.html', '').replace(/^\/+/, '');
      return pageUrl === normalizedUrl || pageUrl === path;
    });
    
    if (page) {
      await renderCustomPageTemplate(page, defaultLang);
    } else {
      showError('Page not found');
    }
  } catch (error) {
    console.error('Error rendering custom page:', error);
    showError('Page not found');
  }
}

/**
 * Render custom page template
 */
async function renderCustomPageTemplate(pageData, language) {
  try {
    // Load template
    const basePath = getBasePath();
    const templatePath = basePath 
      ? `${basePath}/cms-core/templates/customPages/${pageData.template}`
      : `cms-core/templates/customPages/${pageData.template}`;
    const apiTemplatePath = `cms-core/templates/customPages/${pageData.template}`;
    let template = '';
    
    try {
      const response = await fetch(templatePath);
      if (response.ok) {
        template = await response.text();
      } else if (gitApi && gitApi.getFile) {
        // Try GitHub API
        try {
          template = await gitApi.getFile(apiTemplatePath);
        } catch (apiError) {
          console.warn('GitHub API fetch failed:', apiError);
        }
      }
    } catch (e) {
      console.error('Failed to load template:', e);
      if (gitApi && gitApi.getFile) {
        try {
          template = await gitApi.getFile(apiTemplatePath);
        } catch (apiError) {
          console.warn('GitHub API fetch also failed:', apiError);
        }
      }
    }
    
    const templateVars = await getBaseTemplateVars(
      pageData.title || 'Page',
      pageData.class || 'customPage',
      language
    );
    
    // Render template content
    if (template) {
      templateVars.content = new Function("return `" + template + "`;").call(templateVars);
    } else {
      templateVars.content = '<p>Template not found</p>';
    }
    
    // Load and inject blocks
    await injectBlocks(templateVars, 'homepage', null);
    
    await renderPage(templateVars);
  } catch (error) {
    console.error('Error rendering custom page template:', error);
    showError('Failed to render page');
  }
}

/**
 * Get base template variables
 */
async function getBaseTemplateVars(pageTitle, pageClass, language) {
  // Load menu
  let menu = [];
  try {
    const menuData = await loadJSONFile('cms-core/menus/main.json', 'cms-core/menus/main.json');
    if (menuData && typeof menuData === 'object') {
      menu = menuData[language] || menuData[''] || menuData['en'] || [];
    }
    if (!Array.isArray(menu)) {
      console.warn('Menu data is not an array, converting:', menu);
      menu = [];
    }
  } catch (e) {
    console.warn('Could not load menu:', e);
    menu = [];
  }
  
  // Get base path for menu URLs
  const basePath = getEffectiveBasePath() || getBasePath();
  const menuHtml = renderMenu(menu, basePath);
  
  // Ensure menu HTML is not empty
  if (!menuHtml || menuHtml.trim() === '' || menuHtml === '<ul class=\'navbar-nav\'></ul>') {
    console.warn('Menu is empty, using default menu');
    menuHtml = '<ul class="navbar-nav"><li class="nav-item"><a class="nav-link" href="/">Home</a></li></ul>';
  }
  
  // Build strings object
  const strings = {};
  translations.forEach(item => {
    strings[item.key] = item.t[language] || item.t[''] || '';
  });
  
  const linksPrefix = (language === '' || language === appSettings.Default_Language) ? '' : (language + '/');
  
  // Get site theme from appSettings
  const siteTheme = appSettings.Theme || 'default';
  const themeColors = appSettings.ThemeColors || {};
  
  // Add theme class to pageClass
  const themeClass = `theme-${siteTheme}`;
  const finalPageClass = `${pageClass} ${themeClass}`;
  
  // Get logo and favicon paths from appSettings
  const logoPath = appSettings.Logo_Url || 'assets/images/logo.png';
  const faviconPath = appSettings.Favicon_Url || 'assets/images/favicon.ico';
  
  return {
    strings: strings,
    menu_main: menuHtml,
    direction: 'rtl',
    linksPrefix: linksPrefix,
    pageTitle: pageTitle,
    pageDescription: strings.SEODefaultDescription || '',
    pageClass: finalPageClass,
    theme: siteTheme,
    themeColors: themeColors,
    logoPath: logoPath,
    faviconPath: faviconPath,
    content: ''
  };
}

/**
 * Load and inject blocks into template variables
 */
async function injectBlocks(templateVars, pageType, contentType) {
  try {
    const blocks = await loadJSONFile('config/blocks.json', 'cms-core/config/blocks.json');
    if (!Array.isArray(blocks)) return;
    
    // Filter blocks by visibility
    const visibleBlocks = blocks.filter(block => {
      // Check visibility
      if (block.visibility === 'none') return false;
      if (block.visibility === 'homepage' && pageType !== 'homepage') return false;
      if (block.visibility === 'list' && pageType !== 'list') return false;
      if (block.visibility === 'single' && pageType !== 'single') return false;
      if (block.visibility === 'all') return true;
      
      // Check content type filter
      if (block.contentTypes && contentType) {
        const allowedTypes = block.contentTypes.split(',').map(t => t.trim());
        return allowedTypes.includes(contentType);
      }
      
      return true;
    });
    
    // Group blocks by region
    const blocksByRegion = {};
    visibleBlocks.forEach(block => {
      const region = block.region || 'content';
      if (!blocksByRegion[region]) {
        blocksByRegion[region] = [];
      }
      blocksByRegion[region].push(block);
    });
    
    // Add blocks to template vars
    templateVars.blocks = blocksByRegion;
    templateVars.blocks_header = (blocksByRegion.header || []).map(b => b.content).join('');
    templateVars.blocks_footer = (blocksByRegion.footer || []).map(b => b.content).join('');
    templateVars.blocks_sidebar = (blocksByRegion.sidebar || []).map(b => b.content).join('');
    templateVars.blocks_before_content = (blocksByRegion['before-content'] || []).map(b => b.content).join('');
    templateVars.blocks_after_content = (blocksByRegion['after-content'] || []).map(b => b.content).join('');
    
  } catch (error) {
    console.warn('Could not load blocks:', error);
    // Set empty defaults
    templateVars.blocks = {};
    templateVars.blocks_header = '';
    templateVars.blocks_footer = '';
    templateVars.blocks_sidebar = '';
    templateVars.blocks_before_content = '';
    templateVars.blocks_after_content = '';
  }
}

/**
 * Fetch and convert file to base64 data URI with multiple path fallbacks
 */
async function fetchAsDataURI(filePath, basePath = '') {
  const pathsToTry = [];
  
  // Add base path version
  if (basePath) {
    pathsToTry.push(`${basePath}/${filePath}`);
  }
  
  // Add root path version
  pathsToTry.push(`/${filePath}`);
  
  // Add relative path version
  pathsToTry.push(filePath);
  
  // Try GitHub API as fallback
  const gitApi = utils.getGlobalVariable('gitApi');
  
  for (const path of pathsToTry) {
    try {
      const response = await fetch(path);
      if (response.ok) {
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            console.log(`Successfully loaded image as data URI from: ${path}`);
            resolve(reader.result);
          };
          reader.onerror = () => {
            console.warn(`FileReader error for ${path}`);
            resolve(null);
          };
          reader.readAsDataURL(blob);
        });
      }
    } catch (error) {
      // Continue to next path
      continue;
    }
  }
  
  // Try GitHub API if available (for images, we'd need to convert base64 from API)
  if (gitApi && gitApi.getFile) {
    try {
      // Note: GitHub API returns base64 encoded content for binary files
      const content = await gitApi.getFile(filePath);
      // GitHub API returns base64 content, but we need to check the format
      // For now, skip GitHub API for images as it's more complex
      console.warn(`GitHub API image loading not fully implemented for ${filePath}`);
    } catch (apiError) {
      console.warn(`GitHub API fetch failed for image ${filePath}:`, apiError);
    }
  }
  
  console.warn(`Failed to fetch image ${filePath} from all attempted paths`);
  return null;
}

/**
 * Fetch CSS file content with multiple path fallbacks
 */
async function fetchCSS(filePath, basePath = '') {
  const pathsToTry = [];
  
  // Add base path version
  if (basePath) {
    pathsToTry.push(`${basePath}/${filePath}`);
  }
  
  // Add root path version
  pathsToTry.push(`/${filePath}`);
  
  // Add relative path version
  pathsToTry.push(filePath);
  
  // Try GitHub API as fallback
  const gitApi = utils.getGlobalVariable('gitApi');
  
  for (const path of pathsToTry) {
    try {
      const response = await fetch(path);
      if (response.ok) {
        const content = await response.text();
        console.log(`Successfully loaded CSS from: ${path}`);
        return content;
      }
    } catch (error) {
      // Continue to next path
      continue;
    }
  }
  
  // Try GitHub API if available
  if (gitApi && gitApi.getFile) {
    try {
      const content = await gitApi.getFile(filePath);
      console.log(`Successfully loaded CSS from GitHub API: ${filePath}`);
      return content;
    } catch (apiError) {
      console.warn(`GitHub API fetch failed for CSS ${filePath}:`, apiError);
    }
  }
  
  console.warn(`Failed to fetch CSS ${filePath} from all attempted paths`);
  return null;
}

/**
 * Fetch JS file content with multiple path fallbacks
 */
async function fetchJS(filePath, basePath = '') {
  const pathsToTry = [];
  
  // Add base path version
  if (basePath) {
    pathsToTry.push(`${basePath}/${filePath}`);
  }
  
  // Add root path version
  pathsToTry.push(`/${filePath}`);
  
  // Add relative path version
  pathsToTry.push(filePath);
  
  // Try GitHub API as fallback
  const gitApi = utils.getGlobalVariable('gitApi');
  
  for (const path of pathsToTry) {
    try {
      const response = await fetch(path);
      if (response.ok) {
        const content = await response.text();
        console.log(`Successfully loaded JS from: ${path}`);
        return content;
      }
    } catch (error) {
      // Continue to next path
      continue;
    }
  }
  
  // Try GitHub API if available
  if (gitApi && gitApi.getFile) {
    try {
      const content = await gitApi.getFile(filePath);
      console.log(`Successfully loaded JS from GitHub API: ${filePath}`);
      return content;
    } catch (apiError) {
      console.warn(`GitHub API fetch failed for JS ${filePath}:`, apiError);
    }
  }
  
  console.warn(`Failed to fetch JS ${filePath} from all attempted paths`);
  return null;
}

/**
 * Render page using base template
 */
async function renderPage(templateVars) {
  // Load base template
  const basePath = getBasePath();
  const effectiveBasePath = getEffectiveBasePath() || basePath;
  const templatePath = basePath ? `${basePath}/cms-core/templates/base.html` : 'cms-core/templates/base.html';
  
  let baseTemplate = '';
  try {
    const response = await fetch(templatePath);
    if (response.ok) {
      baseTemplate = await response.text();
    } else if (gitApi && gitApi.getFile) {
      try {
        baseTemplate = await gitApi.getFile('cms-core/templates/base.html');
      } catch (apiError) {
        console.error('GitHub API fetch failed:', apiError);
      }
    }
  } catch (e) {
    console.error('Failed to load base template:', e);
    if (gitApi && gitApi.getFile) {
      try {
        baseTemplate = await gitApi.getFile('cms-core/templates/base.html');
      } catch (apiError) {
        console.error('GitHub API fetch also failed:', apiError);
        showError('Failed to load page template');
        return;
      }
    } else {
      showError('Failed to load page template');
      return;
    }
  }
  
  if (!baseTemplate) {
    showError('Failed to load page template');
    return;
  }
  
  // Inject CSS variables for theme colors if they exist
  let themeStyles = '';
  if (templateVars.themeColors && Object.keys(templateVars.themeColors).length > 0) {
    const colors = templateVars.themeColors;
    themeStyles = `
      <style>
        :root {
          ${colors.primary ? `--theme-primary: ${colors.primary};` : ''}
          ${colors.secondary ? `--theme-secondary: ${colors.secondary};` : ''}
          ${colors.background ? `--theme-background: ${colors.background};` : ''}
          ${colors.text ? `--theme-text: ${colors.text};` : ''}
          ${colors.accent ? `--theme-accent: ${colors.accent};` : ''}
        }
        body[data-theme="${templateVars.theme}"] {
          ${colors.primary ? `--primary-color: ${colors.primary};` : ''}
          ${colors.secondary ? `--secondary-color: ${colors.secondary};` : ''}
          ${colors.background ? `background-color: ${colors.background};` : ''}
          ${colors.text ? `color: ${colors.text};` : ''}
        }
        body[data-theme="${templateVars.theme}"] .btn-primary {
          ${colors.primary ? `background-color: ${colors.primary}; border-color: ${colors.primary};` : ''}
        }
        body[data-theme="${templateVars.theme}"] .btn-primary:hover {
          ${colors.primary ? `background-color: ${colors.primary}; opacity: 0.9;` : ''}
        }
        body[data-theme="${templateVars.theme}"] a {
          ${colors.primary ? `color: ${colors.primary};` : ''}
        }
        body[data-theme="${templateVars.theme}"] .navbar {
          ${colors.primary ? `background-color: ${colors.primary};` : ''}
        }
      </style>
    `;
  }
  
  // Inject theme styles into template
  if (themeStyles) {
    baseTemplate = baseTemplate.replace('</head>', themeStyles + '</head>');
  }
  
  // Get settings for asset loading
  const cssMode = appSettings?.CSS_Mode || 'embed';
  const jsMode = appSettings?.JS_Mode || 'embed';
  const basePathMode = appSettings?.BasePath_Mode || 'auto';
  
  // Determine effective base path
  let assetBasePath = effectiveBasePath || '';
  if (assetBasePath && assetBasePath.endsWith('/')) {
    assetBasePath = assetBasePath.slice(0, -1);
  }
  console.log('Loading assets, mode:', { cssMode, jsMode, basePathMode }, 'basePath:', assetBasePath);
  
  // Handle CSS based on settings
  let inlineStyles = '';
  if (cssMode === 'embed') {
    // Fetch and inline CSS files
    const cssFiles = [
      'assets/css/style.css',
      'assets/css/bootstrap.min.css'
    ];
    
    for (const cssFile of cssFiles) {
      try {
        const cssContent = await fetchCSS(cssFile, assetBasePath);
        if (cssContent) {
          inlineStyles += `<style>${cssContent}</style>\n`;
          console.log(`✓ Inlined CSS: ${cssFile}`);
        } else {
          console.error(`✗ Failed to load CSS: ${cssFile}`);
        }
      } catch (error) {
        console.error(`✗ Error loading CSS ${cssFile}:`, error);
      }
    }
  } else {
    // Link mode - update CSS paths
    if (assetBasePath) {
      baseTemplate = baseTemplate.replace(
        /<link[^>]*href=["'](assets\/css\/[^"']+)["']/gi,
        `<link rel="stylesheet" type="text/css" href="${assetBasePath}/$1"`
      );
    }
  }
  
  // Handle JS based on settings
  let inlineScripts = '';
  if (jsMode === 'embed') {
    // Fetch and inline JS files
    const jsFiles = [
      'assets/scripts/main.js'
    ];
    
    for (const jsFile of jsFiles) {
      try {
        const jsContent = await fetchJS(jsFile, assetBasePath);
        if (jsContent) {
          inlineScripts += `<script type="text/javascript">${jsContent}</script>\n`;
          console.log(`✓ Inlined JS: ${jsFile}`);
        } else {
          console.error(`✗ Failed to load JS: ${jsFile}`);
        }
      } catch (error) {
        console.error(`✗ Error loading JS ${jsFile}:`, error);
      }
    }
  } else {
    // Link mode - update JS paths
    if (assetBasePath) {
      baseTemplate = baseTemplate.replace(
        /<script[^>]*src=["'](assets\/scripts\/[^"']+)["']/gi,
        `<script type="text/javascript" src="${assetBasePath}/$1"`
      );
    }
  }
  
  // Replace favicon - use path from templateVars (which comes from appSettings)
  try {
    const faviconPath = templateVars.faviconPath || 'assets/images/favicon.ico';
    const faviconDataURI = await fetchAsDataURI(faviconPath, assetBasePath);
    if (faviconDataURI) {
      baseTemplate = baseTemplate.replace(/<link[^>]*href=["']?[^"']*favicon[^"']*["']?[^>]*>/gi, 
        `<link rel="icon" href="${faviconDataURI}" sizes="16x16">`);
      console.log('Inlined favicon from:', faviconPath);
    } else if (assetBasePath) {
      const fullFaviconPath = assetBasePath.endsWith('/') ? `${assetBasePath}${faviconPath}` : `${assetBasePath}/${faviconPath}`;
      baseTemplate = baseTemplate.replace(/href=["']?[^"']*favicon[^"']*["']?/gi, `href="${fullFaviconPath}"`);
    } else {
      // Use the path from templateVars directly
      baseTemplate = baseTemplate.replace(/href=["']?[^"']*favicon[^"']*["']?/gi, `href="${faviconPath}"`);
    }
  } catch (error) {
    console.warn('Error loading favicon:', error);
  }
  
  // Replace logo image - use path from templateVars (which comes from appSettings)
  try {
    const logoPath = templateVars.logoPath || 'assets/images/logo.png';
    const logoDataURI = await fetchAsDataURI(logoPath, assetBasePath);
    if (logoDataURI) {
      baseTemplate = baseTemplate.replace(/src=["']?[^"']*logo[^"']*["']?/gi, `src="${logoDataURI}"`);
      console.log('Inlined logo from:', logoPath);
    } else if (assetBasePath) {
      const fullLogoPath = assetBasePath.endsWith('/') ? `${assetBasePath}${logoPath}` : `${assetBasePath}/${logoPath}`;
      baseTemplate = baseTemplate.replace(/src=["']?[^"']*logo[^"']*["']?/gi, `src="${fullLogoPath}"`);
    } else {
      // Use the path from templateVars directly
      baseTemplate = baseTemplate.replace(/src=["']?[^"']*logo[^"']*["']?/gi, `src="${logoPath}"`);
    }
  } catch (error) {
    console.warn('Error loading logo:', error);
  }
  
  // Inject inline styles before </head> (only if embed mode)
  if (cssMode === 'embed' && inlineStyles) {
    // Remove CSS link tags only if we successfully inlined styles
    baseTemplate = baseTemplate.replace(/<link[^>]*href=["']?assets\/css\/[^"']+["']?[^>]*>/gi, '');
    baseTemplate = baseTemplate.replace('</head>', inlineStyles + '</head>');
    console.log('✓ Injected inline styles into <head>');
  } else if (cssMode === 'embed' && !inlineStyles) {
    console.warn('⚠ No inline styles to inject - CSS files may not have loaded');
    console.warn('⚠ Keeping original CSS link tags as fallback');
  }
  
  // Render template
  const html = new Function("return `" + baseTemplate + "`;").call(templateVars);
  
  // Inject inline scripts before </body> (only if embed mode)
  let finalHtml = html;
  if (jsMode === 'embed' && inlineScripts) {
    // Remove JS script tags only if we successfully inlined scripts
    finalHtml = html.replace(/<script[^>]*src=["']?assets\/scripts\/[^"']+["']?[^>]*><\/script>/gi, '');
    finalHtml = finalHtml.replace('</body>', inlineScripts + '</body>');
    console.log('✓ Injected inline scripts before </body>');
  } else if (jsMode === 'embed' && !inlineScripts) {
    console.warn('⚠ No inline scripts to inject - JS files may not have loaded');
    console.warn('⚠ Keeping original JS script tags as fallback');
  }
  
  // Replace document content
  document.open();
  document.write(finalHtml);
  document.close();
  
  console.log('✓ Page rendered with inlined assets');
  
  // Debug: Check if styles are actually in the document
  const styleTags = document.querySelectorAll('style');
  const scriptTags = document.querySelectorAll('script[type="text/javascript"]');
  console.log(`Debug: Found ${styleTags.length} <style> tags and ${scriptTags.length} inline script tags in document`);
  
  // Execute any inline scripts that were added
  // (scripts in the template will execute automatically when written to document)
}

/**
 * Show error page
 */
function showError(message) {
  document.body.innerHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Error</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          background: #f5f5f5;
        }
        .error-container {
          text-align: center;
          padding: 40px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #d32f2f; }
      </style>
    </head>
    <body>
      <div class="error-container">
        <h1>Error</h1>
        <p>${message}</p>
        <a href="/">Go to Homepage</a>
      </div>
    </body>
    </html>
  `;
}

