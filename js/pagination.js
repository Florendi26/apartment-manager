/**
 * Production-ready Infinite Scroll Pagination System
 * Features:
 * - IntersectionObserver for automatic loading
 * - Request deduplication
 * - Skeleton loading states
 * - Load more fallback button
 * - Error handling and retry logic
 */

class InfiniteScrollPagination {
  constructor(config) {
    // Configuration
    this.config = {
      itemsPerPage: config.itemsPerPage || 15,
      threshold: config.threshold || 0.1, // IntersectionObserver threshold
      rootMargin: config.rootMargin || '100px', // Load when 100px before viewport
      debounceDelay: config.debounceDelay || 300,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      ...config
    };

    // State
    this.state = {
      currentPage: 0,
      allItems: [],
      isLoading: false,
      hasMore: true,
      error: null,
      loadingRequestId: null, // For request deduplication
      observer: null,
      skeletonElements: []
    };

    // DOM elements
    this.elements = {
      container: config.container,
      sentinel: config.sentinel || this.createSentinel(),
      loadMoreButton: config.loadMoreButton || this.createLoadMoreButton(),
      skeletonTemplate: config.skeletonTemplate || this.createDefaultSkeleton()
    };

    // Callbacks
    this.callbacks = {
      loadPage: config.loadPage, // Must return Promise<{items: [], hasMore: boolean}>
      renderItem: config.renderItem, // (item, index) => HTML string
      onError: config.onError || (() => {}),
      onLoadComplete: config.onLoadComplete || (() => {})
    };

    // Bind methods
    this.loadNextPage = this.loadNextPage.bind(this);
    this.handleLoadMoreClick = this.handleLoadMoreClick.bind(this);
    this.reset = this.reset.bind(this);
    this.destroy = this.destroy.bind(this);

    // Initialize
    this.init();
  }

  init() {
    if (!this.elements.container) {
      console.error('InfiniteScrollPagination: container element is required');
      return;
    }

    if (!this.callbacks.loadPage || !this.callbacks.renderItem) {
      console.error('InfiniteScrollPagination: loadPage and renderItem callbacks are required');
      return;
    }

    // Append sentinel and load more button to container
    if (this.elements.sentinel.parentNode !== this.elements.container) {
      this.elements.container.appendChild(this.elements.sentinel);
    }

    // Setup IntersectionObserver
    this.setupIntersectionObserver();

    // Setup load more button
    this.elements.loadMoreButton.addEventListener('click', this.handleLoadMoreClick);

    // Load initial page immediately (no delay needed - data should be ready)
    if (this.state && this.elements.container) {
      this.loadNextPage();
    }
  }

  createSentinel() {
    const sentinel = document.createElement('div');
    sentinel.className = 'pagination-sentinel';
    sentinel.setAttribute('data-pagination-sentinel', 'true');
    sentinel.style.cssText = 'height: 1px; width: 100%; visibility: hidden; pointer-events: none;';
    return sentinel;
  }

  createLoadMoreButton() {
    const button = document.createElement('button');
    button.className = 'pagination-load-more button-primary';
    button.type = 'button';
    button.textContent = this.config.loadMoreText || 'Load More';
    button.style.cssText = 'width: 100%; margin-top: 1rem; display: none;';
    button.setAttribute('data-pagination-load-more', 'true');
    return button;
  }

  createDefaultSkeleton() {
    return () => {
      const skeleton = document.createElement('tr');
      skeleton.className = 'pagination-skeleton';
      skeleton.innerHTML = '<td colspan="100%" style="padding: 1rem; text-align: center; color: #9ca3af;">Loading...</td>';
      return skeleton;
    };
  }

