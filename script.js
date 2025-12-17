document.addEventListener('DOMContentLoaded', function () {
    // Elements
    const searchInput = document.getElementById('search-input');
    const linksContainer = document.getElementById('links-container');
    const editModeBtn = document.getElementById('edit-mode-btn');

    // Custom Dropdown Elements
    const engineSelector = document.getElementById('engine-selector');
    const selectorTrigger = engineSelector.querySelector('.custom-select-trigger');
    const selectorOptions = engineSelector.querySelector('.custom-select-options');
    const selectorValue = engineSelector.querySelector('.selected-value');
    const options = engineSelector.querySelectorAll('.custom-option');

    // Modal Elements
    const modalOverlay = document.getElementById('link-modal');
    const modalTitle = document.getElementById('modal-title');
    const linkNameInput = document.getElementById('link-name');
    const linkUrlInput = document.getElementById('link-url');
    const modalCancelBtn = document.getElementById('modal-cancel');
    const modalSaveBtn = document.getElementById('modal-save');

    // State
    let isEditMode = false;
    let linksData = [];
    let currentEngine = 'google';
    let editingLinkId = null; // null means adding new
    let dragSrcElement = null;

    // Icons
    const ICONS = {
        default: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
        plus: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
        trash: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>'
    };

    const DEFAULT_LINKS = [
        { id: 'google', name: 'Google', url: 'https://www.google.com', icon: getFavicon('https://www.google.com') },
        { id: 'github', name: 'GitHub', url: 'https://github.com', icon: getFavicon('https://github.com') },
        { id: 'stackoverflow', name: 'Stack Overflow', url: 'https://stackoverflow.com', icon: getFavicon('https://stackoverflow.com') },
        { id: 'youtube', name: 'YouTube', url: 'https://youtube.com', icon: getFavicon('https://youtube.com') }
    ];

    // --- Initialization ---

    function init() {
        loadLinks();
        setupEventListeners();
        setupDropdown();
    }

    function loadLinks() {
        const savedLinks = localStorage.getItem('quickLinks');
        if (savedLinks) {
            linksData = JSON.parse(savedLinks);
        } else {
            linksData = [...DEFAULT_LINKS];
        }
        renderLinks();
    }

    function setupEventListeners() {
        // Search
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch(searchInput.value.trim());
        });

        // Edit Mode Toggle
        editModeBtn.addEventListener('click', toggleEditMode);

        // Modal
        modalCancelBtn.addEventListener('click', closeModal);
        modalSaveBtn.addEventListener('click', saveLinkFromModal);
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });
    }

    // --- Dropdown Logic ---

    function setupDropdown() {
        selectorTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            selectorOptions.classList.toggle('open');
        });

        options.forEach(option => {
            option.addEventListener('click', () => {
                const value = option.dataset.value;
                const text = option.textContent;

                // Update State
                currentEngine = value;

                // Update UI
                selectorValue.textContent = text;
                options.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                selectorOptions.classList.remove('open');

                updatePlaceholder();
            });
        });

        document.addEventListener('click', () => {
            selectorOptions.classList.remove('open');
        });
    }

    function updatePlaceholder() {
        searchInput.placeholder = `Search ${selectorValue.textContent} or type a URL`;
    }

    // --- Search Logic ---

    function performSearch(query) {
        if (!query) return;

        if (isUrl(query)) {
            window.location.href = /^https?:\/\//.test(query) ? query : 'http://' + query;
        } else {
            let searchUrl;
            switch (currentEngine) {
                case 'google': searchUrl = 'https://www.google.com/search?q='; break;
                case 'bing': searchUrl = 'https://www.bing.com/search?q='; break;
                case 'baidu': searchUrl = 'https://www.baidu.com/s?wd='; break;
                case 'duckduckgo': searchUrl = 'https://duckduckgo.com/?q='; break;
                default: searchUrl = 'https://www.google.com/search?q=';
            }
            window.location.href = searchUrl + encodeURIComponent(query);
        }
    }

    function isUrl(string) {
        const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        return urlPattern.test(string);
    }

    // --- Rendering ---

    function renderLinks() {
        linksContainer.innerHTML = '';

        linksData.forEach((link, index) => {
            const linkEl = createLinkElement(link, index);
            linksContainer.appendChild(linkEl);
        });

        // Add "Add New" button if in edit mode
        if (isEditMode) {
            const addBtn = document.createElement('div');
            addBtn.className = 'link-item';
            addBtn.innerHTML = `
                <div class="link-card" style="border: 2px dashed #ccc; background: transparent; cursor: pointer;">
                    <div class="link-icon" style="background: transparent; color: #999;">${ICONS.plus}</div>
                    <div class="link-title" style="color: #999;">Add New</div>
                </div>
            `;
            addBtn.addEventListener('click', () => openModal());
            linksContainer.appendChild(addBtn);
        }
    }

    function createLinkElement(link, index) {
        const wrapper = document.createElement('div');
        wrapper.className = 'link-item';
        if (isEditMode) {
            wrapper.classList.add('edit-mode');
            wrapper.draggable = true;
            wrapper.dataset.index = index;
            setupDragEvents(wrapper);
        }

        // Favicon Logic: use google favicon service or default
        const iconSrc = `https://www.google.com/s2/favicons?domain=${link.url}&sz=64`;

        const content = `
            <a href="${isEditMode ? '#' : link.url}" class="link-card" target="${isEditMode ? '' : '_blank'}" draggable="false">
                <img src="${iconSrc}" class="link-icon" style="padding: 8px; box-sizing: border-box;" onerror="this.src='data:image/svg+xml;base64,${btoa(ICONS.default)}'">
                <div class="link-title">${link.name}</div>
            </a>
            ${isEditMode ? `<div class="delete-btn">${ICONS.trash}</div>` : ''}
        `;

        wrapper.innerHTML = content;

        if (isEditMode) {
            // Edit on click
            wrapper.querySelector('.link-card').addEventListener('click', (e) => {
                e.preventDefault();
                openModal(link);
            });

            // Delete
            wrapper.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteLink(link.id);
            });
        }

        return wrapper;
    }

    function getFavicon(url) {
        // This is just a placeholder, actual rendering uses Google Favicon service in createLinkElement
        return '';
    }

    // --- Edit Mode & Drag Drop ---

    function toggleEditMode() {
        isEditMode = !isEditMode;
        editModeBtn.textContent = isEditMode ? 'Done' : 'Edit';
        renderLinks();
    }

    function setupDragEvents(el) {
        el.addEventListener('dragstart', handleDragStart);
        el.addEventListener('dragover', handleDragOver);
        el.addEventListener('drop', handleDrop);
        el.addEventListener('dragend', handleDragEnd);
    }

    function handleDragStart(e) {
        dragSrcElement = this;
        this.style.opacity = '0.4';
        e.dataTransfer.effectAllowed = 'move';
    }

    function handleDragOver(e) {
        if (e.preventDefault) e.preventDefault();
        return false;
    }

    function handleDrop(e) {
        e.stopPropagation();
        if (dragSrcElement !== this) {
            const srcIndex = parseInt(dragSrcElement.dataset.index);
            const targetIndex = parseInt(this.dataset.index);

            // Swap
            const temp = linksData[srcIndex];
            linksData.splice(srcIndex, 1);
            linksData.splice(targetIndex, 0, temp);

            saveToStorage();
            renderLinks();
        }
        return false;
    }

    function handleDragEnd() {
        this.style.opacity = '1';
    }

    // --- Modal & Data Management ---

    function openModal(link = null) {
        editingLinkId = link ? link.id : null;
        modalTitle.textContent = link ? 'Edit Link' : 'Add Link';
        linkNameInput.value = link ? link.name : '';
        linkUrlInput.value = link ? link.url : '';

        modalOverlay.classList.add('open');
        linkNameInput.focus();
    }

    function closeModal() {
        modalOverlay.classList.remove('open');
    }

    function saveLinkFromModal() {
        const name = linkNameInput.value.trim();
        let url = linkUrlInput.value.trim();

        if (!name || !url) {
            alert('Please fill in both fields');
            return;
        }

        if (!/^https?:\/\//.test(url)) {
            url = 'https://' + url;
        }

        if (editingLinkId) {
            // Update existing
            const index = linksData.findIndex(l => l.id === editingLinkId);
            if (index !== -1) {
                linksData[index] = { ...linksData[index], name, url };
            }
        } else {
            // Add new
            const newLink = {
                id: 'link-' + Date.now(),
                name,
                url,
                icon: '' // dynamic
            };
            linksData.push(newLink);
        }

        saveToStorage();
        renderLinks();
        closeModal();
    }

    function deleteLink(id) {
        if (confirm('Are you sure you want to delete this link?')) {
            linksData = linksData.filter(l => l.id !== id);
            saveToStorage();
            renderLinks();
        }
    }

    function saveToStorage() {
        localStorage.setItem('quickLinks', JSON.stringify(linksData));
    }

    // --- Daily Quote ---

    function fetchQuote() {
        const quoteContainer = document.getElementById('quote-container');
        const quoteContent = document.getElementById('quote-content');
        const quoteAuthor = document.getElementById('quote-author');

        fetch('https://v1.hitokoto.cn/')
            .then(response => response.json())
            .then(data => {
                quoteContent.textContent = data.hitokoto;
                quoteAuthor.textContent = data.from_who ? `${data.from} · ${data.from_who}` : data.from;
                quoteContainer.style.display = 'block';
            })
            .catch(error => {
                console.error('Error fetching quote:', error);
                // Fallback quote
                quoteContent.textContent = "Stay hungry, stay foolish.";
                quoteAuthor.textContent = "Steve Jobs";
                quoteContainer.style.display = 'block';
            });
    }

    // --- Background Image 1+1 Strategy (IndexedDB) ---
    const DB_NAME = 'MeNewTableDB';
    const STORE_NAME = 'backgrounds';
    const DB_VERSION = 2; // Bumped version to ensure store creation

    const BackgroundManager = {
        db: null,

        init() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME);
                    }
                };
                request.onsuccess = (e) => {
                    this.db = e.target.result;
                    resolve();
                };
                request.onerror = (e) => reject(e);
            });
        },

        async loadBackground() {
            try {
                await this.init();
                const cachedBlob = await this.getFromDB('current_bg');

                if (cachedBlob && cachedBlob.size > 0) {
                    // Scenario A: Cache Hit
                    this.applyBackground(cachedBlob);
                    console.log('Background loaded from cache. Fetching new one for next visit...');
                    this.fetchAndCache();
                } else {
                    // Scenario B: Cache Miss
                    console.log('No cached background. Fetching 1+1...');
                    this.fetchAndApply();
                    this.fetchAndCache();
                }
            } catch (err) {
                console.error('Background load failed:', err);
            }
        },

        async fetchAndApply() {
            try {
                const blob = await this.fetchImage();
                if (blob && blob.size > 0) {
                    this.applyBackground(blob);
                }
            } catch (e) {
                console.error('Failed to fetch/apply background, falling back:', e);
                // Fallback: Direct Bing Image of the Day
                document.body.style.backgroundImage = `url('https://bing.biturl.top/?resolution=1920&format=image&index=0&mkt=zh-CN')`;
            }
        },

        async fetchAndCache() {
            try {
                const blob = await this.fetchImage();
                if (blob && blob.size > 0) {
                    console.log(`Caching background blob: ${blob.type}, size: ${blob.size}`);
                    await this.saveToDB('current_bg', blob);
                    console.log('New background cached successfully.');
                } else {
                    console.warn('Fetched blob is empty, skipping cache.');
                }
            } catch (e) {
                console.error('Failed to cache background:', e);
            }
        },

        async fetchImage() {
            // Step 1: Fetch JSON list (Static source)
            const jsonUrl = 'https://raw.onmicrosoft.cn/Bing-Wallpaper-Action/main/data/zh-CN_all.json';
            const jsonResponse = await fetch(jsonUrl);
            if (!jsonResponse.ok) throw new Error('Failed to fetch wallpaper list');

            const data = await jsonResponse.json();
            if (!data.data || data.data.length === 0) throw new Error('Empty wallpaper list');

            // Step 2: Pick random image
            const randomImage = data.data[Math.floor(Math.random() * data.data.length)];
            const imageUrl = `https://www.bing.com${randomImage.url}`;

            // Step 3: Fetch via images.weserv.nl (Robust image proxy with CORS support)
            // Remove protocol, weserv handles it (use ssl: if needed, but standard works for bing)
            const cleanUrl = imageUrl.replace(/^https?:\/\//, '');
            const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&output=jpg&q=100&we`;

            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error('Failed to fetch image blob via proxy');
            return await response.blob();
        },

        applyBackground(blob) {
            const url = URL.createObjectURL(blob);
            document.body.style.backgroundImage = `url('${url}')`;
        },

        getFromDB(key) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        },

        saveToDB(key, value) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put(value, key);

                // Wait for transaction complete to ensure data is on disk
                transaction.oncomplete = () => resolve();
                transaction.onerror = (e) => reject(e.target.error);
                request.onerror = (e) => reject(e.target.error); // Handle request error too
            });
        }
    };

    // Start
    init();
    fetchQuote();
    BackgroundManager.loadBackground();
});
