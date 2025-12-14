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