  setupIntersectionObserver() {
    if (!window.IntersectionObserver) {
      console.warn('IntersectionObserver not supported, falling back to load more button');
      this.showLoadMoreButton();
      return;
    }

    if (!this.state || !this.elements.sentinel) {
      return;
    }

    this.state.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && this.state && this.state.hasMore && !this.state.isLoading) {
            this.loadNextPage();
          }
        });
      },
      {
        root: null,
        rootMargin: this.config.rootMargin,
        threshold: this.config.threshold
      }
    );

    this.state.observer.observe(this.elements.sentinel);
  }

  async loadNextPage() {
    // Check if instance is still valid
    if (!this.state) {
      return;
    }

    // Request deduplication
    if (this.state.isLoading) {
      return;
    }

    const requestId = Date.now();
    this.state.loadingRequestId = requestId;
    this.state.isLoading = true;
    this.state.error = null;

    // Hide load more button during loading
    this.hideLoadMoreButton();

    // Show skeleton loading
    this.showSkeleton();

    try {
      // Call loadPage callback
      const result = await this.callbacks.loadPage(this.state.currentPage + 1, this.config.itemsPerPage);

      // Check if instance is still valid and request is still current
      if (!this.state || this.state.loadingRequestId !== requestId) {
        // Request outdated or instance destroyed - silently ignore
        return;
      }

      const { items = [], hasMore = false } = result;

      // Append items to container
      if (items.length > 0) {
        this.appendItems(items);
        if (this.state) {
          this.state.currentPage += 1;
          this.state.allItems = [...this.state.allItems, ...items];
        }
      }

      if (this.state) {
        this.state.hasMore = hasMore;

        // Update UI based on hasMore
        if (this.state.hasMore) {
          // Move sentinel to end
          this.moveSentinelToEnd();
        } else {
          // No more items
          this.state.observer?.unobserve(this.elements.sentinel);
          this.hideLoadMoreButton();
        }

        // Hide skeleton
        this.hideSkeleton();

        // Call completion callback
        this.callbacks.onLoadComplete({
          page: this.state.currentPage,
          totalItems: this.state.allItems.length,
          hasMore: this.state.hasMore
        });
      }

    } catch (error) {
      // Check if instance is still valid and request is still current
      if (!this.state || this.state.loadingRequestId !== requestId) {
        return;
      }

      this.state.error = error;
      console.error('Pagination error:', error);

      // Hide skeleton
      this.hideSkeleton();

      // Show load more button as fallback
      this.showLoadMoreButton();
      if (this.elements.loadMoreButton) {
        this.elements.loadMoreButton.textContent = this.config.errorText || 'Error loading. Click to retry.';
      }

      // Call error callback
      this.callbacks.onError(error);

    } finally {
      // Only clear loading state if instance is valid and this is still the current request
      if (this.state && this.state.loadingRequestId === requestId) {
        this.state.isLoading = false;
        this.state.loadingRequestId = null;
      }
    }
  }

  appendItems(items) {
    // Check if instance is still valid
    if (!this.state || !this.elements.container) {
      return;
    }

    // Remove skeleton before appending
    this.hideSkeleton();

    // Create document fragment for better performance
    const fragment = document.createDocumentFragment();

    const currentItemCount = this.state.allItems.length;
    items.forEach((item, index) => {
      const itemHTML = this.callbacks.renderItem(item, currentItemCount + index);
      if (typeof itemHTML === 'string') {
        const temp = document.createElement('div');
        temp.innerHTML = itemHTML.trim();
        while (temp.firstChild) {
          fragment.appendChild(temp.firstChild);
        }
      } else if (itemHTML instanceof Node) {
        fragment.appendChild(itemHTML);
      }
    });

    // Insert before sentinel (if container and sentinel still exist)
    if (this.elements.container && this.elements.sentinel && this.elements.sentinel.parentNode) {
      this.elements.container.insertBefore(fragment, this.elements.sentinel);

      // Move sentinel to end after insertion
      this.moveSentinelToEnd();
    }
  }

  moveSentinelToEnd() {
    // Check if elements still exist
    if (!this.elements.container || !this.elements.sentinel || !this.elements.loadMoreButton) {
      return;
    }

    // Ensure sentinel is at the end
    if (this.elements.sentinel.parentNode === this.elements.container) {
      this.elements.container.appendChild(this.elements.sentinel);
    }
    // Ensure load more button is after sentinel
    if (this.elements.loadMoreButton.parentNode === this.elements.container) {
      this.elements.container.appendChild(this.elements.loadMoreButton);
    }
  }

  showSkeleton() {
    if (!this.state || !this.elements.container || !this.elements.sentinel) {
      return;
    }

    if (this.state.skeletonElements.length > 0) {
      return; // Already showing
    }

    const skeletonCount = Math.min(3, this.config.itemsPerPage); // Show max 3 skeletons

    for (let i = 0; i < skeletonCount; i++) {
      const skeleton = this.config.skeletonTemplate();
      this.state.skeletonElements.push(skeleton);
      if (this.elements.container && this.elements.sentinel && this.elements.sentinel.parentNode) {
        this.elements.container.insertBefore(skeleton, this.elements.sentinel);
      }
    }
  }

  hideSkeleton() {
    if (!this.state) {
      return;
    }

    this.state.skeletonElements.forEach(skeleton => {
      if (skeleton && skeleton.parentNode) {
        skeleton.parentNode.removeChild(skeleton);
      }
    });
    this.state.skeletonElements = [];
  }

  showLoadMoreButton() {
    if (!this.elements.loadMoreButton) {
      return;
    }

    this.elements.loadMoreButton.style.display = 'block';
    if (this.state && this.state.error) {
      this.elements.loadMoreButton.textContent = this.config.errorText || 'Error loading. Click to retry.';
      this.elements.loadMoreButton.classList.add('error');
    } else {
      this.elements.loadMoreButton.textContent = this.config.loadMoreText || 'Load More';
      this.elements.loadMoreButton.classList.remove('error');
    }
  }

  hideLoadMoreButton() {
    if (this.elements.loadMoreButton) {
      this.elements.loadMoreButton.style.display = 'none';
    }
  }

  handleLoadMoreClick() {
    if (this.state && !this.state.isLoading && this.state.hasMore) {
      this.loadNextPage();
    }
  }

  reset() {
    // Check if instance is still valid
    if (!this.state || !this.elements.container) {
      return;
    }

    // Clear state
    this.state.currentPage = 0;
    this.state.allItems = [];
    this.state.hasMore = true;
    this.state.error = null;
    this.state.isLoading = false;
    this.state.loadingRequestId = null;

    // Clear container (except sentinel and load more button)
    if (this.elements.container) {
      const children = Array.from(this.elements.container.children);
      children.forEach(child => {
        if (
          child !== this.elements.sentinel &&
          child !== this.elements.loadMoreButton &&
          !child.hasAttribute('data-pagination-skeleton')
        ) {
          child.remove();
        }
      });
    }

    // Hide skeletons
    this.hideSkeleton();

    // Reset UI
    this.moveSentinelToEnd();
    this.hideLoadMoreButton();

    // Re-observe sentinel
    if (this.state.observer && this.elements.sentinel) {
      this.state.observer.observe(this.elements.sentinel);
    }

    // Load first page
    this.loadNextPage();
  }

  destroy() {
    // Unobserve
    if (this.state && this.state.observer) {
      this.state.observer.disconnect();
      this.state.observer = null;
    }

    // Remove event listeners
    if (this.elements.loadMoreButton) {
      this.elements.loadMoreButton.removeEventListener('click', this.handleLoadMoreClick);
    }

    // Remove DOM elements
    if (this.elements.sentinel && this.elements.sentinel.parentNode) {
      this.elements.sentinel.parentNode.removeChild(this.elements.sentinel);
    }
    if (this.elements.loadMoreButton && this.elements.loadMoreButton.parentNode) {
      this.elements.loadMoreButton.parentNode.removeChild(this.elements.loadMoreButton);
    }

    // Clear state
    this.state = null;
  }

  // Public API
  getItems() {
    return this.state ? [...this.state.allItems] : [];
  }

  getCurrentPage() {
    return this.state ? this.state.currentPage : 0;
  }

  hasMore() {
    return this.state ? this.state.hasMore : false;
  }

  isLoading() {
    return this.state ? this.state.isLoading : false;
  }
}

// Export for use in other modules
window.InfiniteScrollPagination = InfiniteScrollPagination;

