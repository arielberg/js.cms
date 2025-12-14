/**
 * Fixed Content Types
 * These content types are always available and cannot be deleted
 */

/**
 * Get fixed content types that are always available
 */
export function getFixedContentTypes() {
  return [
    {
      name: 'page',
      label: 'Page',
      labelPlural: 'Pages',
      urlPrefix: '',
      fixed: true, // Mark as fixed so it can't be deleted
      fields: [
        {
          name: 'title',
          label: 'Title',
          type: 'textfield',
          i18n: true,
          required: true
        },
        {
          name: 'body',
          label: 'Body',
          type: 'wysiwyg',
          i18n: true
        },
        {
          name: 'image',
          label: 'Featured Image',
          type: 'image',
          i18n: false
        }
      ]
    },
    {
      name: 'block',
      label: 'Block',
      labelPlural: 'Blocks',
      urlPrefix: 'blocks/',
      fixed: true, // Mark as fixed so it can't be deleted
      fields: [
        {
          name: 'title',
          label: 'Title',
          type: 'textfield',
          i18n: true,
          required: true
        },
        {
          name: 'body',
          label: 'Content',
          type: 'wysiwyg',
          i18n: true
        },
        {
          name: 'visibility',
          label: 'Visibility',
          type: 'select',
          i18n: false,
          values: {
            'all': 'All Pages',
            'list': 'List Pages Only',
            'single': 'Single Item Pages Only',
            'homepage': 'Homepage Only',
            'none': 'Hidden'
          },
          defaultValue: 'all'
        },
        {
          name: 'contentTypes',
          label: 'Show on Content Types',
          type: 'textfield',
          i18n: false,
          placeholder: 'Comma-separated: post,page (leave empty for all)'
        },
        {
          name: 'regions',
          label: 'Display Regions',
          type: 'textfield',
          i18n: false,
          placeholder: 'header,footer,sidebar (comma-separated)',
          defaultValue: 'content'
        }
      ]
    }
  ];
}

/**
 * Check if a content type is fixed (cannot be deleted)
 */
export function isFixedContentType(contentTypeName) {
  const fixedTypes = getFixedContentTypes();
  return fixedTypes.some(ct => ct.name === contentTypeName);
}

