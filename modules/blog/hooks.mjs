/**
 * Blog Module Hooks
 * Example hooks that extend CMS functionality
 */

export const hooks = {
  /**
   * Before rendering a post, add calculated fields
   */
  beforeRender: async (contentItem, context) => {
    if (contentItem.type === 'post' && contentItem.body) {
      // Calculate reading time (example)
      const wordsPerMinute = 200;
      const wordCount = contentItem.body.replace(/<[^>]*>/g, '').split(/\s+/).length;
      contentItem.readingTime = Math.ceil(wordCount / wordsPerMinute);
    }
    return contentItem;
  },
  
  /**
   * After saving a post, you could send notifications, etc.
   */
  afterSave: async (contentItem) => {
    if (contentItem.type === 'post') {
      console.log(`Post "${contentItem.title}" was saved`);
      // Could add: send notification, update search index, etc.
    }
    return contentItem;
  }
};

